import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    hasApiKey:     !!process.env.MAILCHIMP_API_KEY,
    hasAudienceId: !!process.env.MAILCHIMP_AUDIENCE_ID,
    hasDc:         !!process.env.MAILCHIMP_DATA_CENTER,
    dc:            process.env.MAILCHIMP_DATA_CENTER ?? 'NOT SET',
    // Vercel system vars — should always be set if running on Vercel
    vercelEnv:     process.env.VERCEL_ENV ?? 'NOT SET',
    vercelRegion:  process.env.VERCEL_REGION ?? 'NOT SET',
    nodeEnv:       process.env.NODE_ENV ?? 'NOT SET',
  })
}
