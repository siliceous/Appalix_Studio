import { supabase } from '../../lib/supabase.js'

export const STOP_KEYWORDS  = ['STOP','STOPALL','UNSUBSCRIBE','CANCEL','END','QUIT']
export const START_KEYWORDS = ['START','YES','UNSTOP']
export const HELP_KEYWORDS  = ['HELP','INFO']

// Check both new sms_opt_outs table and legacy sage_contacts.sms_opt_out
export async function isOptedOut(workspaceId: string, phoneE164: string): Promise<boolean> {
  const [{ data: optOutRow }, { data: contact }] = await Promise.all([
    supabase
      .from('sms_opt_outs' as never)
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('phone_e164', phoneE164)
      .eq('channel', 'sms')
      .maybeSingle() as unknown as Promise<{ data: { id: string } | null }>,
    supabase
      .from('sage_contacts')
      .select('sms_opt_out')
      .eq('workspace_id', workspaceId)
      .eq('phone', phoneE164)
      .maybeSingle() as unknown as Promise<{ data: { sms_opt_out: boolean } | null }>,
  ])

  return optOutRow !== null || contact?.sms_opt_out === true
}

export async function recordOptOut(params: {
  workspaceId: string
  phoneE164:   string
  source:      'stop_keyword' | 'manual' | 'api' | 'complaint'
  reason?:     string
}): Promise<void> {
  await Promise.all([
    supabase
      .from('sms_opt_outs' as never)
      .upsert(
        {
          workspace_id: params.workspaceId,
          phone_e164:   params.phoneE164,
          channel:      'sms',
          opted_out_at: new Date().toISOString(),
          source:       params.source,
          reason:       params.reason ?? null,
        },
        { onConflict: 'workspace_id,phone_e164,channel' }
      ),
    supabase
      .from('sage_contacts')
      .update({ sms_opt_out: true, sms_opted_out_at: new Date().toISOString() })
      .eq('workspace_id', params.workspaceId)
      .eq('phone', params.phoneE164),
  ])
}

export async function recordOptIn(workspaceId: string, phoneE164: string): Promise<void> {
  await Promise.all([
    supabase
      .from('sms_opt_outs' as never)
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('phone_e164', phoneE164)
      .eq('channel', 'sms'),
    supabase
      .from('sage_contacts')
      .update({ sms_opt_out: false, sms_opted_out_at: null })
      .eq('workspace_id', workspaceId)
      .eq('phone', phoneE164),
  ])
}
