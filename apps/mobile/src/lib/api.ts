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

export async function fetchFeedItems(
  workspaceId: string,
  userId: string,
  role: string,
  category: 'email' | 'bot' | 'form' | 'ticket' | null,
  dateFrom: string,
  limit = 20,
): Promise<FeedItem[]> {
  const isWorkspaceWide = role === 'owner' || role === 'admin';

  if (category === 'email' || category === null) {
    let q = supabase
      .from('sage_emails')
      .select('id, from_name, from_address, subject, ai_summary, ai_priority, received_at')
      .eq('workspace_id', workspaceId)
      .eq('direction', 'inbound')
      .eq('is_read', false)
      .eq('is_trashed', false)
      .gte('received_at', dateFrom)
      .order('received_at', { ascending: false })
      .limit(limit);
    if (!isWorkspaceWide) q = q.eq('user_id', userId);
    const { data } = await q;
    const emails: FeedItem[] = (data ?? []).map((r: any) => ({
      id: r.id,
      type: 'email' as const,
      contactName: r.from_name,
      contactEmail: r.from_address,
      summary: r.ai_summary ?? r.subject,
      priority: r.ai_priority ?? 'low',
      createdAt: r.received_at,
    }));
    if (category === 'email') return emails;
    if (category === null) {
      // fetch all categories and merge below
    }
  }

  if (category === 'bot') {
    let q = supabase
      .from('conversations')
      .select('id, title, ai_priority, ai_summary, last_activity_at, platform')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .gte('last_activity_at', dateFrom)
      .order('last_activity_at', { ascending: false })
      .limit(limit);
    if (!isWorkspaceWide) q = q.eq('assigned_to', userId);
    const { data } = await q;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      type: 'bot' as const,
      contactName: r.title,
      summary: r.ai_summary,
      priority: r.ai_priority ?? 'low',
      createdAt: r.last_activity_at,
      source: r.platform,
    }));
  }

  if (category === 'form') {
    let q = supabase
      .from('leads')
      .select('id, name, email, phone, company, lead_score, source_platform, created_at')
      .eq('workspace_id', workspaceId)
      .gte('created_at', dateFrom)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (!isWorkspaceWide) q = q.eq('assigned_to', userId);
    const { data } = await q;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      type: 'form' as const,
      contactName: r.name,
      contactEmail: r.email,
      contactPhone: r.phone,
      company: r.company,
      priority: r.lead_score ?? 'low',
      createdAt: r.created_at,
      source: r.source_platform,
    }));
  }

  if (category === 'ticket') {
    let q = supabase
      .from('sage_tickets')
      .select('id, title, priority, status, created_at, name, email')
      .eq('workspace_id', workspaceId)
      .in('status', ['open', 'pending', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(limit);
    if (!isWorkspaceWide) q = q.eq('owner_id', userId);
    const { data } = await q;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      type: 'ticket' as const,
      contactName: r.name,
      contactEmail: r.email,
      summary: r.title,
      priority: r.priority ?? 'low',
      createdAt: r.created_at,
    }));
  }

  // category === null: fetch all and merge
  const isWW = isWorkspaceWide;
  const [emailRes, botRes, formRes, ticketRes] = await Promise.all([
    (() => {
      let q = supabase.from('sage_emails').select('id, from_name, from_address, subject, ai_summary, ai_priority, received_at').eq('workspace_id', workspaceId).eq('direction', 'inbound').eq('is_read', false).eq('is_trashed', false).gte('received_at', dateFrom).order('received_at', { ascending: false }).limit(10);
      if (!isWW) q = q.eq('user_id', userId);
      return q;
    })(),
    (() => {
      let q = supabase.from('conversations').select('id, title, ai_priority, ai_summary, last_activity_at, platform').eq('workspace_id', workspaceId).eq('status', 'active').gte('last_activity_at', dateFrom).order('last_activity_at', { ascending: false }).limit(10);
      if (!isWW) q = q.eq('assigned_to', userId);
      return q;
    })(),
    (() => {
      let q = supabase.from('leads').select('id, name, email, phone, company, lead_score, source_platform, created_at').eq('workspace_id', workspaceId).gte('created_at', dateFrom).order('created_at', { ascending: false }).limit(10);
      if (!isWW) q = q.eq('assigned_to', userId);
      return q;
    })(),
    (() => {
      let q = supabase.from('sage_tickets').select('id, title, priority, status, created_at, name, email').eq('workspace_id', workspaceId).in('status', ['open', 'pending', 'in_progress']).order('created_at', { ascending: false }).limit(10);
      if (!isWW) q = q.eq('owner_id', userId);
      return q;
    })(),
  ]);

  const all: FeedItem[] = [
    ...(emailRes.data ?? []).map((r: any) => ({ id: r.id, type: 'email' as const, contactName: r.from_name, contactEmail: r.from_address, summary: r.ai_summary ?? r.subject, priority: r.ai_priority ?? 'low', createdAt: r.received_at })),
    ...(botRes.data ?? []).map((r: any) => ({ id: r.id, type: 'bot' as const, contactName: r.title, summary: r.ai_summary, priority: r.ai_priority ?? 'low', createdAt: r.last_activity_at, source: r.platform })),
    ...(formRes.data ?? []).map((r: any) => ({ id: r.id, type: 'form' as const, contactName: r.name, contactEmail: r.email, contactPhone: r.phone, company: r.company, priority: r.lead_score ?? 'low', createdAt: r.created_at, source: r.source_platform })),
    ...(ticketRes.data ?? []).map((r: any) => ({ id: r.id, type: 'ticket' as const, contactName: r.name, contactEmail: r.email, summary: r.title, priority: r.priority ?? 'low', createdAt: r.created_at })),
  ];

  const PRIORITY_RANK: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
  return all.sort((a, b) => (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0));
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

