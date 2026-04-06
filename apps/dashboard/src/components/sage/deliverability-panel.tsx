/**
 * DeliverabilityPanel — server component.
 *
 * Shows aggregate email delivery health for the last 30 days:
 * sent, delivered, bounces, failures, suppressed contacts.
 * Only renders if there are outbound email events (no noise for empty workspaces).
 */
import { createAdminClient } from '@/lib/supabase/server'
import { MailCheck, MailX, AlertTriangle, Users } from 'lucide-react'

interface Props {
  workspaceId: string
}

interface EventCount {
  event_type: string
  count: number
}

export async function DeliverabilityPanel({ workspaceId }: Props) {
  const admin = createAdminClient()
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Aggregate event counts for the last 30 days
  const { data: rows } = await admin
    .from('message_events')
    .select('event_type')
    .eq('workspace_id', workspaceId)
    .eq('channel', 'email')
    .gte('event_at', since)

  if (!rows || rows.length === 0) return null

  const counts: Record<string, number> = {}
  for (const r of rows as { event_type: string }[]) {
    counts[r.event_type] = (counts[r.event_type] ?? 0) + 1
  }

  const sent      = counts['email_sent']      ?? 0
  const delivered = counts['email_delivered'] ?? 0
  const bounced   = counts['email_bounced']   ?? 0
  const failed    = counts['email_failed']    ?? 0

  // Only show if there's something meaningful to display
  if (sent === 0) return null

  // Suppressed contacts (bounced or complained, all time)
  const { count: suppressed } = await admin
    .from('sage_contacts')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .in('email_deliverability', ['bounced', 'complained', 'invalid'])

  const bounceRate  = sent > 0 ? ((bounced / sent) * 100).toFixed(1) : '0'
  const failRate    = sent > 0 ? ((failed  / sent) * 100).toFixed(1) : '0'

  const hasIssues = bounced > 0 || failed > 0

  return (
    <div className={`mx-6 mb-3 rounded-xl border px-4 py-3 flex items-center gap-6 flex-wrap text-xs ${
      hasIssues
        ? 'bg-red-50/60 dark:bg-red-500/5 border-red-100 dark:border-red-500/15'
        : 'bg-emerald-50/60 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/15'
    }`}>
      {/* Label */}
      <span className="font-semibold text-gray-500 dark:text-gray-400 shrink-0">
        Email health · 30d
      </span>

      {/* Sent */}
      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
        <span className="tabular-nums font-semibold text-gray-800 dark:text-gray-200">{sent.toLocaleString()}</span>
        sent
      </div>

      {/* Delivered */}
      {delivered > 0 && (
        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
          <MailCheck className="w-3.5 h-3.5" />
          <span className="tabular-nums font-semibold">{delivered.toLocaleString()}</span>
          delivered
        </div>
      )}

      {/* Bounced */}
      {bounced > 0 && (
        <div className="flex items-center gap-1 text-red-500 dark:text-red-400">
          <MailX className="w-3.5 h-3.5" />
          <span className="tabular-nums font-semibold">{bounced.toLocaleString()}</span>
          bounced
          <span className="text-red-400/70 dark:text-red-500/60">({bounceRate}%)</span>
        </div>
      )}

      {/* Failed */}
      {failed > 0 && (
        <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="tabular-nums font-semibold">{failed.toLocaleString()}</span>
          failed
          <span className="text-amber-400/70 dark:text-amber-500/60">({failRate}%)</span>
        </div>
      )}

      {/* Suppressed contacts */}
      {(suppressed ?? 0) > 0 && (
        <div className="flex items-center gap-1 text-red-400 dark:text-red-500 ml-auto shrink-0">
          <Users className="w-3.5 h-3.5" />
          <span className="tabular-nums font-semibold">{suppressed}</span>
          {suppressed === 1 ? 'contact' : 'contacts'} suppressed
        </div>
      )}
    </div>
  )
}
