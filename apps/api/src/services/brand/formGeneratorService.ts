/**
 * formGeneratorService
 *
 * Phase 3 — AI Form Builder: Step 2 of 2
 *
 * Consumes a FormStrategy + BrandSnapshot and produces a complete FormConfig
 * ready for storage and rendering.
 *
 * Rules:
 *   - Never called without a strategy (call formStrategyService first)
 *   - Never reads raw brand tables — only consumes BrandSnapshot
 *   - FormStyle shape is locked for MVP
 *   - TrackerBootstrap is embedded in every FormConfig at generation time
 *   - email field is always present (enforced in strategy, re-enforced here)
 */

import type { BrandSnapshot } from './brandSnapshotService.js'
import type { FormStrategy } from './formStrategyService.js'
import type { TrackerBootstrap } from './websiteGeneratorService.js'

// ── FormStyle (locked MVP shape) ──────────────────────────────────────────────

export interface FormStyle {
  backgroundColor?: string
  textColor?:       string
  buttonColor?:     string
  buttonTextColor?: string
  borderColor?:     string
  borderRadius?:    string
  fontFamily?:      string
  spacing?:         'compact' | 'comfortable' | 'spacious'
  shadowStyle?:     'none' | 'soft' | 'medium'
}

// ── FormField ─────────────────────────────────────────────────────────────────

export type FieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'textarea'
  | 'date'
  | 'select'
  | 'number'

export interface FormField {
  id:           string          // same as name for MVP
  name:         string
  label:        string
  type:         FieldType
  required:     boolean
  placeholder?: string
  options?:     string[]        // for select fields
}

// ── FormConfig ────────────────────────────────────────────────────────────────

export interface FormConfig {
  headline?:    string
  subheadline?: string
  fields:       FormField[]
  cta:          string
  style:        FormStyle
  settings:     FormSettings
  tracking:     TrackerBootstrap
}

export interface FormSettings {
  embedType:          'inline' | 'popup' | 'exit_intent' | 'embedded'
  showLabels:         boolean
  showPlaceholders:   boolean
}

// ── Field type mapping ────────────────────────────────────────────────────────

const FIELD_TYPE_MAP: Record<string, FieldType> = {
  name:              'text',
  first_name:        'text',
  last_name:         'text',
  email:             'email',
  phone:             'tel',
  company:           'text',
  message:           'textarea',
  preferred_date:    'date',
  preferred_time:    'text',
  postcode:          'text',
  budget:            'number',
  how_did_you_hear:  'select',
}

const FIELD_LABEL_MAP: Record<string, string> = {
  name:             'Your Name',
  first_name:       'First Name',
  last_name:        'Last Name',
  email:            'Email Address',
  phone:            'Phone Number',
  company:          'Company',
  message:          'Message',
  preferred_date:   'Preferred Date',
  preferred_time:   'Preferred Time',
  postcode:         'Postcode',
  budget:           'Budget',
  how_did_you_hear: 'How did you hear about us?',
}

const FIELD_PLACEHOLDER_MAP: Record<string, string> = {
  name:             'John Smith',
  first_name:       'John',
  last_name:        'Smith',
  email:            'you@example.com',
  phone:            '+44 7700 000000',
  company:          'Acme Ltd',
  message:          'Tell us a bit about what you need...',
  preferred_date:   '',
  preferred_time:   'e.g. 9am–12pm',
  postcode:         'SW1A 1AA',
  budget:           '',
  how_did_you_hear: '',
}

const HOW_DID_YOU_HEAR_OPTIONS = [
  'Google Search',
  'Social Media',
  'Word of Mouth',
  'Email',
  'Other',
]

// ── Style builder ─────────────────────────────────────────────────────────────

function buildStyle(snapshot: BrandSnapshot): FormStyle {
  return {
    backgroundColor: snapshot.colors.background ?? '#ffffff',
    textColor:       snapshot.colors.text        ?? '#1a1a1a',
    buttonColor:     snapshot.colors.primary     ?? '#000000',
    buttonTextColor: '#ffffff',
    borderColor:     snapshot.colors.accent      ?? '#e2e8f0',
    borderRadius:    '8px',
    fontFamily:      snapshot.typography?.fontBody ?? snapshot.typography?.fontHeading ?? 'inherit',
    spacing:         'comfortable',
    shadowStyle:     'soft',
  }
}

// ── Field builder ─────────────────────────────────────────────────────────────

function buildField(fieldName: string, required: boolean): FormField {
  const type = FIELD_TYPE_MAP[fieldName] ?? 'text'

  return {
    id:          fieldName,
    name:        fieldName,
    label:       FIELD_LABEL_MAP[fieldName] ?? fieldName,
    type,
    required,
    placeholder: FIELD_PLACEHOLDER_MAP[fieldName] ?? '',
    ...(type === 'select' && fieldName === 'how_did_you_hear'
      ? { options: HOW_DID_YOU_HEAR_OPTIONS }
      : {}),
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

export interface GenerateFormInput {
  strategy:     FormStrategy
  snapshot:     BrandSnapshot
  workspaceId:  string
  entityId:     string
  embedType?:   FormSettings['embedType']
}

export function generateForm(input: GenerateFormInput): FormConfig {
  const { strategy, snapshot, workspaceId, entityId } = input

  // Ensure email is always present and required — it's the lead dedup key
  const fieldNames = strategy.fields.includes('email')
    ? strategy.fields
    : ['name', 'email', ...strategy.fields.filter(f => f !== 'name')]

  // Required fields: name + email always required; rest optional unless booking
  const alwaysRequired = new Set(['name', 'first_name', 'email'])
  const fields: FormField[] = fieldNames.map(name =>
    buildField(name, alwaysRequired.has(name))
  )

  return {
    headline:    strategy.headline,
    subheadline: strategy.subheadline,
    fields,
    cta:         strategy.ctaText,
    style:       buildStyle(snapshot),
    settings: {
      embedType:        input.embedType ?? 'inline',
      showLabels:       true,
      showPlaceholders: true,
    },
    tracking: {
      workspaceId,
      entityType: 'brand_form',
      entityId,
    },
  }
}
