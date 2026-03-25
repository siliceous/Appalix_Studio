/**
 * Push a contact to all connected marketing platforms for a workspace.
 * Used by server actions after contact create/update.
 * Fire-and-forget — all errors are logged, not thrown.
 */
import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'

interface ContactData {
  email?:      string | null
  name?:       string | null
  phone?:      string | null
  company?:    string | null
}

type Cfg = Record<string, string>

function nameParts(name = '') {
  const parts = name.trim().split(/\s+/)
  return { first: parts[0] ?? '', last: parts.slice(1).join(' ') }
}

async function pushMailchimp(cfg: Cfg, c: ContactData) {
  if (!c.email || !cfg.access_token || !cfg.list_id) return
  const hash = createHash('md5').update(c.email.toLowerCase()).digest('hex')
  const { first, last } = nameParts(c.name ?? '')
  await fetch(`https://${cfg.server ?? 'us1'}.api.mailchimp.com/3.0/lists/${cfg.list_id}/members/${hash}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.access_token}` },
    body: JSON.stringify({
      email_address: c.email,
      status_if_new: 'subscribed',
      merge_fields: {
        ...(first && { FNAME: first }),
        ...(last  && { LNAME: last }),
        ...(c.phone   && { PHONE:   c.phone }),
        ...(c.company && { COMPANY: c.company }),
      },
    }),
  }).catch(e => console.error('[sync/mailchimp]', e))
}

async function pushKit(cfg: Cfg, c: ContactData) {
  if (!c.email || !cfg.api_key) return
  const { first } = nameParts(c.name ?? '')
  await fetch('https://api.kit.com/v4/subscribers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': cfg.api_key },
    body: JSON.stringify({ email_address: c.email, first_name: first }),
  }).catch(e => console.error('[sync/kit]', e))
}

async function pushKlaviyo(cfg: Cfg, c: ContactData) {
  if (!c.email || !cfg.api_key) return
  const { first, last } = nameParts(c.name ?? '')
  const profileRes = await fetch('https://a.klaviyo.com/api/profiles/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Klaviyo-API-Key ${cfg.api_key}`,
      'revision': '2024-02-15',
    },
    body: JSON.stringify({
      data: {
        type: 'profile',
        attributes: {
          email: c.email,
          first_name: first,
          last_name: last,
          ...(c.phone   && { phone_number: c.phone }),
          ...(c.company && { organization: c.company }),
        },
      },
    }),
  }).catch(e => { console.error('[sync/klaviyo]', e); return null })

  if (cfg.list_id && profileRes?.ok) {
    const data = await profileRes.json().catch(() => null) as { data?: { id: string } } | null
    const pid = data?.data?.id
    if (pid) {
      await fetch(`https://a.klaviyo.com/api/lists/${cfg.list_id}/relationships/profiles/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Klaviyo-API-Key ${cfg.api_key}`,
          'revision': '2024-02-15',
        },
        body: JSON.stringify({ data: [{ type: 'profile', id: pid }] }),
      }).catch(e => console.error('[sync/klaviyo/list]', e))
    }
  }
}

async function pushConstantContact(cfg: Cfg, c: ContactData) {
  if (!c.email || !cfg.access_token) return
  const { first, last } = nameParts(c.name ?? '')
  await fetch('https://api.cc.email/v3/contacts/sign_up_form', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.access_token}` },
    body: JSON.stringify({
      email_address: c.email,
      first_name: first,
      last_name: last,
      ...(c.phone && { phone_numbers: [{ phone_number: c.phone, kind: 'mobile' }] }),
      list_memberships: cfg.list_id ? [cfg.list_id] : [],
      create_source: 'Account',
    }),
  }).catch(e => console.error('[sync/constantcontact]', e))
}

async function pushActiveCampaign(cfg: Cfg, c: ContactData) {
  if (!c.email || !cfg.api_url || !cfg.api_key) return
  const { first, last } = nameParts(c.name ?? '')
  const base = cfg.api_url.replace(/\/$/, '')
  await fetch(`${base}/api/3/contact/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Api-Token': cfg.api_key },
    body: JSON.stringify({
      contact: {
        email: c.email,
        firstName: first,
        lastName: last,
        ...(c.phone && { phone: c.phone }),
      },
    }),
  }).catch(e => console.error('[sync/activecampaign]', e))
}

export async function syncContactOutbound(workspaceId: string, contact: ContactData): Promise<void> {
  if (!contact.email) return
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (admin as any)
    .from('sage_integrations')
    .select('provider, config')
    .eq('workspace_id', workspaceId)
    .eq('status', 'connected')
    .in('provider', ['mailchimp', 'convertkit', 'klaviyo', 'constantcontact', 'activecampaign'])

  if (!rows?.length) return

  void Promise.allSettled(
    (rows as Array<{ provider: string; config: Cfg }>).map(({ provider, config }) => {
      switch (provider) {
        case 'mailchimp':       return pushMailchimp(config, contact)
        case 'convertkit':      return pushKit(config, contact)
        case 'klaviyo':         return pushKlaviyo(config, contact)
        case 'constantcontact': return pushConstantContact(config, contact)
        case 'activecampaign':  return pushActiveCampaign(config, contact)
        default: return Promise.resolve()
      }
    })
  )
}
