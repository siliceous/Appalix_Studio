import { Resend } from 'resend'
import { supabase } from '../lib/supabase.js'
import type { ToolExecutionContext } from './agent/tools.js'

export interface EmailToolInput {
  to:       string
  subject:  string
  body:     string
  html?:    boolean
}

export async function sendEmailTool(
  input: EmailToolInput,
  ctx:   ToolExecutionContext,
): Promise<string> {
  const { to, subject, body, html = false } = input

  // ── 1. Load automation config ──────────────────────────────────
  const { data: ws } = await supabase
    .from('workspaces')
    .select('automation_config')
    .eq('id', ctx.workspaceId)
    .single()

  const cfg      = (ws?.automation_config ?? {}) as Record<string, string>
  const apiKey   = cfg.resend_api_key
  const fromAddr = cfg.email_from_address ?? 'noreply@appalix.com'

  if (!apiKey) {
    return 'Email sending is not configured. Go to Settings → Automation to add your Resend API key.'
  }

  // ── 2. Send ────────────────────────────────────────────────────
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

    // ── 3. Log ─────────────────────────────────────────────────
    await supabase.from('emails_sent').insert({
      workspace_id:        ctx.workspaceId,
      conversation_id:     ctx.conversationId,
      to_address:          to.toLowerCase().trim(),
      subject,
      provider:            'resend',
      provider_message_id: data.id,
    })

    return `Email sent to ${to}.`
  } catch (err) {
    return `Email error: ${err instanceof Error ? err.message : String(err)}`
  }
}
