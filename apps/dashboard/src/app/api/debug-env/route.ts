import { NextResponse } from 'next/server'

/**
 * Temporary debug endpoint — remove after diagnosing env var issues.
 * Visit /api/debug-env to see which OAuth env vars are present.
 */
export async function GET() {
  return NextResponse.json({
    MICROSOFT_CLIENT_ID:     process.env.MICROSOFT_CLIENT_ID     ? 'SET' : 'MISSING',
    MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET ? 'SET' : 'MISSING',
    GOOGLE_CLIENT_ID:        process.env.GOOGLE_CLIENT_ID        ? 'SET' : 'MISSING',
    GOOGLE_CLIENT_SECRET:    process.env.GOOGLE_CLIENT_SECRET    ? 'SET' : 'MISSING',
    NEXT_PUBLIC_APP_URL:     process.env.NEXT_PUBLIC_APP_URL     ?? 'MISSING',
    API_BASE_URL:            process.env.API_BASE_URL             ? 'SET' : 'MISSING',
  })
}
