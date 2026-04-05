import { createAdminClient } from '@/lib/supabase/server'
import { searchBrave } from './brave-search'
import { batchQuickFilter } from './quick-filter'
import { crawlBatch } from './firecrawl'
import { extractCompanyData } from './extract'
import { scoreProspect } from './score'
import { pushProspectToSage } from './push-to-sage'
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

async function updateJob(
  jobId: string,
  status: JobStatus,
  statsUpdate: Record<string, number> = {},
) {
  const admin = createAdminClient()

  // Read current stats, merge updates
  const { data: job } = await admin
    .from('prospect_crawl_jobs')
    .select('stats')
    .eq('id', jobId)
    .single()

  const currentStats = (job?.stats ?? {}) as Record<string, number>
  const newStats = { ...currentStats, ...statsUpdate }

  await admin
    .from('prospect_crawl_jobs')
    .update({ status, stats: newStats, updated_at: new Date().toISOString() })
    .eq('id', jobId)
}

async function failJob(jobId: string, error: string) {
  const admin = createAdminClient()
  await admin
    .from('prospect_crawl_jobs')
    .update({ status: 'failed', error, updated_at: new Date().toISOString() })
    .eq('id', jobId)
}

/**
 * Full prospect discovery pipeline — runs asynchronously via after().
 *
 * Flow:
 *   Brave search → deduplicate → quick LLM filter → homepage crawl
 *   → extract → score → auto-push ≥70 → update job done
 */
