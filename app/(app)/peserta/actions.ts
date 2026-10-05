'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface ParticipantActionResponse {
  success?: boolean
  error?: string
  id?: string
}

function parseOptionalUuid(val?: string | null): string | null {
  if (!val) return null
  const trimmed = val.trim()
  if (
    !trimmed ||
    trimmed === 'NEW' ||
    trimmed === '-- Tidak ditentukan --' ||
    trimmed === '-- Belum Ditentukan --' ||
    trimmed === '-- Tanpa Rincian Spesifik --' ||
    trimmed === '-- Belum Ditetapkan HC --' ||
    trimmed === '-- Pilih Jurusan --' ||
    trimmed === 'null'
  ) {
    return null
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(trimmed) ? trimmed : null
}

async function verifyHcUser(supabase: any, user: { id: string; email?: string }): Promise<boolean> {
  const { data: publicUser } = await supabase
    .from('users')
    .select('id, role, is_active')
    .or(`id.eq.${user.id},email.eq.${user.email}`)
    .maybeSingle()

  if (
    !publicUser ||
    !publicUser.is_active ||
    !['hc_admin', 'hc_staff'].includes(publicUser.role)
  ) {
    return false
  }
  return true
}

export async function createParticipantAction(
  _prevState: ParticipantActionResponse | null,
  formData: FormData
): Promise<ParticipantActionResponse> {
  const supabase = await createClient()

  // 1. Verifikasi sesi user aktif
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Anda harus login untuk melakukan tindakan ini.' }
  }

  const isHc = await verifyHcUser(supabase, user)
  if (!isHc) {
    return { error: 'Anda tidak memiliki izin untuk mendaftarkan peserta.' }
  }

  // 2. Ekstraksi data form
  const name = String(formData.get('name') || '').trim()
  const email = String(formData.get('email') || '').trim() || null
  const phone = String(formData.get('phone') || '').trim() || null
  const application_id = parseOptionalUuid(String(formData.get('application_id') || ''))
  const application_detail_id = parseOptionalUuid(
    String(formData.get('application_detail_id') || '')
  )
  const major_id = parseOptionalUuid(String(formData.get('major_id') || ''))
  const positioning_by_request_id = parseOptionalUuid(
    String(formData.get('positioning_by_request_id') || '')
  )
  const positioning_by_hc_id = parseOptionalUuid(
    String(formData.get('positioning_by_hc_id') || '')
  )
  const actual_start_date =
    String(formData.get('actual_start_date') || '').trim() || null
  const actual_end_date =
    String(formData.get('actual_end_date') || '').trim() || null
  const status_id =
    String(formData.get('status_id') || 'belum_mulai').trim() || 'belum_mulai'
  const notes = String(formData.get('notes') || '').trim() || null

  // 3. Validasi
  if (!name) {
    return { error: 'Nama lengkap peserta wajib diisi.' }
  }

  if (!application_id) {
    return { error: 'Berkas pengajuan terkait wajib dipilih.' }
  }

  if (actual_start_date && actual_end_date) {
    if (new Date(actual_end_date) < new Date(actual_start_date)) {
      return {
        error:
          'Tanggal selesai magang tidak boleh lebih awal dari tanggal mulai magang.',
      }
    }
  }

  // 4. Validasi kuota di database jika application_detail_id dipilih
  if (application_detail_id) {
    const { data: detailData, error: detailError } = await supabase
      .from('application_details')
      .select(`
        id,
        approved_quota,
        major:majors!major_id ( name, code )
      `)
      .eq('id', application_detail_id)
      .maybeSingle()

    if (detailError) {
      console.error('Error fetching application detail for quota check:', detailError)
      return { error: 'Terjadi kesalahan saat memeriksa kuota rincian pengajuan.' }
    }

    if (detailData && typeof detailData.approved_quota === 'number') {
      const { count: currentCount, error: countError } = await supabase
        .from('participants')
        .select('id', { count: 'exact', head: true })
        .eq('application_detail_id', application_detail_id)

      if (countError) {
        console.error('Error checking participant count:', countError)
        return { error: 'Terjadi kesalahan saat memeriksa kuota peserta.' }
      }

      if (typeof currentCount === 'number' && currentCount >= detailData.approved_quota) {
        const rawMajor = Array.isArray(detailData.major)
          ? detailData.major[0]
          : detailData.major
        const major = rawMajor as { name?: string; code?: string | null } | null
        const majorLabel = major?.name
          ? `${major.name}${major.code ? ` (${major.code})` : ''}`
          : 'Rincian Pengajuan'

        return {
          error: `Kuota peserta untuk rincian ${majorLabel} sudah penuh (${detailData.approved_quota}/${detailData.approved_quota}). Peserta tidak dapat ditambahkan.`,
        }
      }
    }
  }

  // 5. Insert ke tabel participants
  const { data: newParticipant, error: insertError } = await supabase
    .from('participants')
    .insert({
      name,
      email,
      phone,
      application_id,
      application_detail_id,
      major_id,
      positioning_by_request_id,
      positioning_by_hc_id,
      actual_start_date,
      actual_end_date,
      status_id,
      notes,
    })
    .select('id')
    .single()

  if (insertError || !newParticipant) {
    console.error('Create participant error:', insertError)
    const msg = insertError?.message || ''
    if (msg.includes('Kuota peserta untuk rincian')) {
      return { error: msg }
    }
    return {
      error: `Gagal menyimpan data peserta: ${
        insertError?.message || 'Database error'
      }`,
    }
  }

  revalidatePath('/peserta')
  revalidatePath('/dashboard')
  revalidatePath('/monitoring')
  if (application_id) {
    revalidatePath(`/pengajuan/${application_id}`)
  }
  return { success: true, id: newParticipant.id }
}

