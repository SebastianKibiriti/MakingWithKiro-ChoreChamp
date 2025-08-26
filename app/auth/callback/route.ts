import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirectTo = requestUrl.searchParams.get('redirectTo') || '/'

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(new URL('/auth/login?error=callback_error', request.url))
      }

      if (data.user) {
        // Redirect to the redirect page which will handle role-based routing
        return NextResponse.redirect(new URL('/auth/redirect', request.url))
      }
    } catch (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(new URL('/auth/login?error=callback_error', request.url))
    }
  }

  // Fallback redirect
  return NextResponse.redirect(new URL(redirectTo, request.url))
}