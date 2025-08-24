'use client'

import { useAuth } from '../lib/auth-context'
import { Database } from '../supabase'
import Navigation from './Navigation'
import Header from './Header'

type Profile = Database['public']['Tables']['profiles']['Row']

interface DashboardLayoutProps {
  children: React.ReactNode
  userRole: 'parent' | 'child'
  userProfile: Profile
}

export default function DashboardLayout({ 
  children, 
  userRole, 
  userProfile 
}: DashboardLayoutProps) {
  const { signOut } = useAuth()

  const backgroundClass = userRole === 'child' 
    ? 'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'
    : 'min-h-screen bg-gray-50'

  return (
    <div className={backgroundClass}>
      <Header user={userProfile} onLogout={signOut} />
      <div className="flex">
        <Navigation role={userRole} currentPath="" />
        <main className="flex-1 max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}