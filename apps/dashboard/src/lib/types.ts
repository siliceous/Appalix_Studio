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
  | 'instagram'
  | 'wordpress'
  | 'web_widget'
  | 'custom_api'
  | 'telegram'
  | 'shopify'

export type WorkspacePlan = 'individual' | 'pro' | 'team' | 'enterprise'
export type SubscriptionStatus =
  | 'active' | 'inactive' | 'trialing' | 'past_due' | 'cancelled' | 'paused'

export type WorkspaceMemberRole = 'owner' | 'admin' | 'manager' | 'employee' | 'member' | 'viewer'

/** Numeric rank — higher = more authority */
export const ROLE_RANK: Record<WorkspaceMemberRole, number> = {
  owner:    5,
  admin:    4,
  manager:  3,
  employee: 2,
  member:   2, // legacy alias for employee
  viewer:   1,
}

/** Per-user permission flags (stored in workspace_permissions table) */
export interface UserPermissions {
  can_view_contacts:  boolean
  can_view_pipelines: boolean
  can_view_projects:  boolean
  can_view_dashboard: boolean
  can_allocate_leads: boolean
  can_reassign_leads: boolean
  can_edit_deals:     boolean
}

export const DEFAULT_PERMISSIONS: UserPermissions = {
  can_view_contacts:  true,
  can_view_pipelines: true,
  can_view_projects:  true,
  can_view_dashboard: true,
  can_allocate_leads: false,
  can_reassign_leads: false,
  can_edit_deals:     false,
}

/** Roles each caller is allowed to invite */
export const INVITE_ALLOWED: Record<WorkspaceMemberRole, WorkspaceMemberRole[]> = {
  owner:    ['admin', 'manager', 'employee'],
  admin:    ['manager', 'employee'],
  manager:  ['employee'],
  employee: [],
  member:   [],
  viewer:   [],
}

export interface WorkspaceMemberSummary {
  user_id: string
  name:    string
  email:   string
  role:    WorkspaceMemberRole
}
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
  sage_business_description: string | null
  seat_limit: number | null
  extra_seats: number
  extra_seat_limit: number | null
  bot_limit: number | null
  extra_bots: number
  extra_bot_limit: number | null
  rr_index: number
  rr_enabled: boolean
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
  // AI triage fields (added in migration 00036)
  ai_priority?:    'high' | 'medium' | 'low' | null
  ai_summary?:     string | null
  ai_insights?:    string[] | null
  ai_action?:      'create_lead' | 'create_ticket' | 'ignore' | null
  ai_entities?:    { name?: string; email?: string; phone?: string; product_interest?: string } | null
  ai_analyzed_at?: string | null
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
// Sage CRM types
// ---------------------------------------------------------------

export type SageTicketStatus        = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed'
export type SageTicketPriority      = 'low' | 'medium' | 'high' | 'urgent'
export type SageDealStatus          = 'open' | 'won' | 'lost'
export type SageContactSource       = 'chat' | 'manual' | 'import' | 'mailchimp' | 'activecampaign'
export type SageContactType         = 'potential_customer' | 'active_customer' | 'other'
export type SageContactVisibility   = 'everyone' | 'team' | 'only_me'
export type SageIntegrationProvider =
  | 'stripe' | 'gmail' | 'microsoft' | 'zapier' | 'make' | 'freshdesk' | 'zendesk'
  | 'mailchimp' | 'activecampaign' | 'convertkit' | 'klaviyo' | 'constantcontact'
  | 'gravity_forms' | 'google_forms' | 'typeform' | 'fluent_forms'
  | 'linkedin' | 'tiktok' | 'microsoft_ads' | 'calendly'
