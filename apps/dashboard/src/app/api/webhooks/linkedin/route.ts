import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient }         from '@/lib/supabase/server'
import { ingestLead }                from '@/lib/ingest-lead'

export const dynamic = 'force-dynamic'

// ── Fetch lead details from LinkedIn API ────────────────────────────────────

async function fetchLinkedInLead(
  responseUrn: string,
  accessToken: string,
): Promise<{
  name:          string
  email:         string | null
  phone:         string | null
  company:       string | null
  job_title:     string | null
  website:       string | null
  campaign_name: string | null
  ad_name:       string | null
  form_name:     string | null
  extra:         Record<string, string>
} | null> {
  try {
    // Extract the numeric ID from the URN
    const responseId = responseUrn.split(':').pop()
    const res = await fetch(
      `https://api.linkedin.com/v2/adLeadGenerationFormResponses/${responseId}`,
      { headers: { Authorization: `Bearer ${accessToken}`, 'X-Restli-Protocol-Version': '2.0.0' } },
    )
    if (!res.ok) {
      console.error('[linkedin webhook] lead fetch failed:', res.status, await res.text())
      return null
    }
    const data = await res.json() as {
      localizedAnswers?: { questionType?: string; localizedAnswer?: string }[]
      'response~'?: {
        answers?: { question?: { questionId?: string }; answer?: string }[]
        formResponse?: { answers?: { questionId?: string; answer?: string }[] }
      }
    }

    // Parse answers — LinkedIn returns different shapes depending on API version
    const fields: Record<string, string> = {}
    const answers =
      (data as Record<string, unknown>).formResponse as { answers?: { questionId?: string; answer?: string }[] } | undefined
      ?? (data as Record<string, unknown>) as { answers?: { questionId?: string; answer?: string }[] }

    for (const a of (answers.answers ?? [])) {
      if (a.questionId && a.answer) {
        fields[a.questionId.toLowerCase()] = a.answer
      }
    }

    const name =
      [fields['firstname'], fields['lastname']].filter(Boolean).join(' ') ||
      fields['full_name'] ||
      fields['name'] ||
      'Unknown'

    return {
      name,
      email:         fields['email']    || fields['emailaddress']           || null,
      phone:         fields['phone']    || fields['phonenumber']            || null,
      company:       fields['company']  || fields['companyname']            || null,
      job_title:     fields['title']    || fields['jobtitle'] || fields['position'] || null,
      website:       fields['website']  || null,
      campaign_name: null,
      ad_name:       null,
      form_name:     null,
      extra:         fields,
    }
  } catch (err) {
    console.error('[linkedin webhook] fetchLinkedInLead error:', err)
    return null
  }
}

// ── GET — LinkedIn webhook verification challenge ───────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const challengeCode = searchParams.get('challengeCode')
  if (challengeCode) {
    return NextResponse.json({ challengeResponse: challengeCode })
  }
  return new NextResponse('OK', { status: 200 })
}

// ── POST — receive lead events ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let payload: {
    events?: {
      leadGenerationFormResponseUrn?: string
      leadGenerationFormUrn?:         string
      accountUrn?:                    string
      campaignUrn?:                   string
    }[]
  }
  try {
    payload = await request.json()
  } catch {
    return new NextResponse('Bad request', { status: 400 })
  }

  const admin = createAdminClient()

  for (const event of payload.events ?? []) {
    const responseUrn = event.leadGenerationFormResponseUrn
    const accountUrn  = event.accountUrn
    if (!responseUrn) continue

    // Look up source by org_id extracted from accountUrn
    const orgId = accountUrn?.split(':').pop() ?? ''

    // Try to find source by org_id in config, or fall back to any active LinkedIn source
    type SourceRow = { id: string; workspace_id: string; config: Record<string, string> }
    let source: SourceRow | null = null

    if (orgId) {
      const { data } = await admin
        .from('lead_ad_sources')
        .select('id, workspace_id, config')
        .eq('platform', 'linkedin')
        .eq('status', 'active')
        .contains('config', { org_id: orgId })
        .limit(1)
        .maybeSingle()
      source = data as unknown as SourceRow | null
    }

    if (!source) {
      console.warn('[linkedin webhook] no source found for accountUrn:', accountUrn)
      continue
    }

    const accessToken = source.config?.access_token
    if (!accessToken) continue

    const lead = await fetchLinkedInLead(responseUrn, accessToken)
    if (!lead) continue

    await ingestLead(lead, {
      workspaceId:    source.workspace_id,
      sourcePlatform: 'linkedin',
      sourceId:       source.id,
      rawPayload:     event,
    })
  }

  return NextResponse.json({ received: true })
}
