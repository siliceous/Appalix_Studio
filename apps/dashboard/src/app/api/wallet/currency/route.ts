// Update workspace billing country and currency (admin only).
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse }                    from 'next/server'

// Supported countries and their ISO 4217 currency codes
export const COUNTRY_CURRENCY: Record<string, string> = {
  AU: 'AUD',
  US: 'USD',
  GB: 'GBP',
  NZ: 'NZD',
  CA: 'CAD',
  SG: 'SGD',
  IN: 'INR',
  DE: 'EUR',
  FR: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  PT: 'EUR',
  IE: 'EUR',
  FI: 'EUR',
}

export const SUPPORTED_COUNTRIES = [
  { code: 'AU', name: 'Australia',      currency: 'AUD' },
  { code: 'NZ', name: 'New Zealand',    currency: 'NZD' },
  { code: 'US', name: 'United States',  currency: 'USD' },
  { code: 'CA', name: 'Canada',         currency: 'CAD' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'IE', name: 'Ireland',        currency: 'EUR' },
  { code: 'DE', name: 'Germany',        currency: 'EUR' },
  { code: 'FR', name: 'France',         currency: 'EUR' },
  { code: 'NL', name: 'Netherlands',    currency: 'EUR' },
  { code: 'SG', name: 'Singapore',      currency: 'SGD' },
  { code: 'IN', name: 'India',          currency: 'INR' },
]

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: memberRaw } = await (supabase as any)
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single() as { data: { workspace_id: string; role: string } | null }

  if (!memberRaw) return NextResponse.json({ error: 'No workspace' }, { status: 403 })
  if (memberRaw.role !== 'admin' && memberRaw.role !== 'owner') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { country } = await req.json() as { country?: string }
  if (!country) return NextResponse.json({ error: 'country is required' }, { status: 400 })

  const currency = COUNTRY_CURRENCY[country.toUpperCase()]
  if (!currency) return NextResponse.json({ error: `Unsupported country: ${country}` }, { status: 400 })

  const admin = createAdminClient()

  // Update workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: wsErr } = await (admin as any)
    .from('workspaces')
    .update({ country: country.toUpperCase(), currency })
    .eq('id', memberRaw.workspace_id)

  if (wsErr) return NextResponse.json({ error: wsErr.message }, { status: 500 })

  // Sync wallet_accounts currency
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('wallet_accounts')
    .update({ currency })
    .eq('workspace_id', memberRaw.workspace_id)

  return NextResponse.json({ ok: true, country: country.toUpperCase(), currency })
}
