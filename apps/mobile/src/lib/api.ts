import { API_URL } from '@/constants/config';
import { supabase } from '@/lib/supabase';
import type {
  FeedItem,
  SageContact,
  SageDeal,
  SageDealStage,
  SagePipeline,
  SageTicket,
  SageTicketPriority,
  SageTicketStatus,
  WorkspaceMember,
  Notification,
} from '@/types';

// ---------------------------------------------------------------------------
// Core HTTP helpers
// ---------------------------------------------------------------------------

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function get<T>(path: string): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, { method: 'GET', headers });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`GET ${path} failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`POST ${path} failed (${res.status}): ${text}`);
  }
  // Some endpoints return 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`PATCH ${path} failed (${res.status}): ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function del<T>(path: string): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, { method: 'DELETE', headers });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`DELETE ${path} failed (${res.status}): ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------

export function fetchFeed(
  workspaceId: string,
  role: string,
  userId: string,
): Promise<FeedItem[]> {
  return get<FeedItem[]>(
    `/api/feed?workspaceId=${workspaceId}&role=${role}&userId=${userId}`,
  );
}

export function fetchFeedItem(id: string): Promise<FeedItem> {
  return get<FeedItem>(`/api/feed/${id}`);
}

export function actionFeedItem(
  id: string,
  actionType: 'reply' | 'assign' | 'ignore' | 'create_deal' | 'create_ticket',
): Promise<void> {
  return post<void>(`/api/feed/${id}/action`, { actionType });
}

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

export function fetchTickets(
  workspaceId: string,
  status?: SageTicketStatus,
  ownerId?: string,
): Promise<SageTicket[]> {
  const params = new URLSearchParams({ workspaceId });
  if (status) params.set('status', status);
  if (ownerId) params.set('ownerId', ownerId);
  return get<SageTicket[]>(`/api/sage/tickets?${params.toString()}`);
}

export function fetchTicket(id: string): Promise<SageTicket> {
  return get<SageTicket>(`/api/sage/tickets/${id}`);
}

export function updateTicketStatus(
  id: string,
  status: SageTicketStatus,
): Promise<SageTicket> {
  return patch<SageTicket>(`/api/sage/tickets/${id}`, { status });
}

export function assignTicket(id: string, ownerId: string): Promise<SageTicket> {
  return patch<SageTicket>(`/api/sage/tickets/${id}`, { ownerId });
}

// ---------------------------------------------------------------------------
// Deals
// ---------------------------------------------------------------------------

export function fetchDeals(
  workspaceId: string,
  pipelineId?: string,
  stageId?: string,
): Promise<SageDeal[]> {
  const params = new URLSearchParams({ workspaceId });
  if (pipelineId) params.set('pipelineId', pipelineId);
  if (stageId) params.set('stageId', stageId);
  return get<SageDeal[]>(`/api/sage/deals?${params.toString()}`);
}

export function fetchDeal(id: string): Promise<SageDeal> {
  return get<SageDeal>(`/api/sage/deals/${id}`);
}

export function moveDealStage(dealId: string, stageId: string): Promise<SageDeal> {
  return patch<SageDeal>(`/api/sage/deals/${dealId}`, { stageId });
}

export function assignDeal(dealId: string, ownerId: string): Promise<SageDeal> {
  return patch<SageDeal>(`/api/sage/deals/${dealId}`, { ownerId });
}

// ---------------------------------------------------------------------------
// Pipelines & Stages
// ---------------------------------------------------------------------------

export function fetchPipelines(workspaceId: string): Promise<SagePipeline[]> {
  return get<SagePipeline[]>(`/api/sage/pipelines?workspaceId=${workspaceId}`);
}

export function fetchDealStages(pipelineId: string): Promise<SageDealStage[]> {
  return get<SageDealStage[]>(`/api/sage/pipelines/${pipelineId}/stages`);
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export function fetchContacts(workspaceId: string): Promise<SageContact[]> {
  return get<SageContact[]>(`/api/sage/contacts?workspaceId=${workspaceId}`);
}

export function fetchContact(id: string): Promise<SageContact> {
  return get<SageContact>(`/api/sage/contacts/${id}`);
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export function fetchNotifications(userId: string): Promise<Notification[]> {
  return get<Notification[]>(`/api/notifications?userId=${userId}`);
}

export function markNotificationRead(id: string): Promise<void> {
  return patch<void>(`/api/notifications/${id}/read`, {});
}

export function markAllNotificationsRead(userId: string): Promise<void> {
  return post<void>(`/api/notifications/read-all`, { userId });
}

// ---------------------------------------------------------------------------
// Workspace Members
// ---------------------------------------------------------------------------

export function fetchWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  return get<WorkspaceMember[]>(
    `/api/workspace/${workspaceId}/members`,
  );
}

// ---------------------------------------------------------------------------
// Home Dashboard
// ---------------------------------------------------------------------------

export interface HomeDashboardData {
  newLeadsToday: number;
  openTickets: number;
  activeDeals: number;
  unreadConversations: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
}

export function fetchHomeDashboard(
  workspaceId: string,
  userId: string,
  role: string,
): Promise<HomeDashboardData> {
  return get<HomeDashboardData>(
    `/api/dashboard/home?workspaceId=${workspaceId}&userId=${userId}&role=${role}`,
  );
}

// ---------------------------------------------------------------------------
// Push Tokens
// ---------------------------------------------------------------------------

export function registerPushToken(userId: string, token: string): Promise<void> {
  return post<void>(`/api/notifications/push-token`, { userId, token });
}

// ---------------------------------------------------------------------------
// Priority helpers (used by mutations)
// ---------------------------------------------------------------------------

export function updateDealStatus(
  id: string,
  status: 'open' | 'won' | 'lost',
): Promise<SageDeal> {
  return patch<SageDeal>(`/api/sage/deals/${id}`, { status });
}

export function updateDealPriority(
  id: string,
  priority: SageTicketPriority,
): Promise<SageDeal> {
  return patch<SageDeal>(`/api/sage/deals/${id}`, { priority });
}
