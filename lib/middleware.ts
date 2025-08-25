import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Database } from './supabase'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient<Database>({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If user is not signed in and trying to access protected routes, redirect to login
  if (!session && (req.nextUrl.pathname.startsWith('/parent') || req.nextUrl.pathname.startsWith('/child'))) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  // If user is signed in, check role-based access
  if (session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    // Redirect based on role if accessing wrong dashboard
    if (profile) {
      if (profile.role === 'parent' && req.nextUrl.pathname.startsWith('/child')) {
        return NextResponse.redirect(new URL('/parent/dashboard', req.url))
      }
      
      if (profile.role === 'child' && req.nextUrl.pathname.startsWith('/parent')) {
        return NextResponse.redirect(new URL('/child/dashboard', req.url))
      }
    }

    // Redirect authenticated users away from login page
    if (req.nextUrl.pathname === '/auth/login') {
      if (profile?.role === 'parent') {
        return NextResponse.redirect(new URL('/parent/dashboard', req.url))
      } else if (profile?.role === 'child') {
        return NextResponse.redirect(new URL('/child/dashboard', req.url))
      }
    }

    // Redirect root path to appropriate dashboard
    if (req.nextUrl.pathname === '/') {
      if (profile?.role === 'parent') {
        return NextResponse.redirect(new URL('/parent/dashboard', req.url))
      } else if (profile?.role === 'child') {
        return NextResponse.redirect(new URL('/child/dashboard', req.url))
      }
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}