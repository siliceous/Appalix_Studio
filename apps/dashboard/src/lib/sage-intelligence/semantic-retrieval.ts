/**
 * Semantic retrieval for Sage — uses vector similarity search over sage_embeddings.
 * Calls the match_sage_embeddings() Postgres RPC function which uses pgvector cosine distance.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { generateEmbedding } from './embeddings'
import type { SemanticHit, SageAccessScope } from './types'

interface RpcRow {
  id:          string
  entity_type: string
  entity_id:   string
  content:     string
  similarity:  number
}

/**
 * Run a semantic (vector) retrieval for the given query.
 *
 * @param query        - Natural language query to embed and search
 * @param scope        - Access scope (used to validate visible records where possible)
 * @param entityTypes  - Optional array to restrict which entity types to search
 * @param threshold    - Minimum cosine similarity (default 0.5, lower = more results but less precise)
 * @param limit        - Maximum number of hits to return (default 8)
 */
export async function runSemanticRetrieval(
  query:       string,
  scope:       SageAccessScope,
  entityTypes?: ('contact' | 'deal' | 'ticket' | 'conversation' | 'email' | 'company')[],
  threshold    = 0.5,
  limit        = 8,
): Promise<SemanticHit[]> {
  if (!process.env.OPENAI_API_KEY) return []

  const embedding = await generateEmbedding(query)
  const admin     = createAdminClient()

  const { data, error } = await admin.rpc('match_sage_embeddings', {
    query_embedding: embedding,
    p_workspace_id:  scope.workspaceId,
    p_entity_types:  entityTypes && entityTypes.length > 0 ? entityTypes : null,
    match_threshold: threshold,
    match_count:     limit,
  })

  if (error || !data) return []

  const rows = data as RpcRow[]

  // Apply access scope: if the user can't see all records, filter out records
  // that belong to users outside their visible set.
  // For now we trust the workspace_id filter on the RPC and return all results —
  // fine-grained record-level filtering happens during answer composition.
  const hits: SemanticHit[] = rows
    .filter(r => r.similarity >= threshold)
    .map(r => ({
      entityType: r.entity_type,
      entityId:   r.entity_id,
      content:    r.content,
      similarity: r.similarity,
    }))

  return hits
}

/**
 * Infer which entity types to search based on the query category.
 * Keeps semantic searches focused so irrelevant entity types don't pollute results.
 */
export function inferEntityTypesFromCategory(category: string): ('contact' | 'deal' | 'ticket' | 'conversation' | 'email' | 'company')[] | undefined {
  switch (category) {
    case 'contacts':      return ['contact']
    case 'deals':         return ['deal', 'contact']
    case 'tickets':       return ['ticket', 'contact']
    case 'conversations': return ['conversation', 'contact']
    case 'emails':        return ['email', 'contact']
    case 'companies':     return ['company', 'contact']
    case 'pipeline':      return ['deal']
    default:              return undefined // search all entity types
  }
}
