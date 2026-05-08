// ── Block types ───────────────────────────────────────────────────────────────

export type BlockType =
  | 'text'
  | 'email'
  | 'phone'
  | 'text_input'
  | 'textarea'
  | 'button'
  | 'image'
  | 'divider'
  | 'checkbox'
  | 'dropdown'
  | 'radio'
  | 'wheel_of_fortune'
  | 'countdown_timer'
  | 'columns'

export type ColumnRatio = '1:1' | '2:1' | '1:2' | '1:1:1'

export interface BlockProps {
  // text / heading
  content?:     string
  variant?:     'heading' | 'body' | 'link' | 'legal'
  textAlign?:   'left' | 'center' | 'right'
  textColor?:   string
  bold?:        boolean
  italic?:      boolean
  underline?:   boolean
  // input fields
  label?:       string
  placeholder?: string
  required?:    boolean
  // button
  action?:      'submit' | 'next_step' | 'close' | 'url'
  url?:         string
  // image
  src?:         string
  alt?:         string
  imageWidth?:  string
  imageRotate?: number
  // dropdown / radio / wheel
  options?:     string[]
  // countdown timer
  timerTarget?: string
  timerLabel?:  string
  // columns layout
  ratio?:       ColumnRatio
  columns?:     FormBlock[][]
  columnWidths?: number[]
  [key: string]: unknown
}

export interface FormBlock {
  id:     string
  stepId: string
  type:   BlockType
  props:  BlockProps
}

// ── Step types ────────────────────────────────────────────────────────────────

export type StepType = 'input' | 'success' | 'custom'

export interface FormStep {
  id:    string
  name:  string
  order: number
  type:  StepType
}

// ── Behaviour ─────────────────────────────────────────────────────────────────

export interface FormBehaviour {
  audience?: {
    tags?:        string[]
    listId?:      string | null
    doubleOptIn?: boolean
    recaptcha?:   boolean
  }
  scheduling?: {
    mode:    'always' | 'scheduled'
    startAt: string | null
    endAt:   string | null
  }
  display?: {
    trigger:           'immediate' | 'delay' | 'scroll' | 'exit_intent' | 'click'
    delaySeconds?:     number
    scrollPercentage?: number
    selector?:         string
    style?:            'popup' | 'fly_in_below' | 'inline' | 'locked' | 'widget'
    entryAnimation?:   'none' | 'fade' | 'slide_up' | 'slide_down' | 'slide_left' | 'slide_right' | 'zoom'
    exitAnimation?:    'none' | 'fade' | 'slide_up' | 'slide_down' | 'slide_left' | 'slide_right' | 'zoom'
    successTitle?:     string
    successBody?:      string
  }
  targeting?: {
    devices?:         ('desktop' | 'mobile' | 'tablet')[]
    hideForSources?:  string[]
    urlRules?:        { type: 'contains' | 'equals' | 'starts_with'; value: string }[]
    visitorType?:     'all' | 'hide_existing' | 'show_existing' | 'segment'
    pageRules?:       { type: 'appears_on' | 'not_on' | 'out_of_stock'; match?: 'is' | 'contains' | 'starts_with'; url?: string }[]
    locationMode?:    'show' | 'hide'
    locationValues?:  string[]
    sourceMode?:      'show' | 'hide'
    sources?:         string[]
    utmSource?:       string
    utmParams?:       { key: string; value: string }[]
  }
  frequency?: {
    mode: 'always' | 'once' | 'once_per_day' | 'once_per_session'
  }
  abTesting?: {
    enabled:  boolean
    variants: { id: string; weight: number }[]
  }
  postSubmit?: {
    createContact: boolean
    createDeal:    boolean
    pipelineId:    string | null
    sendEmail:     boolean
    sendSms:       boolean
    redirectUrl?:  string | null
  }
}

// ── Theme ─────────────────────────────────────────────────────────────────────

export interface FormTheme {
  colors?: {
    primary?:                  string
    background?:               string
    backgroundImage?:          string
    backgroundImagePosition?:  string
    text?:                     string
    muted?:                    string
    fieldText?:                string
  }
  typography?: {
    fontFamily?:        string
    headingFontFamily?: string
    headingSize?:       string
    bodySize?:          string
  }
  buttons?: {
    radius?: string
    style?:  'solid' | 'outline' | 'ghost'
  }
  fields?: {
    radius?:      string
    borderColor?: string
  }
  modal?: {
    width?:  string
    radius?: string
    shadow?: 'none' | 'small' | 'medium' | 'large'
  }
  imagePosition?: 'top' | 'left' | 'right' | 'background'
  imageObjectPosition?: string
}

// ── Form ──────────────────────────────────────────────────────────────────────

export type FormStatus = 'draft' | 'published' | 'paused' | 'archived'
export type FormType   = 'popup' | 'embedded' | 'landing_page' | 'flyout'
export type ChannelMode = 'email_only' | 'sms_only' | 'email_sms'

export interface Form {
  id:                string
  workspace_id:      string
  template_id:       string | null
  name:              string
  status:            FormStatus
  type:              FormType
  channel_mode:      ChannelMode
  steps:             FormStep[]
  blocks:            FormBlock[]
  behaviour:         FormBehaviour
  theme:             FormTheme
  published_version: number
  public_slug:       string | null
  embed_key:         string | null
  created_by:        string | null
  created_at:        string
  updated_at:        string
  published_at:      string | null
}

// ── Template ──────────────────────────────────────────────────────────────────

export type FormGoal =
  | 'collect_subscribers'
  | 'stop_abandonment'
  | 'promote_offers'
  | 'out_of_stock_interest'

export interface FormTemplate {
  id:                string
  workspace_id:      string | null
  name:              string
  description:       string | null
  preview_image_url: string | null
  type:              FormType
  goal:              FormGoal
  channel_mode:      ChannelMode
  is_multi_step:     boolean
  is_system_template: boolean
  tags:              string[]
  category:          string | null
  config: {
    steps:  FormStep[]
    blocks: FormBlock[]
  }
  theme:             FormTheme
  created_at:        string
  updated_at:        string
}

// ── Submission ────────────────────────────────────────────────────────────────

export interface FormSubmission {
  id:             string
  workspace_id:   string
  form_id:        string
  form_version:   number | null
  contact_id:     string | null
  deal_id:        string | null
  submitted_data: Record<string, unknown>
  email:          string | null
  phone:          string | null
  first_name:     string | null
  last_name:      string | null
  full_name:      string | null
  source_url:     string | null
  status:         'new' | 'processed' | 'failed' | 'spam'
  ai_summary:     string | null
  created_at:     string
}

// ── Editor state ──────────────────────────────────────────────────────────────

export type RightTab = 'behaviour' | 'theme' | 'images' | 'embed'
export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export interface EditorState {
  form:           Form
  selectedStepId: string
  selectedBlockId: string | null
  rightTab:       RightTab
  saveState:      SaveState
}

// ── Filter state (template gallery) ──────────────────────────────────────────

export interface TemplateFilters {
  search:      string
  goals:       FormGoal[]
  types:       FormType[]
  channels:    ChannelMode[]
  multiStep:   boolean | null
}
