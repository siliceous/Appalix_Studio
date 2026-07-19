import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const path = url.pathname.replace('/api/talking-actors', '') || '/'
    const query = url.search

    const response = await fetch(`${API_URL}/api/talking-actors${path}${query}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-workspace-id': request.headers.get('x-workspace-id') || '',
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const path = url.pathname.replace('/api/talking-actors', '') || '/'
    const body = await request.json()

    const response = await fetch(`${API_URL}/api/talking-actors${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-workspace-id': request.headers.get('x-workspace-id') || '',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json({ error: 'Failed to post' }, { status: 500 })
  }
}
