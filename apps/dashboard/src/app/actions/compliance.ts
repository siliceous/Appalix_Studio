'use server'

// Legacy A2P compliance actions — superseded by sms-compliance.ts.
// These stubs exist only so the old a2p/ wizard files compile; those pages
// all redirect to /settings/compliance/sms-verification at runtime.

export type BrandData = {
  company_type:    string
  legal_name:      string
  ein:             string
  vertical:        string
  website_url:     string
  street:          string
  city:            string
  state:           string
  postal_code:     string
  country:         string
  contact_first:   string
  contact_last:    string
  contact_email:   string
  contact_phone:   string
  stock_symbol?:   string
  stock_exchange?: string
}

export type CampaignData = {
  brand_profile_id:    string
  name:                string
  use_case:            string
  description:         string
  sample_message_1:    string
  sample_message_2:    string
  opt_in_description:  string
  opt_out_keywords:    string
  help_message:        string
  embedded_links:      boolean
  embedded_phone:      boolean
  affiliate_marketing: boolean
  age_gated:           boolean
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function saveA2PBrand(_data: BrandData): Promise<void> {
  throw new Error('Deprecated — use sms-compliance actions instead')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function submitA2PBrand(_brandId: string): Promise<void> {
  throw new Error('Deprecated — use sms-compliance actions instead')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function saveA2PCampaign(_data: CampaignData): Promise<void> {
  throw new Error('Deprecated — use sms-compliance actions instead')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function submitA2PCampaign(_campaignId: string): Promise<void> {
  throw new Error('Deprecated — use sms-compliance actions instead')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function deleteA2PCampaign(_campaignId: string): Promise<void> {
  throw new Error('Deprecated — use sms-compliance actions instead')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function uploadComplianceDocument(_formData: FormData): Promise<{ error?: string }> {
  throw new Error('Deprecated — use sms-compliance actions instead')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function deleteComplianceDocument(_docId: string): Promise<{ error?: string }> {
  throw new Error('Deprecated — use sms-compliance actions instead')
}
