'use client'

import { useEffect } from 'react'
import { useAuth } from '../../../lib/auth-context'
import LoadingSpinner from '../../../components/LoadingSpinner'

export default function AuthRedirectPage() {
  const { profile, session, loading } = useAuth()

  useEffect(() => {
    if (!loading && session && profile) {
      const redirectPath = profile.role === 'parent' ? '/parent/dashboard' : '/child/dashboard'
      console.log('Redirecting to:', redirectPath)
      
      // Force redirect using window.location
      window.location.href = redirectPath
    } else if (!loading && !session) {
      // No session, redirect to login
      window.location.href = '/auth/login'
    }
  }, [session, profile, loading])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner message="Redirecting to your dashboard..." />
    </div>
  )
}