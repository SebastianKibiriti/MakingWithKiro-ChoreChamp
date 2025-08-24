'use client'

import { useAuth } from '../lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function HomePage() {
  const { profile, loading, session } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      console.log('HomePage: Auth state loaded', { profile, session: !!session })
      
      if (!session || !profile) {
        console.log('No session or profile, redirecting to login')
        router.push('/auth/login')
      } else {
        console.log('User authenticated, redirecting based on role:', profile.role)
        
        if (profile.role === 'parent') {
          router.push('/parent/dashboard')
        } else if (profile.role === 'child') {
          router.push('/child/dashboard')
        } else {
          console.error('Unknown user role:', profile.role)
          router.push('/auth/login')
        }
      }
    }
  }, [profile, loading, session, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-lg text-gray-600 mb-4">
          {loading ? 'Loading your dashboard...' : 'Redirecting...'}
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
      </div>
    </div>
  )
}