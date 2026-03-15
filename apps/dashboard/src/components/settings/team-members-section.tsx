'use client'

import { useTransition } from 'react'
import { removeMember, updateMemberRole } from '@/app/actions/workspace'
import type { WorkspaceMemberRole } from '@/lib/types'
import { ROLE_RANK, INVITE_ALLOWED } from '@/lib/types'

export type MemberDisplay = {
  id: string
  user_id: string
  role: WorkspaceMemberRole
  email: string
  name: string
  accepted_at: string | null
  invited_at: string | null
  invited_by: string | null
  isCurrentUser: boolean
}

type Props = {
  members: MemberDisplay[]
  callerRole: WorkspaceMemberRole
  callerUserId: string
  seatLimit: number | null
  extraSeats: number
  workspaceId: string
}

const ROLE_BADGE: Record<WorkspaceMemberRole, string> = {
  owner:    'bg-amber-100 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400',
  admin:    'bg-brand-100 dark:bg-brand-400/10 text-brand-700 dark:text-brand-400',
  manager:  'bg-purple-100 dark:bg-purple-400/10 text-purple-700 dark:text-purple-400',
  employee: 'bg-green-100 dark:bg-green-400/10 text-green-700 dark:text-green-400',
  member:   'bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400',
  viewer:   'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-500',
}

function Avatar({ name, role }: { name: string; role: WorkspaceMemberRole }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const bg: Record<WorkspaceMemberRole, string> = {
    owner:    'bg-amber-100 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400',
    admin:    'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300',
    manager:  'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    employee: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    member:   'bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400',
    viewer:   'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-500',
  }

  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${bg[role]}`}>
      {initials || role[0].toUpperCase()}
    </div>
  )
}

function MemberRow({
  member,
  callerRole,
  onRemoved,
}: {
  member: MemberDisplay
  callerRole: WorkspaceMemberRole
  onRemoved: (id: string) => void
}) {
  const [isPending, startTransition] = useTransition()

  // Can remove if caller outranks target and target is not owner
  const canRemove =
    !member.isCurrentUser &&
    member.role !== 'owner' &&
    ROLE_RANK[callerRole] > ROLE_RANK[member.role]

  // Can change role if caller outranks target; available roles are what caller can invite
  const canChangeRole =
    !member.isCurrentUser &&
    member.role !== 'owner' &&
    ROLE_RANK[callerRole] > ROLE_RANK[member.role] &&
    (INVITE_ALLOWED[callerRole] ?? []).length > 0

  const ROLES = INVITE_ALLOWED[callerRole] ?? []

  function handleRemove() {
    startTransition(async () => {
      const res = await removeMember(member.id)
      if (res.success) onRemoved(member.id)
      else alert(res.error)
    })
  }

  function handleRoleChange(newRole: WorkspaceMemberRole) {
    startTransition(async () => {
      const res = await updateMemberRole(member.id, newRole)
      if (!res.success) alert(res.error)
    })
  }

  return (
    <div className={`flex items-center gap-3 px-6 py-3.5 transition-opacity ${isPending ? 'opacity-50' : ''}`}>
      <Avatar name={member.name || member.email} role={member.role} />

      <div className="flex-1 min-w-0">
        {member.name && (
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{member.name}</p>
        )}
        <p className={`truncate ${member.name ? 'text-xs text-gray-400 dark:text-gray-500' : 'text-sm text-gray-700 dark:text-gray-300'}`}>
          {member.email}
        </p>
        <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-0.5">
          {member.accepted_at
            ? `Joined ${new Date(member.accepted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
            : 'Invitation pending'}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {canChangeRole ? (
          <select
            defaultValue={member.role}
            onChange={(e) => handleRoleChange(e.target.value as WorkspaceMemberRole)}
            className="text-xs border dark:border-white/10 rounded-lg px-2 py-1 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
        ) : (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_BADGE[member.role]}`}>
            {member.role}
          </span>
        )}

        {canRemove && (
          <button
            onClick={handleRemove}
            disabled={isPending}
            className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 rounded"
            title="Remove member"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

const ROLE_ORDER: WorkspaceMemberRole[] = ['owner', 'admin', 'manager', 'employee', 'member', 'viewer']
const ROLE_LABEL: Partial<Record<WorkspaceMemberRole, string>> = {
  owner: 'Owner', admin: 'Admins', manager: 'Managers', employee: 'Employees', member: 'Members', viewer: 'Viewers',
}

export function TeamMembersSection({ members: initialMembers, callerRole, callerUserId: _callerUserId, seatLimit, extraSeats }: Props) {
  const [members, setMembers] = React.useState(initialMembers)

  const totalSeats = seatLimit !== null ? seatLimit + extraSeats : null
  const usedSeats  = members.length
  const pct        = totalSeats ? Math.min(100, Math.round((usedSeats / totalSeats) * 100)) : 0
  const barColour  = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-[#15A4AE]'

  function handleRemoved(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }

  // Build user_id → name map for "Reports to" labels
  const nameMap: Record<string, string> = {}
  for (const m of members) nameMap[m.user_id] = m.name || m.email

  // Group members by role in hierarchy order
  const grouped = ROLE_ORDER.reduce<Record<string, MemberDisplay[]>>((acc, r) => {
    const group = members.filter((m) => m.role === r)
    if (group.length) acc[r] = group
    return acc
  }, {})

  return (
    <>
      {/* Seat usage bar */}
      {totalSeats !== null && (
        <div className="px-6 pb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-gray-400 dark:text-gray-500">Seats used</span>
            <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">{usedSeats} / {totalSeats}</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/8 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColour}`} style={{ width: `${pct}%` }} />
          </div>
          {usedSeats >= totalSeats && (
            <p className="text-[11px] text-red-500 dark:text-red-400 mt-1">
              Seat limit reached.{' '}
              <a href="/settings/upgrade" className="underline hover:no-underline">Upgrade or add extra seats</a>
              {' '}to invite more members.
            </p>
          )}
        </div>
      )}

      {/* Hierarchy groups */}
      {ROLE_ORDER.filter((r) => grouped[r]).map((r) => (
        <div key={r}>
          {r !== 'owner' && (
            <div className="px-6 py-2 bg-gray-50 dark:bg-white/3 border-t dark:border-white/10">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {ROLE_LABEL[r]}
              </span>
            </div>
          )}
          <div className="divide-y dark:divide-white/10">
            {grouped[r].map((m) => {
              const reportsTo = m.invited_by ? nameMap[m.invited_by] : null
              return (
                <div key={m.id} className={r !== 'owner' && r !== 'admin' ? 'pl-4' : ''}>
                  {reportsTo && m.role !== 'owner' && (
                    <p className="px-6 pt-2 text-[10px] text-gray-400 dark:text-gray-600">
                      Reports to: <span className="font-medium">{reportsTo}</span>
                    </p>
                  )}
                  <MemberRow member={m} callerRole={callerRole} onRemoved={handleRemoved} />
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )
}

// React needs to be imported for useState
import React from 'react'
