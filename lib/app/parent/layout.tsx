'use client'

import { useAuth } from '../../lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import DashboardLayout from '../../components/DashboardLayout'

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!profile || profile.role !== 'parent')) {
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

  if (!profile || profile.role !== 'parent') {
    return null
  }

  return (
    <DashboardLayout userRole="parent" userProfile={profile}>
      {children}
    </DashboardLayout>
  )
}