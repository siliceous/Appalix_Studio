import { useAuthStore } from '@/stores/auth';
import { ROLE_RANK, type WorkspaceRole } from '@/types';

export function useRole() {
  const user = useAuthStore((s) => s.user);
  const role: WorkspaceRole = user?.role ?? 'viewer';
  const rank = ROLE_RANK[role];

  return {
    role,
    rank,
    isOwner: role === 'owner',
    isAdmin: role === 'admin' || role === 'owner',
    isManager: rank >= ROLE_RANK.manager,
    isEmployee: rank >= ROLE_RANK.employee,
    // manager+ can assign tickets/deals to team members
    canAssign: rank >= ROLE_RANK.manager,
    // manager+ can see full team feed
    canViewTeam: rank >= ROLE_RANK.manager,
  };
}
