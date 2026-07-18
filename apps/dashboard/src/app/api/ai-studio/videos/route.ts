import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:3001'

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.headers.get('x-workspace-id')

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspace ID' }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = searchParams.get('limit') || '50'
    const offset = searchParams.get('offset') || '0'
    const status = searchParams.get('status')

    const query = new URLSearchParams({
      limit,
      offset,
      ...(status && { status }),
    })

    const response = await fetch(`${API_URL}/api/ai-studio/videos?${query}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-workspace-id': workspaceId,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Videos API Proxy] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