export type SageIntegrationStatus   = 'connected' | 'disconnected' | 'error'
export type SageActivityEntityType  = 'contact' | 'deal' | 'ticket' | 'company' | 'project'
export type SageProjectStatus        = 'onboarding' | 'active' | 'on_hold' | 'completed' | 'cancelled'
export type SageProjectTaskStatus    = 'pending' | 'in_progress' | 'completed'
export type SageProjectType          = 'client_work' | 'internal' | 'support' | 'onboarding' | 'custom'
export type SageProjectBillingStatus = 'not_invoiced' | 'invoiced' | 'partial' | 'paid'
export type SageProjectSource        = 'email' | 'bot' | 'forms' | 'manual' | 'ads' | 'deal'

export interface SageCompany {
  id:           string
  workspace_id: string
  name:         string
  domain:       string | null
  industry:     string | null
  created_at:   string
  updated_at:   string
}

export interface SageContact {
  id:                     string
  workspace_id:           string
  company_id:             string | null
  source_conversation_id: string | null
  name:                   string
  email:                  string | null
  phone:                  string | null
  company_name:           string | null
  website_url:            string | null
  business_goal:          string | null
  contact_type:           SageContactType | null
  title:                  string | null
  street:                 string | null
  city:                   string | null
  state:                  string | null
  zip:                    string | null
  country:                string | null
  visibility:             SageContactVisibility | null
  last_contacted_at:      string | null
  source:                 SageContactSource
  tags:                   string[]
  notes:                  string | null
  value:                  number | null
  assigned_to:            string | null
  ai_summary:             string | null
  ai_analyzed_at:         string | null
  mailchimp_member_id:    string | null
  sync_deleted_at:        string | null
  created_at:             string
  updated_at:             string
  // joined
  company?:               SageCompany | null
  deal_value?:            number | null
}

export interface SagePipeline {
  id:            string
  workspace_id:  string
  name:          string
  template_type: string | null
  is_default:    boolean
  created_at:    string
}

export interface SagePipelineStage {
  id:          string
  pipeline_id: string
  name:        string
  position:    number
  color:       string
  created_at:  string
}

export interface SageDeal {
  id:                     string
  workspace_id:           string
  pipeline_id:            string | null
  stage_id:               string | null
  contact_id:             string | null
  company_id:             string | null
  owner_id:               string | null
  source_conversation_id: string | null
  title:                  string
  value:                  number | null
  currency:               string
  status:                 SageDealStatus
  tags:                   string[]
  close_date:             string | null
  source:                 string | null
  priority:               'low' | 'medium' | 'high' | null
  win_percentage:         number | null
  visibility:             string
  description:            string | null
  company_name:           string | null
  lost_reason:            string | null
  won_at:                 string | null
  lost_at:                string | null
  created_at:             string
  updated_at:             string
  // joined
  contact?:               Pick<SageContact, 'id' | 'name' | 'email'> | null
  company?:               Pick<SageCompany, 'id' | 'name'> | null
  stage?:                 Pick<SagePipelineStage, 'id' | 'name' | 'color'> | null
}

export interface SageTicketActivity {
  id:           string
  workspace_id: string
  ticket_id:    string
  type:         'note' | 'call' | 'meeting' | 'task'
  title:        string | null
  body:         string | null
  due_at:       string | null
  completed_at: string | null
  created_by:   string | null
  created_at:   string
}

export interface SageDealActivity {
  id:           string
  workspace_id: string
  deal_id:      string
  type:         'note' | 'call' | 'meeting' | 'task'
  title:        string | null
  body:         string | null
  due_at:       string | null
  completed_at: string | null
  created_by:   string | null
  created_at:   string
}

export interface SageTicket {
  id:                string
  workspace_id:      string
  contact_id:        string | null
  deal_id:           string | null
  owner_id:          string | null
  name:              string | null
  email:             string | null
  phone:             string | null
  occurred_at:       string | null
  title:             string
  description:       string | null
  status:            SageTicketStatus
  priority:          SageTicketPriority
  contact_method:    'email' | 'phone' | null
  related_url:       string | null
  external_provider: string | null
  external_id:       string | null
  external_url:      string | null
  created_at:        string
  updated_at:        string
  // joined
  contact?:          Pick<SageContact, 'id' | 'name' | 'email'> | null
}

