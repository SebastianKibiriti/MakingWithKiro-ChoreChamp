'use client'

import { useAuth } from '../../lib/auth-context'
import DashboardLayout from '../../components/DashboardLayout'

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading your command center...</p>
        </div>
      </div>
    )
  }

  if (!profile || profile.role !== 'parent') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">Parent account required to access this area.</p>
          <a href="/" className="mt-4 inline-block bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
            Go Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout userRole="parent" userProfile={profile}>
      {children}
    </DashboardLayout>
  )
}