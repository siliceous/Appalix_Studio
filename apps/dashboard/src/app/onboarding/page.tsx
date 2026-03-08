import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingForm from './onboarding-form'
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8">
          <p className="text-2xl font-bold text-gray-900">Appalix</p>
          <p className="text-sm text-gray-500 mt-1">Let&apos;s set up your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Tell us about your business</h1>
          <p className="text-sm text-gray-500 mb-6">
            This helps Sage AI understand what you sell so it can prioritise your leads and emails correctly.
          </p>

          <OnboardingForm />
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Your 7-day free trial has started. No credit card required.
        </p>
      </div>
    </div>
  )
}
