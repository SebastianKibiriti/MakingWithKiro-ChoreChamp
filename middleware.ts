import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // Create middleware client with explicit environment variables
  const supabase = createMiddlewareClient({ 
    req, 
    res,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  })

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/auth/login',
    '/auth/signup',
    '/auth/callback',
    '/.well-known',
  ]

  // Check if current path is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route)
  )

  // Allow access to public routes and API routes
  if (isPublicRoute || pathname.startsWith('/api/')) {
    return res
  }

  // Redirect to login if no session and trying to access protected route
  if (!session) {
    const redirectUrl = new URL('/auth/login', req.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  // Role-based route protection
  if (pathname.startsWith('/parent/') && profile?.role !== 'parent') {
    return NextResponse.redirect(new URL('/child/dashboard', req.url))
  }

  if (pathname.startsWith('/child/') && profile?.role !== 'child') {
    return NextResponse.redirect(new URL('/parent/dashboard', req.url))
  }

  console.log('Middleware: Auth enabled, user authenticated:', session.user.email)
  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}