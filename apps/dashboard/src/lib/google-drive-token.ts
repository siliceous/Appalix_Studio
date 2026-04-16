import { createAdminClient } from '@/lib/supabase/server'

type DriveConfig = {
  access_token:  string
  refresh_token: string
  expires_at:    string
  google_email?: string
}

/**
 * Returns a valid Google Drive access token for the given user/workspace.
 * Automatically refreshes the token if it has expired (or is within 5 min of expiry).
 * Returns null if no connected integration exists or if refresh fails.
 */
export async function getValidDriveToken(
  userId: string,
  workspaceId: string,
): Promise<string | null> {
  const admin = createAdminClient()

  const { data: row } = await (admin
    .from('sage_integrations' as never)
    .select('config')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('provider', 'google_drive')
    .eq('status', 'connected')
    .maybeSingle() as unknown as Promise<{ data: { config: DriveConfig } | null }>)

  if (!row?.config?.access_token) return null

  const config    = row.config
  const expiresAt = new Date(config.expires_at)
  const now       = new Date()

  // Still valid with a 5-minute safety buffer
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return config.access_token
  }

  // Token expired — refresh it
  if (!config.refresh_token) return null

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: config.refresh_token,
      grant_type:    'refresh_token',
    }),
  })

  if (!tokenRes.ok) return null

  const tokenData = await tokenRes.json() as {
    access_token?: string
    expires_in?:   number
    error?:        string
  }

  if (!tokenData.access_token || tokenData.error) return null

  const newConfig: DriveConfig = {
    ...config,
    access_token: tokenData.access_token,
    expires_at:   new Date(now.getTime() + (tokenData.expires_in ?? 3600) * 1000).toISOString(),
  }

  await (admin
    .from('sage_integrations' as never)
    .update({ config: newConfig, updated_at: now.toISOString() })
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('provider', 'google_drive') as unknown as Promise<unknown>)

  return tokenData.access_token
}
