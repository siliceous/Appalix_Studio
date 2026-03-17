import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { ProfileForm } from './profile-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Edit Profile' }

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRaw } = await supabase
    .from('user_profiles')
    .select('first_name, last_name, avatar_url')
    .eq('user_id', user.id)
    .maybeSingle()
  type ProfileRow = { first_name: string; last_name: string | null; avatar_url: string | null }
  const profile = profileRaw as ProfileRow | null

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Header title="Edit Profile" description="Update your name and profile photo" />
      <ProfileForm
        firstName={profile?.first_name ?? ''}
        lastName={profile?.last_name ?? ''}
        email={user.email ?? ''}
        avatarUrl={profile?.avatar_url ?? null}
      />
    </div>
  )
}
