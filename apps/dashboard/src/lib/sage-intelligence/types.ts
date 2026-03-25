import type { WorkspaceMemberRole } from '@/lib/types'

// ─── Access Scope ─────────────────────────────────────────────────────────────

export interface SageAccessScope {
  userId:         string
  workspaceId:    string
  role:           WorkspaceMemberRole
  rank:           number
  /** If true, user can see ALL workspace data */
  canSeeAll:      boolean
  /** If true, user can see team data (assigned to any employee under them) */
  canSeeTeam:     boolean
  /** Filter: only show deals/tickets/contacts assigned to these user IDs (null = no filter) */
  assignedToFilter: string[] | null
  /** Raw list of all workspace member user IDs visible to this user */
  visibleUserIds: string[]
}

// ─── Query Classification ─────────────────────────────────────────────────────

export type SageQueryCategory =
  | 'contacts'
  | 'deals'
  | 'tickets'
  | 'emails'
  | 'conversations'
  | 'forms'
  | 'companies'
  | 'activities'
  | 'reminders'
  | 'team'
  | 'pipeline'
  | 'analytics'
  | 'briefing'
  | 'alerts'
  | 'action'
  | 'general'

export type SageRetrievalMode = 'structured' | 'semantic' | 'hybrid' | 'none'

export interface SageQueryClassification {
  category:       SageQueryCategory
  retrieval:      SageRetrievalMode
  actionIntent?:  SageActionType
  /** Extracted filters from natural language */
  filters: {
    assignee?:    string   // name or "me"
    priority?:    string
    status?:      string
    dateRange?:   { from?: string; to?: string }
    entity?:      { type: string; name?: string; id?: string }
    limit?:       number
  }
  confidence:     number
}

// ─── Retrieval ────────────────────────────────────────────────────────────────

export interface RetrievedContext {
  contacts?:      RetrievedRecord[]
  deals?:         RetrievedRecord[]
  tickets?:       RetrievedRecord[]
  emails?:        RetrievedRecord[]
  conversations?: RetrievedRecord[]
  forms?:         RetrievedRecord[]
  activities?:    RetrievedRecord[]
  reminders?:     RetrievedRecord[]
  stats?:         Record<string, number | string>
  semanticHits?:  SemanticHit[]
}

export interface RetrievedRecord {
  id:       string
  type:     string
  label:    string
  summary?: string
  metadata: Record<string, unknown>
}

export interface SemanticHit {
  entityType: string
  entityId:   string
  content:    string
  similarity: number
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export type SageActionType =
  | 'create_reminder'
  | 'create_task'
  | 'create_ticket'
  | 'create_deal'
  | 'convert_to_deal'
  | 'assign_deal'
  | 'assign_ticket'
  | 'move_deal_stage'
  | 'save_note'
  | 'draft_reply'
  | 'create_contact'

export interface SageActionPayload {
  type:        SageActionType
  entityType?: string
  entityId?:   string
  params:      Record<string, unknown>
}

export interface SageActionResult {
  success:    boolean
  actionType: SageActionType
  entityId?:  string
  message:    string
  error?:     string
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

export type AlertType =
  | 'hot_lead'
  | 'stale_deal'
  | 'overdue_task'
  | 'unassigned_deal'
  | 'unassigned_ticket'
  | 'deal_closing_soon'
  | 'high_priority_email'
  | 'idle_contact'

export interface SageAlert {
  id:         string
  alertType:  AlertType
  entityType: string
  entityId:   string
  title:      string
  body?:      string
  priority:   'high' | 'medium' | 'low'
  createdAt:  string
  metadata:   Record<string, unknown>
}

// ─── Briefings ────────────────────────────────────────────────────────────────

export interface BriefingSection {
  title:   string
  items:   string[]
  icon?:   string
}

export interface SageBriefing {
  type:        'daily' | 'weekly'
  date:        string
  content:     string
  sections:    BriefingSection[]
  stats:       Record<string, number | string>
  generatedAt: string
}

// ─── Sage Query Response ─────────────────────────────────────────────────────

export interface SageQueryResponse {
  reply:               string
  classification:      SageQueryClassification
  context?:            RetrievedContext
  action?:             SageActionResult
  suggestedFollowUps?: string[]
}
