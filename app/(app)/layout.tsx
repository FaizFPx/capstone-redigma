import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Ambil user yang sedang aktif secara aman dari server Supabase
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Default fallback profil user
  let userName =
    (user.user_metadata?.full_name as string) ||
    user.email?.split('@')[0] ||
    'Pengguna'
  let userRole = 'hc_staff'

  try {
    // Ambil data user dari tabel public.users
    const { data: profile } = await supabase
      .from('users')
      .select('full_name, role')
      .or(`id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle()

    if (profile) {
      if (profile.full_name) userName = profile.full_name
      if (profile.role) userRole = profile.role
    }
  } catch (err) {
    console.error('Error fetching user profile in layout:', err)
  }

  return (
    <AppShell userName={userName} userRole={userRole}>
      {children}
    </AppShell>
  )
}
