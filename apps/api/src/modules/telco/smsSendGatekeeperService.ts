import { supabase }               from '../../lib/supabase.js'
import { isOptedOut }             from '../compliance/smsOptOutService.js'
import { detectCountryFromE164, getCountryRules } from '../compliance/countrySmsRulesService.js'
import { getWalletBalance }       from './walletService.js'

export type GatekeeperResult =
  | { allowed: true }
  | { allowed: false; reason: string; code: string }

export async function checkSendAllowed(params: {
  workspaceId: string
  fromE164:    string
  toE164:      string
}): Promise<GatekeeperResult> {
  const { workspaceId, fromE164, toE164 } = params

  // 1. Detect destination country and get rules
  const destCountry = detectCountryFromE164(toE164)
  const rules       = getCountryRules(destCountry)

  // 2. Wallet balance check — block sends if balance is zero or negative
  const { balance, currency } = await getWalletBalance(workspaceId)
  if (balance <= 0) {
    return {
      allowed: false,
      reason:  `Your Appalix wallet is empty (${currency} ${balance.toFixed(2)}). Add funds at Settings → Wallet to resume sending.`,
      code:    'INSUFFICIENT_WALLET_BALANCE',
    }
  }

  // 3. Opt-out check (always enforced regardless of country)
  if (await isOptedOut(workspaceId, toE164)) {
    return {
      allowed: false,
      reason:  'This recipient has opted out of SMS messages.',
      code:    'OPT_OUT',
    }
  }

  // 4. US A2P 10DLC enforcement
  if (rules.requiresA2P10DLC) {
    // Check approved compliance profile
    const { data: profile } = await supabase
      .from('sms_compliance_profiles' as never)
      .select('id, status')
      .eq('workspace_id', workspaceId)
      .eq('country_code', 'US')
      .eq('compliance_type', 'A2P_10DLC')
      .eq('status', 'approved')
      .maybeSingle() as { data: { id: string; status: string } | null }

    if (!profile) {
      return {
        allowed: false,
        reason:  'US SMS Verification is not approved yet. Complete verification in Settings to enable messaging.',
        code:    'NO_APPROVED_PROFILE',
      }
    }

    // Check approved brand
    const { data: brand } = await supabase
      .from('sms_10dlc_brands' as never)
      .select('id, brand_status')
      .eq('workspace_id', workspaceId)
      .eq('compliance_profile_id', profile.id)
      .eq('brand_status', 'approved')
      .maybeSingle() as { data: { id: string; brand_status: string } | null }

    if (!brand) {
      return {
        allowed: false,
        reason:  'Your US SMS Verification is under carrier review. Messaging will be enabled once approval is complete.',
        code:    'BRAND_PENDING',
      }
    }

    // Check number-to-campaign assignment
    const { data: numRow } = await supabase
      .from('workspace_phone_numbers' as never)
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('e164', fromE164)
      .is('released_at', null)
      .maybeSingle() as { data: { id: string } | null }

    if (numRow) {
      const { data: assignment } = await supabase
        .from('sms_number_campaign_assignments' as never)
        .select('id, status')
        .eq('workspace_id', workspaceId)
        .eq('phone_number_id', numRow.id)
        .eq('status', 'active')
        .maybeSingle() as { data: { id: string; status: string } | null }

      if (!assignment) {
        return {
          allowed: false,
          reason:  'This number is not connected to an approved messaging use case. Assign a campaign in Settings to enable sending.',
          code:    'NO_CAMPAIGN_ASSIGNMENT',
        }
      }
    }
  }

  return { allowed: true }
}
