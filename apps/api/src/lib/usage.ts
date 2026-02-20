import { supabase } from './supabase.js'

// Token pricing in USD per 1M tokens (as of Jan 2026)
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6':         { input: 3.00,  output: 15.00 },
  'claude-opus-4-6':           { input: 15.00, output: 75.00 },
  'claude-haiku-4-5-20251001': { input: 0.80,  output: 4.00  },
  'text-embedding-3-small':    { input: 0.02,  output: 0     },
  'text-embedding-ada-002':    { input: 0.10,  output: 0     },
}

function calcCost(model: string, tokensIn: number, tokensOut: number): number {
  const price = PRICING[model] ?? { input: 3.00, output: 15.00 }
  return (tokensIn / 1_000_000) * price.input + (tokensOut / 1_000_000) * price.output
}

interface UsageParams {
  workspaceId:    string
  eventType:      'message' | 'agent_run' | 'tool_call' | 'rag_query' | 'embedding'
  model?:         string
  tokensInput?:   number
  tokensOutput?:  number
  conversationId?: string
  messageId?:     string
  agentRunId?:    string
  metadata?:      Record<string, unknown>
}

export async function recordUsage(params: UsageParams): Promise<void> {
  const {
    workspaceId, eventType, model,
    tokensInput = 0, tokensOutput = 0,
    conversationId, messageId, agentRunId, metadata = {},
  } = params

  const cost = model ? calcCost(model, tokensInput, tokensOutput) : 0

  const { error } = await supabase.from('usage_events').insert({
    workspace_id:    workspaceId,
    event_type:      eventType,
    model:           model ?? null,
    tokens_input:    tokensInput,
    tokens_output:   tokensOutput,
    cost_usd:        cost,
    conversation_id: conversationId ?? null,
    message_id:      messageId ?? null,
    agent_run_id:    agentRunId ?? null,
    metadata,
  })

  if (error) {
    // Non-fatal — log and continue; billing data loss is better than message failure
    console.error('[usage] failed to record event:', error.message)
  }
}
