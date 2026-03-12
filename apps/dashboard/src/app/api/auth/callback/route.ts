import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Supabase Auth callback handler.
 * Exchanges the one-time code from magic-link / OAuth flows for a session.
 * The middleware then reads this session on subsequent requests.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code       = searchParams.get('code')
  const tokenHash  = searchParams.get('token_hash')
  const type       = searchParams.get('type')
  const next       = searchParams.get('next') ?? '/dashboard'

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2]),
          )
        },
      },
    },
  )

  let userId: string | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let userMeta: Record<string, any> = {}

  if (code) {
    // PKCE flow (Authorization Code) — used by OAuth and newer magic link flow
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('[auth/callback] exchangeCodeForSession error:', error.message)
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }
    userId   = data.user?.id
    userMeta = data.user?.user_metadata ?? {}
  } else if (tokenHash && type) {
    // Token hash flow — used by magic links / email OTP in some Supabase configurations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any })
    if (error) {
      console.error('[auth/callback] verifyOtp error:', error.message)
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }
    userId   = data.user?.id
    userMeta = data.user?.user_metadata ?? {}
  } else {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const admin = createAdminClient()

  // Patch missing full_name for Microsoft/Outlook OAuth users.
  // Microsoft sends 'name' in the token; Supabase doesn't always map it to full_name.
  if (userId && !userMeta.full_name) {
    const derivedName = userMeta.name as string | undefined
    if (derivedName) {
      await admin.auth.admin.updateUserById(userId, {
        user_metadata: { ...userMeta, full_name: derivedName },
      })
    }
  }

  // Stamp accepted_at for any pending workspace membership (invite accepted)
  // Track whether this login is accepting a fresh invite
  let justAcceptedInvite = false
  if (userId) {
    const { count } = await admin
      .from('workspace_members')
      .update({ accepted_at: new Date().toISOString() }, { count: 'exact' })
      .eq('user_id', userId)
      .is('accepted_at', null)
    justAcceptedInvite = (count ?? 0) > 0
  }

  // If a specific destination was requested, honour it
  if (next !== '/dashboard') {
    const redirectTo = next.startsWith('/') ? `${origin}${next}` : origin
    return NextResponse.redirect(redirectTo)
  }

  // Check whether this user has completed the onboarding profile form
  if (userId) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (!profile) {
      return NextResponse.redirect(`${origin}/onboarding`)
    }

    // Existing user accepting an invite — send them to connect their email
    if (justAcceptedInvite) {
      return NextResponse.redirect(`${origin}/onboarding/connect`)
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
