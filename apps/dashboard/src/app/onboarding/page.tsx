import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { saveProfile } from '@/app/actions/profile'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Welcome to Appalix' }

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Already completed onboarding — skip ahead
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <p className="text-2xl font-bold text-gray-900">Appalix</p>
          <p className="text-sm text-gray-500 mt-1">Let&apos;s set up your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Tell us about yourself</h1>
          <p className="text-sm text-gray-500 mb-6">This takes 10 seconds. We&apos;ll never share your details.</p>

          <form action={saveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                  First name <span className="text-red-500">*</span>
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  required
                  autoFocus
                  placeholder="Jane"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Last name
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  placeholder="Smith"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                Company name
              </label>
              <input
                id="company"
                name="company"
                type="text"
                placeholder="Acme Inc."
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Continue to dashboard →
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Your 7-day free trial has started. No credit card required.
        </p>
      </div>
    </div>
  )
}