export async function updateParticipantAction(
  participantId: string,
  _prevState: ParticipantActionResponse | null,
  formData: FormData
): Promise<ParticipantActionResponse> {
  const supabase = await createClient()

  // 1. Verifikasi sesi user aktif
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Anda harus login untuk melakukan tindakan ini.' }
  }

  const isHc = await verifyHcUser(supabase, user)
  if (!isHc) {
    return { error: 'Anda tidak memiliki izin untuk memperbarui data peserta.' }
  }

  const cleanPartId = parseOptionalUuid(participantId)
  if (!cleanPartId) {
    return { error: 'ID peserta tidak valid.' }
  }

  // 2. Ekstraksi data form
  const name = String(formData.get('name') || '').trim()
  const email = String(formData.get('email') || '').trim() || null
  const phone = String(formData.get('phone') || '').trim() || null
  const application_id = parseOptionalUuid(String(formData.get('application_id') || ''))
  const application_detail_id = parseOptionalUuid(
    String(formData.get('application_detail_id') || '')
  )
  const major_id = parseOptionalUuid(String(formData.get('major_id') || ''))
  const positioning_by_request_id = parseOptionalUuid(
    String(formData.get('positioning_by_request_id') || '')
  )
  const positioning_by_hc_id = parseOptionalUuid(
    String(formData.get('positioning_by_hc_id') || '')
  )
  const actual_start_date =
    String(formData.get('actual_start_date') || '').trim() || null
  const actual_end_date =
    String(formData.get('actual_end_date') || '').trim() || null
  const status_id =
    String(formData.get('status_id') || 'belum_mulai').trim() || 'belum_mulai'
  const notes = String(formData.get('notes') || '').trim() || null

  // 3. Validasi
  if (!name) {
    return { error: 'Nama lengkap peserta wajib diisi.' }
  }

  if (!application_id) {
    return { error: 'Berkas pengajuan terkait wajib dipilih.' }
  }

  if (actual_start_date && actual_end_date) {
    if (new Date(actual_end_date) < new Date(actual_start_date)) {
      return {
        error:
          'Tanggal selesai magang tidak boleh lebih awal dari tanggal mulai magang.',
      }
    }
  }

  // 4. Periksa apakah rincian pengajuan diubah ke rincian baru
  const { data: existingParticipant } = await supabase
    .from('participants')
    .select('application_detail_id')
    .eq('id', cleanPartId)
    .maybeSingle()

  if (
    application_detail_id &&
    existingParticipant?.application_detail_id !== application_detail_id
  ) {
    // Dipindahkan ke application_detail_id lain: periksa kuota detail tujuan
    const { data: detailData, error: detailError } = await supabase
      .from('application_details')
      .select(`
        id,
        approved_quota,
        major:majors!major_id ( name, code )
      `)
      .eq('id', application_detail_id)
      .maybeSingle()

    if (detailError) {
      console.error('Error fetching application detail for quota check:', detailError)
      return { error: 'Terjadi kesalahan saat memeriksa kuota rincian pengajuan tujuan.' }
    }

    if (detailData && typeof detailData.approved_quota === 'number') {
      const { count: currentCount, error: countError } = await supabase
        .from('participants')
        .select('id', { count: 'exact', head: true })
        .eq('application_detail_id', application_detail_id)

      if (countError) {
        console.error('Error checking participant count:', countError)
        return { error: 'Terjadi kesalahan saat memeriksa kuota peserta.' }
      }

      if (typeof currentCount === 'number' && currentCount >= detailData.approved_quota) {
        const rawMajor = Array.isArray(detailData.major)
          ? detailData.major[0]
          : detailData.major
        const major = rawMajor as { name?: string; code?: string | null } | null
        const majorLabel = major?.name
          ? `${major.name}${major.code ? ` (${major.code})` : ''}`
          : 'Rincian Pengajuan'

        return {
          error: `Kuota peserta untuk rincian ${majorLabel} sudah penuh (${detailData.approved_quota}/${detailData.approved_quota}). Peserta tidak dapat dipindahkan.`,
        }
      }
    }
  }

  // 5. Update data peserta
  const { error: updateError } = await supabase
    .from('participants')
    .update({
      name,
      email,
      phone,
      application_id,
      application_detail_id,
      major_id,
      positioning_by_request_id,
      positioning_by_hc_id,
      actual_start_date,
      actual_end_date,
      status_id,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cleanPartId)

  if (updateError) {
    console.error('Update participant error:', updateError)
    const msg = updateError.message || ''
    if (msg.includes('Kuota peserta untuk rincian')) {
      return { error: msg }
    }
    return {
      error: `Gagal memperbarui data peserta: ${updateError.message}`,
    }
  }

  revalidatePath('/peserta')
  revalidatePath(`/peserta/${cleanPartId}`)
  revalidatePath('/dashboard')
  revalidatePath('/monitoring')
  if (application_id) {
    revalidatePath(`/pengajuan/${application_id}`)
  }
  return { success: true, id: cleanPartId }
}

