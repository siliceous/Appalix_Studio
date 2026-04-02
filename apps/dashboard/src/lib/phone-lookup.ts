import { createAdminClient } from '@/lib/supabase/server'

// Reduce phone to last 10 digits for format-agnostic comparison
function phoneDigits(p: string): string {
  return p.replace(/\D/g, '').slice(-10)
}

// Returns true if the string looks like a real name rather than a phone number
export function isRealName(s: string | null | undefined): boolean {
  if (!s) return false
  return !/^\+?\d[\d\s\-().]{5,}$/.test(s.trim())
}

/**
 * Search all internal data sources for a name associated with the given
 * phone number. Returns the first match found, or null.
 *
 * Priority: sage_contacts → leads → form submissions → emails
 *
 * @param phone        E.164 phone number to look up
 * @param workspaceId  Workspace scope (multi-tenant isolation)
 * @param excludeContactId  ID of the contact just created — skip to avoid self-match
 */
export async function lookupPhoneOwner(
  phone: string,
  workspaceId: string,
  excludeContactId?: string,
): Promise<string | null> {
  const admin = createAdminClient()
  const digits = phoneDigits(phone)
  if (digits.length < 7) return null

  // Run all source queries in parallel for speed
  const [contactsRes, leadsRes, formsRes, emailsRes] = await Promise.all([
    // 1. sage_contacts — user-verified names only (name_source IS NULL = confirmed)
    admin
      .from('sage_contacts')
      .select('id, name, phone')
      .eq('workspace_id', workspaceId)
      .not('phone', 'is', null)
      .is('name_source', null)
      .limit(50),

    // 2. leads (Meta/Google Ads) — direct name + phone columns
    admin
      .from('leads')
      .select('name, phone')
      .eq('workspace_id', workspaceId)
      .not('phone', 'is', null)
      .not('name', 'is', null)
      .limit(50),

    // 3. form submissions — AI-extracted entities (recent 100, compare in JS)
    admin
      .from('sage_form_submissions')
      .select('ai_entities')
      .eq('workspace_id', workspaceId)
      .not('ai_entities', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100),

    // 4. emails — AI-extracted entities (recent 100, compare in JS)
    admin
      .from('sage_emails')
      .select('ai_entities')
      .eq('workspace_id', workspaceId)
      .not('ai_entities', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  // ── 1. sage_contacts ──────────────────────────────────────────────────────
  for (const c of contactsRes.data ?? []) {
    if (c.id === excludeContactId) continue
    if (c.phone && phoneDigits(c.phone) === digits && isRealName(c.name)) {
      return c.name
    }
  }

  // ── 2. leads ──────────────────────────────────────────────────────────────
  for (const l of leadsRes.data ?? []) {
    if (l.phone && phoneDigits(l.phone) === digits && isRealName(l.name)) {
      return l.name
    }
  }

  // ── 3. form submissions ───────────────────────────────────────────────────
  for (const f of formsRes.data ?? []) {
    const e = f.ai_entities as Record<string, string> | null
    if (e?.phone && phoneDigits(e.phone) === digits && isRealName(e.name)) {
      return e.name
    }
  }

  // ── 4. emails ─────────────────────────────────────────────────────────────
  for (const em of emailsRes.data ?? []) {
    const e = em.ai_entities as Record<string, string> | null
    if (e?.phone && phoneDigits(e.phone) === digits && isRealName(e.name)) {
      return e.name
    }
  }

  return null
}
