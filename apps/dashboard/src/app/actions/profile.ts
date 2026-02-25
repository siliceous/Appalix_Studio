'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function saveProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const firstName = (formData.get('first_name') as string | null)?.trim()
  const lastName  = (formData.get('last_name')  as string | null)?.trim() || null
  const company   = (formData.get('company')    as string | null)?.trim() || null

  if (!firstName) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('user_profiles').upsert({
    user_id:    user.id,
    first_name: firstName,
    last_name:  lastName,
    company,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  redirect('/dashboard')
}
