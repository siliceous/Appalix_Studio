import { NextRequest, NextResponse } from 'next/server'

const API_URL = 'http://localhost:3001'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const workspaceId = request.headers.get('x-workspace-id')

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspace ID' }, { status: 400 })
    }

    let response
    try {
      response = await fetch(`${API_URL}/api/ai-studio/generate/image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify(body),
      })
    } catch (fetchError) {
      console.error('[Proxy] Failed to connect to backend:', fetchError)
      return NextResponse.json({
        error: 'Backend server not running. Start it with: cd apps/api && npm run dev',
        details: 'Cannot reach http://localhost:3001'
      }, { status: 503 })
    }

    const responseText = await response.text()
    console.log('[Proxy] Backend response status:', response.status)
    console.log('[Proxy] Backend response text preview:', responseText.substring(0, 500))

    if (!response.ok) {
      console.error('[Proxy] Backend error response:', responseText)
      return NextResponse.json(
        { error: `Backend error: ${response.status}`, details: responseText },
        { status: response.status }
      )
    }

    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error('[Proxy] Failed to parse response as JSON:', parseError)
      console.error('[Proxy] Raw response:', responseText)
      return NextResponse.json({ error: 'Backend returned invalid JSON' }, { status: 500 })
    }

    console.log('[Frontend Proxy] Generation response:', {
      id: data.id,
      status: data.status,
      hasImageUrls: !!data.imageUrls,
      type: data.type,
    })
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('API proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
