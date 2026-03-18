import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    name?: string
    company?: string
    employees?: string
    website?: string
    phone?: string
    description?: string
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email service not configured.' }, { status: 503 })
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
  const resend = new Resend(RESEND_API_KEY)

  const { error } = await resend.emails.send({
    from: `Appalix <${fromEmail}>`,
    to: ['sales@appalix.ai'],
    subject: 'Demo Request',
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#15A4AE;padding:24px 32px;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">Appalix — New Demo Request</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
                <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Full Name</p>
                <p style="margin:4px 0 0;font-size:15px;color:#111827;font-weight:600;">${body.name ?? '—'}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
                <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Company</p>
                <p style="margin:4px 0 0;font-size:15px;color:#111827;font-weight:600;">${body.company ?? '—'}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
                <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">No. of Employees</p>
                <p style="margin:4px 0 0;font-size:15px;color:#111827;font-weight:600;">${body.employees ?? '—'}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
                <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Website</p>
                <p style="margin:4px 0 0;font-size:15px;color:#111827;font-weight:600;">${body.website ? `<a href="${body.website}" style="color:#15A4AE;">${body.website}</a>` : '—'}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
                <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Phone</p>
                <p style="margin:4px 0 0;font-size:15px;color:#111827;font-weight:600;">${body.phone ?? '—'}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0;">
                <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">What does your company do?</p>
                <p style="margin:4px 0 0;font-size:15px;color:#111827;line-height:1.6;">${body.description ?? '—'}</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `,
  })

  if (error) {
    console.error('[book-demo] Resend error:', JSON.stringify(error))
    return NextResponse.json({ error: 'Failed to send email.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
