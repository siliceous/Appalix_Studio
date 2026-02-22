'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Provider } from '@supabase/supabase-js'

const SOCIAL_PROVIDERS: {
  provider: Provider
  label: string
  icon: React.ReactNode
  bg: string
  text: string
  border: string
}[] = [
  {
    provider: 'google',
    label: 'Continue with Google',
    bg: 'bg-white hover:bg-gray-50',
    text: 'text-gray-700',
    border: 'border border-gray-300',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5">
        <path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
        <path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.615 24 12.255 24z"/>
        <path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"/>
        <path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.64 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
      </svg>
    ),
  },
  {
    provider: 'azure',
    label: 'Continue with Microsoft',
    bg: 'bg-white hover:bg-gray-50',
    text: 'text-gray-700',
    border: 'border border-gray-300',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5">
        <path fill="#f25022" d="M1 1h10v10H1z"/>
        <path fill="#00a4ef" d="M13 1h10v10H13z"/>
        <path fill="#7fba00" d="M1 13h10v10H1z"/>
        <path fill="#ffb900" d="M13 13h10v10H13z"/>
      </svg>
    ),
  },
  {
    provider: 'facebook',
    label: 'Continue with Facebook',
    bg: 'bg-[#1877F2] hover:bg-[#166FE5]',
    text: 'text-white',
    border: 'border border-[#1877F2]',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    provider: 'discord',
    label: 'Continue with Discord',
    bg: 'bg-[#5865F2] hover:bg-[#4752C4]',
    text: 'text-white',
    border: 'border border-[#5865F2]',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
        <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
      </svg>
    ),
  },
]

export default function LoginPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const supabase = createClient()

  async function handleSocial(provider: Provider) {
    setLoading(provider)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/api/auth/callback` },
    })
    if (error) setError(error.message)
    setLoading(null)
  }

  async function handleEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading('email')
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/api/auth/callback` },
    })
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(null)
  }

  if (sent) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h2>
        <p className="text-sm text-gray-500">
          We sent a magic link to <strong>{email}</strong>. Click the link to sign in.
        </p>
        <button
          onClick={() => setSent(false)}
          className="mt-6 text-sm text-brand-600 hover:underline"
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Sign in</h1>
      <p className="text-sm text-gray-500 mb-6">Choose how you'd like to continue.</p>

      {/* Magic link form */}
      <form onSubmit={handleEmail} className="space-y-3 mb-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading !== null}
          className="w-full py-2 px-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading === 'email' ? 'Sending…' : 'Send magic link'}
        </button>
      </form>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3 bg-white text-gray-400">or continue with</span>
        </div>
      </div>

      {/* Social buttons — stacked vertically */}
      <div className="flex flex-col gap-3">
        {SOCIAL_PROVIDERS.map(({ provider, label, icon, bg, text, border }) => (
          <button
            key={provider}
            onClick={() => handleSocial(provider)}
            disabled={loading !== null}
            className={`flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${bg} ${text} ${border}`}
          >
            {icon}
            {loading === provider ? '…' : label}
          </button>
        ))}
      </div>
    </div>
  )
}
