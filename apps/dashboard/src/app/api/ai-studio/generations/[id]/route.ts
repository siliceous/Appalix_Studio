import { NextRequest, NextResponse } from 'next/server'

const API_URL = 'http://localhost:3001'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const workspaceId = request.headers.get('x-workspace-id')

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspace ID' }, { status: 400 })
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing generation ID' }, { status: 400 })
    }

    const response = await fetch(`${API_URL}/api/ai-studio/generations/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-workspace-id': workspaceId,
      },
    })

    if (!response.ok) {
      console.error('[Proxy] Backend error:', response.status)
      return NextResponse.json({ error: 'Failed to fetch generation status' }, { status: response.status })
    }

    const data = await response.json()
    console.log('[Frontend Proxy] Generation status response:', {
      id: data.id,
      status: data.status,
      hasImageUrls: !!data.imageUrls,
      imageUrlsLength: data.imageUrls?.length || 0,
      firstImageLength: data.imageUrls?.[0]?.length || 0,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('API proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
