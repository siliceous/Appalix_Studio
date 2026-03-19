/**
 * Two-way Mailchimp ↔ Appalix contact sync.
 * Runs every 5 minutes for each workspace with sync_enabled = true.
 *
 * Mailchimp → Appalix: fetch members changed since last_synced_at, upsert contacts
 * Appalix → Mailchimp: push contacts updated since last_synced_at to Mailchimp
 * Deletions: contacts with sync_deleted_at older than 5 min → unsubscribe + hard delete
 */

import { createHash } from 'crypto'
import { supabase }   from '../lib/supabase.js'

type Cfg = Record<string, string>

interface MailchimpMember {
  id:            string   // member unique id
  email_address: string
  full_name:     string
  status:        string
  last_changed:  string
  merge_fields:  Record<string, unknown>
  tags:          { id: number; name: string }[]
}

function nameParts(name = '') {
  const parts = name.trim().split(/\s+/)
  return { first: parts[0] ?? '', last: parts.slice(1).join(' ') }
}

// ── Mailchimp → Appalix ──────────────────────────────────────────────────────

async function pullFromMailchimp(workspaceId: string, cfg: Cfg, since: string | null): Promise<number> {
  const { access_token, server, list_id } = cfg
  if (!access_token || !list_id) return 0

  const sinceParam = since ? `&since_last_changed=${encodeURIComponent(since)}` : ''
  const url = `https://${server ?? 'us1'}.api.mailchimp.com/3.0/lists/${list_id}/members?count=500&status=subscribed${sinceParam}`

  const res = await fetch(url, { headers: { Authorization: `Bearer ${access_token}` } })
  if (!res.ok) {
    console.error('[mailchimp-sync] pull failed:', res.status, await res.text())
    return 0
  }

  const data = await res.json() as { members?: MailchimpMember[] }
  const members = data.members ?? []
  let count = 0

  for (const m of members) {
    const mf   = m.merge_fields ?? {}
    const addr = (typeof mf.ADDRESS === 'object' && mf.ADDRESS ? mf.ADDRESS : {}) as Record<string, string>
    const name = m.full_name ||
      `${mf.FNAME ?? ''} ${mf.LNAME ?? ''}`.toString().trim() ||
      m.email_address

    const phone      = typeof mf.PHONE    === 'string' ? mf.PHONE    : null
    const company    = typeof mf.COMPANY  === 'string' ? mf.COMPANY  : null
    const jobTitle   = typeof mf.JOBTITLE === 'string' ? mf.JOBTITLE : null
    const websiteUrl = typeof mf.WEBSITE  === 'string' ? mf.WEBSITE  : null

    // Deduplicate against sage_form_submissions by email or phone + same platform
    let existingSub: { id: string } | null = null
    const { data: byEmail } = await supabase
      .from('sage_form_submissions')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('source_platform', 'mailchimp')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter('fields->>email' as any, 'eq', m.email_address)
      .limit(1)
      .maybeSingle()
    existingSub = byEmail as { id: string } | null
    if (!existingSub && phone) {
      const { data: byPhone } = await supabase
        .from('sage_form_submissions')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('source_platform', 'mailchimp')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter('fields->>phone' as any, 'eq', phone)
        .limit(1)
        .maybeSingle()
      existingSub = byPhone as { id: string } | null
    }

    if (!existingSub) {
      const fields: Record<string, string> = { name, email: m.email_address }
      if (phone)      fields.phone     = phone
      if (company)    fields.company   = company
      if (jobTitle)   fields.job_title = jobTitle
      if (websiteUrl) fields.website   = websiteUrl

      await supabase.from('sage_form_submissions').insert({
        workspace_id:    workspaceId,
        form_id:         null,
        source_platform: 'mailchimp',
        fields,
      })
    }

    // Also upsert into sage_contacts (sync is always enabled when this runs)
    const contactFields = {
      name,
      email:               m.email_address,
      phone,
      company_name:        company,
      title:               jobTitle,
      website_url:         websiteUrl,
      street:              addr.addr1   ?? null,
      city:                addr.city    ?? null,
      state:               addr.state   ?? null,
      zip:                 addr.zip     ?? null,
      country:             addr.country ?? null,
      tags:                m.tags.map(t => t.name),
      mailchimp_member_id: m.id,
      updated_at:          new Date().toISOString(),
    }

    const { data: existing } = await supabase
      .from('sage_contacts')
      .select('id')
      .eq('workspace_id', workspaceId)
      .or(`mailchimp_member_id.eq.${m.id},email.eq.${m.email_address}`)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('sage_contacts')
        .update(contactFields)
        .eq('id', existing.id)
        .eq('workspace_id', workspaceId)
    } else {
      await supabase
        .from('sage_contacts')
        .insert({
          ...contactFields,
          workspace_id: workspaceId,
          source:       'mailchimp',
          contact_type: 'potential_customer',
        })
    }
    count++
  }

  return count
}

// ── Appalix → Mailchimp ──────────────────────────────────────────────────────

