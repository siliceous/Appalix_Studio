'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Header } from '@/components/layout/header'
import type { WorkspaceMemberRole } from '@/lib/types'

const ROLE_LABELS: Partial<Record<WorkspaceMemberRole, string>> = {
  admin:    'Admin — can manage integrations and invite managers/employees',
  manager:  'Manager — can manage employees and view their dashboards',
  employee: 'Employee — works leads assigned to them',
}

export function InviteForm({
  callerRole,
  invitableRoles,
}: {
  callerRole: WorkspaceMemberRole
  invitableRoles: WorkspaceMemberRole[]
}) {
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)

    const form  = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim().toLowerCase()
    const role  = (form.elements.namedItem('role')  as HTMLSelectElement).value

    try {
      const res  = await fetch('/api/invite', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, role }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok || data.error) {
        setError(data.error ?? 'Something went wrong.')
      } else {
        setSuccess(true)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <a href="/settings" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          Settings
        </a>
        <span className="text-gray-400 dark:text-gray-600">/</span>
        <span className="text-sm text-gray-900 dark:text-gray-100">Invite member</span>
      </div>

      <Header
        title="Invite a team member"
        description="They'll receive an email with a link to join your workspace."
      />

      <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-6">
        {success ? (
          <div className="text-center py-4">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-[#15A4AE]/10 flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-green-600 dark:text-[#15A4AE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Invitation sent!</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
              They'll receive an email with a link to join your workspace.
            </p>
            <div className="flex justify-center gap-3">
              <a
                href="/settings"
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Back to settings
              </a>
              <button
                onClick={() => setSuccess(false)}
                className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
              >
                Invite another
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="colleague@company.com"
                className="w-full px-3 py-2.5 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Role
              </label>
              <select
                id="role"
                name="role"
                defaultValue={invitableRoles[0]}
                className="w-full px-3 py-2.5 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400"
              >
                {invitableRoles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r] ?? `${r.charAt(0).toUpperCase()}${r.slice(1)}`}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                As a <span className="capitalize">{callerRole}</span> you can invite: {invitableRoles.join(', ')}.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <a
                href="/settings"
                className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 border dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </a>
              <button
                type="submit"
                disabled={pending}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:bg-brand-400 transition-colors"
              >
                {pending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending invite…
                  </>
                ) : 'Send invite'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
