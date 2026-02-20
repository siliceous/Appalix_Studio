import Anthropic from '@anthropic-ai/sdk'
import { config } from '../../config.js'

const anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY })

export interface ChatMessage {
  role:    'user' | 'assistant'
  content: string
}

export interface ClaudeCallParams {
  model:        string
  systemPrompt: string
  messages:     ChatMessage[]
  maxTokens?:   number
  temperature?: number
  tools?:       Anthropic.Tool[]
}

export interface ClaudeCallResult {
  content:      string
  stopReason:   string
  tokensInput:  number
  tokensOutput: number
  toolUses?:    Anthropic.ToolUseBlock[]
}

/**
 * Single (non-streaming) Claude call.
 * Returns text content, token counts, and any tool_use blocks.
 */
export async function callClaude(params: ClaudeCallParams): Promise<ClaudeCallResult> {
  const {
    model,
    systemPrompt,
    messages,
    maxTokens   = 1024,
    temperature = 0.7,
    tools,
  } = params

  const response = await anthropic.messages.create({
    model,
    max_tokens:  maxTokens,
    temperature,
    system:      systemPrompt,
    messages:    messages as Anthropic.MessageParam[],
    ...(tools?.length ? { tools } : {}),
  })

  const textBlocks    = response.content.filter((b): b is Anthropic.TextBlock     => b.type === 'text')
  const toolUseBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock  => b.type === 'tool_use')

  return {
    content:      textBlocks.map((b) => b.text).join(''),
    stopReason:   response.stop_reason ?? 'end_turn',
    tokensInput:  response.usage.input_tokens,
    tokensOutput: response.usage.output_tokens,
    toolUses:     toolUseBlocks.length ? toolUseBlocks : undefined,
  }
}

/**
 * Build the system prompt, optionally injecting RAG context.
 */
export function buildSystemPrompt(
  basePrompt: string | null,
  ragContext?: string,
): string {
  const base = basePrompt?.trim() ||
    'You are a helpful AI assistant. Answer questions clearly and concisely.'

  if (!ragContext) return base

  return `${base}

---
RELEVANT KNOWLEDGE BASE CONTEXT (use this to answer the question):
${ragContext}
---
If the context above does not contain enough information to answer, say so clearly and suggest the user contact support.`
}

export { anthropic }
