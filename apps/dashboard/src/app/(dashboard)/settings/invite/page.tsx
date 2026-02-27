'use client'

import { useActionState } from 'react'
import { inviteWorkspaceMember } from '@/app/actions/workspace'
import { Header } from '@/components/layout/header'

const initialState = { error: undefined, success: false }

export default function InvitePage() {
  const [state, formAction, isPending] = useActionState(inviteWorkspaceMember, initialState)

  return (
    <div className="max-w-lg space-y-6">
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

      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border dark:border-white/10 p-6">
        {state.success ? (
          <div className="text-center py-4">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-[#61c2ad]/10 flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-green-600 dark:text-[#61c2ad]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
              >
                Invite another
              </button>
            </div>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            {state.error && (
              <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                {state.error}
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
                defaultValue="member"
                className="w-full px-3 py-2.5 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400"
              >
                <option value="member">Member — can view and use all features</option>
                <option value="admin">Admin — can manage integrations and invite members</option>
                <option value="viewer">Viewer — read-only access</option>
              </select>
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
                disabled={isPending}
                className="flex-1 px-4 py-2.5 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:bg-brand-400 transition-colors"
              >
                {isPending ? 'Sending invite…' : 'Send invite'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
