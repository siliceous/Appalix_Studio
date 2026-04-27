import { supabase } from '../../lib/supabase.js'

export async function recordConsent(params: {
  workspaceId:      string
  phoneE164:        string
  contactId?:       string
  source:           string
  consentText?:     string
  optInUrl?:        string
  ipAddress?:       string
  userAgent?:       string
  evidenceFileUrl?: string
  metadata?:        Record<string, unknown>
}): Promise<string> {
  const { data, error } = await supabase
    .from('sms_consent_records' as never)
    .insert({
      workspace_id:      params.workspaceId,
      phone_e164:        params.phoneE164,
      contact_id:        params.contactId ?? null,
      consent_source:    params.source,
      consent_text:      params.consentText ?? null,
      opt_in_url:        params.optInUrl ?? null,
      ip_address:        params.ipAddress ?? null,
      user_agent:        params.userAgent ?? null,
      evidence_file_url: params.evidenceFileUrl ?? null,
      metadata:          params.metadata ?? {},
      consented_at:      new Date().toISOString(),
    })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (error) throw new Error(`[smsConsentService] recordConsent: ${error.message}`)
  return data!.id
}

export async function hasActiveConsent(workspaceId: string, phoneE164: string): Promise<boolean> {
  const { data } = await supabase
    .from('sms_consent_records' as never)
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('phone_e164', phoneE164)
    .is('revoked_at', null)
    .maybeSingle() as { data: { id: string } | null }

  return data !== null
}

export async function revokeConsent(workspaceId: string, phoneE164: string): Promise<void> {
  await supabase
    .from('sms_consent_records' as never)
    .update({ revoked_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .eq('phone_e164', phoneE164)
    .is('revoked_at', null)
}
