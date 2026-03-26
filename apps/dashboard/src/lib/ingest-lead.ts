/**
 * Universal Lead Ingestion Layer
 *
 * Single entry point for ALL lead sources:
 *   Ads → Forms → Email → Chat → Booking → Upload
 *
 * Handles: normalization · deduplication · scoring · routing to correct tables
 */

import { createAdminClient } from '@/lib/supabase/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export type SourcePlatform =
  | 'google_ads'
  | 'meta'
  | 'linkedin'
  | 'tiktok'
  | 'microsoft_ads'
  | 'calendly'
  | 'mailchimp'
  | 'activecampaign'
  | 'klaviyo'
  | 'convertkit'
  | 'constantcontact'
  | 'gravity_forms'
  | 'typeform'
  | 'google_forms'
  | 'fluent_forms'
  | 'csv_upload'
  | 'manual'

/**
 * Normalized lead — all source adapters map their raw payload to this shape
 * before calling ingestLead().
 */
export interface UniversalLead {
  name:          string
  email:         string | null
  phone:         string | null
  company:       string | null
  job_title:     string | null
  website:       string | null
  // Source metadata
  campaign_name: string | null
  ad_name:       string | null
  form_name:     string | null
  // Any extra source-specific fields (address, tags, custom questions, etc.)
  extra?:        Record<string, string>
}

export interface IngestOptions {
  workspaceId:    string
  sourcePlatform: SourcePlatform
  rawPayload:     unknown
  /** lead_ad_sources.id — required for ad platforms to update stats + leads table */
  sourceId?:      string
  /** sage_forms.id — for native form submissions */
  formId?:        string
}

