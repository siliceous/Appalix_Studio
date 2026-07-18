import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refresh session — required for Server Components to read auth state
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Public paths that never require auth
  const isPublic =
    pathname === '/' ||
    pathname === '/embed.js' ||
    pathname === '/test-embed.html' ||
    pathname.startsWith('/integrations/') ||
    pathname.startsWith('/f/') ||
    pathname.startsWith('/features') ||
    pathname.startsWith('/platforms') ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/resources') ||
    pathname.startsWith('/security') ||
    pathname.startsWith('/contact') ||
    pathname.startsWith('/ai-assistant') ||
    pathname.startsWith('/test') ||
    pathname.startsWith('/product') ||
    pathname.startsWith('/bot') ||
    pathname.startsWith('/email') ||
    pathname.startsWith('/smart-forms') ||
    pathname.startsWith('/tickets') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/oauth') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/api/slack') ||
    pathname.startsWith('/api/widget-chat') ||
    pathname.startsWith('/api/widget-config') ||
    pathname.startsWith('/api/embed/') ||
    pathname.startsWith('/api/ai-studio/') ||
    pathname.startsWith('/api/sage/automation-scheduler')

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/ai-studio'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     *  - _next/static (static files)
     *  - _next/image  (image optimisation)
     *  - favicon.ico
     *  - image files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
