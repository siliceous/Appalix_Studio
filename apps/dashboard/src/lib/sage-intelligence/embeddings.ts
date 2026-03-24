/**
 * Embedding generation for Sage semantic retrieval.
 * Uses OpenAI text-embedding-3-small (1536 dims) — matches sage_embeddings.embedding vector(1536).
 */

import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/server'

let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

/**
 * Generate a 1536-dimensional embedding for a given text string.
 * Text is truncated to 8,191 chars (safe token budget for text-embedding-3-small).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8191),
  })
  return response.data[0].embedding
}

/**
 * Build a flat text representation of a contact for embedding.
 */
export function buildContactEmbedContent(c: {
  name: string
  email?: string | null
  phone?: string | null
  company_name?: string | null
  contact_type?: string | null
  business_goal?: string | null
  notes?: string | null
  tags?: string[]
  ai_summary?: string | null
}): string {
  return [
    `Contact: ${c.name}`,
    c.email        ? `Email: ${c.email}` : '',
    c.phone        ? `Phone: ${c.phone}` : '',
    c.company_name ? `Company: ${c.company_name}` : '',
    c.contact_type ? `Type: ${c.contact_type.replace(/_/g, ' ')}` : '',
    c.business_goal ? `Goal: ${c.business_goal}` : '',
    c.tags?.length  ? `Tags: ${c.tags.join(', ')}` : '',
    c.notes        ? `Notes: ${c.notes}` : '',
    c.ai_summary   ? `Summary: ${c.ai_summary}` : '',
  ].filter(Boolean).join('\n')
}

/**
 * Build a flat text representation of a deal for embedding.
 */
export function buildDealEmbedContent(d: {
  title: string
  value?: number | null
  currency?: string
  status?: string | null
  company_name?: string | null
  priority?: string | null
}): string {
  return [
    `Deal: ${d.title}`,
    d.company_name ? `Company: ${d.company_name}` : '',
    d.value        ? `Value: ${d.value} ${d.currency ?? ''}`.trim() : '',
    d.status       ? `Status: ${d.status}` : '',
    d.priority     ? `Priority: ${d.priority}` : '',
  ].filter(Boolean).join('\n')
}

/**
 * Build a flat text representation of a ticket for embedding.
 */
export function buildTicketEmbedContent(t: {
  title: string
  description?: string | null
  priority?: string | null
  status?: string | null
}): string {
  return [
    `Ticket: ${t.title}`,
    t.priority    ? `Priority: ${t.priority}` : '',
    t.status      ? `Status: ${t.status}` : '',
    t.description ? `Description: ${t.description.slice(0, 500)}` : '',
  ].filter(Boolean).join('\n')
}

/**
 * Generate an embedding for a record and upsert it into sage_embeddings.
 * The table has UNIQUE (entity_type, entity_id) so upsert replaces stale vectors.
 *
 * This is intentionally server-side only and fire-and-forget safe —
 * callers should wrap in void + .catch(() => {}) to avoid blocking mutations.
 */
export async function upsertEntityEmbedding(
  workspaceId: string,
  entityType:  'contact' | 'deal' | 'ticket' | 'company' | 'conversation' | 'email',
  entityId:    string,
  content:     string,
): Promise<void> {
  if (!process.env.OPENAI_API_KEY) return   // skip if key not configured

  const embedding = await generateEmbedding(content)
  const admin = createAdminClient()

  await admin.from('sage_embeddings').upsert(
    {
      workspace_id: workspaceId,
      entity_type:  entityType,
      entity_id:    entityId,
      content,
      embedding,
      updated_at:   new Date().toISOString(),
    },
    { onConflict: 'entity_type,entity_id' },
  )
}
