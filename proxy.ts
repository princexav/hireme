import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          // Write refreshed cookies into both the request and response so all
          // code paths (including redirects built below) carry the updated session.
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  function redirectWithCookies(url: string) {
    const redirect = NextResponse.redirect(new URL(url, request.url))
    // Copy any refreshed session cookies onto the redirect response
    response.cookies.getAll().forEach(cookie => {
      redirect.cookies.set(cookie.name, cookie.value)
    })
    return redirect
  }

  if (!user && !pathname.startsWith('/login') && !pathname.startsWith('/signup')) {
    return redirectWithCookies('/login')
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    return redirectWithCookies('/search')
  }

  return response
}

export const config = {
  // API routes are excluded — each handler verifies session independently
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
