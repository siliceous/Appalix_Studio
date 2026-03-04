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

  return (data as { workspace_id: string } | null)?.workspace_id ?? null
}

/**
 * Trigger AI analysis for bot conversations in the workspace.
 * If conversationIds is provided, only those conversations are re-analysed.
 * Otherwise, analyses up to batchSize conversations that have never been processed.
 */
export async function analyzeConversations(
  batchSize        = 50,
  conversationIds?: string[],
): Promise<{ analyzed: number; error?: string }> {
  if (!API_BASE || !SERVICE_KEY) return { analyzed: 0, error: 'Server not configured' }

  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { analyzed: 0, error: 'Not authenticated' }

  try {
    const body: Record<string, unknown> = { workspace_id: workspaceId, batch_size: batchSize }
    if (conversationIds && conversationIds.length > 0) body.conversation_ids = conversationIds

    const res = await fetch(`${API_BASE}/bots/conversations/analyze`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Key': SERVICE_KEY },
      body:    JSON.stringify(body),
    })
    const data = await res.json() as { analyzed?: number; error?: string }
    if (!res.ok) return { analyzed: 0, error: data.error ?? 'Analysis failed' }
    revalidatePath('/dashboard')
    return { analyzed: data.analyzed ?? 0 }
  } catch {
    return { analyzed: 0, error: 'Could not reach API' }
  }
}
