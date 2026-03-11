import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Connect your email — Appalix' }

export default async function OnboardingConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string; hint?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { provider, hint } = await searchParams

  const stateParam  = 'state=onboarding'
  const hintParam   = hint ? `&hint=${encodeURIComponent(hint)}` : ''
  const gmailUrl    = `/api/oauth/google?${stateParam}${hintParam}`
  const outlookUrl  = `/api/oauth/microsoft?${stateParam}${hintParam}`

  // Pre-select based on provider chosen during onboarding form
  const isOutlook = provider === 'microsoft'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <p className="text-2xl font-bold text-gray-900">Appalix</p>
          <p className="text-sm text-gray-500 mt-1">One last step</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Connect your inbox</h1>
          <p className="text-sm text-gray-500 mb-2">
            Sage AI reads your emails to surface leads and prioritise replies.
          </p>
          {hint && (
            <p className="text-xs text-brand-600 font-medium mb-6 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
              {hint}
            </p>
          )}
          {!hint && <div className="mb-6" />}

          <div className="flex flex-col gap-3">
            {/* Primary button based on chosen provider */}
            {!isOutlook ? (
              <>
                <a
                  href={gmailUrl}
                  className="flex items-center justify-center gap-2.5 w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.908 1.528-1.147C21.69 2.28 24 3.434 24 5.457z"/>
                  </svg>
                  Connect Gmail
                </a>
                <a
                  href={outlookUrl}
                  className="flex items-center justify-center gap-2.5 w-full py-3 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl border transition-colors"
                >
                  <svg className="w-4 h-4 text-[#0078d4]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.33.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.5V2.55q0-.44.3-.75.3-.3.75-.3h12.9q.44 0 .75.3.3.3.3.75V10.5q0 .45-.3.75-.3.3-.75.3h-2.8v.45z"/>
                  </svg>
                  Connect Outlook instead
                </a>
              </>
            ) : (
              <>
                <a
                  href={outlookUrl}
                  className="flex items-center justify-center gap-2.5 w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.33.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.5V2.55q0-.44.3-.75.3-.3.75-.3h12.9q.44 0 .75.3.3.3.3.75V10.5q0 .45-.3.75-.3.3-.75.3h-2.8v.45z"/>
                  </svg>
                  Connect Outlook
                </a>
                <a
                  href={gmailUrl}
                  className="flex items-center justify-center gap-2.5 w-full py-3 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl border transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.908 1.528-1.147C21.69 2.28 24 3.434 24 5.457z"/>
                  </svg>
                  Connect Gmail instead
                </a>
              </>
            )}
          </div>

          <div className="mt-4 text-center">
            <a href="/dashboard" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Skip for now
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          You can always connect your email later from Settings.
        </p>
      </div>
    </div>
  )
}
