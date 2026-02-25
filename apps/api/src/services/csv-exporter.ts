import { supabase } from '../lib/supabase.js'
import type { ToolExecutionContext } from './agent/tools.js'

export interface CsvToolInput {
  data_type:    'leads' | 'conversations'
  webhook_url?: string
}

export async function exportCsvTool(
  input: CsvToolInput,
  ctx:   ToolExecutionContext,
): Promise<string> {
  const { data_type, webhook_url } = input

  let rows: Record<string, unknown>[] = []

  if (data_type === 'conversations') {
    const { data } = await supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', ctx.conversationId)
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: true })
      .limit(200)

    rows = (data ?? []) as Record<string, unknown>[]
  } else if (data_type === 'leads') {
    // Leads are extracted messages where an email was detected
    // We surface the most recent user messages containing @ symbols as a best-effort lead list
    const { data } = await supabase
      .from('messages')
      .select('content, created_at, conversation_id')
      .eq('workspace_id', ctx.workspaceId)
      .eq('role', 'user')
      .ilike('content', '%@%')
      .order('created_at', { ascending: false })
      .limit(500)

    rows = (data ?? []) as Record<string, unknown>[]
  }

  if (rows.length === 0) {
    return `No ${data_type} data found to export.`
  }

  const csv = toCsv(rows)

  if (webhook_url) {
    try {
      const res = await fetch(webhook_url, {
        method:  'POST',
        headers: { 'Content-Type': 'text/csv' },
        body:    csv,
        signal:  AbortSignal.timeout(10_000),
      })
      return `Exported ${rows.length} ${data_type} rows. CSV posted to webhook (HTTP ${res.status}).`
    } catch (err) {
      return `CSV generated (${rows.length} rows) but webhook POST failed: ${err instanceof Error ? err.message : String(err)}`
    }
  }

  // Return inline (truncated to 3000 chars to stay within tool output limits)
  const preview = csv.length > 3000 ? csv.slice(0, 3000) + '\n… (truncated)' : csv
  return `Exported ${rows.length} ${data_type} rows:\n\n${preview}`
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape  = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines   = rows.map((r) => headers.map((h) => escape(r[h])).join(','))
  return [headers.join(','), ...lines].join('\n')
}
