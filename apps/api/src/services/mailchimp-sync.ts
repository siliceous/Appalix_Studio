/**
 * Syncs a form submitter's contact details to the workspace's connected
 * Mailchimp audience.  Fire-and-forget — all errors are logged, not thrown.
 */
import { createHash } from 'crypto'
import { supabase }   from '../lib/supabase.js'

interface MailchimpConfig {
  access_token: string
  server:       string   // e.g. "us1"
  list_id:      string
}

interface ContactData {
  email?:   string
  name?:    string
  phone?:   string
  company?: string
  [key: string]: string | undefined
}

function md5(str: string) {
  return createHash('md5').update(str.toLowerCase()).digest('hex')
}

export async function syncToMailchimp(workspaceId: string, contact: ContactData): Promise<void> {
  if (!contact.email) return  // nothing to do without an email

  // Fetch connected Mailchimp integration for this workspace
  const { data: row } = await supabase
    .from('sage_integrations')
    .select('config')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'mailchimp')
    .eq('status', 'connected')
    .maybeSingle()

  if (!row) return  // not connected

  const cfg = row.config as MailchimpConfig
  if (!cfg?.access_token || !cfg?.list_id) return

  const server       = cfg.server ?? 'us1'
  const subscriberHash = md5(contact.email)
  const url          = `https://${server}.api.mailchimp.com/3.0/lists/${cfg.list_id}/members/${subscriberHash}`

  // Split name into first/last
  const nameParts = (contact.name ?? '').trim().split(/\s+/)
  const firstName = nameParts[0] ?? ''
  const lastName  = nameParts.slice(1).join(' ')

  const body = {
    email_address: contact.email,
    status_if_new: 'subscribed',
    merge_fields:  {
      ...(firstName  && { FNAME:   firstName  }),
      ...(lastName   && { LNAME:   lastName   }),
      ...(contact.phone   && { PHONE:   contact.phone   }),
      ...(contact.company && { COMPANY: contact.company }),
    },
  }

  try {
    const res = await fetch(url, {
      method:  'PUT',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${cfg.access_token}`,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { detail?: string }
      console.error(`[mailchimp-sync] API error ${res.status}:`, err.detail ?? res.statusText)
    }
  } catch (err) {
    console.error('[mailchimp-sync] fetch failed:', err)
  }
}