export interface SageProject {
  id:               string
  workspace_id:     string
  deal_id:          string | null
  contact_id:       string | null
  company_id:       string | null
  owner_id:         string | null
  assigned_to:      string[]
  name:             string
  project_type:     SageProjectType
  service_type:     string | null
  template_id:      string | null
  status:           SageProjectStatus
  priority:         'low' | 'medium' | 'high'
  progress_percent: number
  billing_status:   SageProjectBillingStatus
  is_recurring:     boolean
  source:           SageProjectSource | null
  next_action:      string | null
  blocker_flag:     boolean
  blocker_reason:   string | null
  start_date:       string | null
  due_date:         string | null
  value:            number | null
  currency:         string
  notes:            string | null
  deliverables:     string | null
  deleted_at:       string | null
  created_at:       string
  updated_at:       string
  board_id?:        string | null
  stage_id?:        string | null
  // joined
  contact?:         Pick<SageContact, 'id' | 'name' | 'email'> | null
  company?:         Pick<SageCompany, 'id' | 'name'> | null
  deal?:            Pick<SageDeal, 'id' | 'title'> | null
  board?:           { id: string; name: string } | null
  stage?:           { id: string; name: string; color: string } | null
  template?:        Pick<SageProjectTemplate, 'id' | 'name'> | null
}

export interface SageProjectTask {
  id:           string
  project_id:   string
  workspace_id: string
  title:        string
  description:  string | null
  assigned_to:  string | null
  status:       SageProjectTaskStatus
  priority:     'low' | 'medium' | 'high'
  due_date:     string | null
  order_index:  number
  completed_at: string | null
  created_at:   string
  updated_at:   string
}

export interface SageProjectTaskTemplate {
  id:           string
  workspace_id: string | null
  service_type: string
  title:        string
  description:  string | null
  order_index:  number
  created_at:   string
}

export interface SageProjectActivity {
  id:           string
  workspace_id: string
  project_id:   string
  type:         'note' | 'call' | 'meeting' | 'task'
  title:        string | null
  body:         string | null
  due_at:       string | null
  completed_at: string | null
  created_by:   string | null
  created_at:   string
}

export interface SageProjectTemplate {
  id:           string
  workspace_id: string | null   // null = global default
  name:         string
  project_type: SageProjectType
  description:  string | null
  is_default:   boolean
  created_at:   string
  tasks?:       SageTemplateTask[]
}

export interface SageTemplateTask {
  id:                    string
  template_id:           string
  title:                 string
  description:           string | null
  default_assignee_role: 'owner' | 'team_member' | 'custom'
  due_offset_days:       number
  order_index:           number
  created_at:            string
}

export interface SageProjectBoard {
  id:           string
  workspace_id: string
  name:         string
  description:  string | null
  created_at:   string
  stages?:      SageProjectBoardStage[]
}

export interface SageProjectBoardStage {
  id:         string
  board_id:   string
  name:       string
  color:      string
  position:   number
  created_at: string
}

export interface SageActivityLog {
  id:           string
  workspace_id: string
  entity_type:  SageActivityEntityType
  entity_id:    string
  event_type:   string
  payload:      Json
  user_id:      string | null
  created_at:   string
}

export interface SageIntegration {
  id:              string
  workspace_id:    string
  provider:        SageIntegrationProvider
  status:          SageIntegrationStatus
  config:          Json
  sync_enabled:    boolean
  last_synced_at:  string | null
  last_sync_count: number
  created_at:      string
  updated_at:      string
}

