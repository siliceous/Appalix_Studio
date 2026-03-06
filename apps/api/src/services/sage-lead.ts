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
    // 1. Find existing contact: email → name → phone (priority order)
    //    If matched, update their record with any new info.
    //    Only create a new contact if no match found.
    type ContactRow = { id: string }
    let contactId: string | null = null

    // 1a. Match by email (most reliable)
    if (email) {
      const { data } = await supabase
        .from('sage_contacts')
        .select('id')
        .eq('workspace_id', workspaceId)
        .ilike('email', email.trim())
        .limit(1)
        .maybeSingle()
      if (data) contactId = (data as ContactRow).id
    }

    // 1b. Match by name (case-insensitive) if email didn't match
    if (!contactId) {
      const { data } = await supabase
        .from('sage_contacts')
        .select('id')
        .eq('workspace_id', workspaceId)
        .ilike('name', name.trim())
        .limit(1)
        .maybeSingle()
      if (data) contactId = (data as ContactRow).id
    }

    // 1c. Match by phone if neither email nor name matched
    if (!contactId && phone) {
      const { data } = await supabase
        .from('sage_contacts')
        .select('id')
        .eq('workspace_id', workspaceId)
        .ilike('phone', phone.trim())
        .limit(1)
        .maybeSingle()
      if (data) contactId = (data as ContactRow).id
    }

    if (contactId) {
      // Update existing contact with any newly provided fields
      const updates: Record<string, string> = {}
      if (email)   updates.email        = email
      if (phone)   updates.phone        = phone
      if (company) updates.company_name = company
      if (Object.keys(updates).length > 0) {
        await supabase.from('sage_contacts').update(updates).eq('id', contactId)
      }
    } else {
      // Create new contact
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
      contactId = (newContact as ContactRow).id
    }

    // 2. Check if this contact already has any open deal
    const { data: existingDeal } = await supabase
      .from('sage_deals')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('contact_id', contactId)
      .eq('status', 'open')
      .limit(1)
      .maybeSingle()

    if (existingDeal) {
      // Update the existing deal — link this conversation so activity is tracked
      const dealId = (existingDeal as { id: string }).id
      await supabase
        .from('sage_deals')
        .update({ source_conversation_id: conversationId })
        .eq('id', dealId)
        .is('source_conversation_id', null)   // only overwrite if not already linked

      console.log(`[sage-lead] Updated existing deal ${dealId} for contact ${contactId}`)
      return
    }

    // 3. No open deal — find first pipeline + stage and create one
    const { data: pipeline } = await supabase
      .from('sage_pipelines')
      .select('id')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!pipeline) return  // No pipeline yet — skip silently

    const pipelineId = (pipeline as { id: string }).id

    const { data: stage } = await supabase
      .from('sage_pipeline_stages')
      .select('id')
      .eq('pipeline_id', pipelineId)
      .order('position', { ascending: true })
      .limit(1)
      .maybeSingle()

    const stageId = stage ? (stage as { id: string }).id : null

    // Guard: don't create a duplicate if this exact conversation already made a deal
    const { data: existingByConv } = await supabase
      .from('sage_deals')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('source_conversation_id', conversationId)
      .limit(1)
      .maybeSingle()

    if (existingByConv) return

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
