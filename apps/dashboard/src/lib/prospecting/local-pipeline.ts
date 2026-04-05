import { createAdminClient } from '@/lib/supabase/server'
import { searchLocalBusinesses } from './brave-local'
import { searchBrave } from './brave-search'
import { crawlDeep } from './firecrawl'
import { extractCompanyData } from './extract'
import { scoreProspect } from './score'
import { pushProspectToSage } from './push-to-sage'
import { isBlockedDomain } from './quick-filter'
import { enrichFromPlaces } from './google-places'
import { enrichEmailsFromHunter } from './hunter'
import { deductProspectCredit } from './credits'

interface IcpProfile {
  id:                   string
  name:                 string
  industry:             string
  market_segment?:      'b2b' | 'b2c' | 'both'
  target_country?:      string
  target_state?:        string
  target_postcode?:     string
  target_keywords:      string[]
  locations:            string[]
  exclude_keywords:     string[]
  services_of_interest: string[]
}

type JobStatus = 'pending' | 'searching' | 'filtering' | 'crawling' | 'scoring' | 'done' | 'failed'

async function updateJob(jobId: string, status: JobStatus, statsUpdate: Record<string, number> = {}) {
  const admin = createAdminClient()
  const { data: job } = await admin.from('prospect_crawl_jobs').select('stats').eq('id', jobId).single()
  const newStats = { ...(job?.stats ?? {}), ...statsUpdate }
  await admin.from('prospect_crawl_jobs')
    .update({ status, stats: newStats, updated_at: new Date().toISOString() })
    .eq('id', jobId)
}

async function failJob(jobId: string, error: string) {
  const admin = createAdminClient()
  await admin.from('prospect_crawl_jobs')
    .update({ status: 'failed', error, updated_at: new Date().toISOString() })
    .eq('id', jobId)
}

/**
 * Local (Map Pack / GMB) prospect pipeline.
 *
 * Flow:
 *   Brave Local Search → store businesses (with GMB phone/address) →
 *   crawl websites → extract + score → auto-push ≥70 → done
 */
