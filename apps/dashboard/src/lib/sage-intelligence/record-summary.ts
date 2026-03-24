/**
 * Record summary generation for Sage.
 * Fetches live record data, summarises it with Claude Haiku,
 * and upserts the result into sage_record_summaries.
 *
 * The table has UNIQUE (entity_type, entity_id) so repeated calls
 * simply refresh the cached summary.
 */

import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type SummaryEntityType = 'contact' | 'deal' | 'ticket' | 'conversation' | 'company'

// ─── Prompt templates ────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a concise CRM analyst for the Appalix platform.
Summarise the provided record in 2–4 plain sentences.
Rules:
- Use only the data provided; do not invent or assume.
- Note the current status, any open actions or risks, and one recommended next step.
- Write in present tense, active voice.
- No bullet points — prose only.`

// ─── Data fetchers ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchContactData(workspaceId: string, entityId: string, admin: any): Promise<string | null> {
  const { data: c } = await admin
    .from('sage_contacts')
    .select('name, email, phone, company_name, contact_type, business_goal, notes, tags, ai_summary, source, created_at')
    .eq('id', entityId)
    .eq('workspace_id', workspaceId)
    .single()
  if (!c) return null

  const { data: deals } = await admin
    .from('sage_deals')
    .select('title, status, value, currency, stage:sage_pipeline_stages(name)')
    .eq('contact_id', entityId)
    .eq('workspace_id', workspaceId)
    .neq('status', 'lost')
    .limit(5)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dealLines = ((deals ?? []) as any[]).map((d: any) =>
    `${d.title} (${d.status}${d.stage?.name ? ' / ' + d.stage.name : ''})${d.value ? ' — ' + d.value + ' ' + (d.currency ?? '') : ''}`
  )

  return [
    `Name: ${c.name}`,
    c.email        ? `Email: ${c.email}` : '',
    c.company_name ? `Company: ${c.company_name}` : '',
    c.contact_type ? `Type: ${(c.contact_type as string).replace(/_/g, ' ')}` : '',
    c.business_goal ? `Goal: ${c.business_goal}` : '',
    c.notes        ? `Notes: ${c.notes}` : '',
    c.tags?.length  ? `Tags: ${(c.tags as string[]).join(', ')}` : '',
    c.source       ? `Source: ${c.source}` : '',
    dealLines.length > 0 ? `Open deals: ${dealLines.join('; ')}` : 'Open deals: none',
    c.ai_summary   ? `Existing AI summary: ${c.ai_summary}` : '',
  ].filter(Boolean).join('\n')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchDealData(workspaceId: string, entityId: string, admin: any): Promise<string | null> {
  const { data: d } = await admin
    .from('sage_deals')
    .select('title, value, currency, status, priority, company_name, close_date, created_at, stage:sage_pipeline_stages(name), pipeline:sage_pipelines(name), contact:sage_contacts(name, email)')
    .eq('id', entityId)
    .eq('workspace_id', workspaceId)
    .single()
  if (!d) return null

  return [
    `Deal: ${d.title}`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (d.contact as any)?.name ? `Contact: ${(d.contact as any).name}` : '',
    d.company_name ? `Company: ${d.company_name}` : '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (d.pipeline as any)?.name ? `Pipeline: ${(d.pipeline as any).name}` : '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (d.stage as any)?.name ? `Stage: ${(d.stage as any).name}` : '',
    d.status   ? `Status: ${d.status}` : '',
    d.priority ? `Priority: ${d.priority}` : '',
    d.value    ? `Value: ${d.value} ${d.currency ?? ''}`.trim() : '',
    d.close_date ? `Close date: ${d.close_date}` : '',
  ].filter(Boolean).join('\n')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchTicketData(workspaceId: string, entityId: string, admin: any): Promise<string | null> {
  const { data: t } = await admin
    .from('sage_tickets')
    .select('title, description, status, priority, created_at, contact:sage_contacts(name, email)')
    .eq('id', entityId)
    .eq('workspace_id', workspaceId)
    .single()
  if (!t) return null

  return [
    `Ticket: ${t.title}`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (t.contact as any)?.name ? `Contact: ${(t.contact as any).name}` : '',
    t.status      ? `Status: ${t.status}` : '',
    t.priority    ? `Priority: ${t.priority}` : '',
    t.description ? `Description: ${(t.description as string).slice(0, 500)}` : '',
  ].filter(Boolean).join('\n')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchConversationData(workspaceId: string, entityId: string, admin: any): Promise<string | null> {
  const { data: c } = await admin
    .from('conversations')
    .select('title, summary, sentiment, status, ai_summary, ai_insights, created_at')
    .eq('id', entityId)
    .eq('workspace_id', workspaceId)
    .single()
  if (!c) return null

  return [
    `Conversation: ${c.title ?? '(untitled)'}`,
    c.status    ? `Status: ${c.status}` : '',
    c.sentiment ? `Sentiment: ${c.sentiment}` : '',
    c.summary   ? `Summary: ${c.summary}` : '',
    c.ai_summary ? `AI summary: ${c.ai_summary}` : '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c.ai_insights?.length ? `Insights: ${(c.ai_insights as any[]).join('; ')}` : '',
  ].filter(Boolean).join('\n')
}

// ─── Key facts extractor ─────────────────────────────────────────────────────

function extractKeyFacts(rawData: string): string[] {
  // Simple line-by-line extraction — each non-empty line becomes a fact
  return rawData
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && l.includes(': '))
    .slice(0, 10)
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Generate (or refresh) a summary for a specific record and persist it to
 * sage_record_summaries. Returns the summary text, or null if the record
 * doesn't exist or an error occurs.
 *
 * Safe to call fire-and-forget: errors are caught internally.
 */
export async function generateRecordSummary(
  workspaceId: string,
  entityType:  SummaryEntityType,
  entityId:    string,
): Promise<string | null> {
  try {
    const admin = createAdminClient()

    // Fetch raw record data based on entity type
    let rawData: string | null = null
    switch (entityType) {
      case 'contact':      rawData = await fetchContactData(workspaceId, entityId, admin); break
      case 'deal':         rawData = await fetchDealData(workspaceId, entityId, admin);    break
      case 'ticket':       rawData = await fetchTicketData(workspaceId, entityId, admin);  break
      case 'conversation': rawData = await fetchConversationData(workspaceId, entityId, admin); break
      default:             return null
    }

    if (!rawData) return null

    // Generate summary with Claude Haiku
    const message = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 384,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: `Summarise this ${entityType}:\n\n${rawData}` }],
    })

    const summary = message.content[0]?.type === 'text' ? message.content[0].text.trim() : null
    if (!summary) return null

    const keyFacts = extractKeyFacts(rawData)

    // Upsert to sage_record_summaries
    await admin.from('sage_record_summaries').upsert(
      {
        workspace_id: workspaceId,
        entity_type:  entityType,
        entity_id:    entityId,
        summary,
        key_facts:    keyFacts,
        generated_at: new Date().toISOString(),
        model:        'claude-haiku-4-5-20251001',
      },
      { onConflict: 'entity_type,entity_id' },
    )

    return summary
  } catch {
    // Never let summary generation break the calling flow
    return null
  }
}

/**
 * Fetch a pre-generated summary from sage_record_summaries.
 * Returns null if no summary exists yet.
 */
export async function getRecordSummary(
  workspaceId: string,
  entityType:  SummaryEntityType,
  entityId:    string,
): Promise<{ summary: string; keyFacts: string[]; generatedAt: string } | null> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('sage_record_summaries')
      .select('summary, key_facts, generated_at')
      .eq('workspace_id', workspaceId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .single()

    if (!data) return null
    return {
      summary:     data.summary as string,
      keyFacts:    (data.key_facts ?? []) as string[],
      generatedAt: data.generated_at as string,
    }
  } catch {
    return null
  }
}
