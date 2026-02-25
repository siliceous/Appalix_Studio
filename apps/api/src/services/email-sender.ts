import { Resend } from 'resend'
import { supabase } from '../lib/supabase.js'
import type { ToolExecutionContext } from './agent/tools.js'

export interface EmailToolInput {
  to:       string
  subject:  string
  body:     string
  html?:    boolean
}

// ── Whitelist helper ─────────────────────────────────────────────

/**
 * Returns a map of  lowercased-email → display-name
 * for every team member registered in this workspace.
 * Uses the service-role admin API to resolve auth.users emails.
 */
async function getRegisteredEmails(workspaceId: string): Promise<Map<string, string>> {
  const emailMap = new Map<string, string>()

  // 1. Get all workspace member user_ids
  const { data: members } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)

  if (!members?.length) return emailMap

  // 2. Resolve auth emails in parallel via admin API
  const userResults = await Promise.all(
    members.map((m) => supabase.auth.admin.getUserById(m.user_id)),
  )

  // 3. Fetch user_profiles for friendly display names
  const userIds = members.map((m) => m.user_id)
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, first_name, last_name')
    .in('user_id', userIds)

  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.user_id,
      [p.first_name, p.last_name].filter(Boolean).join(' '),
    ]),
  )

  // 4. Build the whitelist
  for (let i = 0; i < userResults.length; i++) {
    const user = userResults[i].data?.user
    if (!user?.email) continue
    const email       = user.email.toLowerCase()
    const displayName = profileMap.get(members[i].user_id) || email.split('@')[0]
    emailMap.set(email, displayName)
  }

  return emailMap
}

// ── Tool implementation ──────────────────────────────────────────

export async function sendEmailTool(
  input: EmailToolInput,
  ctx:   ToolExecutionContext,
): Promise<string> {
  const { to, subject, body, html = false } = input
  const normalizedTo = to.toLowerCase().trim()

  // ── 1. Whitelist check ─────────────────────────────────────────
  const registeredEmails = await getRegisteredEmails(ctx.workspaceId)

  if (!registeredEmails.has(normalizedTo)) {
    if (registeredEmails.size === 0) {
      return `Cannot send to ${to} — no registered contacts found for this workspace. Team members must sign up to Appalix before they can receive emails.`
    }

    const available = Array.from(registeredEmails.entries())
      .map(([email, name]) => `${name} (${email})`)
      .join(', ')

    return (
      `Cannot send to ${to} — this address is not registered with your workspace.\n\n` +
      `Registered contacts you can send to: ${available}\n\n` +
      `Would you like me to send this to one of them instead?`
    )
  }

  // Other registered recipients (excluding the target)
  const others = Array.from(registeredEmails.entries())
    .filter(([email]) => email !== normalizedTo)
    .map(([email, name]) => `${name} (${email})`)

  // ── 2. Load automation config ──────────────────────────────────
  const { data: ws } = await supabase
    .from('workspaces')
    .select('automation_config')
    .eq('id', ctx.workspaceId)
    .single()

  const cfg      = (ws?.automation_config ?? {}) as Record<string, string>
  const apiKey   = cfg.resend_api_key
  const fromAddr = cfg.email_from_address ?? 'noreply@appalix.com'

  if (!apiKey) {
    return 'Error: email sending is not configured. Go to Settings → Automation to add your Resend API key.'
  }

  // ── 3. Send ────────────────────────────────────────────────────
  try {
    const resend = new Resend(apiKey)

    const { data, error } = await resend.emails.send({
      from:    fromAddr,
      to:      [to],
      subject,
      ...(html ? { html: body } : { text: body }),
    })

    if (error || !data?.id) {
      return `Email failed to send: ${error?.message ?? 'Unknown error'}`
    }

    // Log it
    await supabase.from('emails_sent').insert({
      workspace_id:        ctx.workspaceId,
      conversation_id:     ctx.conversationId,
      to_address:          normalizedTo,
      subject,
      provider:            'resend',
      provider_message_id: data.id,
    })

    const recipientName = registeredEmails.get(normalizedTo) ?? to
    let result = `Email sent to ${recipientName} (${to}).`

    if (others.length > 0) {
      result += `\n\nWould you also like to share this with any of the other registered contacts: ${others.join(', ')}?`
    }

    return result
  } catch (err) {
    return `Email error: ${err instanceof Error ? err.message : String(err)}`
  }
}