export async function runLocalProspectPipeline(
  jobId:       string,
  workspaceId: string,
  icp:         IcpProfile,
  searchQuery: string,
  location:    string,
  leadCount:   number = 20,
): Promise<void> {
  const admin = createAdminClient()

  try {
    // ── 1. Brave Local Search ─────────────────────────────────────────────────
    await updateJob(jobId, 'searching')

    // Keep query focused — too many suburb terms dilutes Brave results
    const locationHint = [location || icp.locations[0], icp.target_state, icp.target_country]
      .filter(Boolean).join(' ')
    const braveQuery = [searchQuery, locationHint].filter(Boolean).join(' ')

    let businesses = await searchLocalBusinesses(braveQuery, leadCount)

    // ── Fallback: if Brave Local has no coverage (e.g. AU regions), use web search ──
    if (businesses.length === 0) {
      console.log('[local-pipeline] Brave Local returned 0 — falling back to web search with blocklist')
      const webResults = await searchBrave(braveQuery, leadCount)
      const filtered   = webResults.filter(r => !isBlockedDomain(r.domain))

      // Strip HTML from Brave snippets
      const stripHtml = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim()

      // Extract phone/email directly from Brave title+snippet
      const extractPhone = (text: string): string | null => {
        const m = text.match(/(?:call\s+)?(\+?(?:61[-\s]?)?(?:1[38]\d{2}[\s-]?\d{3}[\s-]?\d{3}|\(?0\d\)?[\s-]?\d{4}[\s-]?\d{4}|\d{4}[\s-]?\d{3}[\s-]?\d{3}))/i)
        return m ? m[1].replace(/\s+/g, ' ').trim() : null
      }
      const extractEmail = (text: string): string | null => {
        const m = text.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/)
        return m ? m[1] : null
      }

      // Convert web results to LocalBusiness shape
      businesses = filtered.map(r => {
        const cleanSnippet = stripHtml(r.description)
        return {
          id:           r.domain,
          name:         r.title,
          phone:        extractPhone(`${r.title} ${r.description}`),
          email:        extractEmail(`${r.title} ${r.description}`),
          website:      r.url,
          domain:       r.domain,
          address:      null,
          city:         null,
          state:        null,
          postcode:     null,
          country:      null,
          categories:   [],
          rating:       null,
          review_count: null,
          description:  cleanSnippet,
          snippet:      cleanSnippet,
        }
      })
    }

    if (businesses.length === 0) {
      await updateJob(jobId, 'done', { found: 0, relevant: 0, crawled: 0, scored: 0, pushed: 0 })
      return
    }

    // ── 2. Deduplicate by domain (skip businesses with no website) ────────────
    await updateJob(jobId, 'filtering', { found: businesses.length })

    const seen = new Set<string>()
    const toProcess = businesses.filter(b => {
      const key = b.domain ?? b.name.toLowerCase().replace(/\s+/g, '-')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // ── 3. Store all found businesses in DB immediately (GMB data) ────────────
    for (const b of toProcess) {
      const locationText = [b.city, b.state, b.country].filter(Boolean).join(', ') || null

      await admin.from('prospect_companies').upsert({
        workspace_id:  workspaceId,
        icp_id:        icp.id,
        job_id:        jobId,
        domain:        b.domain ?? b.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
        company_name:  b.name,
        description:   b.description,
        services:      b.categories,
        city:          b.city,
        state:         b.state,
        country:       b.country,
        location_text: locationText,
        phone_1:       b.phone,
        phones:        b.phone ? [b.phone] : [],
        email_1:       b.email,
        emails:        b.email ? [b.email] : [],
        source:        'local_search',
        status:        'found',
        updated_at:    new Date().toISOString(),
      }, { onConflict: 'workspace_id,domain' })
    }

    await updateJob(jobId, 'crawling', { relevant: toProcess.length })

    // ── 4. Crawl websites for enrichment (those that have a domain) ───────────
    const withWebsite = toProcess.filter(b => b.domain).slice(0, 10)
    let scored = 0
    let pushed = 0

    for (const b of toProcess) {
      const domain = b.domain ?? b.name.toLowerCase().replace(/[^a-z0-9]/g, '')

      // Try to crawl the website for email, contact name, pricing
      let extracted: Awaited<ReturnType<typeof extractCompanyData>>

      if (b.domain) {
        const crawl = await crawlDeep(b.domain)
        // Build extra context — include GMB phone/email + Brave snippet
        const contextParts = [
          b.name !== b.domain ? `Listing title: ${b.name}` : null,
          b.phone ? `GMB phone: ${b.phone}` : null,
          b.email ? `GMB email: ${b.email}` : null,
          b.snippet ? `Search snippet: ${b.snippet}` : null,
        ].filter(Boolean)
        const extraContext = contextParts.length ? contextParts.join('\n') : undefined
        extracted = crawl
          ? await extractCompanyData(b.domain, crawl.markdown, crawl.title, extraContext)
          : (() => {
              // Crawl failed — regex sweep on snippet + extraContext to salvage contact info
              const fallbackText = `${b.name} ${b.description ?? ''} ${b.snippet ?? ''} ${extraContext ?? ''}`
              const emailRe = /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g
              const phoneRe = /(?:\+?61[-\s]?)?(?:1[38]\d{2}[\s-]?\d{3}[\s-]?\d{3}|\(?0\d\)?[\s-]?\d{4}[\s-]?\d{4}|\+\d{1,3}[\s-]?\d[\s\d\-]{6,14}\d)/g
              const fallbackEmails = [...new Set([
                ...(b.email ? [b.email] : []),
                ...(fallbackText.match(emailRe) ?? []).filter(e => !e.includes('example') && !e.includes('sentry') && !e.includes('@2x')),
              ])]
              const fallbackPhones = [...new Set([
                ...(b.phone ? [b.phone] : []),
                ...(fallbackText.match(phoneRe) ?? []).map(p => p.trim()),
              ])]
              return {
                company_name:    b.name,
                contact_name:    null,
                description:     b.description,
                services:        b.categories,
                pricing_hint:    null,
                city:            b.city,
                state:           b.state,
                country:         b.country,
                emails:          fallbackEmails,
                phones:          fallbackPhones,
                decision_makers: [],
              }
            })()
      } else {
        // No website — use GMB data directly
        extracted = {
          company_name:    b.name,
          contact_name:    null,
          description:     b.description,
          services:        b.categories,
          pricing_hint:    null,
          city:            b.city,
          state:           b.state,
          country:         b.country,
          emails:          [],
          phones:          b.phone ? [b.phone] : [],
          decision_makers: [],
        }
      }

      // Merge GMB phone with any extracted phones
      const allPhones = [...new Set([...(b.phone ? [b.phone] : []), ...extracted.phones])]
      const allEmails = [...new Set([...(b.email ? [b.email] : []), ...extracted.emails])]

      // Google Places enrichment — phone wins over scraped (non-blocking)
      let placesPhone:   string | null = null
      let placesCity:    string | null = null
      let placesCountry: string | null = null
      try {
        const places = await enrichFromPlaces(
          extracted.company_name ?? b.name,
          [b.city, b.state, b.country].filter(Boolean).join(' ') || location,
          b.domain ?? undefined,
        )
        if (places) {
          placesPhone   = places.phone
          placesCity    = places.city
          placesCountry = places.country
        }
      } catch { /* non-critical */ }

      // Hunter.io email enrichment (non-blocking)
      let hunterEmails: string[] = []
      try {
        if (b.domain) {
          const hunter = await enrichEmailsFromHunter(b.domain)
          if (hunter) hunterEmails = hunter.emails
        }
      } catch { /* non-critical */ }

      const finalPhones  = [...new Set([...(placesPhone ? [placesPhone] : []), ...allPhones])]
      const finalEmails  = [...new Set([...hunterEmails, ...allEmails])]
      const finalCity    = extracted.city    ?? b.city    ?? placesCity
      const finalCountry = extracted.country ?? b.country ?? placesCountry

      // Score
      const scoreResult = scoreProspect(
        { ...extracted, phones: finalPhones },
        icp,
        b.name,
        b.description ?? '',
      )
      scored++

      // Deduct 1 credit — stop pipeline if exhausted
      const { data: prospectRow } = await admin
        .from('prospect_companies')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('domain', domain)
        .single()

      if (prospectRow) {
        const credited = await deductProspectCredit(workspaceId, prospectRow.id, jobId)
        if (!credited) {
          await updateJob(jobId, 'done', { scored, pushed })
          return
        }
      }

      const locationText = [finalCity, extracted.state ?? b.state, finalCountry].filter(Boolean).join(', ') || null

      await admin.from('prospect_companies').update({
        company_name:     extracted.company_name ?? b.name,
        contact_name:     extracted.contact_name,
        description:      extracted.description ?? b.description,
        services:         extracted.services.length ? extracted.services : b.categories,
        pricing_hint:     extracted.pricing_hint,
        city:             finalCity,
        state:            extracted.state ?? b.state,
        country:          finalCountry,
        location_text:    locationText,
        emails:           finalEmails,
        phones:           finalPhones,
        email_1:          finalEmails[0] ?? null,
        phone_1:          finalPhones[0] ?? null,
        decision_makers:  extracted.decision_makers,
        score:            scoreResult.score,
        score_tier:       scoreResult.tier,
        score_breakdown:  scoreResult.breakdown,
        status:           scoreResult.tier === 'discarded' ? 'found' : 'scored',
        updated_at:       new Date().toISOString(),
      })
        .eq('workspace_id', workspaceId)
        .eq('domain', domain)

      // Auto-push hot prospects
      if (scoreResult.score >= 70) {
        try {
          const { data: prospect } = await admin.from('prospect_companies')
            .select('id').eq('workspace_id', workspaceId).eq('domain', domain).single()

          if (prospect) {
            const pushResult = await pushProspectToSage(
              {
                id:            prospect.id,
                workspace_id:  workspaceId,
                domain,
                company_name:  extracted.company_name ?? b.name,
                description:   extracted.description ?? b.description,
                emails:        allEmails,
                phones:        allPhones,
                location_text: locationText,
              },
              icp.name,
            )

            await admin.from('prospect_companies').update({
              status:     'pushed',
              deal_id:    pushResult.dealId,
              contact_id: pushResult.contactId,
              updated_at: new Date().toISOString(),
            }).eq('workspace_id', workspaceId).eq('domain', domain)

            pushed++
          }
        } catch (err) {
          console.error(`[local-pipeline] push failed for ${domain}:`, err)
        }
      }
    }

    await updateJob(jobId, 'done', { crawled: withWebsite.length, scored, pushed })

  } catch (err) {
    console.error('[local-pipeline] error:', err)
    await failJob(jobId, err instanceof Error ? err.message : String(err))
  }
}
