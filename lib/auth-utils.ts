import { Database } from '../supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

export function getRedirectPath(profile: Profile | null): string {
  if (!profile) {
    return '/auth/login'
  }

  switch (profile.role) {
    case 'parent':
      return '/parent/dashboard'
    case 'child':
      return '/child/dashboard'
    default:
      console.error('Unknown user role:', profile.role)
      return '/auth/login'
  }
}

export function isAuthorizedForPath(profile: Profile | null, pathname: string): boolean {
  if (!profile) {
    return pathname.startsWith('/auth')
  }

  // Allow access to auth pages for logged-in users (they'll be redirected by middleware)
  if (pathname.startsWith('/auth')) {
    return true
  }

  // Check role-based access
  if (profile.role === 'parent' && pathname.startsWith('/parent')) {
    return true
  }

  if (profile.role === 'child' && pathname.startsWith('/child')) {
    return true
  }

  // Root path is allowed (will be redirected)
  if (pathname === '/') {
    return true
  }

  return false
}

export function shouldRedirect(profile: Profile | null, pathname: string): string | null {
  // If not authenticated and trying to access protected routes
  if (!profile && (pathname.startsWith('/parent') || pathname.startsWith('/child'))) {
    return '/auth/login'
  }

  // If authenticated and on login page
  if (profile && pathname === '/auth/login') {
    return getRedirectPath(profile)
  }

  // If authenticated and on root page
  if (profile && pathname === '/') {
    return getRedirectPath(profile)
  }

  // If accessing wrong role's dashboard
  if (profile) {
    if (profile.role === 'parent' && pathname.startsWith('/child')) {
      return '/parent/dashboard'
    }
    if (profile.role === 'child' && pathname.startsWith('/parent')) {
      return '/child/dashboard'
    }
  }

  return null
}