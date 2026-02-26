import { NextResponse } from 'next/server'

export async function GET() {
  // Check exact names AND common variations
  return NextResponse.json({
    exact: {
      MAILCHIMP_API_KEY:     !!process.env.MAILCHIMP_API_KEY,
      MAILCHIMP_AUDIENCE_ID: !!process.env.MAILCHIMP_AUDIENCE_ID,
      MAILCHIMP_DATA_CENTER: !!process.env.MAILCHIMP_DATA_CENTER,
    },
    variations: {
      mailchimp_api_key:       !!process.env.mailchimp_api_key,
      MAILCHIMP_APIKEY:        !!process.env.MAILCHIMP_APIKEY,
      MAILCHIMP_API:           !!process.env.MAILCHIMP_API,
      MAILCHIMP_LIST_ID:       !!process.env.MAILCHIMP_LIST_ID,
      MAILCHIMP_SERVER_PREFIX: !!process.env.MAILCHIMP_SERVER_PREFIX,
      MAILCHIMP_DC:            !!process.env.MAILCHIMP_DC,
    },
    vercelEnv: process.env.VERCEL_ENV ?? 'NOT SET',
  })
}
