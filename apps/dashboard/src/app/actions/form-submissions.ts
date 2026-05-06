'use server'

import { createAdminClient } from '@/lib/supabase/server'
import type { Form, FormBehaviour } from '@/features/forms/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SubmitFormPayload {
  /** Field block ID → value */
  fields:     Record<string, string>
  source_url?: string
  email?:      string
  phone?:      string
  first_name?: string
  last_name?:  string
}

export interface SubmitFormResult {
  success:     boolean
  redirectUrl?: string
  error?:       string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractContactFields(fields: Record<string, string>, blocks: Form['blocks']) {
  let email:      string | null = null
  let phone:      string | null = null
  let first_name: string | null = null
  let last_name:  string | null = null

  for (const block of blocks) {
    const val = fields[block.id]
    if (!val) continue
    if (block.type === 'email') email = val
    if (block.type === 'phone') phone = val
    if (block.type === 'text_input') {
      const lbl = (block.props.label ?? '').toLowerCase()
      if (lbl.includes('first')) first_name = val
      else if (lbl.includes('last')) last_name = val
      else if (lbl.includes('name') && !first_name) first_name = val
    }
  }

  return { email, phone, first_name, last_name }
}

// ── Public submit action ──────────────────────────────────────────────────────

export async function submitForm(
  publicSlug: string,
  fields:     Record<string, string>,
  extra?:     { source_url?: string; email?: string; phone?: string; first_name?: string; last_name?: string },
): Promise<SubmitFormResult> {
  const payload: SubmitFormPayload = { fields, ...extra }
  const admin = createAdminClient()

  // Load form
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: formRaw, error: formErr } = await (admin as any)
    .from('forms')
    .select('id, workspace_id, status, blocks, behaviour, published_version')
    .eq('public_slug', publicSlug)
    .eq('status', 'published')
    .maybeSingle()

  if (formErr || !formRaw) return { success: false, error: 'Form not found or not published.' }

  const form = formRaw as Pick<Form, 'id' | 'workspace_id' | 'status' | 'blocks' | 'behaviour' | 'published_version'>
  const behaviour = (form.behaviour ?? {}) as FormBehaviour
  const postSubmit = behaviour.postSubmit ?? { createContact: true, createDeal: false, pipelineId: null, sendEmail: false, sendSms: false }

  const { email, phone, first_name, last_name } = extractContactFields(payload.fields, form.blocks)

  const contactEmail = email ?? payload.email ?? null
  const contactPhone = phone ?? payload.phone ?? null
  const contactFirst = first_name ?? payload.first_name ?? null
  const contactLast  = last_name  ?? payload.last_name  ?? null
  const fullName     = [contactFirst, contactLast].filter(Boolean).join(' ') || null

  // Create contact if requested
  let contactId: string | null = null
  if (postSubmit.createContact && (contactEmail || contactPhone)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (admin as any)
      .from('sage_contacts')
      .select('id')
      .eq('workspace_id', form.workspace_id)
      .or(
        [
          contactEmail ? `email.eq.${contactEmail}` : null,
          contactPhone ? `phone.eq.${contactPhone}` : null,
        ]
          .filter(Boolean)
          .join(','),
      )
      .maybeSingle()

    if (existing.data?.id) {
      contactId = existing.data.id
      // Update name if we now have it
      if (fullName) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin as any)
          .from('sage_contacts')
          .update({ full_name: fullName, first_name: contactFirst, last_name: contactLast, updated_at: new Date().toISOString() })
          .eq('id', contactId)
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newContact } = await (admin as any)
        .from('sage_contacts')
        .insert({
          workspace_id: form.workspace_id,
          email:        contactEmail,
          phone:        contactPhone,
          first_name:   contactFirst,
          last_name:    contactLast,
          full_name:    fullName,
          source:       'form',
        })
        .select('id')
        .single()
      contactId = newContact?.id ?? null
    }

    // Apply audience tags if configured
    const tags = behaviour.audience?.tags ?? []
    if (tags.length > 0 && contactId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any)
        .from('sage_contacts')
        .update({ tags })
        .eq('id', contactId)
    }
  }

  // Record submission
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('form_submissions')
    .insert({
      workspace_id:  form.workspace_id,
      form_id:       form.id,
      form_version:  form.published_version,
      contact_id:    contactId,
      submitted_data: payload.fields,
      email:         contactEmail,
      phone:         contactPhone,
      first_name:    contactFirst,
      last_name:     contactLast,
      full_name:     fullName,
      source_url:    payload.source_url ?? null,
      status:        'new',
    })

  return {
    success:     true,
    redirectUrl: (postSubmit as { redirectUrl?: string | null }).redirectUrl ?? undefined,
  }
}

// ── Fetch public form (no auth) ───────────────────────────────────────────────

export async function getPublicForm(publicSlug: string): Promise<Form | null> {
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from('forms')
    .select('*')
    .eq('public_slug', publicSlug)
    .eq('status', 'published')
    .maybeSingle()
  return (data as Form) ?? null
}