export async function fetchWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const { data: members } = await supabase
    .from('workspace_members')
    .select('user_id, role')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });

  if (!members || members.length === 0) return [];

  const userIds = members.map((m: any) => m.user_id);
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, first_name, last_name')
    .in('user_id', userIds);

  const profileMap: Record<string, string> = {};
  for (const p of profiles ?? []) {
    profileMap[(p as any).user_id] = [(p as any).first_name, (p as any).last_name].filter(Boolean).join(' ');
  }

  return members.map((m: any) => ({
    userId: m.user_id,
    role: m.role,
    name: profileMap[m.user_id] ?? '',
    email: '',
  }));
}

// ---------------------------------------------------------------------------
// Home Dashboard
// ---------------------------------------------------------------------------

export interface Task {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  due_at: string | null;
  created_at: string;
  kind: 'deal' | 'ticket';
  parentId: string;
  parentTitle: string;
}

export interface HomeDashboardData {
  emailCount: number;  emailHigh: number;  emailMedium: number;
  botCount: number;    botHigh: number;    botMedium: number;
  formCount: number;   formHigh: number;   formMedium: number;
  ticketCount: number; ticketHigh: number; ticketMedium: number;
}

export async function fetchHomeDashboard(
  workspaceId: string,
  userId: string,
  role: string,
  dateFrom: string,
): Promise<HomeDashboardData> {
  const isWorkspaceWide = role === 'owner' || role === 'admin';

  function emailQ() {
    let q = supabase
      .from('sage_emails')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('direction', 'inbound')
      .eq('is_read', false)
      .eq('is_trashed', false)
      .gte('received_at', dateFrom);
    if (!isWorkspaceWide) q = q.eq('user_id', userId);
    return q;
  }

  function botQ() {
    let q = supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .gte('last_activity_at', dateFrom);
    if (!isWorkspaceWide) q = q.eq('assigned_to', userId);
    return q;
  }

  function formQ() {
    let q = supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .gte('created_at', dateFrom);
    if (!isWorkspaceWide) q = q.eq('assigned_to', userId);
    return q;
  }

  function ticketQ() {
    let q = supabase
      .from('sage_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .in('status', ['open', 'pending', 'in_progress']);
    if (!isWorkspaceWide) q = q.eq('owner_id', userId);
    return q;
  }

  const [
    emails, emailHigh, emailMed,
    bots, botHigh, botMed,
    forms, formHigh, formMed,
    tickets, ticketHigh, ticketMed,
  ] = await Promise.all([
    emailQ(),
    emailQ().in('ai_priority', ['high', 'urgent']),
    emailQ().eq('ai_priority', 'medium'),
    botQ(),
    botQ().in('ai_priority', ['high', 'urgent']),
    botQ().eq('ai_priority', 'medium'),
    formQ(),
    formQ().in('lead_score', ['high', 'urgent']),
    formQ().eq('lead_score', 'medium'),
    ticketQ(),
    ticketQ().in('priority', ['high', 'urgent']),
    ticketQ().eq('priority', 'medium'),
  ]);

  return {
    emailCount: emails.count ?? 0,   emailHigh: emailHigh.count ?? 0,   emailMedium: emailMed.count ?? 0,
    botCount: bots.count ?? 0,       botHigh: botHigh.count ?? 0,       botMedium: botMed.count ?? 0,
    formCount: forms.count ?? 0,     formHigh: formHigh.count ?? 0,     formMedium: formMed.count ?? 0,
    ticketCount: tickets.count ?? 0, ticketHigh: ticketHigh.count ?? 0, ticketMedium: ticketMed.count ?? 0,
  };
}

export async function fetchTasks(workspaceId: string): Promise<Task[]> {
  const [dealRes, ticketRes] = await Promise.all([
    supabase
      .from('sage_deal_activities')
      .select('id, type, title, body, due_at, created_at, deal_id, deal:sage_deals(id, title)')
      .eq('workspace_id', workspaceId)
      .not('due_at', 'is', null)
      .is('completed_at', null)
      .order('due_at', { ascending: true })
      .limit(40),
    supabase
      .from('sage_ticket_activities')
      .select('id, type, title, body, due_at, created_at, ticket_id, ticket:sage_tickets(id, title)')
      .eq('workspace_id', workspaceId)
      .not('due_at', 'is', null)
      .is('completed_at', null)
      .order('due_at', { ascending: true })
      .limit(40),
  ]);

  const dealTasks: Task[] = (dealRes.data ?? []).map((t: any) => ({
    id: t.id,
    type: t.type,
    title: t.title,
    body: t.body,
    due_at: t.due_at,
    created_at: t.created_at,
    kind: 'deal',
    parentId: t.deal_id,
    parentTitle: t.deal?.title ?? 'Deal',
  }));

  const ticketTasks: Task[] = (ticketRes.data ?? []).map((t: any) => ({
    id: t.id,
    type: t.type,
    title: t.title,
    body: t.body,
    due_at: t.due_at,
    created_at: t.created_at,
    kind: 'ticket',
    parentId: t.ticket_id,
    parentTitle: t.ticket?.title ?? 'Ticket',
  }));

  return [...dealTasks, ...ticketTasks].sort((a, b) => {
    if (!a.due_at && !b.due_at) return 0;
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
  });
}

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

export interface Reminder {
  id: string;
  title: string;
  note: string | null;
  due_at: string;
  deal_id: string;
  parentTitle: string;
}

export async function fetchReminders(workspaceId: string, userId: string): Promise<Reminder[]> {
  const { data } = await supabase
    .from('sage_reminders')
    .select('id, title, note, due_at, deal_id, sage_deals(title)')
    .eq('workspace_id', workspaceId)
    .eq('created_by', userId)
    .eq('is_sent', false)
    .order('due_at', { ascending: true })
    .limit(40);

  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    title: r.title,
    note: r.note,
    due_at: r.due_at,
    deal_id: r.deal_id,
    parentTitle: r.sage_deals?.title ?? 'Deal',
  }));
}

// ---------------------------------------------------------------------------
// Push Tokens
// ---------------------------------------------------------------------------

export function registerPushToken(userId: string, workspaceId: string, token: string): Promise<void> {
  return post<void>(`/api/notifications/push-token`, { userId, workspaceId, token });
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
