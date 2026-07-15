import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:3001'

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.headers.get('x-workspace-id')

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspace ID' }, { status: 400 })
    }

    const response = await fetch(`${API_URL}/api/ai-studio/deleted-images`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-workspace-id': workspaceId,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Deleted Images Proxy] Backend error:', response.status, errorText.substring(0, 300))
      // Return empty list on error so client falls back to localStorage
      return NextResponse.json({ deleted_image_ids: [], count: 0 })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Deleted images proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
