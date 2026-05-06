import { supabase } from '../lib/supabase.js'
import { getOrCreateConversation, appendMessage, getRecentMessages } from '../lib/conversation.js'
import { recordUsage } from '../lib/usage.js'
import { callClaude, buildSystemPrompt } from './ai/claude.js'
import { retrieveContext, buildRagContext } from './rag/retrieval.js'
import { runAgent } from './agent/runner.js'
import { extractLeadData, routeLeadToProvider } from './lead-capture.js'
import {
  detectHandoffIntent,
  sendHandoffNotification,
  isHandoffConfigured,
  buildWaLink,
  HANDOFF_SYSTEM_INJECTION,
  type HandoffChannelConfig,
} from './handoff.js'
import { getConversationVerification, type ConversationVerification } from './identity-verifier.js'
import { isInternalPlatform, buildSensitivityInjection } from './sensitive-query.js'
import type { IncomingMessage } from '../adapters/types.js'

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
  options?: { skipUserMessage?: boolean; skipAssistantMessage?: boolean },
): Promise<{ reply: string; conversationId: string; botPaused?: boolean }> {
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
  // 1. Load bot config + integration config (CRM / handoff webhooks)
  // ---------------------------------------------------------------
  const { data: bot, error: botError } = await supabase
    .from('bots')
    .select('*')
    .eq('id', botId)
    .single()

  if (botError || !bot) {
    throw new Error(`Bot not found: ${botId}`)
  }

  // Load workspace plan for tool gating
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('plan')
    .eq('id', workspaceId)
    .single()
  const workspacePlan = workspace?.plan ?? 'starter'

  // Starter and Core are locked to Haiku regardless of bot.model.
  // Pro and above use the model the bot owner configured.
  const HAIKU = 'claude-haiku-4-5-20251001'
  const effectiveModel = (workspacePlan === 'starter' || workspacePlan === 'core')
    ? HAIKU
    : (bot.model ?? HAIKU)

  let integrationConfig: Record<string, unknown> = {}
  if (integrationId) {
    const { data: intData } = await supabase
      .from('integrations')
      .select('config')
      .eq('id', integrationId)
      .single()
    integrationConfig = (intData?.config ?? {}) as Record<string, unknown>
  }


  const handoffCfg: HandoffChannelConfig = {
    channel:           (integrationConfig.handoff_channel as string ?? 'generic') as HandoffChannelConfig['channel'],
    webhook_url:       integrationConfig.handoff_webhook_url as string | undefined,
    telegram_token:    integrationConfig.handoff_telegram_token as string | undefined,
    telegram_chat_id:  integrationConfig.handoff_telegram_chat_id as string | undefined,
    twilio_sid:        integrationConfig.handoff_twilio_sid as string | undefined,
    twilio_token:      integrationConfig.handoff_twilio_token as string | undefined,
    twilio_from:       integrationConfig.handoff_twilio_from as string | undefined,
    twilio_to:         integrationConfig.handoff_twilio_to as string | undefined,
    whatsapp_number:   integrationConfig.handoff_whatsapp_number as string | undefined,
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
  // 2b. Check if a human agent has taken over (bot_paused flag)
  // ---------------------------------------------------------------
  const { data: convMeta } = await supabase
    .from('conversations')
    .select('bot_paused')
    .eq('id', conversationId)
    .single()
  if (convMeta?.bot_paused) {
    if (!options?.skipUserMessage) {
      await appendMessage({ conversationId, workspaceId, role: 'user', content: text })
    }
    console.log(`[processor] bot_paused — skipping AI for conversation=${conversationId}`)
    return { reply: '', conversationId, botPaused: true }
  }

  // ---------------------------------------------------------------
  // 2c. Load identity verification status for this conversation
  // ---------------------------------------------------------------
  const verification: ConversationVerification | null = await getConversationVerification(conversationId)
  const internalPlatform = isInternalPlatform(platform)

  // ---------------------------------------------------------------
  // 3. Save user message (skip if caller already stored it)
  // ---------------------------------------------------------------
  if (!options?.skipUserMessage) {
    await appendMessage({
      conversationId,
      workspaceId,
      role:    'user',
      content: text,
    })
  }

  // ---------------------------------------------------------------
  // 4. CRM lead capture (fire-and-forget, runs in parallel)
  // ---------------------------------------------------------------
  if (integrationConfig.crm_provider || integrationConfig.crm_webhook_url) {
    const lead = extractLeadData(text)
    if (lead.email || lead.phone) {
      void routeLeadToProvider(integrationConfig, lead, {
        event:          'lead_captured',
        conversationId,
        integrationId:  integrationId ?? '',
        workspaceId,
        email:          lead.email,
        phone:          lead.phone,
        message:        text,
        timestamp:      new Date().toISOString(),
      })
    }
  }

  // ---------------------------------------------------------------
  // 4d. Human handoff detection
  // ---------------------------------------------------------------
  const handoffTriggered = isHandoffConfigured(handoffCfg) && detectHandoffIntent(text)

  if (handoffTriggered) {
    void sendHandoffNotification(handoffCfg, {
      event:          'handoff_requested',
      conversationId,
      integrationId:  integrationId ?? '',
      workspaceId,
      userMessage:    text,
      timestamp:      new Date().toISOString(),
    })
    console.log(`[handoff] triggered via ${handoffCfg.channel} for conversation=${conversationId}`)
  }

  // ---------------------------------------------------------------
  // 5. Load conversation history (for memory-enabled bots)
  // ---------------------------------------------------------------
  const history = bot.enable_memory
    ? await getRecentMessages(conversationId, 20)
    : []

  // ---------------------------------------------------------------
  // 6. RAG retrieval (if enabled)
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

  // Build layered system prompt: base → sensitivity policy → handoff override
  const sensitivityInjection = buildSensitivityInjection(
    verification?.email  ?? null,
    verification?.name   ?? null,
    internalPlatform,
  )

  const languageInjection = (bot.language_preference && bot.language_preference !== 'auto')
    ? `\n\nLANGUAGE: Always respond in ${bot.language_preference}, regardless of the language the user writes in.`
    : ''

  const timeInjection = msg.clientTime
    ? `\n\nCURRENT TIME: The user's local time is ${new Date(msg.clientTime).toLocaleString('en-AU', { timeZone: msg.clientTimezone ?? undefined, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}. Use this when answering questions about the current time, date, or scheduling.`
    : ''

  const waLinkInjection = (handoffTriggered && handoffCfg.channel === 'whatsapp_link' && handoffCfg.whatsapp_number)
    ? `\n\n6. Include this clickable link in your reply so the visitor can start a WhatsApp chat immediately: [Chat on WhatsApp →](${buildWaLink(handoffCfg.whatsapp_number, 'Hi, I need some help')})`
    : ''

  const basePrompt = handoffTriggered
    ? `${bot.system_prompt ?? ''}\n\n${HANDOFF_SYSTEM_INJECTION}${waLinkInjection}${languageInjection}${timeInjection}`.trim()
    : `${bot.system_prompt ?? ''}\n\n${sensitivityInjection}${languageInjection}${timeInjection}`.trim()

  const systemPrompt = buildSystemPrompt(basePrompt, ragContext)

  // ---------------------------------------------------------------
  // 7. Generate AI response
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
      model:         effectiveModel,
      systemPrompt,
      messages:      history,
      maxTokens:     bot.max_tokens,
      temperature:   bot.temperature,
      workspacePlan,
    })
    reply     = result.reply
    tokensIn  = result.tokensInput
    tokensOut = result.tokensOutput
  } else {
    // Single-turn Claude call
    const result = await callClaude({
      model:        effectiveModel,
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
  // 8. Save assistant message (skipped when caller saves it with provider message ID)
  // ---------------------------------------------------------------
  const msgId = options?.skipAssistantMessage
    ? undefined
    : await appendMessage({
        conversationId,
        workspaceId,
        role:           'assistant',
        content:        reply,
        model:          effectiveModel,
        tokensInput:    tokensIn,
        tokensOutput:   tokensOut,
        responseTimeMs,
      })

  // ---------------------------------------------------------------
  // 9. Record usage (only for single-turn; agent loop records its own)
  // ---------------------------------------------------------------
  if (!bot.enable_tools) {
    await recordUsage({
      workspaceId,
      eventType:     'message',
      model:         effectiveModel,
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

/**
 * Look up an active integration by a value stored in its JSONB config.
 * Used for global webhooks (e.g. Facebook) that route by page_id instead of integrationId.
 */
export async function resolveIntegrationByConfig(
  platform: string,
  configKey: string,
  configValue: string,
) {
  const { data, error } = await supabase
    .from('integrations')
    .select('id, workspace_id, bot_id, platform, config, status, webhook_secret')
    .eq('platform', platform)
    .eq('status', 'active')
    .not('bot_id', 'is', null)
    .filter(`config->${configKey}`, 'eq', `"${configValue}"`)
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data
}
