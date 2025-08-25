'use client'

import { useAuth } from '../../../lib/auth-context'
import { useDashboardStats, useAvailableMissions } from '../../../lib/hooks/useSupabaseData'

export default function ChildDashboard() {
  const { profile } = useAuth()
  const { stats, loading: statsLoading, error: statsError } = useDashboardStats(profile?.id, 'child')
  const { missions, loading: missionsLoading, error: missionsError } = useAvailableMissions(profile?.id)

  if (statsLoading || missionsLoading) {
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

  if (statsError || missionsError) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-indigo-900">🏆 Mission Command Center</h1>
          <p className="text-red-600">Error loading mission data: {statsError || missionsError}</p>
        </div>
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow-lg border border-indigo-200">
          <h3 className="text-lg font-medium text-indigo-900">Current Rank</h3>
          <p className="text-2xl font-bold text-indigo-600">🎖️ {profile?.rank || 'Recruit'}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow-lg border border-indigo-200">
          <h3 className="text-lg font-medium text-indigo-900">Available Missions</h3>
          <p className="text-2xl font-bold text-green-600">{stats.availableMissions}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow-lg border border-indigo-200">
          <h3 className="text-lg font-medium text-indigo-900">Missions Completed Today</h3>
          <p className="text-2xl font-bold text-yellow-600">{stats.completedToday}</p>
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

      {/* Available Missions Preview */}
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg border border-indigo-200">
        <div className="px-6 py-4 border-b border-indigo-200">
          <h2 className="text-lg font-medium text-indigo-900">Available Missions</h2>
        </div>
        <div className="p-6">
          {missions.length === 0 ? (
            <p className="text-indigo-700 text-center py-4">
              No missions available right now. Check back later, Agent!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {missions.slice(0, 4).map((mission) => (
                <div key={mission.id} className="border border-indigo-200 rounded-lg p-4 hover:bg-indigo-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-indigo-900">{mission.title}</h3>
                    <span className="text-sm font-bold text-yellow-600">⭐ {mission.points}</span>
                  </div>
                  <p className="text-sm text-indigo-700 mt-1">{mission.description}</p>
                </div>
              ))}
            </div>
          )}
          {missions.length > 4 && (
            <div className="text-center mt-4">
              <p className="text-sm text-indigo-600">
                +{missions.length - 4} more missions available
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}