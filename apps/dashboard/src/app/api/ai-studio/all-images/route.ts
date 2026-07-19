import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:3001'

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.headers.get('x-workspace-id')
    const authHeader = request.headers.get('authorization')

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspace ID' }, { status: 400 })
    }

    const headerObj: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-workspace-id': workspaceId,
    }

    if (authHeader) {
      headerObj['Authorization'] = authHeader
    }

    const response = await fetch(`${API_URL}/api/ai-studio/all-images`, {
      method: 'GET',
      headers: headerObj,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Proxy] Backend error:', response.status, errorText.substring(0, 300))
      return NextResponse.json({ error: 'Failed to fetch images' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('API proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
