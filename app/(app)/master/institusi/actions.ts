'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { InstitutionActionResponse } from './types'

export async function createInstitutionAction(
  formData: FormData
): Promise<InstitutionActionResponse> {
  try {
    const name = String(formData.get('name') ?? '').trim()
    const type = String(formData.get('type') ?? '').trim()
    const address = String(formData.get('address') ?? '').trim() || null
    const contact_email = String(formData.get('contact_email') ?? '').trim() || null
    const contact_phone = String(formData.get('contact_phone') ?? '').trim() || null

    if (!name || name.length < 2) {
      return { error: 'Nama institusi wajib diisi minimal 2 karakter.' }
    }

    if (!type) {
      return { error: 'Jenis / tipe institusi wajib dipilih.' }
    }

    const supabase = await createClient()

    // 1. Cek duplikasi nama institusi (case-insensitive & trimmed)
    const normalizedName = name.trim()
    const { data: existingList, error: checkError } = await supabase
      .from('institutions')
      .select('id, name')
      .ilike('name', normalizedName)
      .limit(1)

    if (checkError) {
      console.error('Error checking institution duplicate:', checkError)
    }

    if (existingList && existingList.length > 0) {
      return {
        error: `Institusi dengan nama "${normalizedName}" sudah terdaftar. Gunakan nama yang berbeda.`,
      }
    }

    // 2. Insert record baru
    const { data, error } = await supabase
      .from('institutions')
      .insert({
        name,
        type,
        address,
        contact_email,
        contact_phone,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating institution:', error)
      return { error: error.message || 'Gagal menambahkan institusi.' }
    }

    revalidatePath('/master/institusi')
    revalidatePath('/pengajuan')
    revalidatePath('/monitoring')

    return { success: true, data }
  } catch (err) {
    console.error('Unexpected error in createInstitutionAction:', err)
    return { error: 'Terjadi kesalahan sistem saat menyimpan institusi.' }
  }
}

export async function updateInstitutionAction(
  id: string,
  formData: FormData
): Promise<InstitutionActionResponse> {
  try {
    if (!id) {
      return { error: 'ID institusi tidak valid.' }
    }

    const name = String(formData.get('name') ?? '').trim()
    const type = String(formData.get('type') ?? '').trim()
    const address = String(formData.get('address') ?? '').trim() || null
    const contact_email = String(formData.get('contact_email') ?? '').trim() || null
    const contact_phone = String(formData.get('contact_phone') ?? '').trim() || null

    if (!name || name.length < 2) {
      return { error: 'Nama institusi wajib diisi minimal 2 karakter.' }
    }

    if (!type) {
      return { error: 'Jenis / tipe institusi wajib dipilih.' }
    }

    const supabase = await createClient()

    // 1. Cek duplikasi nama institusi pada record lain (case-insensitive & trimmed)
    const normalizedName = name.trim()
    const { data: existingList, error: checkError } = await supabase
      .from('institutions')
      .select('id, name')
      .ilike('name', normalizedName)
      .neq('id', id)
      .limit(1)

    if (checkError) {
      console.error('Error checking duplicate for update:', checkError)
    }

    if (existingList && existingList.length > 0) {
      return {
        error: `Institusi dengan nama "${normalizedName}" sudah digunakan oleh institusi lain.`,
      }
    }

    // 2. Update record
    const { data, error } = await supabase
      .from('institutions')
      .update({
        name,
        type,
        address,
        contact_email,
        contact_phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating institution:', error)
      return { error: error.message || 'Gagal memperbarui institusi.' }
    }

    revalidatePath('/master/institusi')
    revalidatePath('/pengajuan')
    revalidatePath('/monitoring')

    return { success: true, data }
  } catch (err) {
    console.error('Unexpected error in updateInstitutionAction:', err)
    return { error: 'Terjadi kesalahan sistem saat memperbarui institusi.' }
  }
}

export async function deleteInstitutionAction(
  id: string
): Promise<InstitutionActionResponse> {
  try {
    if (!id) {
      return { error: 'ID institusi tidak valid.' }
    }

    const supabase = await createClient()

    // 1. Foreign Key dependency check: Apakah ada pengajuan yang mereferensikan institusi ini?
    const { count, error: countError } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('institution_id', id)

    if (countError) {
      console.error('Error checking application FK constraint:', countError)
    }

    if (count && count > 0) {
      return {
        error:
          'Institusi tidak dapat dihapus karena sudah digunakan pada data pengajuan.',
      }
    }

    // 2. Lakukan delete jika aman
    const { error: deleteError } = await supabase
      .from('institutions')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting institution:', deleteError)
      if (deleteError.code === '23503') {
        return {
          error:
            'Institusi tidak dapat dihapus karena sedang direferensikan oleh data pengajuan.',
        }
      }
      return { error: deleteError.message || 'Gagal menghapus institusi.' }
    }

    revalidatePath('/master/institusi')
    revalidatePath('/pengajuan')
    revalidatePath('/monitoring')

    return { success: true }
  } catch (err) {
    console.error('Unexpected error in deleteInstitutionAction:', err)
    return { error: 'Terjadi kesalahan sistem saat menghapus institusi.' }
  }
}
