// ─────────────────────────────────────────────────────────────────────────────
// numberProvisioningService — business logic for Appalix number management.
//
// All carrier/provider details are handled by telecomProvider (TelnyxProvider).
// This layer owns: wallet enforcement, DB persistence, and usage recording.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase }          from '../../lib/supabase.js'
import { telecomProvider }   from './providers/TelnyxProvider.js'
import { walletDeduct, getWalletBalance } from './walletService.js'
import { recordPhoneNumberMonth }         from '../../services/usage-ledger.service.js'
import type { SearchNumbersParams, AvailableNumber } from './providers/TelecomProvider.js'

// ── Search ────────────────────────────────────────────────────────────────────

export async function searchAvailableNumbers(
  params: SearchNumbersParams,
): Promise<AvailableNumber[]> {
  return telecomProvider.searchNumbers(params)
}

// ── List messaging profiles ───────────────────────────────────────────────────

export async function listMessagingProfiles() {
  return telecomProvider.listMessagingProfiles()
}

// ── Purchase ──────────────────────────────────────────────────────────────────

export interface PurchaseNumberOptions {
  workspaceId:         string
  phoneNumber:         string   // E.164
  countryCode:         string
  messagingProfileId?: string
}

export interface PurchaseNumberResult {
  id:          string           // workspace_phone_numbers.id
  e164:        string
  newBalance?: number
  error?:      string
}

export async function purchaseNumber(
  opts: PurchaseNumberOptions,
): Promise<PurchaseNumberResult> {
  // 1. Check wallet has enough for at least one month's holding cost
  const { balance, currency } = await getWalletBalance(opts.workspaceId)
  const MIN_PURCHASE_BALANCE = 1.00   // minimum $1 in wallet to allow purchase
  if (balance < MIN_PURCHASE_BALANCE) {
    return {
      id:    '',
      e164:  opts.phoneNumber,
      error: `Insufficient wallet balance (${currency} ${balance.toFixed(2)}). Add at least ${currency} ${MIN_PURCHASE_BALANCE.toFixed(2)} to purchase a number.`,
    }
  }

  // 2. Purchase via provider
  const purchased = await telecomProvider.purchaseNumber({
    phoneNumber:        opts.phoneNumber,
    messagingProfileId: opts.messagingProfileId,
  })

  // 3. Persist to DB
  const { data: saved, error: dbErr } = await supabase
    .from('workspace_phone_numbers' as never)
    .insert({
      workspace_id:         opts.workspaceId,
      provider:             telecomProvider.name,
      provider_number_id:   purchased.providerNumberId,
      e164:                 purchased.e164,
      country_code:         opts.countryCode,
      messaging_profile_id: opts.messagingProfileId ?? null,
      purchased_at:         new Date().toISOString(),
      capabilities:         purchased.capabilities,
    })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (dbErr || !saved) {
    console.error('[numberProvisioning] db insert failed:', dbErr?.message)
    // Number was purchased but couldn't be saved — critical; log for support
    return {
      id:    '',
      e164:  opts.phoneNumber,
      error: 'Number purchased but failed to save — contact support',
    }
  }

  // 4. Record first-month usage + deduct wallet (fire-and-forget; don't block on error)
  void recordPhoneNumberMonth({
    workspaceId:   opts.workspaceId,
    phoneNumberId: saved.id,
    e164:          opts.phoneNumber,
    occurredAt:    new Date(),
  }).catch(err => console.error('[numberProvisioning] recordPhoneNumberMonth:', err))

  return { id: saved.id, e164: opts.phoneNumber }
}

// ── Release ───────────────────────────────────────────────────────────────────

export interface ReleaseNumberOptions {
  workspaceId:  string
  numberId:     string   // workspace_phone_numbers.id
}

export async function releaseNumber(opts: ReleaseNumberOptions): Promise<{ error?: string }> {
  // Load the record
  const { data: row } = await supabase
    .from('workspace_phone_numbers' as never)
    .select('id, provider_number_id, e164, workspace_id')
    .eq('id', opts.numberId)
    .maybeSingle() as {
      data: { id: string; provider_number_id: string | null; e164: string; workspace_id: string } | null
    }

  if (!row) return { error: 'Number not found' }
  if (row.workspace_id !== opts.workspaceId) return { error: 'Forbidden' }

  // Release at carrier
  if (row.provider_number_id) {
    try {
      await telecomProvider.releaseNumber(row.provider_number_id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // If provider says already released (404-like), continue anyway
      if (!msg.includes('404') && !msg.toLowerCase().includes('not found')) {
        return { error: msg }
      }
    }
  }

  // Soft-delete in DB
  await supabase
    .from('workspace_phone_numbers' as never)
    .update({ released_at: new Date().toISOString() })
    .eq('id', opts.numberId)

  return {}
}

// Re-export wallet check for routes that need it without importing walletService directly
export { getWalletBalance, walletDeduct }
