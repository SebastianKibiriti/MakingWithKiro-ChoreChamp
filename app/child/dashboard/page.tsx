'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../lib/auth-context'
import { supabase } from '../../../lib/supabase'
import AIVoiceCoach from '../../components/AIVoiceCoach'
import ChildMissionHub from '../../../components/ChildMissionHub'

interface DashboardStats {
  currentPoints: number
  availableMissions: number
  completedToday: number
  pendingApprovals: number
}

export default function ChildDashboard() {
  const { profile, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    currentPoints: 0,
    availableMissions: 0,
    completedToday: 0,
    pendingApprovals: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'missions'>('overview')

  useEffect(() => {
    if (profile?.role === 'child') {
      fetchDashboardData()
      
      // Set up real-time subscriptions
      const subscription = supabase
        .channel('child_dashboard')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'chore_completions' }, 
          () => fetchDashboardData()
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'chores' },
          () => fetchDashboardData()
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles' },
          (payload) => {
            if (payload.new.id === profile?.id) {
              fetchDashboardData()
            }
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [profile])

  const fetchDashboardData = async () => {
    try {
      // Get current points from profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', profile?.id)
        .single()

      if (profileError) throw profileError

      // Get available missions count
      const { count: availableMissionsCount, error: missionsError } = await supabase
        .from('chores')
        .select('*', { count: 'exact', head: true })
        .eq('parent_id', profile?.parent_id)
        .or(`assigned_to.is.null,assigned_to.eq.${profile?.id}`)

      if (missionsError) throw missionsError

      // Get today's completed chores count
      const today = new Date().toISOString().split('T')[0]
      const { count: completedTodayCount, error: completedError } = await supabase
        .from('chore_completions')
        .select('*', { count: 'exact', head: true })
        .eq('child_id', profile?.id)
        .eq('status', 'approved')
        .gte('approved_at', `${today}T00:00:00.000Z`)
        .lt('approved_at', `${today}T23:59:59.999Z`)

      if (completedError) throw completedError

      // Get pending approvals count
      const { count: pendingCount, error: pendingError } = await supabase
        .from('chore_completions')
        .select('*', { count: 'exact', head: true })
        .eq('child_id', profile?.id)
        .eq('status', 'pending')

      if (pendingError) throw pendingError

      setStats({
        currentPoints: profileData?.points || 0,
        availableMissions: availableMissionsCount || 0,
        completedToday: completedTodayCount || 0,
        pendingApprovals: pendingCount || 0
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-indigo-900">🏆 Mission Command Center</h1>
          <p className="text-indigo-700">Loading your mission data, Agent...</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow-lg border border-indigo-200 animate-pulse">
              <div className="h-4 bg-indigo-200 rounded mb-2"></div>
              <div className="h-8 bg-indigo-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (profile?.role !== 'child') {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Access denied. Child account required.</p>
      </div>
    )
  }

  // Calculate rank progress (simplified - you might want to use your ranks.ts file)
  const currentPoints = stats.currentPoints
  const nextRankPoints = Math.ceil(currentPoints / 100) * 100 + 100 // Simple progression
  const progressPercentage = Math.min((currentPoints / nextRankPoints) * 100, 100)

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-indigo-900">🏆 Mission Command Center</h1>
        <p className="text-indigo-700">Ready for your next mission, Agent {profile?.name}?</p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-indigo-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', count: null },
            { id: 'missions', name: 'Available Missions', count: stats.availableMissions }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-indigo-500 hover:text-indigo-700 hover:border-indigo-300'
              }`}
            >
              {tab.name}
              {tab.count !== null && (
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-indigo-100 text-indigo-600' : 'bg-indigo-100 text-indigo-600'
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow-lg border border-indigo-200">
              <h3 className="text-lg font-medium text-indigo-900">Current Rank</h3>
              <p className="text-2xl font-bold text-indigo-600">🎖️ {profile?.rank || 'Recruit Rascal'}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow-lg border border-indigo-200">
              <h3 className="text-lg font-medium text-indigo-900">Total Points</h3>
              <p className="text-2xl font-bold text-yellow-600">⭐ {stats.currentPoints}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow-lg border border-indigo-200">
              <h3 className="text-lg font-medium text-indigo-900">Completed Today</h3>
              <p className="text-2xl font-bold text-green-600">{stats.completedToday}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow-lg border border-indigo-200">
              <h3 className="text-lg font-medium text-indigo-900">Pending Review</h3>
              <p className="text-2xl font-bold text-orange-600">{stats.pendingApprovals}</p>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow-lg border border-indigo-200">
            <h3 className="text-lg font-medium text-indigo-900 mb-4">Progress to Next Rank</h3>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-indigo-600 h-4 rounded-full transition-all duration-300" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <p className="text-sm text-indigo-700 mt-2">
              {currentPoints} / {nextRankPoints} points to next rank
            </p>
          </div>

          {/* AI Voice Coach */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg border border-indigo-200 p-6">
            <AIVoiceCoach profile={profile} />
          </div>
        </>
      )}

      {activeTab === 'missions' && <ChildMissionHub />}
    </div>
  )
}