export async function runProspectPipeline(
  jobId:       string,
  workspaceId: string,
  icp:         IcpProfile,
  searchQuery: string,
  location:    string,
  leadCount:   number = 20,
): Promise<void> {
  const admin = createAdminClient()

  try {
    // ── 1. Search ──────────────────────────────────────────────────────────
    await updateJob(jobId, 'searching')

    const countryHint  = icp.target_country?.trim()  ?? ''
    const stateHint    = icp.target_state?.trim()    ?? ''
    const postcodeHint = icp.target_postcode?.trim() ?? ''
    const braveQuery = [searchQuery, location, stateHint, postcodeHint, countryHint].filter(Boolean).join(' ')

    const searchResults = await searchBrave(braveQuery, leadCount)

    if (searchResults.length === 0) {
      await updateJob(jobId, 'done', { found: 0, relevant: 0, crawled: 0, scored: 0, pushed: 0 })
      return
    }

    // ── 2. Deduplicate by domain ───────────────────────────────────────────
    const seen = new Set<string>()
    const deduplicated = searchResults.filter(r => {
      if (seen.has(r.domain)) return false
      seen.add(r.domain)
      return true
    })

    await updateJob(jobId, 'filtering', { found: deduplicated.length })

    // ── 3. Quick LLM filter ───────────────────────────────────────────────
    const filtered = await batchQuickFilter(deduplicated, {
      industry:         icp.industry,
      market_segment:   icp.market_segment,
      target_keywords:  icp.target_keywords,
      exclude_keywords: icp.exclude_keywords,
    })

    await updateJob(jobId, 'filtering', { relevant: filtered.length })

    // Store all found companies in DB (filtered-out ones too, for transparency)
    const allDomains = deduplicated.map(r => r.domain)
    const filteredDomains = new Set(filtered.map(r => r.domain))

    for (const result of deduplicated) {
      await admin
        .from('prospect_companies')
        .upsert({
          workspace_id: workspaceId,
          icp_id:       icp.id,
          job_id:       jobId,
          domain:       result.domain,
          title:        result.title,
          snippet:      result.description,
          source:       'brave',
          status:       filteredDomains.has(result.domain) ? 'found' : 'filtered_out',
          updated_at:   new Date().toISOString(),
        }, { onConflict: 'workspace_id,domain' })
    }

    if (filtered.length === 0) {
      await updateJob(jobId, 'done', { found: allDomains.length, relevant: 0 })
      return
    }

    // ── 4. Deep-crawl (homepage + contact + about + services + pricing) ───────
    await updateJob(jobId, 'crawling')

    // Cap at 10 deep-crawls to control cost
    const toCrawl = filtered.slice(0, 10)
    const crawlResults = await crawlBatch(toCrawl.map(r => r.domain), 3)

    await updateJob(jobId, 'scoring', { crawled: crawlResults.size })

    // ── 5. Extract + score + push ──────────────────────────────────────────
    let pushed = 0
    let scored = 0

    for (const result of toCrawl) {
      const crawl = crawlResults.get(result.domain)

      // GMB / directory enrichment via targeted Brave search (non-blocking if it fails)
      // Always seed with the original search snippet so phone numbers in it are never lost
      const stripHtmlCtx = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim()
      let gmbContext: string = `Search snippet: ${stripHtmlCtx(result.description)}`
      try {
        const gmbResults = await searchBrave(`"${result.domain}" phone email address contact`, 5)
        if (gmbResults.length > 0) {
          gmbContext += '\n' + gmbResults
            .map(r => `${r.title}: ${stripHtmlCtx(r.description)}`)
            .join('\n')
        }
      } catch { /* non-critical */ }

      // Extract (use snippet as fallback if crawl failed)
      const stripHtml = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim()

      const extracted = crawl
        ? await extractCompanyData(result.domain, crawl.markdown, crawl.title, gmbContext)
        : (() => {
            // Crawl failed — regex sweep on snippet + gmbContext to salvage contact info
            const fallbackText = `${result.title} ${stripHtml(result.description)} ${gmbContext ?? ''}`
            const emailRe = /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g
            const phoneRe = /(?:\+?61[-\s]?)?(?:1[38]\d{2}[\s-]?\d{3}[\s-]?\d{3}|\(?0\d\)?[\s-]?\d{4}[\s-]?\d{4}|\+\d{1,3}[\s-]?\d[\s\d\-]{6,14}\d)/g
            const fallbackEmails = [...new Set((fallbackText.match(emailRe) ?? []).filter(e => !e.includes('example') && !e.includes('sentry') && !e.includes('@2x')))]
            const fallbackPhones = [...new Set((fallbackText.match(phoneRe) ?? []).map(p => p.trim()))]
            return {
              company_name:    result.title ?? result.domain,
              contact_name:    null,
              description:     stripHtml(result.description),
              services:        [],
              pricing_hint:    null,
              city:            null,
              state:           null,
              country:         null,
              emails:          fallbackEmails,
              phones:          fallbackPhones,
              decision_makers: [],
            }
          })()

      // Google Places enrichment — phone + address (non-blocking)
      let placesPhone:   string | null = null
      let placesCity:    string | null = null
      let placesCountry: string | null = null
      try {
        const places = await enrichFromPlaces(
          extracted.company_name ?? result.title ?? result.domain,
          location,
          result.domain,
        )
        if (places) {
          placesPhone   = places.phone
          placesCity    = places.city    ?? placesCity
          placesCountry = places.country ?? placesCountry
        }
      } catch { /* non-critical */ }

      // Hunter.io email enrichment (non-blocking)
      let hunterEmails: string[] = []
      try {
        const hunter = await enrichEmailsFromHunter(result.domain)
        if (hunter) hunterEmails = hunter.emails
      } catch { /* non-critical */ }

      // Merge: Google Places phone wins; Hunter emails prepended (highest confidence first)
      const finalPhones  = [...new Set([...(placesPhone ? [placesPhone] : []), ...extracted.phones])]
      const finalEmails  = [...new Set([...hunterEmails, ...extracted.emails])]
      const finalCity    = extracted.city    ?? placesCity
      const finalCountry = extracted.country ?? placesCountry

      // Score
      const scoreResult = scoreProspect({ ...extracted, phones: finalPhones }, icp, result.title, result.description)
      scored++

      // Deduct 1 credit — stop pipeline if exhausted
      const { data: prospectRow } = await admin
        .from('prospect_companies')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('domain', result.domain)
        .single()

      if (prospectRow) {
        const credited = await deductProspectCredit(workspaceId, prospectRow.id, jobId)
        if (!credited) {
          await updateJob(jobId, 'done', { scored, pushed })
          return
        }
      }

      // Compute location_text from structured fields for backwards compat
      const locationText = [finalCity, extracted.state, finalCountry].filter(Boolean).join(', ') || null

      // Update prospect record with extraction + score
      await admin
        .from('prospect_companies')
        .update({
          company_name:     extracted.company_name,
          contact_name:     extracted.contact_name,
          description:      extracted.description,
          services:         extracted.services,
          pricing_hint:     extracted.pricing_hint,
          city:             finalCity,
          state:            extracted.state,
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
        .eq('domain', result.domain)

      // Auto-push hot prospects
      if (scoreResult.score >= 70) {
        try {
          const { data: prospect } = await admin
            .from('prospect_companies')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('domain', result.domain)
            .single()

          if (prospect) {
            const pushResult = await pushProspectToSage(
              {
                id:           prospect.id,
                workspace_id: workspaceId,
                domain:       result.domain,
                company_name: extracted.company_name,
                description:  extracted.description,
                emails:       extracted.emails,
                phones:       extracted.phones,
                location_text: locationText,
              },
              icp.name,
            )

            await admin
              .from('prospect_companies')
              .update({
                status:     'pushed',
                deal_id:    pushResult.dealId,
                contact_id: pushResult.contactId,
                updated_at: new Date().toISOString(),
              })
              .eq('workspace_id', workspaceId)
              .eq('domain', result.domain)

            pushed++
          }
        } catch (err) {
          console.error(`[prospect] push failed for ${result.domain}:`, err)
        }
      }
    }

    await updateJob(jobId, 'done', { scored, pushed })

  } catch (err) {
    console.error('[prospect-pipeline] error:', err)
    await failJob(jobId, err instanceof Error ? err.message : String(err))
  }
}
