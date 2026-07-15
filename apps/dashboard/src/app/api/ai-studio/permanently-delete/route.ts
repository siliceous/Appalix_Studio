import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:3001'

export async function POST(request: NextRequest) {
  try {
    const workspaceId = request.headers.get('x-workspace-id')

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspace ID' }, { status: 400 })
    }

    const body = await request.json()

    const response = await fetch(`${API_URL}/api/ai-studio/permanently-delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-workspace-id': workspaceId,
      },
      body: JSON.stringify(body),
    })

    // Accept both 200 (success) and 202 (success, local-only mode) status codes
    if (!response.ok && response.status !== 202) {
      const errorText = await response.text()
      console.error('[Permanent Delete Proxy] Backend error:', response.status, errorText.substring(0, 300))
      return NextResponse.json({ error: 'Failed to schedule deletion' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Permanent delete proxy error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