export interface SageEmail {
  id:              string
  workspace_id:    string
  contact_id:      string | null
  deal_id:         string | null
  message_id:      string
  thread_id:       string | null
  from_address:    string
  from_name:       string | null
  to_address:      string
  subject:         string
  body_text:       string | null
  body_html:       string | null
  received_at:     string
  direction:       'inbound' | 'outbound'
  is_read:         boolean
  is_starred:      boolean
  is_trashed:      boolean
  ai_priority:     'high' | 'medium' | 'low' | null
  ai_category:     'Sales' | 'Support' | 'Invoice' | 'Receipt' | 'Financial' | 'Social' | 'Promotion' | 'Legal' | 'Security' | 'Meeting' | 'Partnership' | 'Shipping' | 'Subscription' | 'Other' | null
  ai_summary:      string | null
  ai_reason:       string | null
  ai_user_prompt:  string | null
  ai_action:       'create_lead' | 'update_lead' | 'reopen' | 'create_ticket' | 'reply_draft' | 'ignore' | null
  ai_entities:     {
    name?:             string
    company?:          string
    email?:            string
    phone?:            string
    website?:          string
    product_interest?: string
    intent_signals?:   string[]
    urgency_signals?:  string[]
  } | null
  ai_insights:     string[] | null
  ai_reply_drafts: { tone: string; body: string }[] | null
  ai_analyzed_at:  string | null
  assigned_to:     string | null
  created_at:      string
  // joined
  contact?:        Pick<SageContact, 'id' | 'name' | 'email'> | null
}

export interface SageMeeting {
  id:             string
  workspace_id:   string
  email_id:       string | null
  ics_uid:        string | null
  title:          string
  start_at:       string | null
  end_at:         string | null
  location:       string | null
  description:    string | null
  organizer:      string | null
  organizer_name: string | null
  attendees:      string[]
  created_at:     string
}

export interface SageReminder {
  id:           string
  workspace_id: string
  deal_id:      string | null
  contact_id:   string | null
  title:        string
  note:         string | null
  due_at:       string
  is_sent:      boolean
  sent_at:      string | null
  created_at:   string
}

// ---------------------------------------------------------------
// Lead Ads (Forms section)
// ---------------------------------------------------------------
// Lead ad + booking platforms (active: meta, google_ads — coming soon: linkedin, tiktok, microsoft_ads, calendly)
export type LeadAdPlatform = 'meta' | 'google_ads' | 'mailchimp' | 'activecampaign' | 'linkedin' | 'tiktok' | 'microsoft_ads' | 'calendly'
export type LeadScore = 'high' | 'medium' | 'low'

export interface LeadAdSourceConfig {
  // Meta
  verify_token?:      string
  app_secret?:        string
  page_access_token?: string
  page_id?:           string
  page_name?:         string
  // Google Ads
  webhook_key?:       string
}

export interface LeadAdSource {
  id:           string
  workspace_id: string
  platform:     LeadAdPlatform
  name:         string
  status:       'active' | 'inactive'
  config:       LeadAdSourceConfig
  leads_count:  number
  last_lead_at: string | null
  created_at:   string
  updated_at:   string
}

export interface Lead {
  id:              string
  workspace_id:    string
  source_id:       string | null
  name:            string
  email:           string | null
  phone:           string | null
  company:         string | null
  job_title:       string | null
  website:         string | null
  source_platform: LeadAdPlatform
  campaign_name:   string | null
  ad_name:         string | null
  form_name:       string | null
  lead_score:      LeadScore | null
  pipeline_stage:  string
  assigned_to:     string | null
  allocated_by:    string | null
  allocated_at:    string | null
  raw_payload:     Record<string, unknown> | null
  created_at:      string
  updated_at:      string
  source?:         LeadAdSource | null
}

export interface LeadEvent {
  id:         string
  lead_id:    string
  event_type: string
  event_data: Record<string, unknown> | null
  created_at: string
}

