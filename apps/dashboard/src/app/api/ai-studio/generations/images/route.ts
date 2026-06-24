import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.headers.get('x-workspace-id')

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspace ID' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch all completed image generations for the workspace
    const { data: generations, error } = await supabase
      .from('ai_image_generations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[API] Error fetching generations:', error)
      return NextResponse.json({ error: 'Failed to fetch generations' }, { status: 500 })
    }

    // Format generations into asset format
    const assets = generations.map((gen: any) => {
      const imageUrls = gen.output_urls ? JSON.parse(gen.output_urls) : []
      const primaryUrl = gen.output_url || (imageUrls.length > 0 ? imageUrls[0] : '')

      return {
        id: gen.id,
        type: 'image',
        name: gen.prompt.substring(0, 50) + (gen.prompt.length > 50 ? '...' : ''),
        url: primaryUrl,
        thumbnail: primaryUrl,
        createdAt: new Date(gen.created_at),
        model: gen.model || 'Unknown',
        credits: gen.quantity * 10,
        status: 'completed',
        aspect_ratio: gen.aspect_ratio,
        style: gen.style,
        full_prompt: gen.prompt,
      }
    })

    return NextResponse.json({ assets })
  } catch (error) {
    console.error('[API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
