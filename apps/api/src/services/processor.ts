import { supabase } from '../lib/supabase.js'
import { getOrCreateConversation, appendMessage, getRecentMessages } from '../lib/conversation.js'
import { recordUsage } from '../lib/usage.js'
import { callClaude, buildSystemPrompt } from './ai/claude.js'
import { retrieveContext, buildRagContext } from './rag/retrieval.js'
import { runAgent } from './agent/runner.js'
import type { IncomingMessage, OutgoingMessage } from '../adapters/types.js'

/**
 * Core message processor — platform-agnostic.
 *
 * Called by every platform route handler after the adapter normalises
 * the inbound payload to IncomingMessage.
 *
 * Returns the AI reply text plus the conversation ID.
 */
export async function processMessage(
  msg: IncomingMessage,
): Promise<{ reply: string; conversationId: string }> {
  const {
    workspaceId,
    botId,
    integrationId,
    platform,
    platformThreadId,
    platformUserId,
    text,
  } = msg

  // ---------------------------------------------------------------
  // 1. Load bot config
  // ---------------------------------------------------------------
  const { data: bot, error: botError } = await supabase
    .from('bots')
    .select('*')
    .eq('id', botId)
    .single()

  if (botError || !bot) {
    throw new Error(`Bot not found: ${botId}`)
  }

  // ---------------------------------------------------------------
  // 2. Get or create conversation
  // ---------------------------------------------------------------
  const conversationId = await getOrCreateConversation({
    workspaceId,
    botId,
    integrationId,
    platform,
    platformThreadId,
    platformUserId,
  })

  // ---------------------------------------------------------------
  // 3. Save user message
  // ---------------------------------------------------------------
  await appendMessage({
    conversationId,
    workspaceId,
    role:    'user',
    content: text,
  })

  // ---------------------------------------------------------------
  // 4. Load conversation history (for memory-enabled bots)
  // ---------------------------------------------------------------
  const history = bot.enable_memory
    ? await getRecentMessages(conversationId, 20)
    : []

  // ---------------------------------------------------------------
  // 5. RAG retrieval (if enabled)
  // ---------------------------------------------------------------
  let ragContext: string | undefined

  console.log(`[processor] bot=${botId} enable_rag=${bot.enable_rag}`)

  if (bot.enable_rag) {
    const chunks = await retrieveContext({
      workspaceId,
      query:          text,
      matchCount:     5,
      conversationId,
    })
    ragContext = buildRagContext(chunks)
    console.log(`[processor] ragContext ${ragContext ? `${ragContext.length} chars` : 'EMPTY — no chunks matched'}`)
  }

  const systemPrompt = buildSystemPrompt(bot.system_prompt, ragContext)

  // ---------------------------------------------------------------
  // 6. Generate AI response
  // ---------------------------------------------------------------
  const startTime = Date.now()
  let reply: string
  let tokensIn  = 0
  let tokensOut = 0

  const messages = [
    ...history,
    { role: 'user' as const, content: text },
  ]

  if (bot.enable_tools) {
    // Multi-step agent loop
    const result = await runAgent({
      workspaceId,
      conversationId,
      botId,
      model:        bot.model,
      systemPrompt,
      messages:     history,
      maxTokens:    bot.max_tokens,
      temperature:  bot.temperature,
    })
    reply     = result.reply
    tokensIn  = result.tokensInput
    tokensOut = result.tokensOutput
  } else {
    // Single-turn Claude call
    const result = await callClaude({
      model:        bot.model,
      systemPrompt,
      messages,
      maxTokens:    bot.max_tokens,
      temperature:  bot.temperature,
    })
    reply     = result.content || (bot.fallback_message ?? 'I\'m sorry, I couldn\'t generate a response.')
    tokensIn  = result.tokensInput
    tokensOut = result.tokensOutput
  }

  const responseTimeMs = Date.now() - startTime

  // ---------------------------------------------------------------
  // 7. Save assistant message
  // ---------------------------------------------------------------
  const msgId = await appendMessage({
    conversationId,
    workspaceId,
    role:           'assistant',
    content:        reply,
    model:          bot.model,
    tokensInput:    tokensIn,
    tokensOutput:   tokensOut,
    responseTimeMs,
  })

  // ---------------------------------------------------------------
  // 8. Record usage (only for single-turn; agent loop records its own)
  // ---------------------------------------------------------------
  if (!bot.enable_tools) {
    await recordUsage({
      workspaceId,
      eventType:     'message',
      model:         bot.model,
      tokensInput:   tokensIn,
      tokensOutput:  tokensOut,
      conversationId,
      messageId:     msgId,
      metadata:      { platform, response_time_ms: responseTimeMs },
    })
  }

  return { reply, conversationId }
}

/**
 * Load integration context from the DB.
 * Returns null if not found or inactive.
 */
export async function resolveIntegration(integrationId: string) {
  const { data, error } = await supabase
    .from('integrations')
    .select('id, workspace_id, bot_id, platform, config, status, webhook_secret')
    .eq('id', integrationId)
    .single()

  if (error || !data) return null
  if (data.status !== 'active') return null
  if (!data.bot_id) return null

  return data
}