async function pushToMailchimp(workspaceId: string, cfg: Cfg, since: string | null): Promise<number> {
  const { access_token, server, list_id } = cfg
  if (!access_token || !list_id) return 0

  const { data: contacts } = await supabase
    .from('sage_contacts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('sync_deleted_at', null)
    .gt('updated_at', since ?? '1970-01-01')
    .neq('source', 'mailchimp')  // don't re-push what we just pulled

  if (!contacts?.length) return 0

  let count = 0
  for (const c of contacts as Record<string, unknown>[]) {
    if (!c.email) continue
    const hash = createHash('md5').update((c.email as string).toLowerCase()).digest('hex')
    const { first, last } = nameParts(c.name as string)

    const body: Record<string, unknown> = {
      email_address: c.email,
      status_if_new: 'subscribed',
      merge_fields: {
        ...(first                                  ? { FNAME:    first }           : {}),
        ...(last                                   ? { LNAME:    last }            : {}),
        ...(typeof c.phone       === 'string'      ? { PHONE:    c.phone }         : {}),
        ...(typeof c.company_name === 'string'     ? { COMPANY:  c.company_name }  : {}),
        ...(typeof c.title       === 'string'      ? { JOBTITLE: c.title }         : {}),
        ...(typeof c.website_url === 'string'      ? { WEBSITE:  c.website_url }   : {}),
      },
    }

    if (Array.isArray(c.tags) && c.tags.length > 0) {
      body.tags = (c.tags as string[]).map(name => ({ name, status: 'active' }))
    }

    const res = await fetch(
      `https://${server ?? 'us1'}.api.mailchimp.com/3.0/lists/${list_id}/members/${hash}`,
      {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access_token}` },
        body:    JSON.stringify(body),
      }
    ).catch(e => { console.error('[mailchimp-sync] push error', e); return null })

    if (res?.ok) {
      // Store the Mailchimp member id if we don't have it yet
      if (!c.mailchimp_member_id) {
        const data = await res.json().catch(() => null) as { id?: string } | null
        if (data?.id) {
          await supabase
            .from('sage_contacts')
            .update({ mailchimp_member_id: data.id })
            .eq('id', c.id as string)
        }
      }
      count++
    }
  }

  return count
}

// ── Process pending deletions ────────────────────────────────────────────────

async function processDeletions(workspaceId: string, cfg: Cfg): Promise<void> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  const { data: toDelete } = await supabase
    .from('sage_contacts')
    .select('id, email, mailchimp_member_id')
    .eq('workspace_id', workspaceId)
    .not('sync_deleted_at', 'is', null)
    .lt('sync_deleted_at', fiveMinutesAgo)

  if (!toDelete?.length) return

  const { access_token, server, list_id } = cfg

  for (const c of toDelete as { id: string; email: string | null; mailchimp_member_id: string | null }[]) {
    // Unsubscribe from Mailchimp
    if (c.email && access_token && list_id) {
      const hash = createHash('md5').update(c.email.toLowerCase()).digest('hex')
      await fetch(
        `https://${server ?? 'us1'}.api.mailchimp.com/3.0/lists/${list_id}/members/${hash}`,
        {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access_token}` },
          body:    JSON.stringify({ status: 'unsubscribed' }),
        }
      ).catch(e => console.error('[mailchimp-sync] unsubscribe error', e))
    }

    // Hard delete from Appalix
    await supabase
      .from('sage_contacts')
      .delete()
      .eq('id', c.id)
      .eq('workspace_id', workspaceId)
  }
}

// ── Main poller ──────────────────────────────────────────────────────────────

export async function runMailchimpTwoWaySync(): Promise<void> {
  // Find all workspaces with Mailchimp connected and sync_enabled = true
  const { data: integrations } = await supabase
    .from('sage_integrations')
    .select('id, workspace_id, config, last_synced_at, sync_enabled')
    .eq('provider', 'mailchimp')
    .eq('status', 'connected')
    .eq('sync_enabled', true)

  if (!integrations?.length) return

  for (const integration of integrations as {
    id: string
    workspace_id: string
    config: Cfg
    last_synced_at: string | null
    sync_enabled: boolean
  }[]) {
    const { id, workspace_id, config, last_synced_at } = integration

    try {
      const [pulled, pushed] = await Promise.all([
        pullFromMailchimp(workspace_id, config, last_synced_at),
        pushToMailchimp(workspace_id, config, last_synced_at),
      ])

      await processDeletions(workspace_id, config)

      const total = pulled + pushed
      await supabase
        .from('sage_integrations')
        .update({
          last_synced_at:  new Date().toISOString(),
          last_sync_count: total,
        })
        .eq('id', id)

      if (total > 0) {
        console.log(`[mailchimp-sync] workspace=${workspace_id} pulled=${pulled} pushed=${pushed}`)
      }
    } catch (err) {
      console.error(`[mailchimp-sync] error for workspace=${workspace_id}:`, err)
    }
  }
}
