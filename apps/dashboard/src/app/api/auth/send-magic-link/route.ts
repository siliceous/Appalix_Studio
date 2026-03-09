import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  const body = await request.json() as { email?: string }
  const email = (body.email ?? '').trim().toLowerCase()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 })
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'Email service not configured. Please contact support.' },
      { status: 503 },
    )
  }

  // Use NEXT_PUBLIC_APP_URL for the redirect (falls back to request origin)
  const origin = (process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin).replace(/\/$/, '')

  // Generate the magic link server-side using the service-role client
  const admin = createAdminClient()
  const { data, error: genError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${origin}/api/auth/callback` },
  })

  if (genError || !data?.properties?.action_link) {
    console.error('[send-magic-link] generateLink error:', genError?.message)
    return NextResponse.json(
      { error: genError?.message ?? 'Failed to generate magic link.' },
      { status: 400 },
    )
  }

  const actionLink = data.properties.action_link
  const fromEmail  = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
  const appName    = 'Appalix'

  const resend = new Resend(RESEND_API_KEY)
  const { error: sendError } = await resend.emails.send({
    from:    `${appName} <${fromEmail}>`,
    to:      [email],
    subject: `Your sign-in link for ${appName}`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#ec732e;padding:24px 32px;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">${appName}</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Sign in to ${appName}</h1>
          <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.5;">
            Click the button below to sign in. This link is valid for <strong>1 hour</strong> and can only be used once.
          </p>
          <a href="${actionLink}"
             style="display:inline-block;padding:13px 28px;background:#ec732e;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
            Sign in to ${appName}
          </a>
          <p style="margin:28px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;">
            If you didn't request this email you can safely ignore it.<br/>
            Having trouble with the button? Copy and paste this URL:<br/>
            <a href="${actionLink}" style="color:#ec732e;word-break:break-all;">${actionLink}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `,
  })

  if (sendError) {
    console.error('[send-magic-link] Resend error:', JSON.stringify(sendError))
    return NextResponse.json(
      { error: `Resend: ${sendError.message ?? JSON.stringify(sendError)}` },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}
