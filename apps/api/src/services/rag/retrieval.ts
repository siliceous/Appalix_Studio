import { supabase } from '../../lib/supabase.js'
import { embedText } from './embeddings.js'
import { recordUsage } from '../../lib/usage.js'

export interface RetrievedChunk {
  id:         string
  sourceId:   string
  content:    string
  similarity: number
  metadata:   Record<string, unknown>
}

export interface RetrievalParams {
  workspaceId:     string
  query:           string
  matchThreshold?: number
  matchCount?:     number
  sourceIds?:      string[]   // restrict to specific sources
  conversationId?: string
}

/**
 * Embed the query, run pgvector cosine similarity search, return ranked chunks.
 */
export async function retrieveContext(params: RetrievalParams): Promise<RetrievedChunk[]> {
  const {
    workspaceId,
    query,
    matchThreshold = 0.70,
    matchCount     = 5,
    sourceIds,
    conversationId,
  } = params

  // Embed the query
  const queryEmbedding = await embedText(query)

  // Record embedding usage (approx — we don't get token counts from embeddings API response)
  await recordUsage({
    workspaceId,
    eventType:      'rag_query',
    model:          'text-embedding-3-small',
    tokensInput:    Math.ceil(query.length / 4),  // rough approximation
    conversationId,
  })

  // Call the Supabase RPC function (defined in migration 00015)
  let result

  if (sourceIds && sourceIds.length > 0) {
    result = await supabase.rpc('match_chunks_multi_source', {
      query_embedding: queryEmbedding as never,
      p_workspace_id:  workspaceId,
      p_source_ids:    sourceIds,
      match_threshold: matchThreshold,
      match_count:     matchCount,
    })
  } else {
    result = await supabase.rpc('match_chunks', {
      query_embedding: queryEmbedding as never,
      p_workspace_id:  workspaceId,
      match_threshold: matchThreshold,
      match_count:     matchCount,
    })
  }

  if (result.error) {
    console.error('[rag/retrieval] RPC error:', result.error.message)
    return []
  }

  return (result.data ?? []).map((row: {
    id: string; source_id: string; content: string; similarity: number; metadata: Record<string, unknown>
  }) => ({
    id:         row.id,
    sourceId:   row.source_id,
    content:    row.content,
    similarity: row.similarity,
    metadata:   row.metadata ?? {},
  }))
}

/**
 * Format retrieved chunks into a context string for the system prompt.
 */
export function buildRagContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return ''

  return chunks
    .map((chunk, i) => `[${i + 1}] ${chunk.content}`)
    .join('\n\n')
}
