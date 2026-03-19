/**
 * Syncs a contact to all connected marketing platforms for a workspace.
 * Fire-and-forget — errors are logged, not thrown.
 */
import { createHash } from 'crypto'
import { supabase }   from '../lib/supabase.js'

interface ContactData {
  email?:    string
  name?:     string
  phone?:    string
  company?:  string
  [key: string]: string | undefined
}

type Cfg = Record<string, string>

interface SyncOptions {
  formMailchimpListId?: string
  submissionId?: string
}

function nameParts(name = '') {
  const parts = name.trim().split(/\s+/)
  return { first: parts[0] ?? '', last: parts.slice(1).join(' ') }
}

async function pushMailchimp(cfg: Cfg, c: ContactData, opts?: SyncOptions): Promise<boolean> {
  const listId = opts?.formMailchimpListId ?? cfg.list_id
  if (!c.email || !cfg.access_token || !listId) return false
  const hash = createHash('md5').update(c.email.toLowerCase()).digest('hex')
  const { first, last } = nameParts(c.name)
  const res = await fetch(`https://${cfg.server ?? 'us1'}.api.mailchimp.com/3.0/lists/${listId}/members/${hash}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.access_token}` },
    body: JSON.stringify({
      email_address: c.email,
      status_if_new: 'subscribed',
      merge_fields: {
        ...(first && { FNAME: first }),
        ...(last  && { LNAME: last }),
        ...(c.phone   && { PHONE: c.phone }),
        ...(c.company && { COMPANY: c.company }),
      },
    }),
  }).catch(e => { console.error('[sync/mailchimp]', e); return null })
  return !!res?.ok
}

async function pushKit(cfg: Cfg, c: ContactData) {
  const token = cfg.access_token ?? cfg.api_key
  if (!c.email || !token) return
  const { first } = nameParts(c.name)
  await fetch('https://api.kit.com/v4/subscribers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ email_address: c.email, first_name: first }),
  }).catch(e => console.error('[sync/kit]', e))
}

async function pushKlaviyo(cfg: Cfg, c: ContactData) {
  if (!c.email || !cfg.api_key) return
  const { first, last } = nameParts(c.name)
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
  const { first, last } = nameParts(c.name)
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
  const { first, last } = nameParts(c.name)
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

export async function syncContactToAllPlatforms(workspaceId: string, contact: ContactData, opts?: SyncOptions): Promise<void> {
  if (!contact.email) return

  const { data: rows } = await supabase
    .from('sage_integrations')
    .select('provider, config')
    .eq('workspace_id', workspaceId)
    .eq('status', 'connected')
    .in('provider', ['mailchimp', 'convertkit', 'klaviyo', 'constantcontact', 'activecampaign'])

  if (!rows?.length) return

  const results = await Promise.allSettled(
    (rows as Array<{ provider: string; config: Cfg }>).map(({ provider, config }) => {
      switch (provider) {
        case 'mailchimp':       return pushMailchimp(config, contact, opts)
        case 'convertkit':      return pushKit(config, contact)
        case 'klaviyo':         return pushKlaviyo(config, contact)
        case 'constantcontact': return pushConstantContact(config, contact)
        case 'activecampaign':  return pushActiveCampaign(config, contact)
        default: return Promise.resolve(false)
      }
    })
  )

  // Stamp mailchimp_synced_at if Mailchimp push succeeded
  if (opts?.submissionId) {
    const mailchimpIdx = (rows as Array<{ provider: string }>).findIndex(r => r.provider === 'mailchimp')
    if (mailchimpIdx >= 0) {
      const result = results[mailchimpIdx]
      if (result.status === 'fulfilled' && result.value === true) {
        const { error: stampErr } = await supabase
          .from('sage_form_submissions')
          .update({ mailchimp_synced_at: new Date().toISOString() })
          .eq('id', opts.submissionId)
        if (stampErr) console.error('[sync/mailchimp] stamp failed', stampErr)
      }
    }
  }
}

// Keep old export alias for backwards compat
export { syncContactToAllPlatforms as syncToMailchimp }
