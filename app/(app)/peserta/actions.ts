'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export interface ParticipantActionResponse {
  success?: boolean
  error?: string
  id?: string
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

  // 2. Ekstraksi data form
  const name = String(formData.get('name') || '').trim()
  const email = String(formData.get('email') || '').trim() || null
  const phone = String(formData.get('phone') || '').trim() || null
  const application_id = String(formData.get('application_id') || '').trim()
  const application_detail_id =
    String(formData.get('application_detail_id') || '').trim() || null
  const major_id = String(formData.get('major_id') || '').trim() || null
  const positioning_by_request_id =
    String(formData.get('positioning_by_request_id') || '').trim() || null
  const positioning_by_hc_id =
    String(formData.get('positioning_by_hc_id') || '').trim() || null
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

  // 4. Insert ke tabel participants
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
    return {
      error: `Gagal menyimpan data peserta: ${
        insertError?.message || 'Database error'
      }`,
    }
  }

  revalidatePath('/peserta')
  redirect(`/peserta/${newParticipant.id}?success=created`)
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

  // 2. Ekstraksi data form
  const name = String(formData.get('name') || '').trim()
  const email = String(formData.get('email') || '').trim() || null
  const phone = String(formData.get('phone') || '').trim() || null
  const application_id = String(formData.get('application_id') || '').trim()
  const application_detail_id =
    String(formData.get('application_detail_id') || '').trim() || null
  const major_id = String(formData.get('major_id') || '').trim() || null
  const positioning_by_request_id =
    String(formData.get('positioning_by_request_id') || '').trim() || null
  const positioning_by_hc_id =
    String(formData.get('positioning_by_hc_id') || '').trim() || null
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

  // 4. Update data peserta
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
    .eq('id', participantId)

  if (updateError) {
    console.error('Update participant error:', updateError)
    return {
      error: `Gagal memperbarui data peserta: ${updateError.message}`,
    }
  }

  revalidatePath('/peserta')
  revalidatePath(`/peserta/${participantId}`)
  redirect(`/peserta/${participantId}?success=updated`)
}
