import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { saveUserName } from '@/app/actions/user-profile'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Edit Profile' }

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRaw } = await supabase
    .from('user_profiles')
    .select('first_name, last_name')
    .eq('user_id', user.id)
    .maybeSingle()
  type ProfileRow = { first_name: string; last_name: string | null }
  const profile = profileRaw as ProfileRow | null

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Header title="Edit Profile" description="Update your display name" />

      <section className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10">
        <form action={saveUserName} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              First name
            </label>
            <input
              name="first_name"
              type="text"
              defaultValue={profile?.first_name ?? ''}
              required
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-[#1c1c1c] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#61c2ad]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Last name
            </label>
            <input
              name="last_name"
              type="text"
              defaultValue={profile?.last_name ?? ''}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-[#1c1c1c] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#61c2ad]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={user.email ?? ''}
              disabled
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500 cursor-not-allowed"
            />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Save changes
            </button>
            <a
              href="/settings"
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </a>
          </div>
        </form>
      </section>
    </div>
  )
}
