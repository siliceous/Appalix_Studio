// ─────────────────────────────────────────────────────────────────────────────
// TelecomProvider — generic interface for any underlying carrier/telco.
//
// Business logic must call this interface, never a provider directly.
// This makes Telnyx replaceable (ClickSend, Twilio, Bandwidth, etc.)
// without touching product code.
// ─────────────────────────────────────────────────────────────────────────────

export interface PhoneNumberCapabilities {
  sms:   boolean
  voice: boolean
  mms:   boolean
}

// ── Number search ─────────────────────────────────────────────────────────────

export interface SearchNumbersParams {
  country:  string        // ISO-3166-1 alpha-2, e.g. 'AU'
  areaCode?: string
  limit?:    number
}

export interface AvailableNumber {
  phoneNumber:       string                  // E.164
  region?:           string
  monthlyCostCents:  number                  // in the provider's currency
  currency:          string
  capabilities:      PhoneNumberCapabilities
}

// ── Number purchase ───────────────────────────────────────────────────────────

export interface PurchaseNumberParams {
  phoneNumber:        string
  messagingProfileId?: string
  connectionId?:       string                // voice connection
}

export interface PurchasedNumber {
  providerNumberId: string                   // opaque provider ID, stored internally only
  e164:             string
  capabilities:     PhoneNumberCapabilities
}

// ── Messaging profile ─────────────────────────────────────────────────────────

export interface MessagingProfile {
  providerProfileId: string
  name:              string
  enabled:           boolean
}

// ── SMS ───────────────────────────────────────────────────────────────────────

export interface SendSmsParams {
  from:                string               // E.164 sender (must be owned by account)
  to:                  string               // E.164 recipient
  body:                string
  messagingProfileId?: string
}

export interface SentSms {
  providerMessageId: string
  segments:          number
}

// ── The interface ─────────────────────────────────────────────────────────────

export interface TelecomProvider {
  readonly name: string                      // 'telnyx' | 'twilio' | 'clicksend' etc.

  // Numbers
  searchNumbers(params: SearchNumbersParams): Promise<AvailableNumber[]>
  purchaseNumber(params: PurchaseNumberParams): Promise<PurchasedNumber>
  releaseNumber(providerNumberId: string): Promise<void>
  listMessagingProfiles(): Promise<MessagingProfile[]>

  // SMS
  sendSms(params: SendSmsParams): Promise<SentSms>
}
