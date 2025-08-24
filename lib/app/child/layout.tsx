'use client'

import { useAuth } from '../../lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import DashboardLayout from '../../components/DashboardLayout'

export default function ChildLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!profile || profile.role !== 'child')) {
      router.push('/auth/login')
    }
  }, [profile, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!profile || profile.role !== 'child') {
    return null
  }

  return (
    <DashboardLayout userRole="child" userProfile={profile}>
      {children}
    </DashboardLayout>
  )
}