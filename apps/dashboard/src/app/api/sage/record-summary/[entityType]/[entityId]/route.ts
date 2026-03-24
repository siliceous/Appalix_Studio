import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRecordSummary, generateRecordSummary } from '@/lib/sage-intelligence/record-summary'

type EntityType = 'contact' | 'deal' | 'ticket' | 'conversation' | 'company'
const VALID_TYPES = new Set<EntityType>(['contact', 'deal', 'ticket', 'conversation', 'company'])

/**
 * GET /api/sage/record-summary/:entityType/:entityId
 *
 * Returns a pre-generated summary from sage_record_summaries.
 * If none exists yet, triggers generation on-demand and returns the result.
 *
 * Query params:
 *   workspace_id (required)
 *   refresh=true  — force regeneration even if cached summary exists
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ entityType: string; entityId: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { entityType: rawType, entityId } = await params
  const workspaceId = req.nextUrl.searchParams.get('workspace_id')
  const forceRefresh = req.nextUrl.searchParams.get('refresh') === 'true'

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
  }

  if (!VALID_TYPES.has(rawType as EntityType)) {
    return NextResponse.json({ error: `Invalid entity type: ${rawType}` }, { status: 400 })
  }

  const entityType = rawType as EntityType

  // Verify the user belongs to this workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('workspace_id', workspaceId)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  // Return cached summary unless refresh is requested
  if (!forceRefresh) {
    const cached = await getRecordSummary(workspaceId, entityType, entityId)
    if (cached) {
      return NextResponse.json({ summary: cached, cached: true })
    }
  }

  // Generate (or regenerate) the summary
  const summary = await generateRecordSummary(workspaceId, entityType, entityId)
  if (!summary) {
    return NextResponse.json({ error: 'Could not generate summary for this record' }, { status: 404 })
  }

  const result = await getRecordSummary(workspaceId, entityType, entityId)
  return NextResponse.json({ summary: result ?? { summary, keyFacts: [], generatedAt: new Date().toISOString() }, cached: false })
}
