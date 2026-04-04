import { createAdminClient } from '@/lib/supabase/server'
import { searchLocalBusinesses } from './brave-local'
import { searchBrave } from './brave-search'
import { crawlDeep } from './firecrawl'
import { extractCompanyData } from './extract'
import { scoreProspect } from './score'
import { pushProspectToSage } from './push-to-sage'
import { isBlockedDomain } from './quick-filter'

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

      // Extract phone numbers directly from Brave title/snippet (e.g. "Call 1300 319 866")
      const extractPhone = (text: string): string | null => {
        const m = text.match(/(?:call\s+)?(\+?(?:61\s*)?(?:1[38]\d{2}[\s-]?\d{3}[\s-]?\d{3}|\(?0\d\)?[\s-]?\d{4}[\s-]?\d{4}|\d{4}[\s-]?\d{3}[\s-]?\d{3}))/i)
        return m ? m[1].replace(/\s+/g, ' ').trim() : null
      }

      // Convert web results to LocalBusiness shape
      businesses = filtered.map(r => ({
        id:           r.domain,
        name:         r.title,
        phone:        extractPhone(`${r.title} ${r.description}`),
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
        description:  stripHtml(r.description),
      }))
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
        email_1:       null,
        emails:        [],
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
        // Pass the original Brave title as extra context — it often contains phone numbers
        const extraContext = b.name !== b.domain ? `Original listing title: ${b.name}` : undefined
        extracted = crawl
          ? await extractCompanyData(b.domain, crawl.markdown, crawl.title, extraContext)
          : {
              company_name: b.name,
              contact_name: null,
              description:  b.description,
              services:     b.categories,
              pricing_hint: null,
              city:         b.city,
              state:        b.state,
              country:      b.country,
              emails:       [],
              phones:       b.phone ? [b.phone] : [],
            }
      } else {
        // No website — use GMB data directly
        extracted = {
          company_name: b.name,
          contact_name: null,
          description:  b.description,
          services:     b.categories,
          pricing_hint: null,
          city:         b.city,
          state:        b.state,
          country:      b.country,
          emails:       [],
          phones:       b.phone ? [b.phone] : [],
        }
      }

      // Merge GMB phone with any extracted phones
      const allPhones = [...new Set([...(b.phone ? [b.phone] : []), ...extracted.phones])]
      const allEmails = extracted.emails

      // Score
      const scoreResult = scoreProspect(
        { ...extracted, phones: allPhones },
        icp,
        b.name,
        b.description ?? '',
      )
      scored++

      const locationText = [extracted.city ?? b.city, extracted.state ?? b.state, extracted.country ?? b.country].filter(Boolean).join(', ') || null

      await admin.from('prospect_companies').update({
        company_name:    extracted.company_name ?? b.name,
        contact_name:    extracted.contact_name,
        description:     extracted.description ?? b.description,
        services:        extracted.services.length ? extracted.services : b.categories,
        pricing_hint:    extracted.pricing_hint,
        city:            extracted.city ?? b.city,
        state:           extracted.state ?? b.state,
        country:         extracted.country ?? b.country,
        location_text:   locationText,
        emails:          allEmails,
        phones:          allPhones,
        email_1:         allEmails[0] ?? null,
        phone_1:         allPhones[0] ?? null,
        score:           scoreResult.score,
        score_tier:      scoreResult.tier,
        score_breakdown: scoreResult.breakdown,
        status:          scoreResult.tier === 'discarded' ? 'found' : 'scored',
        updated_at:      new Date().toISOString(),
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
