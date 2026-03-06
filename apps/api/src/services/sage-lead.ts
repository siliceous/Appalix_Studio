/**
 * Sage CRM — auto-create a contact + deal from a chat conversation.
 *
 * Called by processor.ts (step 4c) when the bot collects a visitor's name
 * together with at least one of: email, phone.
 */
import { supabase } from '../lib/supabase.js'

interface SageLeadInput {
  workspaceId:    string
  conversationId: string
  name:           string
  email?:         string
  phone?:         string
  company?:       string
}

// In-process guard: prevent concurrent duplicate creation for the same conversation
const pendingConversations = new Set<string>()

export async function createSageLeadFromChat({
  workspaceId,
  conversationId,
  name,
  email,
  phone,
  company,
}: SageLeadInput): Promise<void> {
  // In-process dedup: skip if another concurrent call for this conversation is running
  if (pendingConversations.has(conversationId)) {
    console.log(`[sage-lead] Skipping duplicate call for conversation ${conversationId}`)
    return
  }
  pendingConversations.add(conversationId)

  try {
    // 1. Upsert contact — match by email if provided, otherwise always insert
    let contactId: string | null = null

    if (email) {
      const { data: existing } = await supabase
        .from('sage_contacts')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('email', email)
        .limit(1)
        .maybeSingle()

      if (existing) {
        contactId = (existing as { id: string }).id
      }
    }

    if (!contactId) {
      const { data: newContact, error } = await supabase
        .from('sage_contacts')
        .insert({
          workspace_id:           workspaceId,
          source_conversation_id: conversationId,
          name,
          email:        email   ?? null,
          phone:        phone   ?? null,
          company_name: company ?? null,
          source: 'chat',
          tags:   [],
        })
        .select('id')
        .single()

      if (error) {
        console.error('[sage-lead] Failed to create contact:', error.message)
        return
      }
      contactId = (newContact as { id: string }).id
    }

    // 2. Find the first pipeline + first stage for this workspace
    const { data: pipeline } = await supabase
      .from('sage_pipelines')
      .select('id')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!pipeline) {
      // No pipeline yet — skip deal creation silently
      return
    }
    const pipelineId = (pipeline as { id: string }).id

    const { data: stage } = await supabase
      .from('sage_pipeline_stages')
      .select('id')
      .eq('pipeline_id', pipelineId)
      .order('position', { ascending: true })
      .limit(1)
      .maybeSingle()

    const stageId = stage ? (stage as { id: string }).id : null

    // 3. Check if a deal already exists from this conversation to avoid duplicates
    const { data: existingDeal } = await supabase
      .from('sage_deals')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('source_conversation_id', conversationId)
      .limit(1)
      .maybeSingle()

    if (existingDeal) return   // already created

    // 4. Create the deal
    const { data: deal, error: dealError } = await supabase
      .from('sage_deals')
      .insert({
        workspace_id:           workspaceId,
        pipeline_id:            pipelineId,
        stage_id:               stageId,
        contact_id:             contactId,
        source_conversation_id: conversationId,
        title:                  name,
        source:                 'chat',
        status:                 'open',
        visibility:             'everyone',
        currency:               'USD',
        tags:                   [],
      })
      .select('id')
      .single()

    if (dealError) {
      console.error('[sage-lead] Failed to create deal:', dealError.message)
      return
    }

    const dealId = (deal as { id: string }).id

    // 5. Log activity
    await supabase.from('sage_activity_log').insert({
      workspace_id: workspaceId,
      entity_type:  'deal',
      entity_id:    dealId,
      event_type:   'deal_created',
      payload:      { title: name, source: 'chat', conversationId },
      user_id:      null,
    })

    console.log(`[sage-lead] Created contact ${contactId} + deal ${dealId} for conversation ${conversationId}`)
  } catch (err) {
    console.error('[sage-lead] Unexpected error:', err instanceof Error ? err.message : String(err))
  } finally {
    pendingConversations.delete(conversationId)
  }
}
