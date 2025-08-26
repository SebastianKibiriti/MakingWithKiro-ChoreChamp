'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../../../lib/auth-context'
import { supabase } from '../../../lib/supabase'
import { useRealtimeChores } from '../../../lib/hooks/useRealtimeChores'
import { ConnectionStatus } from '../../../lib/realtime-context'
import ChoreManager from '../../../components/ChoreManager'
import ChoreApprovalManager from '../../../components/ChoreApprovalManager'

interface DashboardStats {
  totalChildren: number
  pendingApprovals: number
  completedToday: number
  activeChores: number
}

interface Child {
  id: string
  name: string
  rank: string
  points: number
}

export default function ParentDashboard() {
  const { profile, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalChildren: 0,
    pendingApprovals: 0,
    completedToday: 0,
    activeChores: 0
  })
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'chores' | 'approvals'>('overview')

  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch children
      const { data: childrenData, error: childrenError } = await supabase
        .from('profiles')
        .select('*')
        .eq('parent_id', profile?.id)
        .eq('role', 'child')

      if (childrenError) throw childrenError
      setChildren(childrenData || [])

      // Fetch active chores count
      const { count: activeChoresCount, error: choresError } = await supabase
        .from('chores')
        .select('*', { count: 'exact', head: true })
        .eq('parent_id', profile?.id)

      if (choresError) throw choresError

      // Fetch pending approvals count
      const { count: pendingCount, error: pendingError } = await supabase
        .from('chore_completions')
        .select('chore:chores!inner(*)', { count: 'exact', head: true })
        .eq('chore.parent_id', profile?.id)
        .eq('status', 'pending')

      if (pendingError) throw pendingError

      // Fetch today's completed chores
      const today = new Date().toISOString().split('T')[0]
      const { count: completedTodayCount, error: completedError } = await supabase
        .from('chore_completions')
        .select('chore:chores!inner(*)', { count: 'exact', head: true })
        .eq('chore.parent_id', profile?.id)
        .eq('status', 'approved')
        .gte('approved_at', `${today}T00:00:00.000Z`)
        .lt('approved_at', `${today}T23:59:59.999Z`)

      if (completedError) throw completedError

      setStats({
        totalChildren: childrenData?.length || 0,
        pendingApprovals: pendingCount || 0,
        completedToday: completedTodayCount || 0,
        activeChores: activeChoresCount || 0
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  // Set up real-time subscriptions with proper filtering - memoized to prevent recreating
  const realtimeChores = useRealtimeChores(useMemo(() => ({
    onChoreUpdate: (event) => {
      // Handle chore updates (create, update, delete)
      console.log('Chore update received:', event)
      fetchDashboardData()
    },
    onChoreCompletionUpdate: async (event) => {
      // Handle chore completion updates with parent filtering
      console.log('Chore completion update received:', event)
      
      // For completion events, we need to verify this completion belongs to this parent's chores
      if (event.eventType === 'INSERT' || event.eventType === 'UPDATE') {
        const completionData = event.new
        if (completionData?.chore_id) {
          // Verify the chore belongs to this parent
          const { data: choreData, error } = await supabase
            .from('chores')
            .select('parent_id')
            .eq('id', completionData.chore_id)
            .single()
          
          if (!error && choreData?.parent_id === profile?.id) {
            fetchDashboardData()
          }
        }
      } else if (event.eventType === 'DELETE') {
        // For deletions, we'll refresh to be safe since we can't verify ownership
        fetchDashboardData()
      }
    },
    onProfileUpdate: (event) => {
      // Handle profile updates (points, rank changes for children)
      console.log('Profile update received:', event)
      
      // Check if this is a child profile update for this parent's children
      const profileData = event.new
      if (profileData?.parent_id === profile?.id) {
        fetchDashboardData()
      }
    },
    onError: (error) => {
      console.error('Real-time subscription error:', error)
    },
    onConnectionChange: (connected) => {
      console.log('Real-time connection status:', connected ? 'connected' : 'disconnected')
    }
  }), [fetchDashboardData, profile?.id]))

  useEffect(() => {
    if (profile?.role === 'parent' && profile?.id) {
      fetchDashboardData()
      
      // Subscribe to real-time updates with parent-specific filtering
      realtimeChores.subscribe({
        parentId: profile.id,
        events: ['INSERT', 'UPDATE', 'DELETE']
      })

      // Cleanup function to properly unsubscribe
      return () => {
        realtimeChores.unsubscribe()
      }
    }
  }, [profile?.id, profile?.role]) // Removed fetchDashboardData and realtimeChores from deps since they're now stable

  if (authLoading || loading) {
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

  if (profile?.role !== 'parent') {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Access denied. Parent account required.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parent Command Center</h1>
          <p className="text-gray-600">Manage your family's chore missions</p>
        </div>
        <div className="flex items-center space-x-4">
          <ConnectionStatus showDetails={true} className="text-sm" />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', count: null },
            { id: 'chores', name: 'Manage Chores', count: stats.activeChores },
            { id: 'approvals', name: 'Pending Approvals', count: stats.pendingApprovals }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
              {tab.count !== null && (
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
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
                        <span className="text-sm text-gray-500">{child.rank || 'Recruit Rascal'}</span>
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
        </>
      )}

      {activeTab === 'chores' && <ChoreManager />}
      {activeTab === 'approvals' && <ChoreApprovalManager />}
    </div>
  )
}