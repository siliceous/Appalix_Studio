'use server'

import { Resend } from 'resend'

export type ContactState = {
  success: boolean
  message: string
} | null

const SALES_EMAIL    = 'sales@appalix.ai'
const SECURITY_EMAIL = 'security@appalix.ai'
const FROM_EMAIL     = 'Appalix Contact <noreply@appalix.ai>'

export async function submitContactForm(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const name        = (formData.get('name')         as string | null)?.trim() ?? ''
  const email       = (formData.get('email')        as string | null)?.trim().toLowerCase() ?? ''
  const phone       = (formData.get('phone')        as string | null)?.trim() ?? ''
  const country     = (formData.get('country')      as string | null)?.trim() ?? ''
  const inquiryType = (formData.get('inquiry_type') as string | null)?.trim() ?? 'general'
  const message     = (formData.get('message')      as string | null)?.trim() ?? ''

  if (!name || !email || !message) {
    return { success: false, message: 'Please fill in all required fields.' }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: 'Please enter a valid email address.' }
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[contact] RESEND_API_KEY not set')
    return { success: false, message: 'Contact form is temporarily unavailable.' }
  }

  const toEmail = inquiryType === 'security' ? SECURITY_EMAIL : SALES_EMAIL

  const subject =
    inquiryType === 'security'
      ? `[Security] Contact form — ${name}`
      : `[${inquiryType === 'sales' ? 'Sales' : 'General'}] Contact form — ${name}`

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; color: #1a1a1a;">
      <h2 style="margin-bottom: 24px; color: #ec732e;">New contact form submission</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; font-weight: 600; width: 140px;">Name</td><td>${name}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: 600;">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
        ${phone   ? `<tr><td style="padding: 8px 0; font-weight: 600;">Phone</td><td>${phone}</td></tr>` : ''}
        ${country ? `<tr><td style="padding: 8px 0; font-weight: 600;">Country</td><td>${country}</td></tr>` : ''}
        <tr><td style="padding: 8px 0; font-weight: 600;">Inquiry type</td><td style="text-transform: capitalize;">${inquiryType}</td></tr>
      </table>
      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e5e5;" />
      <h3 style="margin-bottom: 12px;">Message</h3>
      <p style="line-height: 1.6; white-space: pre-wrap;">${message}</p>
      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e5e5;" />
      <p style="font-size: 12px; color: #888;">Sent from appalix.ai/contact</p>
    </div>
  `

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from:     FROM_EMAIL,
      to:       [toEmail],
      replyTo:  email,
      subject,
      html,
    })

    if (error) {
      console.error('[contact] Resend error', error)
      return { success: false, message: 'Something went wrong. Please try again.' }
    }

    return {
      success: true,
      message: "Thanks for reaching out! We'll get back to you within one business day.",
    }
  } catch (err) {
    console.error('[contact] fetch failed', err)
    return { success: false, message: 'Something went wrong. Please try again.' }
  }
}
