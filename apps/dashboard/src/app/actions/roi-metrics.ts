'use server'

import { createClient } from '@/lib/supabase/server'

export type RoiPeriod = '7d' | '30d' | '90d' | 'all'

export interface RoiMetrics {
  period: RoiPeriod

  // AI triage counts
  emailsTriaged:  number
  botsTriaged:    number
  formsTriaged:   number
  totalTriaged:   number
  timeSavedHours: number   // estimate: email×4min + bot×3min + form×3min

  // AI email action distribution
  emailActions: { action: string; count: number }[]

  // Deal pipeline
  dealsOpen:       number
  dealsWon:        number
  dealsLost:       number
  pipelineValue:   number   // sum of open deal values
  revenueWon:      number   // sum of won deal values
  winRate:         number   // won / (won + lost) %

  // Deal source attribution (where leads came from)
  dealsBySource: { source: string; count: number; value: number }[]

  // Contact source breakdown
  contactsBySource: { source: string; count: number }[]

  // Form actioned rate
  formsActioned:  number
  formsPending:   number
}

function fromDate(period: RoiPeriod): string | null {
  if (period === 'all') return null
  const d = new Date()
  if (period === '7d')  d.setDate(d.getDate() - 7)
  if (period === '30d') d.setDate(d.getDate() - 30)
  if (period === '90d') d.setDate(d.getDate() - 90)
  return d.toISOString()
}

export async function getRoiMetrics(workspaceId: string, period: RoiPeriod = '30d'): Promise<RoiMetrics> {
  const supabase = await createClient()
  const from = fromDate(period)

  // ── Helper: apply date filter ───────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dated = (q: any, col = 'created_at') => from ? q.gte(col, from) : q

  // ── 1. Emails triaged by AI ─────────────────────────────────────────────
  const emailQ = supabase
    .from('sage_emails')
    .select('ai_action')
    .eq('workspace_id', workspaceId)
    .not('ai_analyzed_at', 'is', null)
    .eq('direction', 'inbound')
  const { data: emailRows } = await dated(emailQ, 'received_at')
  const emailsData = (emailRows ?? []) as { ai_action: string | null }[]
  const emailsTriaged = emailsData.length

  const emailActionMap: Record<string, number> = {}
  for (const r of emailsData) {
    const k = r.ai_action ?? 'pending'
    emailActionMap[k] = (emailActionMap[k] ?? 0) + 1
  }
  const emailActions = Object.entries(emailActionMap).map(([action, count]) => ({ action, count }))

  // ── 2. Bot conversations triaged ────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const botsQ = (supabase as any)
    .from('sage_conversations')
    .select('id')
    .eq('workspace_id', workspaceId)
    .not('ai_analyzed_at', 'is', null)
  const { data: botsRows } = await dated(botsQ)
  const botsTriaged = (botsRows ?? []).length

  // ── 3. Form submissions triaged ─────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formsQ = (supabase as any)
    .from('sage_form_submissions')
    .select('actioned_at, action_type')
    .eq('workspace_id', workspaceId)
    .not('ai_analyzed_at', 'is', null)
  const { data: formsRows } = await dated(formsQ)
  const formsData = (formsRows ?? []) as { actioned_at: string | null; action_type: string | null }[]
  const formsTriaged  = formsData.length
  const formsActioned = formsData.filter(r => r.actioned_at !== null).length
  const formsPending  = formsTriaged - formsActioned

  // ── 4. Time saved estimate ──────────────────────────────────────────────
  const timeSavedMins = emailsTriaged * 4 + botsTriaged * 3 + formsTriaged * 3
  const timeSavedHours = Math.round((timeSavedMins / 60) * 10) / 10

  // ── 5. Deals ────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dealsQ = (supabase as any)
    .from('sage_deals')
    .select('status, value, source, won_at')
    .eq('workspace_id', workspaceId)
  const { data: dealsRaw } = await dated(dealsQ)
  const dealsData = (dealsRaw ?? []) as { status: string; value: number | null; source: string | null; won_at: string | null }[]

  let dealsOpen = 0, dealsWon = 0, dealsLost = 0
  let pipelineValue = 0, revenueWon = 0
  const sourceMap: Record<string, { count: number; value: number }> = {}

  for (const d of dealsData) {
    if (d.status === 'open')  { dealsOpen++;  pipelineValue += d.value ?? 0 }
    if (d.status === 'won')   { dealsWon++;   revenueWon    += d.value ?? 0 }
    if (d.status === 'lost')  { dealsLost++ }

    const src = d.source ?? 'manual'
    if (!sourceMap[src]) sourceMap[src] = { count: 0, value: 0 }
    sourceMap[src].count++
    sourceMap[src].value += d.value ?? 0
  }

  const winRate = (dealsWon + dealsLost) > 0
    ? Math.round((dealsWon / (dealsWon + dealsLost)) * 100)
    : 0

  const dealsBySource = Object.entries(sourceMap).map(([source, v]) => ({
    source: source === 'bots' ? 'Bot' : source === 'email' ? 'Email' : source === 'forms' ? 'Form' : 'Manual',
    count: v.count,
    value: v.value,
  })).sort((a, b) => b.count - a.count)

  // ── 6. Contacts by source ───────────────────────────────────────────────
  const contactsQ = supabase
    .from('sage_contacts')
    .select('source')
    .eq('workspace_id', workspaceId)
  const { data: contactsRaw } = await dated(contactsQ)
  const contactsData = (contactsRaw ?? []) as { source: string | null }[]

  const contactSourceMap: Record<string, number> = {}
  for (const c of contactsData) {
    const k = c.source ?? 'manual'
    contactSourceMap[k] = (contactSourceMap[k] ?? 0) + 1
  }
  const contactsBySource = Object.entries(contactSourceMap).map(([source, count]) => ({
    source: source === 'chat' ? 'Bot' : source === 'manual' ? 'Manual' : source === 'import' ? 'Import' : source,
    count,
  })).sort((a, b) => b.count - a.count)

  return {
    period,
    emailsTriaged,
    botsTriaged,
    formsTriaged,
    totalTriaged: emailsTriaged + botsTriaged + formsTriaged,
    timeSavedHours,
    emailActions,
    dealsOpen,
    dealsWon,
    dealsLost,
    pipelineValue,
    revenueWon,
    winRate,
    dealsBySource,
    contactsBySource,
    formsActioned,
    formsPending,
  }
}
