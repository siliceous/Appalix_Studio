'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

async function getWorkspaceId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  if (!data) redirect('/login')
  return (data as { workspace_id: string }).workspace_id
}

// ── A2P Brand ─────────────────────────────────────────────────────────────────

export type BrandData = {
  company_type:  string
  legal_name:    string
  ein:           string
  vertical:      string
  website_url:   string
  street:        string
  city:          string
  state:         string
  postal_code:   string
  country:       string
  contact_first: string
  contact_last:  string
  contact_email: string
  contact_phone: string
  stock_symbol?: string
  stock_exchange?: string
}

export async function saveA2PBrand(data: BrandData) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('compliance_brand_profiles')
    .upsert({
      workspace_id:  workspaceId,
      status:        'draft',
      legal_name:    data.legal_name    || null,
      ein:           data.ein           || null,
      company_type:  data.company_type  || null,
      vertical:      data.vertical      || null,
      website_url:   data.website_url   || null,
      street:        data.street        || null,
      city:          data.city          || null,
      state:         data.state         || null,
      postal_code:   data.postal_code   || null,
      country:       data.country       || 'US',
      contact_first: data.contact_first || null,
      contact_last:  data.contact_last  || null,
      contact_email: data.contact_email || null,
      contact_phone: data.contact_phone || null,
      stock_symbol:  data.stock_symbol  || null,
      stock_exchange: data.stock_exchange || null,
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'workspace_id' })
  if (error) throw new Error(error.message)
  redirect('/settings/compliance/a2p')
}

export async function submitA2PBrand(brandId: string) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('compliance_brand_profiles')
    .update({ status: 'submitted', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', brandId)
    .eq('workspace_id', workspaceId)
  if (error) throw new Error(error.message)
  redirect('/settings/compliance/a2p')
}

// ── A2P Campaign ──────────────────────────────────────────────────────────────

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

export async function saveA2PCampaign(data: CampaignData) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('compliance_campaigns')
    .insert({
      workspace_id:        workspaceId,
      brand_profile_id:    data.brand_profile_id,
      name:                data.name               || null,
      status:              'draft',
      use_case:            data.use_case           || null,
      description:         data.description        || null,
      sample_message_1:    data.sample_message_1   || null,
      sample_message_2:    data.sample_message_2   || null,
      opt_in_description:  data.opt_in_description || null,
      opt_out_keywords:    data.opt_out_keywords   || 'STOP, UNSUBSCRIBE',
      help_message:        data.help_message       || null,
      embedded_links:      data.embedded_links,
      embedded_phone:      data.embedded_phone,
      affiliate_marketing: data.affiliate_marketing,
      age_gated:           data.age_gated,
    })
  if (error) throw new Error(error.message)
  redirect('/settings/compliance/a2p')
}

export async function submitA2PCampaign(campaignId: string) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('compliance_campaigns')
    .update({ status: 'submitted', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', campaignId)
    .eq('workspace_id', workspaceId)
  if (error) throw new Error(error.message)
  redirect('/settings/compliance/a2p')
}

export async function deleteA2PCampaign(campaignId: string) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('compliance_campaigns')
    .delete()
    .eq('id', campaignId)
    .eq('workspace_id', workspaceId)
  redirect('/settings/compliance/a2p')
}
