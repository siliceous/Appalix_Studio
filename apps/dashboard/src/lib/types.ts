// ============================================================
// Database types — mirrors the Supabase schema in /supabase/migrations
// Regenerate from live DB with:
//   supabase gen types typescript --linked > src/lib/types.ts
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Platform =
  | 'slack'
  | 'google_chat'
  | 'facebook_messenger'
  | 'whatsapp'
  | 'wordpress'
  | 'web_widget'
  | 'custom_api'

export type WorkspacePlan = 'starter' | 'core' | 'pro' | 'scale' | 'enterprise'
export type SubscriptionStatus =
  | 'active' | 'inactive' | 'trialing' | 'past_due' | 'cancelled' | 'paused'

export type WorkspaceMemberRole = 'owner' | 'admin' | 'member' | 'viewer'
export type IntegrationStatus = 'active' | 'inactive' | 'error'
export type ConversationStatus = 'active' | 'closed' | 'archived'
export type MessageRole = 'user' | 'assistant' | 'tool' | 'system'
export type SourceType = 'url' | 'sitemap' | 'file' | 'text' | 'notion' | 'confluence' | 'gitbook' | 'google_drive' | 'dropbox' | 'onedrive' | 'sharepoint'
export type SourceStatus = 'pending' | 'processing' | 'ready' | 'failed' | 'outdated'
export type AgentRunStatus = 'running' | 'completed' | 'failed' | 'cancelled'
export type UsageEventType = 'message' | 'agent_run' | 'tool_call' | 'rag_query' | 'embedding'

// ---------------------------------------------------------------
// Row types (what you get back from SELECT *)
// ---------------------------------------------------------------

export interface Workspace {
  id: string
  name: string
  slug: string
  plan: WorkspacePlan
  subscription_status: SubscriptionStatus
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  woo_order_id: string | null
  billing_email: string | null
  trial_ends_at: string | null
  monthly_message_limit: number
  monthly_agent_run_limit: number
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: WorkspaceMemberRole
  invited_by: string | null
  invited_at: string | null
  accepted_at: string | null
  created_at: string
}

export interface Integration {
  id: string
  workspace_id: string
  bot_id: string | null
  platform: Platform
  name: string
  status: IntegrationStatus
  config: Json
  webhook_secret: string | null
  last_error: string | null
  created_at: string
  updated_at: string
}

export interface Bot {
  id: string
  workspace_id: string
  name: string
  description: string | null
  bot_type: 'widget' | 'internal'
  model: string
  system_prompt: string | null
  max_tokens: number
  temperature: number
  enable_rag: boolean
  enable_tools: boolean
  enable_memory: boolean
  fallback_message: string | null
  language_preference: string
  widget_skin: string
  widget_accent_color: string | null
  widget_header_color:  string | null
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  workspace_id: string
  bot_id: string | null
  integration_id: string | null
  platform: Platform | null
  platform_thread_id: string | null
  platform_user_id: string | null
  title: string | null
  summary: string | null
  sentiment: 'positive' | 'neutral' | 'negative' | null
  status: ConversationStatus
  message_count: number
  last_activity_at: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  workspace_id: string
  role: MessageRole
  content: string
  tokens_input: number | null
  tokens_output: number | null
  model: string | null
  response_time_ms: number | null
  is_error: boolean
  error_message: string | null
  tool_name: string | null
  platform_message_id: string | null
  created_at: string
}

export interface Source {
  id: string
  workspace_id: string
  type: SourceType
  name: string
  description: string | null
  url: string | null
  file_path: string | null
  status: SourceStatus
  chunk_count: number | null
  error_message: string | null
  last_synced_at: string | null
  metadata: Json
  created_at: string
  updated_at: string
}

export interface AgentRun {
  id: string
  workspace_id: string
  conversation_id: string | null
  bot_id: string | null
  status: AgentRunStatus
  input: Json | null
  output: Json | null
  steps: number
  tokens_input: number
  tokens_output: number
  duration_ms: number | null
  error_message: string | null
  started_at: string
  completed_at: string | null
}

export interface UsageEvent {
  id: string
  workspace_id: string
  event_type: UsageEventType
  model: string | null
  tokens_input: number
  tokens_output: number
  cost_usd: number
  conversation_id: string | null
  message_id: string | null
  agent_run_id: string | null
  metadata: Json
  created_at: string
}

// ---------------------------------------------------------------
// Database shape (used by Supabase typed client)
// ---------------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      workspaces:        { Row: Workspace;        Insert: Partial<Workspace>;        Update: Partial<Workspace> }
      workspace_members: { Row: WorkspaceMember;  Insert: Partial<WorkspaceMember>;  Update: Partial<WorkspaceMember> }
      integrations:      { Row: Integration;      Insert: Partial<Integration>;      Update: Partial<Integration> }
      bots:              { Row: Bot;              Insert: Partial<Bot>;              Update: Partial<Bot> }
      conversations:     { Row: Conversation;     Insert: Partial<Conversation>;     Update: Partial<Conversation> }
      messages:          { Row: Message;          Insert: Partial<Message>;          Update: Partial<Message> }
      sources:           { Row: Source;           Insert: Partial<Source>;           Update: Partial<Source> }
      agent_runs:        { Row: AgentRun;         Insert: Partial<AgentRun>;         Update: Partial<AgentRun> }
      usage_events:      { Row: UsageEvent;       Insert: Partial<UsageEvent>;       Update: Partial<UsageEvent> }
    }
    Views: Record<string, never>
    Functions: {
      match_chunks: {
        Args: { query_embedding: number[]; p_workspace_id: string; match_threshold?: number; match_count?: number }
        Returns: { id: string; source_id: string; content: string; similarity: number; metadata: Json }[]
      }
    }
    Enums: Record<string, never>
  }
}
