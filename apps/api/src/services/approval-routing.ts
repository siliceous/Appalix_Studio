import { Resend } from 'resend'
import { supabase } from '../lib/supabase.js'
import type { ToolExecutionContext } from './agent/tools.js'

export interface ApprovalToolInput {
  title:        string
  description:  string
  channel:      'email' | 'slack'
  metadata?:    Record<string, unknown>
}

export async function requestApprovalTool(
  input: ApprovalToolInput,
  ctx:   ToolExecutionContext,
): Promise<string> {
  const { title, description, channel, metadata = {} } = input

  // Create approval_requests record
  const { data: approval, error: dbError } = await supabase
    .from('approval_requests')
    .insert({
      workspace_id:    ctx.workspaceId,
      conversation_id: ctx.conversationId,
      title,
      description,
      metadata,
      status:          'pending',
      channel,
    })
    .select('id')
    .single()

  if (dbError || !approval) {
    return `Failed to create approval request: ${dbError?.message ?? 'Unknown error'}`
  }

  // Load automation config
  const { data: ws } = await supabase
    .from('workspaces')
    .select('automation_config')
    .eq('id', ctx.workspaceId)
    .single()

  const cfg = (ws?.automation_config ?? {}) as Record<string, string>

  if (channel === 'email') {
    const approverEmail = cfg.approver_email
    const apiKey        = cfg.resend_api_key
    const fromAddr      = cfg.email_from_address ?? 'noreply@appalix.com'

    if (!approverEmail || !apiKey) {
      return `Approval request created (ID: ${approval.id}) but email notification skipped — approver_email or resend_api_key not configured in Settings → Automation.`
    }

    try {
      const resend = new Resend(apiKey)
      await resend.emails.send({
        from:    fromAddr,
        to:      [approverEmail],
        subject: `Approval required: ${title}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
            <h2 style="margin-bottom:8px">Approval required</h2>
            <p style="color:#555;margin-bottom:16px">${description}</p>
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <tr><td style="padding:6px 0;color:#888">Request ID</td><td>${approval.id}</td></tr>
              <tr><td style="padding:6px 0;color:#888">Workspace</td><td>${ctx.workspaceId}</td></tr>
            </table>
            <p style="margin-top:24px;font-size:12px;color:#aaa">Sent via Appalix AI</p>
          </div>
        `,
      })
    } catch (err) {
      return `Approval request created (ID: ${approval.id}) but email notification failed: ${err instanceof Error ? err.message : String(err)}`
    }

    return `Approval request sent to ${approverEmail} via email. Request ID: ${approval.id}`
  }

  if (channel === 'slack') {
    const webhookUrl = cfg.approval_slack_webhook_url

    if (!webhookUrl) {
      return `Approval request created (ID: ${approval.id}) but Slack notification skipped — approval_slack_webhook_url not configured in Settings → Automation.`
    }

    try {
      await fetch(webhookUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `*Approval required: ${title}*`,
          blocks: [
            {
              type: 'section',
              text: { type: 'mrkdwn', text: `*Approval required: ${title}*\n${description}` },
            },
            {
              type: 'context',
              elements: [{ type: 'mrkdwn', text: `Request ID: \`${approval.id}\` · Sent via Appalix AI` }],
            },
          ],
        }),
        signal: AbortSignal.timeout(8_000),
      })
    } catch (err) {
      return `Approval request created (ID: ${approval.id}) but Slack notification failed: ${err instanceof Error ? err.message : String(err)}`
    }

    return `Approval request posted to Slack. Request ID: ${approval.id}`
  }

  return `Approval request created (ID: ${approval.id}).`
}
