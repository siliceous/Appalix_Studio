import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    // Which Vercel project/deployment is actually serving appalix.ai?
    vercelProjectId:   process.env.VERCEL_PROJECT_ID    ?? 'NOT SET',
    vercelGitRepo:     process.env.VERCEL_GIT_REPO_SLUG ?? 'NOT SET',
    vercelUrl:         process.env.VERCEL_URL            ?? 'NOT SET',
    vercelEnv:         process.env.VERCEL_ENV            ?? 'NOT SET',
    // Mailchimp vars
    hasApiKey:         !!process.env.MAILCHIMP_API_KEY,
    hasAudienceId:     !!process.env.MAILCHIMP_AUDIENCE_ID,
    hasDc:             !!process.env.MAILCHIMP_DATA_CENTER,
  })
}
