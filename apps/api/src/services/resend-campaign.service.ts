/**
 * Resend Campaign Service
 *
 * Handles batch email sending via Resend and webhook event processing.
 * Appalix owns all contact data — Resend is purely the delivery engine.
 */

import { Resend } from 'resend'
import { supabase } from '../lib/supabase.js'

const BATCH_SIZE = 100   // Resend batch API limit

// ── Resend client ─────────────────────────────────────────────────────────────

async function getResendClient(workspaceId: string): Promise<{ client: Resend; fromEmail: string; fromName: string } | null> {
  const { data: ws } = await supabase
    .from('workspaces')
    .select('automation_config, name')
    .eq('id', workspaceId)
    .single()

  const cfg    = (ws?.automation_config ?? {}) as Record<string, string>
  const apiKey = cfg.resend_api_key || process.env.RESEND_API_KEY
  if (!apiKey) return null

  return {
    client:    new Resend(apiKey),
    fromEmail: cfg.email_from_address || process.env.RESEND_FROM_EMAIL || 'noreply@appalix.com',
    fromName:  ws?.name ?? 'Appalix',
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CampaignRecipient {
  recipientId: string
  contactId:   string | null
  email:       string
  name:        string | null
}

export interface SendBatchParams {
  workspaceId: string
  campaignId:  string
  batchId:     string
  subject:     string
  previewText: string | null
  bodyHtml:    string
  bodyText:    string | null
  fromName:    string
  fromEmail:   string
  replyTo:     string | null
  recipients:  CampaignRecipient[]
}

// ── Sending ───────────────────────────────────────────────────────────────────

export async function sendCampaignBatch(params: SendBatchParams): Promise<{ sent: number; failed: number }> {
  const { workspaceId, campaignId, batchId, subject, bodyHtml, bodyText, fromName, fromEmail, replyTo, recipients } = params

  const resendCfg = await getResendClient(workspaceId)
  if (!resendCfg) {
    console.error(`[email-campaign] no Resend API key for workspace=${workspaceId}`)
    await supabase.from('email_send_batches').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', batchId)
    return { sent: 0, failed: recipients.length }
  }

  const { client } = resendCfg
  const from = `${fromName} <${fromEmail}>`

  let sent   = 0
  let failed = 0

  // Split into ≤100 chunks for Resend batch API
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE)

    const messages = chunk.map(r => ({
      from,
      to:      [r.name ? `${r.name} <${r.email}>` : r.email],
      subject,
      html:    personalise(bodyHtml, r),
      ...(bodyText ? { text: personalise(bodyText, r) } : {}),
      ...(replyTo  ? { reply_to: replyTo }               : {}),
      headers: {
        // Tags let Resend webhook payloads carry our internal IDs
        'X-Appalix-Workspace': workspaceId,
        'X-Appalix-Campaign':  campaignId,
        'X-Appalix-Recipient': r.recipientId,
      },
    }))

    try {
      const { data, error } = await client.batch.send(messages as Parameters<typeof client.batch.send>[0])

      if (error || !data) {
        console.error(`[email-campaign] batch send error:`, error)
        failed += chunk.length
        // Mark individual recipients as failed
        await supabase.from('email_campaign_recipients')
          .update({ status: 'failed', sent_at: new Date().toISOString() })
          .in('id', chunk.map(r => r.recipientId))
        continue
      }

      // data is an array matching the request order
      const results = Array.isArray(data) ? data : [data]
      const now = new Date().toISOString()

      for (let j = 0; j < chunk.length; j++) {
        const r      = chunk[j]
        const result = results[j] as { id?: string; error?: { message: string } } | undefined

        if (result?.id) {
          await supabase.from('email_campaign_recipients').update({
            status:          'sent',
            resend_email_id: result.id,
            sent_at:         now,
          }).eq('id', r.recipientId)
          sent++
        } else {
          await supabase.from('email_campaign_recipients').update({
            status:  'failed',
            sent_at: now,
          }).eq('id', r.recipientId)
          failed++
        }
      }
    } catch (err) {
      console.error(`[email-campaign] chunk error:`, err)
      failed += chunk.length
      await supabase.from('email_campaign_recipients')
        .update({ status: 'failed' })
        .in('id', chunk.map(r => r.recipientId))
    }
  }

  // Update batch counters
  await supabase.from('email_send_batches').update({
    status:       failed === recipients.length ? 'failed' : 'completed',
    sent_count:   sent,
    failed_count: failed,
    updated_at:   new Date().toISOString(),
  }).eq('id', batchId)

  return { sent, failed }
}

// ── Webhook event processing ──────────────────────────────────────────────────

export type ResendEventType =
  | 'email.sent' | 'email.delivered' | 'email.delivery_delayed'
  | 'email.bounced' | 'email.complained' | 'email.clicked' | 'email.opened'

export interface ResendWebhookPayload {
  type: ResendEventType
  data: {
    email_id:   string
    from?:      string
    to?:        string[]
    subject?:   string
    created_at: string
    bounce?: { message: string; type?: string }
    click?:  { link: string }
  }
}