export async function deleteParticipantAction(
  participantId: string
): Promise<ParticipantActionResponse> {
  const supabase = await createClient()

  // 1. Verifikasi sesi user aktif
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Anda harus login untuk melakukan tindakan ini.' }
  }

  // 2. Verifikasi otorisasi role HC
  const isHc = await verifyHcUser(supabase, user)
  if (!isHc) {
    return { error: 'Anda tidak memiliki izin untuk menghapus peserta.' }
  }

  const cleanPartId = parseOptionalUuid(participantId)
  if (!cleanPartId) {
    return { error: 'ID peserta tidak valid.' }
  }

  // 3. Ambil data peserta sebelum dihapus untuk keperluan revalidasi
  const { data: participantData, error: fetchError } = await supabase
    .from('participants')
    .select('id, name, application_id, application_detail_id')
    .eq('id', cleanPartId)
    .maybeSingle()

  if (fetchError) {
    console.error('Error fetching participant before deletion:', fetchError)
    return { error: 'Terjadi kesalahan saat memeriksa data peserta.' }
  }

  if (!participantData) {
    return { error: 'Data peserta tidak ditemukan atau sudah dihapus.' }
  }

  // 4. Hapus participant dari database
  const { error: deleteError } = await supabase
    .from('participants')
    .delete()
    .eq('id', cleanPartId)

  if (deleteError) {
    console.error('Error deleting participant:', deleteError)
    return { error: `Gagal menghapus peserta: ${deleteError.message}` }
  }

  // 5. Revalidasi path terkait
  revalidatePath('/peserta')
  revalidatePath(`/peserta/${cleanPartId}`)
  revalidatePath('/dashboard')
  revalidatePath('/monitoring')
  revalidatePath('/riwayat')
  if (participantData.application_id) {
    revalidatePath(`/pengajuan/${participantData.application_id}`)
  }

  return { success: true }
}
