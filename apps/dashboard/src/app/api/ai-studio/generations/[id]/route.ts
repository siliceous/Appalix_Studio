import { NextRequest, NextResponse } from 'next/server'

const API_URL = 'http://localhost:3001'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
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
    return NextResponse.json(data)
  } catch (error) {
    console.error('API proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
