'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { VoiceConfig } from '@/lib/types'

// ── helpers ──────────────────────────────────────────────────────────────────

async function getWorkspaceId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  if (!data) redirect('/login')
  return (data as { workspace_id: string }).workspace_id
}

// ── Bot voice settings ────────────────────────────────────────────────────────

export async function updateBotVoice(botId: string, formData: FormData) {
  // Verify ownership using user session (RLS-based read)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) redirect('/login')

  const { data: botRaw } = await supabase
    .from('bots')
    .select('workspace_id')
    .eq('id', botId)
    .single()
  if (!botRaw || (botRaw as { workspace_id: string }).workspace_id !== membership.workspace_id) {
    throw new Error('Bot not found')
  }

  const voiceConfig: VoiceConfig = {
    tone:               (formData.get('tone') as string) || 'professional',
    pace:               (formData.get('pace') as string) || 'moderate',
    empathy:            parseInt(formData.get('empathy') as string) || 3,
    assertiveness:      parseInt(formData.get('assertiveness') as string) || 3,
    formality:          parseInt(formData.get('formality') as string) || 3,
    ask_one_at_a_time:  formData.get('ask_one_at_a_time') === 'on',
    confirm_details:    formData.get('confirm_details') === 'on',
    push_for_booking:   formData.get('push_for_booking') === 'on',
    escalate_sooner:    formData.get('escalate_sooner') === 'on',
    collect_lead_first: formData.get('collect_lead_first') === 'on',
    greeting_script:    (formData.get('greeting_script') as string)?.trim() || undefined,
    escalation_rules:   (formData.get('escalation_rules') as string)?.trim() || undefined,
  }

  // Use admin client to bypass RLS for the write (same pattern as updateBot)
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await admin.from('bots').update({
    enable_voice: formData.get('enable_voice') === 'on',
    voice_mode:   (formData.get('voice_mode') as string) || 'voice_text',
    voice_name:   (formData.get('voice_name') as string) || 'Aoede',
    voice_preset: (formData.get('voice_preset') as string) || null,
    voice_goal:   formData.getAll('voice_goal').filter(Boolean),
    voice_config: voiceConfig,
    updated_at:   new Date().toISOString(),
  } as any)
    .eq('id', botId)

  if (error) throw new Error(error.message)
  redirect(`/agent/bots/${botId}`)
}

export async function saveBotVoiceConfig(botId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) redirect('/login')

  const { data: botRaw } = await supabase
    .from('bots').select('workspace_id').eq('id', botId).single()
  if (!botRaw || (botRaw as { workspace_id: string }).workspace_id !== membership.workspace_id) {
    throw new Error('Bot not found')
  }

  const voiceConfig: VoiceConfig = {
    tone:               (formData.get('tone') as string) || 'professional',
    pace:               (formData.get('pace') as string) || 'moderate',
    empathy:            parseInt(formData.get('empathy') as string) || 3,
    assertiveness:      parseInt(formData.get('assertiveness') as string) || 3,
    formality:          parseInt(formData.get('formality') as string) || 3,
    ask_one_at_a_time:  formData.get('ask_one_at_a_time') === 'on',
    confirm_details:    formData.get('confirm_details') === 'on',
    push_for_booking:   formData.get('push_for_booking') === 'on',
    escalate_sooner:    formData.get('escalate_sooner') === 'on',
    collect_lead_first: formData.get('collect_lead_first') === 'on',
    greeting_script:    (formData.get('greeting_script') as string)?.trim() || undefined,
    escalation_rules:   (formData.get('escalation_rules') as string)?.trim() || undefined,
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await admin.from('bots').update({
    enable_voice: formData.get('enable_voice') === 'on',
    voice_mode:   (formData.get('voice_mode') as string) || 'voice_text',
    voice_name:   (formData.get('voice_name') as string) || 'Aoede',
    voice_preset: (formData.get('voice_preset') as string) || null,
    voice_goal:   formData.getAll('voice_goal').filter(Boolean),
    voice_config: voiceConfig,
    updated_at:   new Date().toISOString(),
  } as any).eq('id', botId)

  if (error) throw new Error(error.message)
  redirect(`/bots?tab=training&bot=${botId}`)
}

// ── Voice agents (phone) ──────────────────────────────────────────────────────

export async function createVoiceAgent(formData: FormData) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const config: VoiceConfig = {
    greeting_script:    (formData.get('greeting_script') as string)?.trim() || undefined,
    escalation_rules:   (formData.get('escalation_rules') as string)?.trim() || undefined,
    tone:               (formData.get('tone') as string) || 'professional',
    pace:               (formData.get('pace') as string) || 'moderate',
    empathy:            parseInt(formData.get('empathy') as string) || 3,
    assertiveness:      parseInt(formData.get('assertiveness') as string) || 3,
    working_hours:      (formData.get('working_hours') as string)?.trim() || undefined,
  }

  const { data, error } = await admin.from('voice_agents').insert({
    workspace_id: workspaceId,
    name:         (formData.get('name') as string)?.trim(),
    type:         (formData.get('type') as string) || 'inbound',
    phone_number: (formData.get('phone_number') as string)?.trim() || null,
    bot_id:       (formData.get('bot_id') as string) || null,
    preset:       (formData.get('preset') as string) || null,
    goal:         (formData.get('goal') as string) || null,
    is_active:    false,
    config,
  }).select('id').single()

  if (error) throw new Error(error.message)
  redirect(`/phone/voice-agents/${(data as { id: string }).id}`)
}

