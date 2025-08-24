'use client'

import { useAuth } from '../../../lib/auth-context'
import { useDashboardStats, useChildren } from '../../../lib/hooks/useSupabaseData'

export default function ParentDashboard() {
  const { profile } = useAuth()
  const { stats, loading: statsLoading, error: statsError } = useDashboardStats(profile?.id, 'parent')
  const { children, loading: childrenLoading, error: childrenError } = useChildren(profile?.id)

  if (statsLoading || childrenLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parent Dashboard</h1>
          <p className="text-gray-600">Loading your family's chore activity...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (statsError || childrenError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parent Dashboard</h1>
          <p className="text-red-600">Error loading dashboard: {statsError || childrenError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Parent Dashboard</h1>
        <p className="text-gray-600">Overview of your family's chore activity</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Total Children</h3>
          <p className="text-3xl font-bold text-indigo-600">{stats.totalChildren}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Pending Approvals</h3>
          <p className="text-3xl font-bold text-yellow-600">{stats.pendingApprovals}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Completed Today</h3>
          <p className="text-3xl font-bold text-green-600">{stats.completedToday}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Active Chores</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.activeChores}</p>
        </div>
      </div>

      {/* Children Overview */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Children Overview</h2>
        </div>
        <div className="p-6">
          {children.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No children found. Add children to your family to get started!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {children.map((child) => (
                <div key={child.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">{child.name}</h3>
                    <span className="text-sm text-gray-500">{child.rank || 'Recruit'}</span>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">Points: {child.points}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}