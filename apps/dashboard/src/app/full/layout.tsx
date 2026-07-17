import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function FullLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // Confirm user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const url = new URL('/login', process.env.NEXTAUTH_URL || 'http://localhost:3000')
    url.searchParams.set('next', '/full/dashboard')
    redirect(url.toString())
  }

  return <>{children}</>
}
