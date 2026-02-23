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
    config = {
      site_url: formData.get('site_url') as string || '',
      api_key:  formData.get('api_key') as string || '',
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

  const name          = (formData.get('name') as string | null)?.trim()
  const botId         = formData.get('bot_id') as string | null
  const welcomeMsg    = (formData.get('welcome_message') as string | null)?.trim()
  const allowedOrigins = (formData.get('allowed_origins') as string | null)?.trim()

  // Merge welcome_message into existing config
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
