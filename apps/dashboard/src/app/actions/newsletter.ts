'use server'

export async function subscribeToNewsletter(
  _prevState: { success: boolean; message: string } | null,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  const email = (formData.get('email') as string | null)?.trim().toLowerCase()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: 'Please enter a valid email address.' }
  }

  const apiKey      = process.env.MAILCHIMP_API_KEY
  const audienceId  = process.env.MAILCHIMP_AUDIENCE_ID
  const dc          = process.env.MAILCHIMP_DATA_CENTER

  if (!apiKey || !audienceId || !dc) {
    console.error('[newsletter] Missing Mailchimp env vars')
    return { success: false, message: 'Newsletter signup is temporarily unavailable.' }
  }

  try {
    const res = await fetch(
      `https://${dc}.api.mailchimp.com/3.0/lists/${audienceId}/members`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`any:${apiKey}`).toString('base64')}`,
        },
        body: JSON.stringify({
          email_address: email,
          status: 'subscribed',
        }),
        signal: AbortSignal.timeout(10_000),
      },
    )

    if (res.status === 200 || res.status === 201) {
      return { success: true, message: "You're in! Check your inbox for a confirmation." }
    }

    const body = await res.json().catch(() => ({}))

    // Already subscribed — treat as success
    if (res.status === 400 && body?.title === 'Member Exists') {
      return { success: true, message: "You're already subscribed — thanks!" }
    }

    console.error('[newsletter] Mailchimp error', res.status, body)
    return { success: false, message: 'Something went wrong. Please try again.' }
  } catch (err) {
    console.error('[newsletter] fetch failed', err)
    return { success: false, message: 'Something went wrong. Please try again.' }
  }
}
