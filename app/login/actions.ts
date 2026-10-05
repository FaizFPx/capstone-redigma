'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('Supabase login error details:', {
      message: error.message,
      status: error.status,
      code: error.code,
    })
    redirect('/login?error=invalid_credentials')
  }

  redirect('/dashboard')
}
