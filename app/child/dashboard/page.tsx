'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../lib/auth-context'
import { supabase } from '../../../lib/supabase'
import AIVoiceCoach from '../../components/AIVoiceCoach'
import ChildMissionHub from '../../../components/ChildMissionHub'
import UsageStatus from '../../../components/UsageStatus'

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
          {[
            { bg: '#FF9933', border: '#FF8C00' },
            { bg: '#FFDD00', border: '#FFD700' },
            { bg: '#99CC66', border: '#9ACD32' }
          ].map((colors, i) => (
            <div key={i} className="p-6 rounded-lg shadow-lg border-2 animate-pulse" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
              <div className="h-4 bg-white/30 rounded mb-2"></div>
              <div className="h-8 bg-white/30 rounded"></div>
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
    <div className="space-y-4 sm:space-y-6 overflow-x-hidden">
      <div className="text-center px-2 sm:px-4">
        <h1 className="bungee-regular text-lg sm:text-2xl md:text-3xl text-indigo-900">🏆 Mission Command Center</h1>
        <p className="text-xs sm:text-sm md:text-base text-indigo-700 mt-1">Ready for your next mission, Agent {profile?.name}?</p>
      </div>

      {/* Navigation Tabs */}
      <div className="rounded-lg shadow-lg border-2 p-2 sm:p-4 mx-2 sm:mx-0" style={{ backgroundColor: '#FFDD00', borderColor: '#FFD700' }}>
        <nav className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          {[
            { id: 'overview', name: 'Overview', count: null, color: '#FF9933' },
            { id: 'missions', name: 'Missions', count: stats.availableMissions, color: '#00BBDD' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 sm:py-3 px-3 sm:px-6 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 ${
                activeTab === tab.id
                  ? 'text-white shadow-lg transform scale-105'
                  : 'text-gray-800 hover:text-white hover:shadow-md hover:scale-102'
              }`}
              style={{
                backgroundColor: activeTab === tab.id ? tab.color : 'transparent',
                border: `2px solid ${tab.color}`
              }}
            >
              <span className="block sm:inline text-center sm:text-left">{tab.name}</span>
              {tab.count !== null && (
                <span className={`ml-0 sm:ml-2 mt-1 sm:mt-0 inline-block py-1 px-2 rounded-full text-xs font-bold ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'text-white'
                }`} style={{ backgroundColor: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : tab.color }}>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 px-2 sm:px-0">
            {/* Combined Rank & Points Card - Orange theme for achievement/status */}
            <div className="sm:col-span-2 lg:col-span-1 p-3 sm:p-6 rounded-lg shadow-lg border-2" style={{ backgroundColor: '#FF9933', borderColor: '#FF8C00' }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm sm:text-lg font-medium text-white">Current Rank 🎖️</h3>
                <span className="text-sm sm:text-lg font-medium text-white">⭐ {stats.currentPoints}</span>
              </div>
              <p className="bungee-regular text-lg sm:text-2xl text-white">{profile?.rank || 'Recruit Rascal'}</p>
            </div>
            {/* Completed Card - Light Green theme for success/completion */}
            <div className="p-3 sm:p-6 rounded-lg shadow-lg border-2" style={{ backgroundColor: '#99CC66', borderColor: '#9ACD32' }}>
              <h3 className="text-sm sm:text-lg font-medium text-white">Completed Today</h3>
              <p className="text-lg sm:text-2xl font-bold text-white">{stats.completedToday}</p>
            </div>
            {/* Pending Card - Teal theme for pending/waiting states */}
            <div className="p-3 sm:p-6 rounded-lg shadow-lg border-2" style={{ backgroundColor: '#00BBDD', borderColor: '#00BCD4' }}>
              <h3 className="text-sm sm:text-lg font-medium text-white">Pending Review</h3>
              <p className="text-lg sm:text-2xl font-bold text-white">{stats.pendingApprovals}</p>
            </div>
          </div>

          <div className="p-3 sm:p-6 rounded-lg shadow-lg border-2 mx-2 sm:mx-0" style={{ backgroundColor: '#E66666', borderColor: '#E56E6E' }}>
            <h3 className="bungee-regular text-sm sm:text-lg text-white mb-3 sm:mb-4">Progress to Next Rank</h3>
            <div className="w-full bg-white/30 rounded-full h-4">
              <div 
                className="bg-white h-4 rounded-full transition-all duration-300" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <p className="text-sm text-white mt-2">
              {currentPoints} / {nextRankPoints} points to next rank
            </p>
          </div>

          {/* Usage Status */}
          <div className="mx-2 sm:mx-0">
            <UsageStatus />
          </div>

          {/* AI Voice Coach */}
          <div className="rounded-lg shadow-lg border-2 p-3 sm:p-6 mx-2 sm:mx-0" style={{ backgroundColor: '#F0F8FF', borderColor: '#00BBDD' }}>
            <AIVoiceCoach profile={profile} />
          </div>
        </>
      )}

      {activeTab === 'missions' && <ChildMissionHub />}
    </div>
  )
}