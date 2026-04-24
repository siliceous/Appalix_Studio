import { supabase }       from '../lib/supabase.js'
import { walletDeduct }  from '../modules/telco/walletService.js'

type UsageEventType =
  | 'sms_outbound_segment'
  | 'sms_inbound_message'
  | 'voice_inbound_minute'
  | 'voice_outbound_minute'
  | 'voice_ai_stream_minute'
  | 'phone_number_month'

interface RateEntry {
  unit_price: number
  min_increment_sec?: number
}

async function lookupRate(
  table: 'billing_rate_cards' | 'provider_cost_rate_cards',
  matchCol: string,
  matchVal: string | null,
  usageType: UsageEventType,
  at: Date,
): Promise<number> {
  const query = supabase
    .from(table as 'billing_rate_cards')
    .select('rates')
    .lte('effective_from', at.toISOString())

  const { data } = matchVal === null
    ? await query.is(matchCol, null).order('effective_from', { ascending: false }).limit(1).maybeSingle()
    : await query.eq(matchCol, matchVal).order('effective_from', { ascending: false }).limit(1).maybeSingle()

  if (!data?.rates) return 0
  const rates = data.rates as Record<string, RateEntry>
  return rates[usageType]?.unit_price ?? 0
}

// Workspace sell price — falls back to global default (workspace_id = null)
export async function getWorkspaceRate(
  workspaceId: string,
  usageType: UsageEventType,
  at: Date = new Date(),
): Promise<number> {
  const specific = await lookupRate('billing_rate_cards', 'workspace_id', workspaceId, usageType, at)
  if (specific > 0) return specific
  return lookupRate('billing_rate_cards', 'workspace_id', null, usageType, at)
}

// Provider buy-side cost
export async function getProviderRate(
  provider: string,
  usageType: UsageEventType,
  at: Date = new Date(),
): Promise<number> {
  return lookupRate('provider_cost_rate_cards' as 'billing_rate_cards', 'provider', provider, usageType, at)
}

export async function recordSmsOutbound(params: {
  workspaceId:     string
  sourceId:        string   // messages.id
  segments:        number
  occurredAt:      Date
  toE164:          string
  telnyxMessageId: string
  currency?:       string
}) {
  const currency = params.currency ?? 'AUD'
  const [sellRate, providerRate] = await Promise.all([
    getWorkspaceRate(params.workspaceId, 'sms_outbound_segment', params.occurredAt),
    getProviderRate('telnyx', 'sms_outbound_segment', params.occurredAt),
  ])

  const sellTotal = sellRate * params.segments

  const { data: usageRow, error } = await supabase.from('usage_events' as never).insert({
    workspace_id:        params.workspaceId,
    source_table:        'messages',
    source_id:           params.sourceId,
    provider:            'telnyx',
    usage_type:          'sms_outbound_segment',
    quantity:            params.segments,
    unit:                'segment',
    occurred_at:         params.occurredAt.toISOString(),
    provider_unit_cost:  providerRate,
    provider_cost_total: providerRate * params.segments,
    sell_unit_price:     sellRate,
    sell_total:          sellTotal,
    currency,
    rating_status:       sellRate > 0 ? 'rated' : 'unrated',
    meta: {
      to:                params.toE164,
      telnyx_message_id: params.telnyxMessageId,
    },
  }).select('id').single() as { data: { id: string } | null; error: { message: string } | null }

  if (error) {
    console.error('[usage-ledger] recordSmsOutbound:', error.message)
    return
  }

  if (sellTotal > 0) {
    void walletDeduct({
      workspaceId:   params.workspaceId,
      amount:        sellTotal,
      type:          'usage_deduction',
      description:   `SMS outbound — ${params.segments} segment${params.segments !== 1 ? 's' : ''} to ${params.toE164}`,
      referenceId:   usageRow?.id,
      referenceType: 'usage_event',
      allowNegative: true, // don't block sends if wallet hits zero; alert separately
    }).catch(err => console.error('[usage-ledger] wallet deduct failed:', err))
  }
}

export async function recordSmsInbound(params: {
  workspaceId:     string
  sourceId:        string   // messages.id
  occurredAt:      Date
  fromE164:        string
  telnyxMessageId: string
  currency?:       string
}) {
  const currency = params.currency ?? 'AUD'
  const [sellRate, providerRate] = await Promise.all([
    getWorkspaceRate(params.workspaceId, 'sms_inbound_message', params.occurredAt),
    getProviderRate('telnyx', 'sms_inbound_message', params.occurredAt),
  ])

  const { data: usageRow, error } = await supabase.from('usage_events' as never).insert({
    workspace_id:        params.workspaceId,
    source_table:        'messages',
    source_id:           params.sourceId,
    provider:            'telnyx',
    usage_type:          'sms_inbound_message',
    quantity:            1,
    unit:                'message',
    occurred_at:         params.occurredAt.toISOString(),
    provider_unit_cost:  providerRate,
    provider_cost_total: providerRate,
    sell_unit_price:     sellRate,
    sell_total:          sellRate,
    currency,
    rating_status:       sellRate > 0 ? 'rated' : 'unrated',
    meta: {
      from:              params.fromE164,
      telnyx_message_id: params.telnyxMessageId,
    },
  }).select('id').single() as { data: { id: string } | null; error: { message: string } | null }

  if (error) {
    console.error('[usage-ledger] recordSmsInbound:', error.message)
    return
  }

  if (sellRate > 0) {
    void walletDeduct({
      workspaceId:   params.workspaceId,
      amount:        sellRate,
      type:          'usage_deduction',
      description:   `SMS inbound from ${params.fromE164}`,
      referenceId:   usageRow?.id,
      referenceType: 'usage_event',
      allowNegative: true,
    }).catch(err => console.error('[usage-ledger] wallet deduct failed:', err))
  }
}

export async function recordPhoneNumberMonth(params: {
  workspaceId:   string
  phoneNumberId: string   // workspace_phone_numbers.id
  e164:          string
  occurredAt:    Date
  currency?:     string
}) {
  const currency = params.currency ?? 'AUD'
  const [sellRate, providerRate] = await Promise.all([
    getWorkspaceRate(params.workspaceId, 'phone_number_month', params.occurredAt),
    getProviderRate('telnyx', 'phone_number_month', params.occurredAt),
  ])

  const { error } = await supabase.from('usage_events' as never).insert({
    workspace_id:        params.workspaceId,
    source_table:        'workspace_phone_numbers',
    source_id:           params.phoneNumberId,
    provider:            'telnyx',
    usage_type:          'phone_number_month',
    quantity:            1,
    unit:                'number_month',
    occurred_at:         params.occurredAt.toISOString(),
    provider_unit_cost:  providerRate,
    provider_cost_total: providerRate,
    sell_unit_price:     sellRate,
    sell_total:          sellRate,
    currency,
    rating_status:       sellRate > 0 ? 'rated' : 'unrated',
    meta: { e164: params.e164 },
  })

  if (error) console.error('[usage-ledger] recordPhoneNumberMonth:', error.message)
}
