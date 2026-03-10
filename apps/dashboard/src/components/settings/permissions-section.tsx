'use client'

import { useState, useTransition } from 'react'
import type { WorkspaceMemberRole, UserPermissions } from '@/lib/types'
import { ROLE_RANK, DEFAULT_PERMISSIONS } from '@/lib/types'

export type MemberForPermissions = {
  user_id: string
  name: string
  email: string
  role: WorkspaceMemberRole
}

type PermissionKey = keyof UserPermissions

const PERMISSION_LABELS: { key: PermissionKey; label: string; description: string }[] = [
  { key: 'can_view_contacts',  label: 'View contacts',  description: 'Access the Contacts section' },
  { key: 'can_view_pipelines', label: 'View pipelines', description: 'Access Pipelines and deals' },
  { key: 'can_view_projects',  label: 'View projects',  description: 'Access the Projects section' },
  { key: 'can_view_dashboard', label: 'View dashboard', description: 'Access the main dashboard' },
  { key: 'can_allocate_leads', label: 'Allocate leads', description: 'Assign leads to team members' },
  { key: 'can_reassign_leads', label: 'Reassign leads', description: 'Move leads to different members' },
  { key: 'can_edit_deals',     label: 'Edit deals',     description: 'Create and edit pipeline deals' },
]

type PermMap = Record<string, UserPermissions>

function MemberPermissionRow({
  member,
  permissions,
  callerRole,
}: {
  member: MemberForPermissions
  permissions: UserPermissions
  callerRole: WorkspaceMemberRole
}) {
  const [perms, setPerms] = useState<UserPermissions>(permissions)
  const [saving, setSaving] = useState<PermissionKey | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function toggle(key: PermissionKey) {
    const next = { ...perms, [key]: !perms[key] }
    setPerms(next)
    setSaving(key)
    setError(null)
    try {
      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: member.user_id, [key]: next[key] }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok || data.error) {
        setPerms(perms) // revert
        setError(data.error ?? 'Save failed')
      }
    } catch {
      setPerms(perms)
      setError('Network error')
    } finally {
      setSaving(null)
    }
  }

  const ROLE_BADGE: Partial<Record<WorkspaceMemberRole, string>> = {
    admin:    'bg-brand-100 dark:bg-brand-400/10 text-brand-700 dark:text-brand-400',
    manager:  'bg-purple-100 dark:bg-purple-400/10 text-purple-700 dark:text-purple-400',
    employee: 'bg-green-100 dark:bg-green-400/10 text-green-700 dark:text-green-400',
    member:   'bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400',
    viewer:   'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-500',
  }

  return (
    <div className="border-b dark:border-white/10 last:border-b-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-6 py-3.5 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/8 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-400 shrink-0">
          {(member.name || member.email)[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{member.name || member.email}</p>
          {member.name && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{member.email}</p>}
        </div>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0 ${ROLE_BADGE[member.role] ?? ''}`}>
          {member.role}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-6 pb-4 bg-gray-50 dark:bg-white/2">
          {error && (
            <p className="text-xs text-red-500 dark:text-red-400 mb-3">{error}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3">
            {PERMISSION_LABELS.map(({ key, label, description }) => (
              <label
                key={key}
                className="flex items-start gap-3 p-3 bg-white dark:bg-[#2a2a2a] rounded-lg border dark:border-white/10 cursor-pointer hover:border-brand-300 dark:hover:border-brand-400/30 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={perms[key]}
                  disabled={saving === key}
                  onChange={() => toggle(key)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-white/20 dark:bg-white/5"
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{label}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function PermissionsSection({
  members,
  callerRole,
  initialPermissions,
}: {
  members: MemberForPermissions[]
  callerRole: WorkspaceMemberRole
  initialPermissions: Record<string, Partial<UserPermissions>>
}) {
  // Only show members below the caller's rank
  const manageable = members.filter(
    (m) => (ROLE_RANK[m.role] ?? 0) < (ROLE_RANK[callerRole] ?? 0)
  )

  if (manageable.length === 0) return null

  // Build full permissions for each member (with defaults for missing keys)
  const permMap: PermMap = {}
  for (const m of manageable) {
    permMap[m.user_id] = { ...DEFAULT_PERMISSIONS, ...(initialPermissions[m.user_id] ?? {}) }
  }

  return (
    <div className="divide-y dark:divide-white/10">
      {manageable.map((m) => (
        <MemberPermissionRow
          key={m.user_id}
          member={m}
          permissions={permMap[m.user_id]}
          callerRole={callerRole}
        />
      ))}
    </div>
  )
}
