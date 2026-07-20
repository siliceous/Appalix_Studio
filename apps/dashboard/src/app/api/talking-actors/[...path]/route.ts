import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    const pathStr = '/' + (path?.join('/') || '')
    const url = new URL(request.url)
    const query = url.search

    console.log('[Proxy] GET', `${API_URL}/api/talking-actors${pathStr}${query}`)

    const headerObj: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-workspace-id': request.headers.get('x-workspace-id') || '',
    }

    const authHeader = request.headers.get('authorization')
    if (authHeader) {
      headerObj['Authorization'] = authHeader
    }

    const response = await fetch(`${API_URL}/api/talking-actors${pathStr}${query}`, {
      method: 'GET',
      headers: headerObj,
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('[Proxy] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    const pathStr = '/' + (path?.join('/') || '')
    const body = await request.json()

    console.log('[Proxy] POST', `${API_URL}/api/talking-actors${pathStr}`)

    const headerObj: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-workspace-id': request.headers.get('x-workspace-id') || '',
    }

    const authHeader = request.headers.get('authorization')
    if (authHeader) {
      headerObj['Authorization'] = authHeader
    }

    const response = await fetch(`${API_URL}/api/talking-actors${pathStr}`, {
      method: 'POST',
      headers: headerObj,
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('[Proxy] POST error:', error)
    return NextResponse.json({ error: 'Failed to post' }, { status: 500 })
  }
}
