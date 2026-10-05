'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { PositionActionResponse } from './types'

export async function createPositionAction(
  formData: FormData
): Promise<PositionActionResponse> {
  try {
    const name = String(formData.get('name') ?? '').trim()
    const is_active = formData.get('is_active') === 'true' || formData.get('is_active') === 'on'

    if (!name || name.length < 2) {
      return { error: 'Nama posisi penempatan wajib diisi minimal 2 karakter.' }
    }

    const supabase = await createClient()

    // 1. Cek duplikasi nama posisi (case-insensitive)
    const { data: existing, error: checkError } = await supabase
      .from('positions')
      .select('id, name')
      .ilike('name', name)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking position duplicate:', checkError)
    }

    if (existing) {
      return {
        error: `Posisi dengan nama "${name}" sudah terdaftar. Gunakan nama yang berbeda.`,
      }
    }

    // 2. Insert record baru
    const { data, error } = await supabase
      .from('positions')
      .insert({
        name,
        is_active,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating position:', error)
      return { error: error.message || 'Gagal menambahkan posisi.' }
    }

    revalidatePath('/master/posisi')
    revalidatePath('/pengajuan')
    revalidatePath('/peserta')

    return { success: true, data }
  } catch (err) {
    console.error('Unexpected error in createPositionAction:', err)
    return { error: 'Terjadi kesalahan sistem saat menyimpan posisi.' }
  }
}

export async function updatePositionAction(
  id: string,
  formData: FormData
): Promise<PositionActionResponse> {
  try {
    if (!id) {
      return { error: 'ID posisi tidak valid.' }
    }

    const name = String(formData.get('name') ?? '').trim()
    const is_active =
      formData.get('is_active') === 'true' || formData.get('is_active') === 'on'

    if (!name || name.length < 2) {
      return { error: 'Nama posisi penempatan wajib diisi minimal 2 karakter.' }
    }

    const supabase = await createClient()

    // 1. Cek duplikasi nama posisi pada record lain
    const { data: existing, error: checkError } = await supabase
      .from('positions')
      .select('id, name')
      .ilike('name', name)
      .neq('id', id)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking duplicate for position update:', checkError)
    }

    if (existing) {
      return {
        error: `Posisi dengan nama "${name}" sudah digunakan oleh data lain.`,
      }
    }

    // 2. Update record
    const { data, error } = await supabase
      .from('positions')
      .update({
        name,
        is_active,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating position:', error)
      return { error: error.message || 'Gagal memperbarui posisi.' }
    }

    revalidatePath('/master/posisi')
    revalidatePath('/pengajuan')
    revalidatePath('/peserta')

    return { success: true, data }
  } catch (err) {
    console.error('Unexpected error in updatePositionAction:', err)
    return { error: 'Terjadi kesalahan sistem saat memperbarui posisi.' }
  }
}

export async function deletePositionAction(
  id: string
): Promise<PositionActionResponse> {
  try {
    if (!id) {
      return { error: 'ID posisi tidak valid.' }
    }

    const supabase = await createClient()

    // 1. Cek referensi FK pada application_details dan participants
    const [
      { count: appDetailsCount, error: appDetailsError },
      { count: partReqCount, error: partReqError },
      { count: partHcCount, error: partHcError },
    ] = await Promise.all([
      supabase
        .from('application_details')
        .select('*', { count: 'exact', head: true })
        .eq('requested_position_id', id),
      supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('positioning_by_request_id', id),
      supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('positioning_by_hc_id', id),
    ])

    if (appDetailsError) {
      console.error('Error checking application_details FK:', appDetailsError)
    }
    if (partReqError) {
      console.error('Error checking participants positioning_by_request_id FK:', partReqError)
    }
    if (partHcError) {
      console.error('Error checking participants positioning_by_hc_id FK:', partHcError)
    }

    const totalRefs = (appDetailsCount || 0) + (partReqCount || 0) + (partHcCount || 0)
    if (totalRefs > 0) {
      return {
        error:
          'Posisi tidak dapat dihapus karena sudah digunakan pada data pengajuan atau peserta.',
      }
    }

    // 2. Hapus jika aman
    const { error: deleteError } = await supabase
      .from('positions')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting position:', deleteError)
      if (deleteError.code === '23503') {
        return {
          error:
            'Posisi tidak dapat dihapus karena sudah digunakan pada data pengajuan atau peserta.',
        }
      }
      return { error: deleteError.message || 'Gagal menghapus posisi.' }
    }

    revalidatePath('/master/posisi')
    revalidatePath('/pengajuan')
    revalidatePath('/peserta')

    return { success: true }
  } catch (err) {
    console.error('Unexpected error in deletePositionAction:', err)
    return { error: 'Terjadi kesalahan sistem saat menghapus posisi.' }
  }
}
