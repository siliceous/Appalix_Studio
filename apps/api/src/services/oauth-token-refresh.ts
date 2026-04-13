/**
 * OAuth2 token refresh utility for Gmail and Microsoft integrations.
 *
 * When an OAuth2 access token expires (typically after 1 hour),
 * we use the stored refresh_token to get a new one and update the DB.
 */
import { supabase } from '../lib/supabase.js'

/**
 * Returns a valid access token for the given integration config.
 * If the token is expired (or about to expire), refreshes it automatically.
 * Returns null if refresh fails or no refresh_token is available.
 */
export async function getValidAccessToken(
  workspaceId: string,
  userId:      string,
  provider:    'gmail' | 'microsoft',
  config:      Record<string, string>,
): Promise<string | null> {
  if (config['auth_method'] !== 'oauth2') return null

  const now        = Date.now()
  const expiresAt  = config.expires_at ? new Date(config.expires_at).getTime() : 0
  const bufferMs   = 5 * 60 * 1000  // refresh 5 min before expiry

  // Token is still valid
  if (config.access_token && expiresAt > now + bufferMs) {
    return config.access_token
  }

  // Token expired — try refresh
  if (!config.refresh_token) {
    console.warn(`[OAuth] No refresh_token for ${provider} workspace=${workspaceId} user=${userId}`)
    return config.access_token || null  // return old token and hope for the best
  }

  try {
    let newTokens: { access_token?: string; expires_in?: number; refresh_token?: string }

    if (provider === 'gmail') {
      const clientId     = process.env.GOOGLE_CLIENT_ID
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET
      if (!clientId || !clientSecret) {
        console.error('[OAuth] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set')
        return config.access_token || null
      }
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    new URLSearchParams({
          grant_type:    'refresh_token',
          refresh_token: config.refresh_token,
          client_id:     clientId,
          client_secret: clientSecret,
        }),
      })
      newTokens = await res.json() as typeof newTokens
    } else {
      // Microsoft
      const clientId     = process.env.MICROSOFT_CLIENT_ID
      const clientSecret = process.env.MICROSOFT_CLIENT_SECRET
      if (!clientId || !clientSecret) {
        console.error('[OAuth] MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET not set')
        return config.access_token || null
      }
      const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    new URLSearchParams({
          grant_type:    'refresh_token',
          refresh_token: config.refresh_token,
          client_id:     clientId,
          client_secret: clientSecret,
          scope: [
            'https://graph.microsoft.com/Mail.Read',
            'https://graph.microsoft.com/Mail.ReadWrite',
            'https://graph.microsoft.com/Mail.Send',
            'offline_access',
          ].join(' '),
        }),
      })
      newTokens = await res.json() as typeof newTokens
    }

    if (!newTokens.access_token) {
      console.error(`[OAuth] Token refresh failed for ${provider}:`, newTokens)
      // invalid_grant / invalid_token = refresh token permanently revoked.
      // Returning the old dead token would just cause every downstream call to 401.
      const revokedErrors = ['invalid_grant', 'invalid_token', 'token_expired', 'unauthorized_client']
      const isRevoked = revokedErrors.includes((newTokens as { error?: string }).error ?? '')
      return isRevoked ? null : (config.access_token || null)
    }

    // Persist refreshed token back to DB
    const updatedConfig: Record<string, string> = {
      ...config,
      access_token: newTokens.access_token,
      expires_at:   new Date(now + (newTokens.expires_in ?? 3600) * 1000).toISOString(),
    }
    if (newTokens.refresh_token) {
      updatedConfig['refresh_token'] = newTokens.refresh_token
    }

    await supabase
      .from('sage_integrations')
      .update({ config: updatedConfig })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('provider', provider)

    console.log(`[OAuth] Refreshed ${provider} token for workspace=${workspaceId} user=${userId}`)
    return newTokens.access_token

  } catch (err) {
    console.error(`[OAuth] Token refresh error for ${provider}:`, (err as Error).message)
    return config.access_token || null
  }
}
