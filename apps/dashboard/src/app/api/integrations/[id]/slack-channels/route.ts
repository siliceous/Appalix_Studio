import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

interface SlackChannel {
  id:         string
  name:       string
  is_channel: boolean
  is_im:      boolean
  is_private: boolean
  is_member:  boolean
  num_members?: number
}

/**
 * GET  /api/integrations/:id/slack-channels
 * Returns all channels + DMs the bot token can access.
 *
 * POST /api/integrations/:id/slack-channels
 * Saves the list of allowed channel IDs to integration.config.allowed_channels.
 * Pass [] to allow all.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: row } = await supabase
    .from('integrations')
    .select('config')
    .eq('id', id)
    .single()
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const cfg      = row.config as Record<string, unknown>
  const botToken = cfg.bot_token as string
  if (!botToken) return NextResponse.json({ error: 'No bot token' }, { status: 400 })

  // Fetch public channels + private channels the bot is in
  const [pubRes, imRes] = await Promise.all([
    fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=200', {
      headers: { Authorization: `Bearer ${botToken}` },
    }),
    fetch('https://slack.com/api/conversations.list?types=im&limit=200', {
      headers: { Authorization: `Bearer ${botToken}` },
    }),
  ])

  const [pubData, imData] = await Promise.all([
    pubRes.json() as Promise<{ ok: boolean; channels?: SlackChannel[]; error?: string }>,
    imRes.json() as Promise<{ ok: boolean; channels?: SlackChannel[]; error?: string }>,
  ])

  const channels: SlackChannel[] = [
    ...(pubData.channels ?? []),
    ...(imData.channels ?? []),
  ]

  return NextResponse.json({
    channels,
    allowed_channels: (cfg.allowed_channels as string[] | undefined) ?? [],
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { allowed_channels } = await req.json() as { allowed_channels: string[] }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: row } = await supabase
    .from('integrations')
    .select('config, workspace_id')
    .eq('id', id)
    .single()
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('integrations')
    .update({ config: { ...(row.config as object), allowed_channels } })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
