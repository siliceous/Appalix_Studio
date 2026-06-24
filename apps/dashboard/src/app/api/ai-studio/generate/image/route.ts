import { NextRequest, NextResponse } from 'next/server'

const API_URL = 'http://localhost:3001'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const workspaceId = request.headers.get('x-workspace-id')

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspace ID' }, { status: 400 })
    }

    const response = await fetch(`${API_URL}/api/ai-studio/generate/image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-workspace-id': workspaceId,
      },
      body: JSON.stringify(body),
    })

    const responseText = await response.text()
    console.log('[Proxy] Backend response status:', response.status)
    console.log('[Proxy] Backend response text preview:', responseText.substring(0, 200))

    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error('[Proxy] Failed to parse response as JSON:', parseError)
      console.error('[Proxy] Raw response:', responseText)
      return NextResponse.json({ error: 'Backend returned invalid JSON' }, { status: 500 })
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('API proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
