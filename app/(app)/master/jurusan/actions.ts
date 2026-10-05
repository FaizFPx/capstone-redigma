'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { MajorActionResponse } from './types'

export async function createMajorAction(
  formData: FormData
): Promise<MajorActionResponse> {
  try {
    const name = String(formData.get('name') ?? '').trim()
    const code = String(formData.get('code') ?? '').trim() || null
    const institution_level =
      String(formData.get('institution_level') ?? '').trim() || null
    const is_active = formData.get('is_active') === 'true' || formData.get('is_active') === 'on'

    if (!name || name.length < 2) {
      return { error: 'Nama jurusan / program studi wajib diisi minimal 2 karakter.' }
    }

    const supabase = await createClient()

    // 1. Cek duplikasi nama jurusan (case-insensitive)
    const { data: existing, error: checkError } = await supabase
      .from('majors')
      .select('id, name')
      .ilike('name', name)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking major duplicate:', checkError)
    }

    if (existing) {
      return {
        error: `Jurusan dengan nama "${name}" sudah terdaftar. Gunakan nama yang berbeda.`,
      }
    }

    // 2. Insert record baru
    const { data, error } = await supabase
      .from('majors')
      .insert({
        name,
        code,
        institution_level,
        is_active,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating major:', error)
      return { error: error.message || 'Gagal menambahkan jurusan.' }
    }

    revalidatePath('/master/jurusan')
    revalidatePath('/pengajuan')
    revalidatePath('/peserta')

    return { success: true, data }
  } catch (err) {
    console.error('Unexpected error in createMajorAction:', err)
    return { error: 'Terjadi kesalahan sistem saat menyimpan jurusan.' }
  }
}

export async function updateMajorAction(
  id: string,
  formData: FormData
): Promise<MajorActionResponse> {
  try {
    if (!id) {
      return { error: 'ID jurusan tidak valid.' }
    }

    const name = String(formData.get('name') ?? '').trim()
    const code = String(formData.get('code') ?? '').trim() || null
    const institution_level =
      String(formData.get('institution_level') ?? '').trim() || null
    const is_active =
      formData.get('is_active') === 'true' || formData.get('is_active') === 'on'

    if (!name || name.length < 2) {
      return { error: 'Nama jurusan / program studi wajib diisi minimal 2 karakter.' }
    }

    const supabase = await createClient()

    // 1. Cek duplikasi nama jurusan pada record lain
    const { data: existing, error: checkError } = await supabase
      .from('majors')
      .select('id, name')
      .ilike('name', name)
      .neq('id', id)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking duplicate for update:', checkError)
    }

    if (existing) {
      return {
        error: `Jurusan dengan nama "${name}" sudah digunakan oleh data lain.`,
      }
    }

    // 2. Update record
    const { data, error } = await supabase
      .from('majors')
      .update({
        name,
        code,
        institution_level,
        is_active,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating major:', error)
      return { error: error.message || 'Gagal memperbarui jurusan.' }
    }

    revalidatePath('/master/jurusan')
    revalidatePath('/pengajuan')
    revalidatePath('/peserta')

    return { success: true, data }
  } catch (err) {
    console.error('Unexpected error in updateMajorAction:', err)
    return { error: 'Terjadi kesalahan sistem saat memperbarui jurusan.' }
  }
}

export async function deleteMajorAction(
  id: string
): Promise<MajorActionResponse> {
  try {
    if (!id) {
      return { error: 'ID jurusan tidak valid.' }
    }

    const supabase = await createClient()

    // 1. Cek referensi FK pada application_details dan participants
    const [
      { count: appDetailsCount, error: appDetailsError },
      { count: partCount, error: partError },
    ] = await Promise.all([
      supabase
        .from('application_details')
        .select('*', { count: 'exact', head: true })
        .eq('major_id', id),
      supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('major_id', id),
    ])

    if (appDetailsError) {
      console.error('Error checking application_details FK:', appDetailsError)
    }
    if (partError) {
      console.error('Error checking participants FK:', partError)
    }

    const totalRefs = (appDetailsCount || 0) + (partCount || 0)
    if (totalRefs > 0) {
      return {
        error:
          'Jurusan tidak dapat dihapus karena sudah digunakan pada data pengajuan atau peserta.',
      }
    }

    // 2. Hapus jika aman
    const { error: deleteError } = await supabase
      .from('majors')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting major:', deleteError)
      if (deleteError.code === '23503') {
        return {
          error:
            'Jurusan tidak dapat dihapus karena sudah digunakan pada data pengajuan atau peserta.',
        }
      }
      return { error: deleteError.message || 'Gagal menghapus jurusan.' }
    }

    revalidatePath('/master/jurusan')
    revalidatePath('/pengajuan')
    revalidatePath('/peserta')

    return { success: true }
  } catch (err) {
    console.error('Unexpected error in deleteMajorAction:', err)
    return { error: 'Terjadi kesalahan sistem saat menghapus jurusan.' }
  }
}
