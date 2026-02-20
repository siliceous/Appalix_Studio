import { supabase } from './supabase.js'
import type { Platform } from '../adapters/types.js'

/**
 * Find or create a conversation for the given platform thread.
 * Used by all platform adapters to ensure idempotent conversation tracking.
 */
export async function getOrCreateConversation(params: {
  workspaceId:     string
  botId:           string
  integrationId:   string
  platform:        Platform
  platformThreadId: string
  platformUserId?: string
}): Promise<string> {
  const { workspaceId, botId, integrationId, platform, platformThreadId, platformUserId } = params

  // Try to find an existing open conversation for this thread
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('platform', platform)
    .eq('platform_thread_id', platformThreadId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) return existing.id

  // Create a new conversation
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      workspace_id:      workspaceId,
      bot_id:            botId,
      integration_id:    integrationId,
      platform,
      platform_thread_id: platformThreadId,
      platform_user_id:  platformUserId ?? null,
      status:            'active',
      last_activity_at:  new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create conversation: ${error.message}`)
  return data.id
}

/**
 * Append a message to a conversation and increment message_count.
 * Returns the new message ID.
 */
export async function appendMessage(params: {
  conversationId:   string
  workspaceId:      string
  role:             'user' | 'assistant' | 'tool' | 'system'
  content:          string
  model?:           string
  tokensInput?:     number
  tokensOutput?:    number
  responseTimeMs?:  number
  isError?:         boolean
  errorMessage?:    string
  toolName?:        string
  platformMessageId?: string
}): Promise<string> {
  const { conversationId, workspaceId, ...rest } = params

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id:    conversationId,
      workspace_id:       workspaceId,
      role:               rest.role,
      content:            rest.content,
      model:              rest.model ?? null,
      tokens_input:       rest.tokensInput ?? null,
      tokens_output:      rest.tokensOutput ?? null,
      response_time_ms:   rest.responseTimeMs ?? null,
      is_error:           rest.isError ?? false,
      error_message:      rest.errorMessage ?? null,
      tool_name:          rest.toolName ?? null,
      platform_message_id: rest.platformMessageId ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to append message: ${error.message}`)

  // Refresh last_activity_at
  await supabase
    .from('conversations')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', conversationId)

  return data.id
}

/**
 * Load the last N messages for a conversation (for context window).
 */
export async function getRecentMessages(
  conversationId: string,
  limit = 20,
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const { data } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: false })
    .limit(limit)

  // Reverse to chronological order
  return (data ?? []).reverse() as Array<{ role: 'user' | 'assistant'; content: string }>
}