// ---------------------------------------------------------------
// Database shape (used by Supabase typed client)
// ---------------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      workspaces:            { Row: Workspace;          Insert: Partial<Workspace>;          Update: Partial<Workspace> }
      workspace_members:     { Row: WorkspaceMember;    Insert: Partial<WorkspaceMember>;    Update: Partial<WorkspaceMember> }
      integrations:          { Row: Integration;        Insert: Partial<Integration>;        Update: Partial<Integration> }
      bots:                  { Row: Bot;                Insert: Partial<Bot>;                Update: Partial<Bot> }
      conversations:         { Row: Conversation;       Insert: Partial<Conversation>;       Update: Partial<Conversation> }
      messages:              { Row: Message;            Insert: Partial<Message>;            Update: Partial<Message> }
      sources:               { Row: Source;             Insert: Partial<Source>;             Update: Partial<Source> }
      agent_runs:            { Row: AgentRun;           Insert: Partial<AgentRun>;           Update: Partial<AgentRun> }
      usage_events:          { Row: UsageEvent;         Insert: Partial<UsageEvent>;         Update: Partial<UsageEvent> }
      sage_companies:        { Row: SageCompany;        Insert: Partial<SageCompany>;        Update: Partial<SageCompany> }
      sage_contacts:         { Row: SageContact;        Insert: Partial<SageContact>;        Update: Partial<SageContact> }
      sage_pipelines:        { Row: SagePipeline;       Insert: Partial<SagePipeline>;       Update: Partial<SagePipeline> }
      sage_pipeline_stages:  { Row: SagePipelineStage;  Insert: Partial<SagePipelineStage>;  Update: Partial<SagePipelineStage> }
      sage_deals:            { Row: SageDeal;           Insert: Partial<SageDeal>;           Update: Partial<SageDeal> }
      sage_tickets:          { Row: SageTicket;         Insert: Partial<SageTicket>;         Update: Partial<SageTicket> }
      sage_activity_log:     { Row: SageActivityLog;    Insert: Partial<SageActivityLog>;    Update: Partial<SageActivityLog> }
      sage_integrations:     { Row: SageIntegration;    Insert: Partial<SageIntegration>;    Update: Partial<SageIntegration> }
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

// ── Documents (Quotes / Packing Lists / Invoices) ─────────────────────────────

export type SageDocumentType    = 'quote' | 'packing_list' | 'invoice'
export type SageDocumentStatus  = 'draft' | 'sent' | 'accepted' | 'declined' | 'invoiced' | 'paid' | 'partial' | 'overdue' | 'void'
export type SageDiscountType    = 'percent' | 'fixed'

export interface SageItem {
  id:           string
  workspace_id: string
  item_code:    string
  description:  string
  category:     string | null
  job:          string | null
  tax_code:     string | null
  unit:         string | null
  unit_price:   number
  deleted_at:   string | null
  created_at:   string
  updated_at:   string
}

export interface SageDocumentItem {
  id:          string
  document_id: string
  item_code?:  string | null
  description: string
  category?:   string | null
  job?:        string | null
  tax_code?:   string | null
  unit?:       string | null
  quantity:    number
  unit_price:  number
  discount?:   number
  amount:      number
  order_index: number
  created_at:  string
}

export interface SageDocument {
  id:                  string
  workspace_id:        string
  doc_type:            SageDocumentType
  doc_number:          string
  project_id:          string | null
  contact_id:          string | null
  company_id:          string | null
  quote_id:            string | null
  status:              SageDocumentStatus
  currency:            string
  subtotal:            number
  discount_type:       SageDiscountType
  discount_value:      number
  tax_rate:            number
  tax_amount:          number
  total:               number
  issue_date:          string
  due_date:            string | null
  valid_until:         string | null
  notes:               string | null
  terms:               string | null
  customer_po:         string | null
  tax_inclusive:       boolean
  amount_paid:         number
  attachments:         { name: string; url: string; size: number; type: string }[]
  from_name:           string | null
  from_address:        string | null
  accent_color:        string | null
  logo_url:            string | null
  stripe_customer_id:  string | null
  stripe_invoice_id:   string | null
  stripe_payment_link: string | null
  sent_at:             string | null
  accepted_at:         string | null
  paid_at:             string | null
  viewed_at:           string | null
  created_by:          string | null
  created_at:          string
  updated_at:          string
  deleted_at:          string | null
  // Joined
  items?:   SageDocumentItem[]
  contact?: { id: string; name: string; email: string | null } | null
  company?: { id: string; name: string } | null
  project?: { id: string; name: string } | null
}
