import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:3001'

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${API_URL}/api/ai-studio/models/image`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('[Proxy] Backend error:', response.status)
      return NextResponse.json({ error: 'Failed to fetch models' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[Proxy] Error fetching models:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