export async function processResendWebhook(payload: ResendWebhookPayload): Promise<void> {
  const { type, data } = payload
  const resendEmailId  = data.email_id
  const now            = new Date().toISOString()

  // Look up the recipient record
  const { data: recipient } = await supabase
    .from('email_campaign_recipients')
    .select('id, workspace_id, campaign_id, batch_id, contact_id, status')
    .eq('resend_email_id', resendEmailId)
    .maybeSingle()

  if (!recipient) {
    // Not a campaign email (could be a transactional Resend email) — ignore silently
    return
  }

  const { id: recipientId, workspace_id, campaign_id, batch_id, contact_id } = recipient

  switch (type) {
    case 'email.delivered': {
      await supabase.from('email_campaign_recipients').update({ status: 'delivered' }).eq('id', recipientId)
      await incrementCampaignCounter(campaign_id, 'delivered_count')
      break
    }
    case 'email.opened': {
      // Only record first open
      if (recipient.status !== 'opened' && recipient.status !== 'clicked') {
        await supabase.from('email_campaign_recipients').update({ status: 'opened', opened_at: now }).eq('id', recipientId)
        await incrementCampaignCounter(campaign_id, 'opened_count')
        if (batch_id) await incrementBatchCounter(batch_id, 'opened_count')
      }
      break
    }
    case 'email.clicked': {
      if (recipient.status !== 'clicked') {
        await supabase.from('email_campaign_recipients').update({
          status:     'clicked',
          opened_at:  recipient.status !== 'opened' ? now : undefined,
          clicked_at: now,
        }).eq('id', recipientId)
        await incrementCampaignCounter(campaign_id, 'clicked_count')
        if (batch_id) await incrementBatchCounter(batch_id, 'clicked_count')
        if (recipient.status !== 'opened') await incrementCampaignCounter(campaign_id, 'opened_count')
      }
      break
    }
    case 'email.bounced': {
      const bounceType   = (data.bounce?.type ?? 'hard').toLowerCase().includes('soft') ? 'soft' : 'hard'
      const bounceReason = data.bounce?.message ?? null
      await supabase.from('email_campaign_recipients').update({
        status:       'bounced',
        bounced_at:   now,
        bounce_type:  bounceType,
        bounce_reason: bounceReason,
      }).eq('id', recipientId)
      await incrementCampaignCounter(campaign_id, 'bounced_count')
      if (batch_id) await incrementBatchCounter(batch_id, 'bounced_count')
      // Hard bounce → mark contact as bounced to suppress future sends
      if (bounceType === 'hard' && contact_id) {
        await supabase.from('contacts').update({
          email_deliverability: 'bounced',
          email_bounced_at:     now,
          email_bounce_reason:  bounceReason,
        }).eq('id', contact_id)
      }
      break
    }
    case 'email.complained': {
      await supabase.from('email_campaign_recipients').update({ status: 'complained', complained_at: now }).eq('id', recipientId)
      await incrementCampaignCounter(campaign_id, 'complained_count')
      if (batch_id) await incrementBatchCounter(batch_id, 'complained_count')
      // Spam complaint → suppress contact
      if (contact_id) {
        await supabase.from('contacts').update({
          email_deliverability: 'complained',
          email_opt_out:        true,
        }).eq('id', contact_id)
      }
      break
    }
    default:
      break
  }

  // Store raw event in message_events for audit trail
  await supabase.from('message_events').insert({
    workspace_id,
    channel:             'email',
    external_message_id: resendEmailId,
    contact_id:          contact_id ?? null,
    event_type:          type.replace('email.', 'email_'),
    provider:            'resend',
    provider_payload:    payload,
    event_at:            now,
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function personalise(template: string, r: CampaignRecipient): string {
  const apiBase       = process.env.API_BASE_URL ?? 'http://localhost:3001'
  const unsubscribeUrl = `${apiBase}/email/unsubscribe?rid=${r.recipientId}`
  return template
    .replace(/\{\{first_name\}\}/gi,      r.name?.split(' ')[0] ?? '')
    .replace(/\{\{full_name\}\}/gi,       r.name ?? '')
    .replace(/\{\{email\}\}/gi,           r.email)
    .replace(/\{\{unsubscribe_link\}\}/gi, unsubscribeUrl)
}

async function incrementCampaignCounter(campaignId: string, column: string) {
  const { data } = await supabase.from('email_campaigns').select(column).eq('id', campaignId).single()
  if (data) {
    const row = data as unknown as Record<string, unknown>
    await supabase.from('email_campaigns').update({
      [column]:   ((row[column] as number) ?? 0) + 1,
      updated_at: new Date().toISOString(),
    }).eq('id', campaignId)
  }
}

async function incrementBatchCounter(batchId: string, column: string) {
  const { data } = await supabase.from('email_send_batches').select(column).eq('id', batchId).single()
  if (data) {
    const row = data as unknown as Record<string, unknown>
    await supabase.from('email_send_batches').update({
      [column]:   ((row[column] as number) ?? 0) + 1,
      updated_at: new Date().toISOString(),
    }).eq('id', batchId)
  }
}
