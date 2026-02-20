import OpenAI from 'openai'
import { config } from '../../config.js'

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY })

// Must match the vector(1536) column in the chunks table
const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMS  = 1536

/**
 * Embed a single text string.
 * Used for query embedding before RAG retrieval.
 */
export async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8191),  // model's token limit
    dimensions: EMBEDDING_DIMS,
  })
  return response.data[0].embedding
}

/**
 * Embed multiple texts in a single API call (batch).
 * Used during document ingestion.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const response = await openai.embeddings.create({
    model:      EMBEDDING_MODEL,
    input:      texts.map((t) => t.slice(0, 8191)),
    dimensions: EMBEDDING_DIMS,
  })

  // Sort by index to ensure order matches input
  return response.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding)
}

/**
 * Split text into overlapping chunks suitable for embedding.
 * Simple character-based splitter; replace with tiktoken for precise token counts.
 */
export function chunkText(
  text:        string,
  chunkSize:   number = 1500,
  overlapSize: number = 200,
): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end  = Math.min(start + chunkSize, text.length)
    const chunk = text.slice(start, end).trim()
    if (chunk) chunks.push(chunk)
    start += chunkSize - overlapSize
  }

  return chunks
}

export const EMBEDDING_TOKEN_COST_PER_M = 0.02  // text-embedding-3-small
