import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const workspaceId = request.headers.get('x-workspace-id')

    if (!workspaceId || !projectId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const body = await request.json()
    const { imageId, image, prompt, timestamp } = body

    if (!image) {
      return NextResponse.json({ error: 'Image data required' }, { status: 400 })
    }

    // Verify project belongs to workspace
    const { data: project, error: projectError } = await supabase
      .from('sage_project_boards')
      .select('id')
      .eq('id', projectId)
      .eq('workspace_id', workspaceId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Convert base64 image to buffer and upload to storage
    const imageBuffer = Buffer.from(image.split(',')[1] || image, 'base64')
    const fileName = `${imageId || `image-${Date.now()}`}.png`
    const filePath = `ai-images/${workspaceId}/${projectId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('public')
      .upload(filePath, imageBuffer, {
        contentType: 'image/png',
        upsert: false,
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('public')
      .getPublicUrl(filePath)

    // Store image metadata as a document (if sage_documents exists)
    const { data: document, error: docError } = await supabase
      .from('sage_documents')
      .insert({
        workspace_id: workspaceId,
        board_id: projectId,
        title: `Generated Image - ${new Date(timestamp).toLocaleDateString()}`,
        content: prompt || 'Generated image',
        type: 'image',
        metadata: {
          imageUrl: urlData?.publicUrl,
          imageId,
          originalPrompt: prompt,
          generatedAt: timestamp,
        },
      })
      .select('id')
      .single()

    if (docError) throw docError

    return NextResponse.json({
      success: true,
      imageUrl: urlData?.publicUrl,
      documentId: document?.id,
    })
  } catch (error) {
    console.error('Failed to save image to project:', error)
    return NextResponse.json({ error: 'Failed to save image to project' }, { status: 500 })
  }
}
