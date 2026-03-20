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
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) redirect('/login')

  const platform = formData.get('platform') as Platform
  const name     = (formData.get('name') as string | null)?.trim() || `${platform} integration`
  const botId    = formData.get('bot_id') as string | null

  // eCommerce platform plan enforcement
  const { data: wsRaw } = await supabase.from('workspaces').select('plan').eq('id', membership.workspace_id).single()
  const workspacePlan = (wsRaw as { plan: string } | null)?.plan ?? 'individual'

  const ECOMMERCE_PLAN_REQUIRED: Partial<Record<Platform, string[]>> = {
    shopify: ['pro', 'team', 'enterprise'],
    // magento: ['team', 'enterprise'],
  }
  const required = ECOMMERCE_PLAN_REQUIRED[platform]
  if (required && !required.includes(workspacePlan)) {
    throw new Error(`Your current plan does not include ${platform} integration. Please upgrade to access this feature.`)
  }

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
  } else if (platform === 'shopify') {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const webhookSecret = Array.from({ length: 48 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    config = {
      shop_domain:    (formData.get('shop_domain') as string || '').replace(/^https?:\/\//, '').trim(),
      access_token:   formData.get('access_token') as string || '',
      webhook_secret: webhookSecret,
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
  const { data: inserted, error } = await admin.from('integrations').insert({
    workspace_id: membership.workspace_id,
    bot_id:       botId || null,
    platform,
    name,
    status:       'active',
    config,
  }).select('id').single()

  if (error) throw new Error(error.message)

  const integrationId = (inserted as { id: string }).id

  // Auto-register Shopify webhooks for order events
  if (platform === 'shopify') {
    const shopDomain    = config.shop_domain as string
    const accessToken   = config.access_token as string
    const apiBase       = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.appalix.ai'
    const webhookAddr   = `${apiBase}/webhooks/shopify/${integrationId}`

    const topics = ['orders/create', 'orders/updated', 'fulfillments/create', 'orders/cancelled']
    try {
      const shopRes = await fetch(`https://${shopDomain}/admin/api/2024-01/shop.json`, {
        headers: { 'X-Shopify-Access-Token': accessToken },
      })
      const shopData = shopRes.ok ? (await shopRes.json() as { shop?: { name?: string; email?: string } }) : null

      const scriptSrc = `${apiBase}/widget.js?id=${integrationId}`

      await Promise.all([
        // Order/fulfillment webhooks
        ...topics.map(topic =>
          fetch(`https://${shopDomain}/admin/api/2024-01/webhooks.json`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
            body:    JSON.stringify({ webhook: { topic, address: webhookAddr, format: 'json' } }),
          })
        ),
        // Auto-inject chat widget via ScriptTag (no theme.liquid edit needed)
        fetch(`https://${shopDomain}/admin/api/2024-01/script_tags.json`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
          body:    JSON.stringify({ script_tag: { event: 'onload', src: scriptSrc } }),
        }),
      ])

      await admin.from('integrations').update({
        config: {
          ...config,
          shop_name:           shopData?.shop?.name ?? null,
          shop_email:          shopData?.shop?.email ?? null,
          webhooks_registered: true,
          script_tag_src:      scriptSrc,
        },
      }).eq('id', integrationId)
    } catch {
      // Non-fatal — user can register manually
    }
  }

  // Auto-register Telegram webhook and fetch bot username
  if (platform === 'telegram') {
    const botToken      = config.bot_token as string
    const webhookSecret = config.webhook_secret_token as string
    const apiBase       = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.appalix.ai'
    const webhookUrl    = `${apiBase}/webhooks/telegram/${integrationId}`
    try {
      const [, getMeRes] = await Promise.all([
        fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ url: webhookUrl, secret_token: webhookSecret }),
        }),
        fetch(`https://api.telegram.org/bot${botToken}/getMe`),
      ])
      const me = await getMeRes.json() as { ok: boolean; result?: { username?: string } }
      if (me.ok && me.result?.username) {
        await admin.from('integrations').update({
          config: { ...config, bot_username: me.result.username },
        }).eq('id', integrationId)
      }
    } catch {
      // Non-fatal
    }
  }

  redirect(`/integrations/${integrationId}`)
}

export async function registerShopifyScriptTag(integrationId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: membershipRaw } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).order('created_at', { ascending: true }).limit(1).single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) throw new Error('Unauthorized')

  const admin = createAdminClient()
  const { data: intRaw } = await admin.from('integrations').select('config').eq('id', integrationId).eq('workspace_id', membership.workspace_id).single()
  if (!intRaw) throw new Error('Integration not found')

  const cfg         = (intRaw as { config: Record<string, string> }).config
  const shopDomain  = cfg.shop_domain
  const accessToken = cfg.access_token
  const apiBase     = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.appalix.ai'
  const scriptSrc   = `${apiBase}/widget.js?id=${integrationId}`

  const res = await fetch(`https://${shopDomain}/admin/api/2024-01/script_tags.json`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
    body:    JSON.stringify({ script_tag: { event: 'onload', src: scriptSrc } }),
  })

  if (!res.ok) {
    const err = await res.text()
    return { ok: false, error: err }
  }

  await admin.from('integrations').update({
    config: { ...cfg, script_tag_src: scriptSrc },
  }).eq('id', integrationId)

  return { ok: true }
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
    .order('created_at', { ascending: true })
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
    .order('created_at', { ascending: true })
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
    .order('created_at', { ascending: true })
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
  const handoffWhatsappNumber  = (formData.get('handoff_whatsapp_number')   as string | null)?.trim()?.replace(/\D/g, '') || null
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
  setOrDel('handoff_twilio_from',       handoffTwilioFrom)
  setOrDel('handoff_twilio_to',         handoffTwilioTo)
  setOrDel('handoff_whatsapp_number',   handoffWhatsappNumber)

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

  // Re-register Telegram webhook if the bot token was updated
  if (telegramBotTokenUpdate) {
    const webhookSecret = (newConfig.webhook_secret_token as string | undefined) ?? ''
    const apiBase       = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.appalix.ai'
    const webhookUrl    = `${apiBase}/webhooks/telegram/${integrationId}`
    try {
      await fetch(`https://api.telegram.org/bot${telegramBotTokenUpdate}/setWebhook`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: webhookUrl, secret_token: webhookSecret }),
      })
    } catch {
      // Non-fatal
    }
  }

  redirect('/integrations')
}