export async function updateVoiceAgent(agentId: string, formData: FormData) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const config: VoiceConfig = {
    greeting_script:    (formData.get('greeting_script') as string)?.trim() || undefined,
    escalation_rules:   (formData.get('escalation_rules') as string)?.trim() || undefined,
    tone:               (formData.get('tone') as string) || 'professional',
    pace:               (formData.get('pace') as string) || 'moderate',
    empathy:            parseInt(formData.get('empathy') as string) || 3,
    assertiveness:      parseInt(formData.get('assertiveness') as string) || 3,
    working_hours:      (formData.get('working_hours') as string)?.trim() || undefined,
    ask_one_at_a_time:  formData.get('ask_one_at_a_time') === 'on',
    confirm_details:    formData.get('confirm_details') === 'on',
    push_for_booking:   formData.get('push_for_booking') === 'on',
    escalate_sooner:    formData.get('escalate_sooner') === 'on',
    collect_lead_first: formData.get('collect_lead_first') === 'on',
  }

  const { error } = await admin.from('voice_agents').update({
    name:         (formData.get('name') as string)?.trim(),
    type:         (formData.get('type') as string) || 'inbound',
    phone_number: (formData.get('phone_number') as string)?.trim() || null,
    bot_id:       (formData.get('bot_id') as string) || null,
    preset:       (formData.get('preset') as string) || null,
    goal:         (formData.get('goal') as string) || null,
    is_active:    formData.get('is_active') === 'on',
    config,
    updated_at:   new Date().toISOString(),
  })
    .eq('id', agentId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message)
  redirect(`/phone/voice-agents/${agentId}`)
}

export async function deleteVoiceAgent(agentId: string) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  await admin.from('voice_agents').delete().eq('id', agentId).eq('workspace_id', workspaceId)
  redirect('/phone/voice-agents')
}

export async function toggleVoiceAgentActive(agentId: string, active: boolean) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  await admin.from('voice_agents')
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq('id', agentId)
    .eq('workspace_id', workspaceId)
}

// ── Voice knowledge ───────────────────────────────────────────────────────────

export async function createVoiceKnowledgeEntry(formData: FormData) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const rawPhrases = (formData.get('trigger_phrases') as string) ?? ''
  const triggerPhrases = rawPhrases
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  await admin.from('voice_knowledge_entries').insert({
    workspace_id:    workspaceId,
    bot_id:          (formData.get('bot_id') as string) || null,
    voice_agent_id:  (formData.get('voice_agent_id') as string) || null,
    category:        (formData.get('category') as string) || 'faq',
    title:           (formData.get('title') as string)?.trim(),
    trigger_phrases: triggerPhrases,
    content:         (formData.get('content') as string)?.trim(),
    usage_type:      (formData.get('usage_type') as string) || 'auto',
    is_active:       true,
  })
}

export async function updateVoiceKnowledgeEntry(
  entryId: string,
  formData: FormData,
) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const rawPhrases = (formData.get('trigger_phrases') as string) ?? ''
  const triggerPhrases = rawPhrases
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  await admin.from('voice_knowledge_entries').update({
    category:        (formData.get('category') as string) || 'faq',
    title:           (formData.get('title') as string)?.trim(),
    trigger_phrases: triggerPhrases,
    content:         (formData.get('content') as string)?.trim(),
    usage_type:      (formData.get('usage_type') as string) || 'auto',
    is_active:       formData.get('is_active') !== 'false',
    updated_at:      new Date().toISOString(),
  })
    .eq('id', entryId)
    .eq('workspace_id', workspaceId)
}

// ── Phone number settings ─────────────────────────────────────────────────────

export async function updatePhoneNumberBot(numberId: string, formData: FormData) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  const botId = (formData.get('bot_id') as string) || null
  const { error } = await admin
    .from('workspace_phone_numbers')
    .update({ bot_id: botId, updated_at: new Date().toISOString() })
    .eq('id', numberId)
    .eq('workspace_id', workspaceId)
  if (error) throw new Error(error.message)
  redirect(`/phone/${numberId}?tab=settings`)
}

export async function updatePhoneNumberVoiceSettings(numberId: string, formData: FormData) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  // Verify the number belongs to this workspace before updating
  const { data: existing } = await admin
    .from('workspace_phone_numbers')
    .select('id')
    .eq('id', numberId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  if (!existing) throw new Error('Phone number not found')

  const autoDelete = formData.get('auto_delete_recordings_enabled') === 'on'
  const retentionRaw = formData.get('recording_retention_days') as string
  const retentionDays = autoDelete && retentionRaw ? parseInt(retentionRaw) || null : null

  const { error } = await admin
    .from('workspace_phone_numbers')
    .update({
      call_recording_enabled:         formData.get('call_recording_enabled') === 'on',
      call_transcription_enabled:     formData.get('call_transcription_enabled') === 'on',
      auto_delete_recordings_enabled: autoDelete,
      recording_retention_days:       retentionDays,
      voicemail_enabled:              formData.get('voicemail_enabled') === 'on',
      voicemail_greeting:             (formData.get('voicemail_greeting') as string)?.trim() || null,
      missed_call_textback_enabled:   formData.get('missed_call_textback_enabled') === 'on',
      missed_call_textback_message:   (formData.get('missed_call_textback_message') as string)?.trim() || null,
      call_timeout_seconds:           parseInt(formData.get('call_timeout_seconds') as string) || 30,
      updated_at:                     new Date().toISOString(),
    })
    .eq('id', numberId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message)
  redirect(`/phone/${numberId}?tab=settings`)
}

export async function deleteVoiceKnowledgeEntry(entryId: string) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  await admin.from('voice_knowledge_entries')
    .delete()
    .eq('id', entryId)
    .eq('workspace_id', workspaceId)
}
