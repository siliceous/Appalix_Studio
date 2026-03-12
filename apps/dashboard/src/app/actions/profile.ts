'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildBusinessDescription } from '@/lib/business-profile'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface ScrapedProfile {
  company:         string
  industry:        string
  whatYouSell:     string[]   // individual products / services as separate items
  targetCustomers: string[]   // individual customer segments as separate items
}

/**
 * Fetch a URL (website, LinkedIn, etc.) and use Claude to extract
 * structured business profile fields for the onboarding form.
 */
export async function scrapeBusinessProfile(url: string): Promise<ScrapedProfile | { error: string }> {
  let html: string
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Appalix/1.0; +https://appalix.com)',
        'Accept':     'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    html = await res.text()
  } catch (err) {
    return { error: `Could not fetch that URL: ${(err as Error).message}` }
  }

  // Strip HTML tags and collapse whitespace, keep at most 8000 chars
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000)

  if (!text) return { error: 'The page returned no readable content.' }

  try {
    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages:   [{
        role:    'user',
        content: `Extract business profile information from the following webpage content.
Return ONLY valid JSON with these exact keys:
{
  "company":         "company or brand name (string, empty string if not found)",
  "industry":        "industry sector such as SaaS, E-commerce, Consulting, etc. (string)",
  "whatYouSell":     ["product or service 1", "product or service 2"],
  "targetCustomers": ["customer segment 1", "customer segment 2"]
}

Rules:
- whatYouSell: list each distinct product or service as a separate short string (2–6 words each), max 8 items
- targetCustomers: list each distinct customer type or segment separately, max 6 items
- If a field cannot be determined, use an empty array [] or empty string ""

Webpage content:
${text}`,
      }],
    })

    const raw   = response.content.find(b => b.type === 'text')?.text ?? ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return { error: 'Could not parse AI response.' }

    const parsed = JSON.parse(match[0]) as ScrapedProfile
    return parsed
  } catch (err) {
    return { error: `AI extraction failed: ${(err as Error).message}` }
  }
}

/**
 * Update the workspace business profile from the Settings page.
 * Accepts the same fields as the onboarding form.
 */
export async function saveBusinessProfile(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const company     = (formData.get('company')          as string | null)?.trim() || null
  const industry    = (formData.get('industry')         as string | null)?.trim() || null
  const whatYouSell = (formData.get('what_you_sell')    as string | null)?.trim() || null
  const targetCust  = (formData.get('target_customers') as string | null)?.trim() || null

  const description = buildBusinessDescription({ company, industry, whatYouSell, targetCust })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership } = await (supabase as any)
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (!membership) return { error: 'Workspace not found' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('workspaces')
    .update({ sage_business_description: description })
    .eq('id', membership.workspace_id)

  if (error) return { error: error.message }

  // Reset AI analysis for recent emails so the 1-minute poller re-analyzes
  // them with the new business description (last 100 inbound emails).
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: recentEmails } = await (supabase as any)
      .from('sage_emails')
      .select('id')
      .eq('workspace_id', membership.workspace_id)
      .eq('direction', 'inbound')
      .not('ai_analyzed_at', 'is', null)
      .order('received_at', { ascending: false })
      .limit(100)

    if (recentEmails && recentEmails.length > 0) {
      const ids = (recentEmails as { id: string }[]).map(e => e.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('sage_emails')
        .update({ ai_analyzed_at: null })
        .in('id', ids)
    }
  } catch { /* best-effort — don't fail the save if this errors */ }

  return {}
}

export async function saveProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const firstName   = (formData.get('first_name')       as string | null)?.trim()
  const lastName    = (formData.get('last_name')         as string | null)?.trim() || null
  const company     = (formData.get('company')           as string | null)?.trim() || null
  const industry    = (formData.get('industry')          as string | null)?.trim() || null
  const whatYouSell = (formData.get('what_you_sell')     as string | null)?.trim() || null
  const targetCust  = (formData.get('target_customers')  as string | null)?.trim() || null

  if (!firstName) return

  const businessDescription = buildBusinessDescription({ company, industry, whatYouSell, targetCust })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('user_profiles').upsert({
    user_id:    user.id,
    first_name: firstName,
    last_name:  lastName,
    company,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  // Save business description to the workspace so AI email analysis uses it
  if (businessDescription) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: membership } = await (supabase as any)
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (membership) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('workspaces')
        .update({ sage_business_description: businessDescription })
        .eq('id', membership.workspace_id)
    }
  }

  // Detect email provider from the user's auth email domain
  const emailDomain = user.email?.split('@')[1]?.toLowerCase() ?? ''
  const microsoftDomains = ['outlook.com', 'hotmail.com', 'live.com', 'microsoft.com', 'msn.com']
  const gmailDomains = ['gmail.com', 'googlemail.com']
  let providerParam = ''
  if (gmailDomains.includes(emailDomain)) {
    providerParam = '?provider=gmail'
  } else if (microsoftDomains.includes(emailDomain)) {
    providerParam = '?provider=microsoft'
  }
  redirect(`/onboarding/connect${providerParam}`)
}
