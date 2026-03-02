'use server'

import { createClient }  from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const API_BASE    = process.env.API_BASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function getWorkspaceId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  return data?.workspace_id ?? null
}

/**
 * Trigger IMAP sync for the current workspace.
 * Returns the number of new emails synced.
 */
export async function syncEmails(): Promise<{ synced: number; error?: string }> {
  if (!API_BASE || !SERVICE_KEY) return { synced: 0, error: 'Server not configured' }

  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { synced: 0, error: 'Not authenticated' }

  try {
    const res = await fetch(`${API_BASE}/sage/emails/sync`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Key': SERVICE_KEY },
      body:    JSON.stringify({ workspace_id: workspaceId }),
    })
    const data = await res.json() as { synced?: number; error?: string }
    if (!res.ok) return { synced: 0, error: data.error ?? 'Sync failed' }
    revalidatePath('/sage/emails')
    return { synced: data.synced ?? 0 }
  } catch {
    return { synced: 0, error: 'Could not reach API' }
  }
}

/**
 * Send an email using the workspace's connected Gmail/Outlook account.
 */
export async function sendEmail(opts: {
  to:              string
  subject:         string
  body:            string
  replyToEmailId?: string
}): Promise<{ ok: boolean; error?: string }> {
  if (!API_BASE || !SERVICE_KEY) return { ok: false, error: 'Server not configured' }

  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { ok: false, error: 'Not authenticated' }

  try {
    const res = await fetch(`${API_BASE}/sage/emails/send`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Key': SERVICE_KEY },
      body:    JSON.stringify({ workspace_id: workspaceId, ...opts, reply_to_email_id: opts.replyToEmailId }),
    })
    const data = await res.json() as { ok?: boolean; error?: string }
    if (!res.ok) return { ok: false, error: data.error ?? 'Send failed' }
    revalidatePath('/sage/emails')
    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not reach API' }
  }
}

/**
 * Ask Claude to rewrite an email body according to an instruction.
 */
export async function rewriteEmail(opts: {
  emailId?:    string
  body:        string
  instruction: string
}): Promise<{ body: string; error?: string }> {
  if (!API_BASE || !SERVICE_KEY) return { body: opts.body, error: 'Server not configured' }

  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { body: opts.body, error: 'Not authenticated' }

  try {
    const res = await fetch(`${API_BASE}/sage/emails/${opts.emailId ?? 'new'}/rewrite`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Key': SERVICE_KEY },
      body:    JSON.stringify({ workspace_id: workspaceId, body: opts.body, instruction: opts.instruction }),
    })
    const data = await res.json() as { body?: string; error?: string }
    if (!res.ok) return { body: opts.body, error: data.error ?? 'Rewrite failed' }
    return { body: data.body ?? opts.body }
  } catch {
    return { body: opts.body, error: 'Could not reach API' }
  }
}