export interface IngestResult {
  submissionId: string
  leadId?:      string
  status:       'created' | 'deduplicated'
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Platforms that also write to the leads table (ad pipeline view) */
const AD_PLATFORMS = new Set<SourcePlatform>([
  'google_ads', 'meta', 'linkedin', 'tiktok', 'microsoft_ads',
])

// ── Helpers ───────────────────────────────────────────────────────────────────

export function scoreLead(lead: Pick<UniversalLead, 'email' | 'phone' | 'company' | 'job_title'>): 'high' | 'medium' | 'low' {
  const count = [lead.email, lead.phone, lead.company, lead.job_title].filter(Boolean).length
  if (count >= 3) return 'high'
  if (count >= 2) return 'medium'
  return 'low'
}

/** Builds the normalized fields JSONB object — strips null/empty values */
export function buildLeadFields(lead: UniversalLead): Record<string, string> {
  return Object.fromEntries(
    Object.entries({
      name:      lead.name      || null,
      email:     lead.email,
      phone:     lead.phone,
      company:   lead.company,
      job_title: lead.job_title,
      website:   lead.website,
      campaign:  lead.campaign_name,
      form_name: lead.form_name,
      ad_name:   lead.ad_name,
      ...lead.extra,
    }).filter(([, v]) => v != null && v !== '')
  ) as Record<string, string>
}

// ── Core ──────────────────────────────────────────────────────────────────────

/**
 * ingestLead — universal entry point for all lead sources.
 *
 * 1. Deduplicates against sage_form_submissions (workspace-wide by email/phone)
 * 2. Inserts into sage_form_submissions (primary store — powers Forms feed + AI)
 * 3. For ad platforms: also upserts into leads table (powers Leads pipeline)
 * 4. Updates source stats for ad platforms
 */
export async function ingestLead(
  lead: UniversalLead,
  opts: IngestOptions,
): Promise<IngestResult> {
  const { workspaceId, sourcePlatform, rawPayload, sourceId, formId } = opts
  const admin  = createAdminClient()
  const score  = scoreLead(lead)
  const fields = buildLeadFields(lead)

  // ── 1. Deduplication ────────────────────────────────────────────────────────
  // Workspace-wide dedup: same contact from different sources is one record
  if (lead.email || lead.phone) {
    let existingSub: { id: string } | null = null

    if (lead.email) {
      const { data } = await admin
        .from('sage_form_submissions')
        .select('id')
        .eq('workspace_id', workspaceId)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter('fields->>email' as any, 'eq', lead.email)
        .limit(1)
        .maybeSingle()
      existingSub = data as { id: string } | null
    }

    if (!existingSub && lead.phone) {
      const { data } = await admin
        .from('sage_form_submissions')
        .select('id')
        .eq('workspace_id', workspaceId)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter('fields->>phone' as any, 'eq', lead.phone)
        .limit(1)
        .maybeSingle()
      existingSub = data as { id: string } | null
    }

    if (existingSub) {
      // Enrich existing record with any new info from this source
      await admin
        .from('sage_form_submissions')
        .update({
          fields,
          ai_priority: score,
          raw_payload: rawPayload as Record<string, unknown>,
        })
        .eq('id', existingSub.id)
      return { submissionId: existingSub.id, status: 'deduplicated' }
    }
  }

  // ── 2. Insert into sage_form_submissions ────────────────────────────────────
  const { data: newSub, error: subErr } = await admin
    .from('sage_form_submissions')
    .insert({
      workspace_id:    workspaceId,
      form_id:         formId ?? null,
      source_platform: sourcePlatform,
      fields,
      raw_payload:     rawPayload as Record<string, unknown>,
      ai_priority:     score,
    })
    .select('id')
    .single()

  if (subErr || !newSub) {
    throw new Error(`ingestLead: insert failed — ${subErr?.message ?? 'unknown error'}`)
  }

  const submissionId = (newSub as { id: string }).id
  let leadId: string | undefined

  // ── 3. Ad platforms: upsert into leads table ─────────────────────────────
  if (AD_PLATFORMS.has(sourcePlatform) && sourceId) {
    // Dedup in leads table separately (ad pipeline has its own dedup)
    let existingLead: { id: string } | null = null

    if (lead.email || lead.phone) {
      const orParts: string[] = []
      if (lead.email) orParts.push(`email.eq.${lead.email}`)
      if (lead.phone) orParts.push(`phone.eq.${lead.phone}`)

      const { data } = await admin
        .from('leads')
        .select('id')
        .eq('workspace_id', workspaceId)
        .or(orParts.join(','))
        .limit(1)
        .maybeSingle()
      existingLead = data as { id: string } | null
    }

    if (existingLead) {
      await admin.from('leads').update({
        name:          lead.name,
        company:       lead.company,
        job_title:     lead.job_title,
        website:       lead.website,
        campaign_name: lead.campaign_name,
        ad_name:       lead.ad_name,
        form_name:     lead.form_name,
        lead_score:    score,
        updated_at:    new Date().toISOString(),
      }).eq('id', existingLead.id)

      await admin.from('lead_events').insert({
        lead_id:    existingLead.id,
        event_type: 'lead_deduplicated',
        event_data: { source: sourcePlatform, raw_payload: rawPayload },
      })
      leadId = existingLead.id
    } else {
      const { data: newLead } = await admin
        .from('leads')
        .insert({
          workspace_id:    workspaceId,
          source_id:       sourceId,
          source_platform: sourcePlatform,
          name:            lead.name,
          email:           lead.email,
          phone:           lead.phone,
          company:         lead.company,
          job_title:       lead.job_title,
          website:         lead.website,
          campaign_name:   lead.campaign_name,
          ad_name:         lead.ad_name,
          form_name:       lead.form_name,
          lead_score:      score,
          pipeline_stage:  'new_lead',
          raw_payload:     rawPayload as Record<string, unknown>,
        })
        .select('id')
        .single()

      if (newLead) {
        leadId = (newLead as { id: string }).id

        await admin.from('lead_events').insert({
          lead_id:    leadId,
          event_type: 'lead_created',
          event_data: { source: sourcePlatform, score },
        })

        // Update source stats
        const { data: src } = await admin
          .from('lead_ad_sources')
          .select('leads_count')
          .eq('id', sourceId)
          .single()

        if (src) {
          await admin.from('lead_ad_sources').update({
            leads_count:  ((src as { leads_count: number }).leads_count ?? 0) + 1,
            last_lead_at: new Date().toISOString(),
          }).eq('id', sourceId)
        }
      }
    }
  }

  return { submissionId, leadId, status: 'created' }
}
