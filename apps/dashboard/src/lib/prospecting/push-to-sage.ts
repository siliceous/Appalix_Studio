import { createAdminClient } from '@/lib/supabase/server'
import { triggerAiReview } from '@/lib/ai-guidance/review-trigger'

interface ProspectToPush {
  id:           string
  workspace_id: string
  domain:       string
  company_name: string | null
  description:  string | null
  emails:       string[]
  phones:       string[]
  location_text: string | null
}

interface PushResult {
  dealId:    string
  contactId: string | null
}

/**
 * Creates a contact + deal in Sage from a qualified prospect,
 * then triggers an AI review so it appears in the guidance panel.
 *
 * Pipeline selection: uses the first pipeline in the workspace.
 * Stage selection: uses the first stage (leftmost / earliest).
 */
export async function pushProspectToSage(
  prospect:   ProspectToPush,
  icpName:    string,
): Promise<PushResult> {
  const admin = createAdminClient()

  // ── Get a pipeline + stage to push into ───────────────────────────────────
  const { data: pipeline } = await admin
    .from('sage_pipelines')
    .select('id')
    .eq('workspace_id', prospect.workspace_id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (!pipeline) throw new Error('No pipeline found in workspace')

  const { data: stage } = await admin
    .from('sage_pipeline_stages')
    .select('id')
    .eq('pipeline_id', pipeline.id)
    .order('position', { ascending: true })
    .limit(1)
    .single()

  if (!stage) throw new Error('No stage found in pipeline')

  // ── Create contact (if email available) ───────────────────────────────────
  let contactId: string | null = null
  const email = prospect.emails[0] ?? null
  const phone = prospect.phones[0] ?? null

  if (email || prospect.company_name) {
    const { data: contact } = await admin
      .from('sage_contacts')
      .insert({
        workspace_id: prospect.workspace_id,
        name:         prospect.company_name ?? prospect.domain,
        email:        email,
        phone:        phone,
        company_name: prospect.company_name,
        website_url:  `https://${prospect.domain}`,
        city:         prospect.location_text ?? null,
        source:       'prospecting_engine',
        notes:        prospect.description ?? null,
      })
      .select('id')
      .single()

    contactId = contact?.id ?? null
  }

  // ── Create deal ───────────────────────────────────────────────────────────
  const dealTitle = prospect.company_name ?? prospect.domain

  const { data: deal } = await admin
    .from('sage_deals')
    .insert({
      workspace_id: prospect.workspace_id,
      pipeline_id:  pipeline.id,
      stage_id:     stage.id,
      title:        dealTitle,
      contact_id:   contactId,
      source:       'prospecting_engine',
      status:       'open',
      description:  prospect.description
        ? `${prospect.description}\n\nDiscovered via prospecting engine (ICP: ${icpName}).`
        : `Discovered via prospecting engine (ICP: ${icpName}). Domain: ${prospect.domain}`,
    })
    .select('id')
    .single()

  if (!deal) throw new Error('Failed to create deal')

  // ── Log timeline event ────────────────────────────────────────────────────
  await admin.from('sage_activity_log').insert({
    workspace_id: prospect.workspace_id,
    entity_type:  'deal',
    entity_id:    deal.id,
    event_type:   'deal_created',
    payload: {
      summary:  `Prospect discovered via prospecting engine`,
      source:   'prospecting_engine',
      domain:   prospect.domain,
      icp:      icpName,
    },
  })

  // ── Trigger AI review (non-blocking) ──────────────────────────────────────
  triggerAiReview('deal', deal.id, prospect.workspace_id, 'prospect_discovered').catch(() => {})

  return { dealId: deal.id, contactId }
}
