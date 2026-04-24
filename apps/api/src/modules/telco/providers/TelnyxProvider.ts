// ─────────────────────────────────────────────────────────────────────────────
// TelnyxProvider — Telnyx implementation of TelecomProvider.
//
// This file is the ONLY place Telnyx-specific API calls, field names,
// and response shapes live. Product/business code imports TelecomProvider
// and the `telecomProvider` singleton, never this file directly.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  TelecomProvider,
  AvailableNumber,
  PurchasedNumber,
  PurchaseNumberParams,
  SearchNumbersParams,
  SendSmsParams,
  SentSms,
  MessagingProfile,
} from './TelecomProvider.js'

const TELNYX_API = 'https://api.telnyx.com/v2'

class TelnyxProvider implements TelecomProvider {
  readonly name = 'telnyx'

  private get headers() {
    const key = process.env.TELNYX_API_KEY
    if (!key) throw new Error('TELNYX_API_KEY not configured')
    return {
      Authorization:  `Bearer ${key}`,
      'Content-Type': 'application/json',
    }
  }

  private async request<T>(
    path:    string,
    method:  'GET' | 'POST' | 'DELETE' | 'PATCH' = 'GET',
    body?:   Record<string, unknown>,
  ): Promise<T> {
    const res = await fetch(`${TELNYX_API}${path}`, {
      method,
      headers: this.headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const data = await res.json() as T & { errors?: Array<{ detail: string }> }
    if (!res.ok) {
      const msg = (data as { errors?: Array<{ detail: string }> }).errors?.[0]?.detail
        ?? `Telnyx ${method} ${path} → ${res.status}`
      throw new Error(`[telnyx] ${msg}`)
    }
    return data
  }

  // ── Numbers ───────────────────────────────────────────────────────────────

  async searchNumbers(params: SearchNumbersParams): Promise<AvailableNumber[]> {
    const qs = new URLSearchParams({
      'filter[country_code]': params.country.toUpperCase(),
      'filter[features][]':   'sms',
      'filter[limit]':        String(params.limit ?? 20),
    })
    if (params.areaCode) {
      qs.set('filter[national_destination_code]', params.areaCode)
    }

    const data = await this.request<{
      data?: Array<{
        phone_number:        string
        region_information?: Array<{ region_name: string; region_type: string }>
        cost_information?:   { monthly_cost: string; currency: string }
        features?:           Array<{ name: string }>
      }>
    }>(`/available_phone_numbers?${qs}`)

    return (data.data ?? []).map(n => {
      const region = n.region_information?.find(
        r => r.region_type === 'city_name' || r.region_type === 'rate_center',
      )
      const costStr = n.cost_information?.monthly_cost ?? '0'
      const currency = n.cost_information?.currency ?? 'USD'
      return {
        phoneNumber:      n.phone_number,
        region:           region?.region_name,
        monthlyCostCents: Math.round(parseFloat(costStr) * 100),
        currency,
        capabilities: {
          sms:   (n.features ?? []).some(f => f.name === 'sms'),
          voice: (n.features ?? []).some(f => f.name === 'voice'),
          mms:   (n.features ?? []).some(f => f.name === 'mms'),
        },
      }
    })
  }

  async purchaseNumber(params: PurchaseNumberParams): Promise<PurchasedNumber> {
    const body: Record<string, unknown> = {
      phone_number: params.phoneNumber,
    }
    if (params.messagingProfileId) {
      body.messaging_profile_id = params.messagingProfileId
    }
    if (params.connectionId) {
      body.connection_id = params.connectionId
    }

    const data = await this.request<{
      data: {
        id:           string
        phone_number: string
        features?:    Array<{ name: string }>
      }
    }>('/phone_numbers', 'POST', body)

    return {
      providerNumberId: data.data.id,
      e164:             data.data.phone_number,
      capabilities: {
        sms:   (data.data.features ?? []).some(f => f.name === 'sms'),
        voice: (data.data.features ?? []).some(f => f.name === 'voice'),
        mms:   (data.data.features ?? []).some(f => f.name === 'mms'),
      },
    }
  }

  async releaseNumber(providerNumberId: string): Promise<void> {
    await this.request(`/phone_numbers/${providerNumberId}`, 'DELETE')
  }

  async listMessagingProfiles(): Promise<MessagingProfile[]> {
    const data = await this.request<{
      data?: Array<{ id: string; name: string; enabled: boolean }>
    }>('/messaging_profiles')

    return (data.data ?? []).map(p => ({
      providerProfileId: p.id,
      name:              p.name,
      enabled:           p.enabled,
    }))
  }

  // ── SMS ───────────────────────────────────────────────────────────────────

  async sendSms(params: SendSmsParams): Promise<SentSms> {
    const body: Record<string, string> = {
      from: params.from,
      to:   params.to,
      text: params.body,
    }
    if (params.messagingProfileId) {
      body.messaging_profile_id = params.messagingProfileId
    }

    const data = await this.request<{
      data: { id: string; parts: number }
    }>('/messages', 'POST', body)

    return {
      providerMessageId: data.data.id,
      segments:          data.data.parts ?? 1,
    }
  }
}

// Singleton — import this in business/product code, not TelnyxProvider directly
export const telecomProvider: TelecomProvider = new TelnyxProvider()
