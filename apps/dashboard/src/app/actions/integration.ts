'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Platform } from '@/lib/types'

export async function createIntegration(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) redirect('/login')

  const platform = formData.get('platform') as Platform
  const name     = (formData.get('name') as string | null)?.trim() || `${platform} integration`
  const botId    = formData.get('bot_id') as string | null

  // Build platform-specific config
  let config: Record<string, unknown> = {}

  if (platform === 'web_widget') {
    const origins = (formData.get('allowed_origins') as string | null)?.trim() || '*'
    config = {
      allowed_origins: origins === '*' ? ['*'] : origins.split(',').map((o) => o.trim()).filter(Boolean),
      theme: 'light',
    }
  } else if (platform === 'custom_api') {
    // Generate a random API key for the integration
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const apiKey = 'sk-' + Array.from({ length: 40 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    config = { api_key: apiKey, allowed_ips: [] }
  } else if (platform === 'slack') {
    config = {
      bot_token:      formData.get('bot_token') as string || '',
      signing_secret: formData.get('signing_secret') as string || '',
      app_id:         formData.get('app_id') as string || '',
    }
  } else if (platform === 'wordpress') {
    const submittedKey = (formData.get('api_key') as string | null)?.trim()
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const apiKey = submittedKey || ('wp-' + Array.from({ length: 40 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''))
    config = {
      site_url: formData.get('site_url') as string || '',
      api_key:  apiKey,
    }
  } else if (platform === 'facebook_messenger') {
    config = {
      page_access_token: formData.get('page_access_token') as string || '',
      verify_token:      formData.get('verify_token') as string || '',
      app_secret:        formData.get('app_secret') as string || '',
    }
  } else if (platform === 'whatsapp') {
    config = {
      phone_number_id: formData.get('phone_number_id') as string || '',
      access_token:    formData.get('access_token') as string || '',
      verify_token:    formData.get('verify_token') as string || '',
    }
  } else if (platform === 'google_chat') {
    config = {
      service_account_json: formData.get('service_account_json') as string || '',
      space_name:           formData.get('space_name') as string || '',
    }
  } else if (platform === 'telegram') {
    const submittedSecret = (formData.get('telegram_webhook_secret') as string | null)?.trim()
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const webhookSecret = submittedSecret || Array.from({ length: 48 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    config = {
      bot_token:             formData.get('telegram_bot_token') as string || '',
      webhook_secret_token:  webhookSecret,
    }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('integrations').insert({
    workspace_id: membership.workspace_id,
    bot_id:       botId || null,
    platform,
    name,
    status:       'active',
    config,
  })

  if (error) throw new Error(error.message)

  redirect('/integrations')
}

export async function setIntegrationStatus(
  integrationId: string,
  newStatus: 'active' | 'inactive',
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) throw new Error('Unauthorized')

  const admin = createAdminClient()
  const { error } = await admin
    .from('integrations')
    .update({ status: newStatus })
    .eq('id', integrationId)
    .eq('workspace_id', membership.workspace_id)

  if (error) throw new Error(error.message)
}

export async function deleteIntegration(integrationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) throw new Error('Unauthorized')

  const admin = createAdminClient()
  const { error } = await admin
    .from('integrations')
    .delete()
    .eq('id', integrationId)
    .eq('workspace_id', membership.workspace_id)

  if (error) throw new Error(error.message)
}

export async function updateIntegration(integrationId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify the integration belongs to the user's workspace
  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) redirect('/login')

  const { data: intRaw } = await supabase
    .from('integrations')
    .select('id, config')
    .eq('id', integrationId)
    .eq('workspace_id', membership.workspace_id)
    .single()
  if (!intRaw) throw new Error('Integration not found')

  const name              = (formData.get('name') as string | null)?.trim()
  const botId             = formData.get('bot_id') as string | null
  const wpApiKey          = (formData.get('wp_api_key') as string | null)?.trim()
  const welcomeMsg        = (formData.get('welcome_message') as string | null)?.trim()
  const allowedOrigins    = (formData.get('allowed_origins') as string | null)?.trim()
  const crmProvider            = (formData.get('crm_provider')             as string | null)?.trim()
  const crmWebhookUrl          = (formData.get('crm_webhook_url')          as string | null)?.trim()
  const crmHubspotToken        = (formData.get('crm_hubspot_token')        as string | null)?.trim()
  const crmIntercomToken       = (formData.get('crm_intercom_token')       as string | null)?.trim()
  const crmZohoToken                = (formData.get('crm_zoho_token')                as string | null)?.trim()
  const crmSalesforceToken          = (formData.get('crm_salesforce_token')          as string | null)?.trim()
  const crmSalesforceInstanceUrl    = (formData.get('crm_salesforce_instance_url')   as string | null)?.trim()
  const crmMondayToken              = (formData.get('crm_monday_token')              as string | null)?.trim()
  const crmMondayBoardId            = (formData.get('crm_monday_board_id')           as string | null)?.trim()
  const handoffChannel         = (formData.get('handoff_channel')           as string | null)?.trim()
  const handoffWebhookUrl      = (formData.get('handoff_webhook_url')       as string | null)?.trim()
  const handoffTelegramToken   = (formData.get('handoff_telegram_token')    as string | null)?.trim()
  const handoffTelegramChatId  = (formData.get('handoff_telegram_chat_id')  as string | null)?.trim()
  const handoffTwilioSid       = (formData.get('handoff_twilio_sid')        as string | null)?.trim()
  const handoffTwilioToken     = (formData.get('handoff_twilio_token')      as string | null)?.trim()
  const handoffTwilioFrom      = (formData.get('handoff_twilio_from')       as string | null)?.trim()
  const handoffTwilioTo        = (formData.get('handoff_twilio_to')         as string | null)?.trim()
  const telegramBotTokenUpdate = (formData.get('telegram_bot_token_update') as string | null)?.trim()

  // Merge all config fields into existing JSONB config
  const existingConfig = (intRaw as { config: Record<string, unknown> }).config ?? {}
  const newConfig: Record<string, unknown> = { ...existingConfig }

  if (welcomeMsg !== null && welcomeMsg !== undefined) {
    newConfig.welcome_message = welcomeMsg
  }
  if (allowedOrigins !== null && allowedOrigins !== undefined) {
    newConfig.allowed_origins =
      allowedOrigins === '*'
        ? ['*']
        : allowedOrigins.split(',').map((o) => o.trim()).filter(Boolean)
  }

  // Handoff channel type
  if (handoffChannel) newConfig.handoff_channel = handoffChannel

  // Helper: set or delete a config key based on value presence
  const setOrDel = (key: string, val: string | null | undefined) => {
    if (val === null || val === undefined) return
    if (val) newConfig[key] = val
    else delete newConfig[key]
  }

  // CRM provider + credentials
  if (crmProvider !== null && crmProvider !== undefined) {
    if (crmProvider && crmProvider !== 'none') newConfig.crm_provider = crmProvider
    else delete newConfig.crm_provider
  }
  setOrDel('crm_webhook_url',    crmWebhookUrl)
  setOrDel('crm_hubspot_token',  crmHubspotToken)
  setOrDel('crm_intercom_token', crmIntercomToken)
  setOrDel('crm_zoho_token',               crmZohoToken)
  setOrDel('crm_salesforce_token',         crmSalesforceToken)
  setOrDel('crm_salesforce_instance_url',  crmSalesforceInstanceUrl)
  setOrDel('crm_monday_token',             crmMondayToken)
  setOrDel('crm_monday_board_id',          crmMondayBoardId)

  // WordPress API key (only update if explicitly submitted)
  if (wpApiKey !== null && wpApiKey !== undefined) {
    if (wpApiKey) newConfig.api_key = wpApiKey
  }

  setOrDel('handoff_webhook_url',      handoffWebhookUrl)
  setOrDel('handoff_telegram_token',   handoffTelegramToken)
  setOrDel('handoff_telegram_chat_id', handoffTelegramChatId)
  setOrDel('handoff_twilio_sid',       handoffTwilioSid)
  setOrDel('handoff_twilio_token',     handoffTwilioToken)
  setOrDel('handoff_twilio_from',      handoffTwilioFrom)
  setOrDel('handoff_twilio_to',        handoffTwilioTo)

  // Telegram bot token update (only if explicitly submitted)
  if (telegramBotTokenUpdate !== null && telegramBotTokenUpdate !== undefined) {
    if (telegramBotTokenUpdate) newConfig.bot_token = telegramBotTokenUpdate
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('integrations')
    .update({
      ...(name ? { name } : {}),
      ...(botId !== null ? { bot_id: botId || null } : {}),
      config: newConfig,
    })
    .eq('id', integrationId)

  if (error) throw new Error(error.message)

  redirect('/integrations')
}
