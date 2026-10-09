'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ApplicationType } from './types'

export interface ActionResponse {
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
    trimmed === '-- Pilih Jurusan --' ||
    trimmed === '-- Pilih Institusi --' ||
    trimmed === 'null'
  ) {
    return null
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(trimmed) ? trimmed : null
}

export async function createApplicationAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const supabase = await createClient()

  // 1. Verifikasi autentikasi user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Anda harus login untuk melakukan tindakan ini.' }
  }

  // 2. Ekstraksi field form pengajuan
  const application_type = String(formData.get('application_type') || '') as ApplicationType
  let institution_id = String(formData.get('institution_id') || '').trim()
  const new_institution_name = String(formData.get('new_institution_name') || '').trim()
  const new_institution_type = String(formData.get('new_institution_type') || 'SMK').trim()

  const apply_date = String(formData.get('apply_date') || '').trim()
  const pic_hc_id = parseOptionalUuid(String(formData.get('pic_hc_id') || ''))
  const stage_id = String(formData.get('stage_id') || 'belum_ditanggapi').trim()
  const decision_id = String(formData.get('decision_id') || 'dalam_proses').trim()
  const kop_letter_number = String(formData.get('kop_letter_number') || '').trim() || null
  const confirmation_deadline = String(formData.get('confirmation_deadline') || '').trim() || null
  const confirmation_date = String(formData.get('confirmation_date') || '').trim() || null
  const proposed_start_date = String(formData.get('proposed_start_date') || '').trim() || null
  const proposed_end_date = String(formData.get('proposed_end_date') || '').trim() || null
  const approved_start_date = String(formData.get('approved_start_date') || '').trim() || null
  const approved_end_date = String(formData.get('approved_end_date') || '').trim() || null
  const notes = String(formData.get('notes') || '').trim() || null

  // 3. Validasi dasar
  if (!['PKL', 'MAGANG_MANDIRI'].includes(application_type)) {
    return { error: 'Jenis pengajuan harus PKL atau MAGANG_MANDIRI.' }
  }

  if (!apply_date) {
    return { error: 'Tanggal pengajuan wajib diisi.' }
  }

  // Jika institusi baru diisi manual
  if ((!institution_id || institution_id === 'NEW') && new_institution_name) {
    const trimmedName = new_institution_name.trim()

    // Cek apakah institusi dengan nama ini sudah terdaftar (case-insensitive)
    const { data: existingInst } = await supabase
      .from('institutions')
      .select('id, name')
      .ilike('name', trimmedName)
      .limit(1)

    if (existingInst && existingInst.length > 0) {
      // Otomatis tautkan ke institusi yang sudah ada agar tidak terjadi duplikasi data
      institution_id = existingInst[0].id
    } else {
      const { data: newInst, error: instErr } = await supabase
        .from('institutions')
        .insert({
          name: trimmedName,
          type: new_institution_type || 'SMK',
        })
        .select('id')
        .single()

      if (instErr || !newInst) {
        return { error: `Gagal menambahkan institusi: ${instErr?.message || 'Unknown error'}` }
      }
      institution_id = newInst.id
    }
  }

  if (!institution_id || institution_id === 'NEW' || institution_id === '-- Pilih Institusi --') {
    return { error: 'Institusi wajib dipilih atau diisi.' }
  }

  // 4. Parse & validasi awal detail rows sebelum insert
  const detailsJson = String(formData.get('details_json') || '[]')
  let parsedDetails: Array<{
    major_id?: string | null
    new_major_name?: string | null
    requested_position_id?: string | null
    new_position_name?: string | null
    requested_quota?: number | string | null
    approved_quota?: number | string | null
    notes?: string | null
  }> = []

  try {
    parsedDetails = JSON.parse(detailsJson)
  } catch {
    return { error: 'Format rincian pengajuan tidak valid.' }
  }

  // 4b. Pengisian jurusan pada rincian bersifat opsional (dapat berupa NULL)

  // 5. Insert ke tabel applications
  const { data: appData, error: appError } = await supabase
    .from('applications')
    .insert({
      application_type,
      institution_id,
      apply_date,
      pic_hc_id,
      stage_id,
      decision_id,
      kop_letter_number,
      confirmation_deadline,
      confirmation_date,
      proposed_start_date,
      proposed_end_date,
      approved_start_date,
      approved_end_date,
      notes,
    })
    .select('id')
    .single()

  if (appError || !appData) {
    console.error('Create application error:', appError)
    return { error: `Gagal menyimpan pengajuan: ${appError?.message || 'Database error'}` }
  }

  const applicationId = appData.id

  // 6. Simpan rincian (application_details) dengan sanitasi & atomic rollback jika gagal
  if (Array.isArray(parsedDetails) && parsedDetails.length > 0) {
    for (const item of parsedDetails) {
      let major_id: string | null = null
      let requested_position_id: string | null = null

      // Tambah jurusan baru jika diinput teks baru
      if (item.new_major_name && item.new_major_name.trim()) {
        const { data: mData, error: mErr } = await supabase
          .from('majors')
          .insert({ name: item.new_major_name.trim() })
          .select('id')
          .single()
        if (mErr) {
          console.error('Error creating new major:', mErr)
        } else if (mData) {
          major_id = mData.id
        }
      } else {
        major_id = parseOptionalUuid(item.major_id)
      }

      // Tambah posisi baru jika diinput teks baru
      if (item.new_position_name && item.new_position_name.trim()) {
        const { data: pData, error: pErr } = await supabase
          .from('positions')
          .insert({ name: item.new_position_name.trim() })
          .select('id')
          .single()
        if (pErr) {
          console.error('Error creating new position:', pErr)
        } else if (pData) {
          requested_position_id = pData.id
        }
      } else {
        // Jika user memilih "-- Tidak ditentukan --" (nilai ''), maka menjadi NULL
        requested_position_id = parseOptionalUuid(item.requested_position_id)
      }

      let requested_quota: number | null = null
      if (
        item.requested_quota !== null &&
        item.requested_quota !== '' &&
        item.requested_quota !== undefined
      ) {
        const parsed = parseInt(String(item.requested_quota), 10)
        if (!isNaN(parsed)) {
          if (parsed < 0) {
            await supabase.from('applications').delete().eq('id', applicationId)
            return { error: 'Kuota yang diajukan tidak boleh bernilai negatif.' }
          }
          requested_quota = parsed
        }
      }

      let approved_quota: number | null = null
      if (
        item.approved_quota !== null &&
        item.approved_quota !== '' &&
        item.approved_quota !== undefined
      ) {
        const parsed = parseInt(String(item.approved_quota), 10)
        if (!isNaN(parsed)) {
          if (parsed < 0) {
            await supabase.from('applications').delete().eq('id', applicationId)
            return { error: 'Kuota yang disetujui tidak boleh bernilai negatif.' }
          }
          approved_quota = parsed
        }
      }

      const { error: dErr } = await supabase.from('application_details').insert({
        application_id: applicationId,
        major_id,
        requested_position_id, // NULL jika tidak ditentukan
        requested_quota,
        approved_quota,
        notes: item.notes?.trim() || null,
      })

      if (dErr) {
        console.error('Error inserting application detail:', dErr)
        // Atomic cleanup: hapus aplikasi yatim jika rincian gagal disimpan
        await supabase.from('applications').delete().eq('id', applicationId)
        return { error: `Gagal menyimpan rincian jurusan/posisi: ${dErr.message}` }
      }
    }
  }

  // 7. Catat log awal ke application_status_logs
  try {
    const { data: publicUser } = await supabase
      .from('users')
      .select('id')
      .or(`id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle()

    await supabase.from('application_status_logs').insert({
      application_id: applicationId,
      previous_stage_id: null,
      new_stage_id: stage_id,
      previous_decision_id: null,
      new_decision_id: decision_id,
      changed_by_user_id: publicUser?.id || null,
      change_notes: 'Pengajuan baru dibuat.',
    })
  } catch (logErr) {
    console.warn('Logging status change warning:', logErr)
  }

  revalidatePath('/pengajuan')
  return { success: true, id: applicationId }
}

export async function updateApplicationAction(
  applicationId: string,
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const supabase = await createClient()

  // 1. Verifikasi autentikasi
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Anda harus login untuk melakukan tindakan ini.' }
  }

  // 2. Ambil data existing untuk perbandingan log
  const { data: existingApp } = await supabase
    .from('applications')
    .select('stage_id, decision_id')
    .eq('id', applicationId)
    .single()

  const application_type = String(formData.get('application_type') || '') as ApplicationType
  let institution_id = String(formData.get('institution_id') || '').trim()
  const new_institution_name = String(formData.get('new_institution_name') || '').trim()
  const new_institution_type = String(formData.get('new_institution_type') || 'SMK').trim()

  const apply_date = String(formData.get('apply_date') || '').trim()
  const pic_hc_id = parseOptionalUuid(String(formData.get('pic_hc_id') || ''))
  const stage_id = String(formData.get('stage_id') || 'belum_ditanggapi').trim()
  const decision_id = String(formData.get('decision_id') || 'dalam_proses').trim()
  const kop_letter_number = String(formData.get('kop_letter_number') || '').trim() || null
  const confirmation_deadline = String(formData.get('confirmation_deadline') || '').trim() || null
  const confirmation_date = String(formData.get('confirmation_date') || '').trim() || null
  const proposed_start_date = String(formData.get('proposed_start_date') || '').trim() || null
  const proposed_end_date = String(formData.get('proposed_end_date') || '').trim() || null
  const approved_start_date = String(formData.get('approved_start_date') || '').trim() || null
  const approved_end_date = String(formData.get('approved_end_date') || '').trim() || null
  const notes = String(formData.get('notes') || '').trim() || null

  if (!['PKL', 'MAGANG_MANDIRI'].includes(application_type)) {
    return { error: 'Jenis pengajuan harus PKL atau MAGANG_MANDIRI.' }
  }

  if (!apply_date) {
    return { error: 'Tanggal pengajuan wajib diisi.' }
  }

  if ((!institution_id || institution_id === 'NEW') && new_institution_name) {
    const trimmedName = new_institution_name.trim()

    // Cek apakah institusi dengan nama ini sudah terdaftar (case-insensitive)
    const { data: existingInst } = await supabase
      .from('institutions')
      .select('id, name')
      .ilike('name', trimmedName)
      .limit(1)

    if (existingInst && existingInst.length > 0) {
      // Otomatis tautkan ke institusi yang sudah ada agar tidak terjadi duplikasi data
      institution_id = existingInst[0].id
    } else {
      const { data: newInst, error: instErr } = await supabase
        .from('institutions')
        .insert({
          name: trimmedName,
          type: new_institution_type || 'SMK',
        })
        .select('id')
        .single()

      if (instErr || !newInst) {
        return { error: `Gagal menambahkan institusi: ${instErr?.message || 'Unknown error'}` }
      }
      institution_id = newInst.id
    }
  }

  if (!institution_id || institution_id === 'NEW' || institution_id === '-- Pilih Institusi --') {
    return { error: 'Institusi wajib dipilih atau diisi.' }
  }

  // 3. Update tabel applications
  const { error: updateError } = await supabase
    .from('applications')
    .update({
      application_type,
      institution_id,
      apply_date,
      pic_hc_id,
      stage_id,
      decision_id,
      kop_letter_number,
      confirmation_deadline,
      confirmation_date,
      proposed_start_date,
      proposed_end_date,
      approved_start_date,
      approved_end_date,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)

  if (updateError) {
    console.error('Update application error:', updateError)
    return { error: `Gagal memperbarui pengajuan: ${updateError.message}` }
  }

  // 4. Update details: Hapus rincian lama dan masukkan rincian baru
  const detailsJson = String(formData.get('details_json') || '[]')
  try {
    const details = JSON.parse(detailsJson) as Array<{
      id?: string
      major_id?: string | null
      new_major_name?: string | null
      requested_position_id?: string | null
      new_position_name?: string | null
      requested_quota?: number | string | null
      approved_quota?: number | string | null
      notes?: string | null
    }>

    // Pengisian jurusan pada rincian bersifat opsional (dapat berupa NULL)

    // Hapus detail sebelumnya
    await supabase.from('application_details').delete().eq('application_id', applicationId)

    if (Array.isArray(details) && details.length > 0) {
      for (const item of details) {
        let major_id: string | null = null
        let requested_position_id: string | null = null

        if (item.new_major_name && item.new_major_name.trim()) {
          const { data: mData, error: mErr } = await supabase
            .from('majors')
            .insert({ name: item.new_major_name.trim() })
            .select('id')
            .single()
          if (!mErr && mData) major_id = mData.id
        } else {
          major_id = parseOptionalUuid(item.major_id)
        }

        if (item.new_position_name && item.new_position_name.trim()) {
          const { data: pData, error: pErr } = await supabase
            .from('positions')
            .insert({ name: item.new_position_name.trim() })
            .select('id')
            .single()
          if (!pErr && pData) requested_position_id = pData.id
        } else {
          requested_position_id = parseOptionalUuid(item.requested_position_id)
        }

        let requested_quota: number | null = null
        if (
          item.requested_quota !== null &&
          item.requested_quota !== '' &&
          item.requested_quota !== undefined
        ) {
          const parsed = parseInt(String(item.requested_quota), 10)
          if (!isNaN(parsed)) requested_quota = Math.max(0, parsed)
        }

        let approved_quota: number | null = null
        if (
          item.approved_quota !== null &&
          item.approved_quota !== '' &&
          item.approved_quota !== undefined
        ) {
          const parsed = parseInt(String(item.approved_quota), 10)
          if (!isNaN(parsed)) approved_quota = Math.max(0, parsed)
        }

        const { error: dErr } = await supabase.from('application_details').insert({
          application_id: applicationId,
          major_id,
          requested_position_id, // NULL jika tidak ditentukan
          requested_quota,
          approved_quota,
          notes: item.notes?.trim() || null,
        })

        if (dErr) {
          console.error('Error re-inserting application detail:', dErr)
          return { error: `Gagal memperbarui rincian jurusan/posisi: ${dErr.message}` }
        }
      }
    }
  } catch (err) {
    console.error('Error updating application details:', err)
    return { error: 'Terjadi kesalahan saat memproses rincian pengajuan.' }
  }

  // 5. Catat log perubahan status jika tahap atau keputusan berubah
  if (
    existingApp &&
    (existingApp.stage_id !== stage_id || existingApp.decision_id !== decision_id)
  ) {
    try {
      const { data: publicUser } = await supabase
        .from('users')
        .select('id')
        .or(`id.eq.${user.id},email.eq.${user.email}`)
        .maybeSingle()

      await supabase.from('application_status_logs').insert({
        application_id: applicationId,
        previous_stage_id: existingApp.stage_id,
        new_stage_id: stage_id,
        previous_decision_id: existingApp.decision_id,
        new_decision_id: decision_id,
        changed_by_user_id: publicUser?.id || null,
        change_notes: 'Status pengajuan diperbarui melalui formulir edit.',
      })
    } catch (logErr) {
      console.warn('Logging status change update warning:', logErr)
    }
  }

  revalidatePath('/pengajuan')
  revalidatePath(`/pengajuan/${applicationId}`)
  return { success: true, id: applicationId }
}

export async function deleteApplicationAction(
  applicationId: string
): Promise<ActionResponse> {
  const supabase = await createClient()

  // 1. Validasi authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Anda harus login untuk melakukan tindakan ini.' }
  }

  // 2. Validasi user adalah HC aktif
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
    return { error: 'Anda tidak memiliki izin untuk menghapus pengajuan.' }
  }

  // 3. Validasi ID pengajuan
  const cleanAppId = parseOptionalUuid(applicationId)
  if (!cleanAppId) {
    return { error: 'ID pengajuan tidak valid.' }
  }

  // 4. Cari application
  const { data: appData, error: appFetchError } = await supabase
    .from('applications')
    .select('id')
    .eq('id', cleanAppId)
    .maybeSingle()

  if (appFetchError) {
    console.error('Error fetching application for deletion:', appFetchError)
    return { error: 'Terjadi kesalahan saat memeriksa data pengajuan.' }
  }

  if (!appData) {
    return { error: 'Pengajuan tidak ditemukan.' }
  }

  // 5. Cek apakah application sudah memiliki participant
  const { count: participantCount, error: participantError } = await supabase
    .from('participants')
    .select('id', { count: 'exact', head: true })
    .eq('application_id', cleanAppId)

  if (participantError) {
    console.error('Error checking participants for deletion:', participantError)
    return { error: 'Terjadi kesalahan saat memeriksa peserta pengajuan.' }
  }

  if (participantCount && participantCount > 0) {
    return { error: 'Pengajuan tidak dapat dihapus karena sudah memiliki peserta.' }
  }

  // 6. DELETE application (Cascade deletes application_details & application_status_logs)
  const { error: deleteError } = await supabase
    .from('applications')
    .delete()
    .eq('id', cleanAppId)

  if (deleteError) {
    console.error('Error deleting application:', deleteError)
    if (deleteError.code === '23503') {
      return { error: 'Pengajuan tidak dapat dihapus karena masih digunakan oleh data lain.' }
    }
    return { error: `Gagal menghapus pengajuan: ${deleteError.message}` }
  }

  revalidatePath('/pengajuan')
  revalidatePath('/dashboard')
  revalidatePath('/monitoring')
  revalidatePath('/riwayat')

  return { success: true }
}

export async function quickUpdateApplicationStatusAction(
  applicationId: string,
  stage_id: string,
  decision_id: string,
  change_notes?: string
): Promise<ActionResponse> {
  const supabase = await createClient()

  // 1. Validasi authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Anda harus login untuk melakukan tindakan ini.' }
  }

  // 2. Validasi user adalah HC aktif
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
    return { error: 'Anda tidak memiliki izin untuk mengubah status pengajuan.' }
  }

  // 3. Validasi ID pengajuan
  const cleanAppId = parseOptionalUuid(applicationId)
  if (!cleanAppId) {
    return { error: 'ID pengajuan tidak valid.' }
  }

  const cleanStageId = String(stage_id || '').trim()
  const cleanDecisionId = String(decision_id || '').trim()

  if (!cleanStageId || !cleanDecisionId) {
    return { error: 'Tahap dan keputusan pengajuan wajib dipilih.' }
  }

  // 4. Ambil data existing untuk verifikasi dan logging
  const { data: existingApp, error: fetchErr } = await supabase
    .from('applications')
    .select('id, stage_id, decision_id')
    .eq('id', cleanAppId)
    .single()

  if (fetchErr || !existingApp) {
    return { error: 'Data pengajuan tidak ditemukan.' }
  }

  const isChanged =
    existingApp.stage_id !== cleanStageId || existingApp.decision_id !== cleanDecisionId

  if (isChanged) {
    // 5. Update record di applications
    const { error: updateError } = await supabase
      .from('applications')
      .update({
        stage_id: cleanStageId,
        decision_id: cleanDecisionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cleanAppId)

    if (updateError) {
      console.error('Quick update application status error:', updateError)
      return { error: `Gagal memperbarui status pengajuan: ${updateError.message}` }
    }

    // 6. Catat log perubahan status di application_status_logs
    try {
      await supabase.from('application_status_logs').insert({
        application_id: cleanAppId,
        previous_stage_id: existingApp.stage_id,
        new_stage_id: cleanStageId,
        previous_decision_id: existingApp.decision_id,
        new_decision_id: cleanDecisionId,
        changed_by_user_id: publicUser.id,
        change_notes:
          change_notes?.trim() ||
          'Status pengajuan diperbarui melalui Quick Status Transition.',
      })
    } catch (logErr) {
      console.warn('Logging quick status change warning:', logErr)
    }
  }

  // 7. Revalidate
  revalidatePath('/pengajuan')
  revalidatePath(`/pengajuan/${cleanAppId}`)
  revalidatePath('/dashboard')
  revalidatePath('/monitoring')
  revalidatePath('/riwayat')

  return { success: true, id: cleanAppId }
}

