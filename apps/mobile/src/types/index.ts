export type WorkspaceRole = 'owner' | 'admin' | 'manager' | 'employee' | 'viewer';

export const ROLE_RANK: Record<WorkspaceRole, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  employee: 2,
  viewer: 1,
};

export interface User {
  id: string;
  email: string;
  role: WorkspaceRole;
  workspaceId: string;
  name?: string;
}

export type SageTicketStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';

export type SageTicketPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface FeedItem {
  id: string;
  type: 'form' | 'bot' | 'email' | 'ticket';
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  company?: string;
  summary?: string;
  priority: SageTicketPriority;
  createdAt: string;
  source?: string;
  actionedAt?: string;
}

export interface SageTicket {
  id: string;
  title: string;
  name?: string;
  email?: string;
  phone?: string;
  status: SageTicketStatus;
  priority: SageTicketPriority;
  description?: string;
  createdAt: string;
  updatedAt: string;
  contactId?: string;
  ownerId?: string;
}

export interface SageDeal {
  id: string;
  title: string;
  value?: number;
  currency: string;
  status: 'open' | 'won' | 'lost';
  priority?: SageTicketPriority;
  stageId?: string;
  pipelineId?: string;
  contactId?: string;
  companyId?: string;
  ownerId?: string;
  companyName?: string;
  closeDate?: string;
  description?: string;
  winPercentage?: number;
  lostReason?: string;
  wonAt?: string;
  lostAt?: string;
  // joined
  stageName?: string;
  stageColor?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SageContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  ownerId?: string;
  createdAt: string;
}

export interface SagePipeline {
  id: string;
  name: string;
}

export interface SageDealStage {
  id: string;
  name: string;
  color: string;
  pipelineId: string;
  position: number;
}

export interface SageDealActivity {
  id: string;
  type: 'note' | 'call' | 'meeting' | 'task';
  title: string | null;
  body: string | null;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface WorkspaceMember {
  userId: string;
  name: string;
  email: string;
  role: WorkspaceRole;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  deepLink?: string;
  read: boolean;
  createdAt: string;
}
