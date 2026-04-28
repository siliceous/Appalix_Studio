import type { FastifyInstance } from 'fastify'
import { supabase } from '../../lib/supabase.js'
import { sendCampaignBatch, type CampaignRecipient } from '../../services/resend-campaign.service.js'

export async function emailCampaignRoutes(fastify: FastifyInstance) {
  /**
   * POST /email/campaigns/:id/send
   * Fetches eligible recipients, creates batches, fires sending.
   * Called by the dashboard server action after the user clicks Send.
   * Protected by service-role key header.
   */
  fastify.post<{ Params: { id: string } }>(
    '/campaigns/:id/send',
    async (request, reply) => {
      const serviceKey = request.headers['x-service-key'] as string | undefined
      if (serviceKey !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return reply.status(401).send({ error: 'Unauthorised' })
      }

      const campaignId = request.params.id

      // Load campaign
      const { data: campaign, error: cErr } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()

      if (cErr || !campaign) return reply.status(404).send({ error: 'Campaign not found' })
      if (!['draft', 'paused', 'failed'].includes(campaign.status)) {
        return reply.status(400).send({ error: `Cannot send a campaign with status: ${campaign.status}` })
      }

      // Mark as sending immediately
      await supabase.from('email_campaigns').update({
        status:     'sending',
        sent_at:    new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', campaignId)

      reply.status(202).send({ message: 'Sending started' })

      // Resolve recipients in the background
      setImmediate(async () => {
        try {
          await dispatchCampaign(campaign)
        } catch (err) {
          console.error(`[email-campaign] dispatch error campaign=${campaignId}:`, err)
          await supabase.from('email_campaigns').update({
            status:     'failed',
            updated_at: new Date().toISOString(),
          }).eq('id', campaignId)
        }
      })
    },
  )

  /**
   * GET /email/unsubscribe
   * Public one-click unsubscribe link included in every campaign email.
   * ?rid=<recipientId> — marks the contact opted-out and shows a confirmation page.
   */
  fastify.get<{ Querystring: { rid?: string } }>(
    '/unsubscribe',
    async (request, reply) => {
      const recipientId = request.query.rid
      if (!recipientId) return reply.status(400).send('Invalid unsubscribe link.')

      const { data: recipient } = await supabase
        .from('email_campaign_recipients')
        .select('id, contact_id, campaign_id, workspace_id')
        .eq('id', recipientId)
        .maybeSingle()

      if (recipient) {
        const now = new Date().toISOString()
        await supabase.from('email_campaign_recipients').update({
          status:          'unsubscribed',
          unsubscribed_at: now,
        }).eq('id', recipientId)

        await supabase.from('email_campaigns').select('unsubscribed_count').eq('id', recipient.campaign_id).single()
          .then(async ({ data }) => {
            if (data) {
              await supabase.from('email_campaigns').update({
                unsubscribed_count: ((data as { unsubscribed_count: number }).unsubscribed_count ?? 0) + 1,
                updated_at:         now,
              }).eq('id', recipient.campaign_id)
            }
          })

        if (recipient.contact_id) {
          await supabase.from('sage_contacts').update({ email_opt_out: true }).eq('id', recipient.contact_id)
        }
      }

      // Return a simple confirmation page
      return reply.type('text/html').send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Unsubscribed</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;}
.box{text-align:center;padding:48px 32px;max-width:400px;}
h1{font-size:1.25rem;color:#111;margin-bottom:8px;}p{color:#666;font-size:.875rem;}</style></head>
<body><div class="box">
<h1>You've been unsubscribed</h1>
<p>You won't receive any more emails from this sender. If this was a mistake, please contact them directly.</p>
</div></body></html>`)
    },
  )

  /**
   * GET /email/campaigns/:id/stats
   * Returns live aggregate stats for a campaign.
   */
  fastify.get<{ Params: { id: string } }>(
    '/campaigns/:id/stats',
    async (request, reply) => {
      const serviceKey = request.headers['x-service-key'] as string | undefined
      if (serviceKey !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return reply.status(401).send({ error: 'Unauthorised' })
      }

      const { data, error } = await supabase
        .from('email_campaigns')
        .select(`
          id, status, sent_at,
          total_recipients, sent_count, delivered_count,
          opened_count, clicked_count, bounced_count,
          complained_count, unsubscribed_count, failed_count
        `)
        .eq('id', request.params.id)
        .single()

      if (error || !data) return reply.status(404).send({ error: 'Campaign not found' })
      return reply.send(data)
    },
  )
}

// ── Dispatch logic ────────────────────────────────────────────────────────────

async function dispatchCampaign(campaign: Record<string, unknown>) {
  const campaignId  = campaign.id  as string
  const workspaceId = campaign.workspace_id as string
  const filter      = (campaign.recipient_filter ?? { all: true }) as { all?: boolean; tags?: string[] }

  // Build contacts query — exclude opted-out and hard-bounced
  let query = supabase
    .from('sage_contacts')
    .select('id, email, name, tags')
    .eq('workspace_id', workspaceId)
    .eq('email_opt_out', false)
    .neq('email_deliverability', 'bounced')
    .neq('email_deliverability', 'complained')
    .not('email', 'is', null)

  if (!filter.all && filter.tags && filter.tags.length > 0) {
    query = query.overlaps('tags', filter.tags)
  }

  const { data: contacts, error: cErr } = await query
  if (cErr) throw cErr
  if (!contacts || contacts.length === 0) {
    await supabase.from('email_campaigns').update({
      status:           'completed',
      total_recipients: 0,
      updated_at:       new Date().toISOString(),
    }).eq('id', campaignId)
    return
  }

  // Update total recipients count
  await supabase.from('email_campaigns').update({
    total_recipients: contacts.length,
    updated_at:       new Date().toISOString(),
  }).eq('id', campaignId)

  // Create recipient records and batch them
  const BATCH_SIZE = 100
  const batches    = chunk(contacts, BATCH_SIZE)
  let totalSent    = 0
  let totalFailed  = 0

  for (let i = 0; i < batches.length; i++) {
    const batchContacts = batches[i]

    // Create batch record
    const { data: batch } = await supabase.from('email_send_batches').insert({
      workspace_id:    workspaceId,
      campaign_id:     campaignId,
      batch_number:    i + 1,
      recipient_count: batchContacts.length,
      status:          'sending',
      send_after:      new Date().toISOString(),
    }).select('id').single()

    if (!batch) continue

    // Create recipient records
    const recipientRows = batchContacts.map(c => ({
      workspace_id: workspaceId,
      campaign_id:  campaignId,
      batch_id:     batch.id,
      contact_id:   c.id,
      email:        c.email,
      name:         c.name ?? null,
      status:       'pending',
    }))

    const { data: inserted } = await supabase
      .from('email_campaign_recipients')
      .insert(recipientRows)
      .select('id, contact_id, email, name')

    if (!inserted) continue

    const recipients: CampaignRecipient[] = inserted.map(r => ({
      recipientId: r.id,
      contactId:   r.contact_id,
      email:       r.email,
      name:        r.name,
    }))

    const { sent, failed } = await sendCampaignBatch({
      workspaceId,
      campaignId,
      batchId:     batch.id,
      subject:     campaign.subject     as string,
      previewText: campaign.preview_text as string | null,
      bodyHtml:    campaign.body_html    as string,
      bodyText:    campaign.body_text    as string | null,
      fromName:    campaign.from_name    as string,
      fromEmail:   campaign.from_email   as string,
      replyTo:     campaign.reply_to     as string | null,
      recipients,
    })

    totalSent   += sent
    totalFailed += failed

    // Small delay between batches to respect Resend rate limits
    if (i < batches.length - 1) {
      await sleep(500)
    }
  }

  await supabase.from('email_campaigns').update({
    status:       totalFailed === contacts.length ? 'failed' : 'completed',
    sent_count:   totalSent,
    failed_count: totalFailed,
    updated_at:   new Date().toISOString(),
  }).eq('id', campaignId)

  // Update usage metering
  const period = new Date().toISOString().slice(0, 7) // YYYY-MM
  await supabase.from('email_usage_metering').upsert({
    workspace_id:         workspaceId,
    billing_period:       period,
    emails_sent:          totalSent,
    campaign_emails_sent: totalSent,
    updated_at:           new Date().toISOString(),
  }, { onConflict: 'workspace_id,billing_period', ignoreDuplicates: false })

  console.log(`[email-campaign] campaign=${campaignId} sent=${totalSent} failed=${totalFailed}`)
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
