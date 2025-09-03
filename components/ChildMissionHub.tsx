'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'

interface Mission {
  id: string
  title: string
  description: string
  points: number
  assigned_to?: string
  recurring: boolean
}

interface MissionCompletion {
  id: string
  chore_id: string
  status: 'pending' | 'approved' | 'rejected'
  completed_at: string
  chore: {
    title: string
    points: number
  }
}

export default function ChildMissionHub() {
  const { profile } = useAuth()
  const [missions, setMissions] = useState<Mission[]>([])
  const [completions, setCompletions] = useState<MissionCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<string | null>(null)

  useEffect(() => {
    if (profile?.role === 'child') {
      fetchAvailableMissions()
      fetchMyCompletions()
      
      // Set up real-time subscription for mission updates
      const subscription = supabase
        .channel('missions')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'chores' 
          }, 
          () => {
            fetchAvailableMissions()
          }
        )
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chore_completions'
          },
          () => {
            fetchMyCompletions()
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [profile])

  const fetchAvailableMissions = async () => {
    try {
      // Get chores that are either assigned to this child or unassigned
      // and belong to this child's parent
      const { data, error } = await supabase
        .from('chores')
        .select('*')
        .eq('parent_id', profile?.parent_id)
        .or(`assigned_to.is.null,assigned_to.eq.${profile?.id}`)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMissions(data || [])
    } catch (error) {
      console.error('Error fetching missions:', error)
    }
  }

  const fetchMyCompletions = async () => {
    try {
      const { data, error } = await supabase
        .from('chore_completions')
        .select(`
          *,
          chore:chores(title, points)
        `)
        .eq('child_id', profile?.id)
        .order('completed_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setCompletions(data || [])
    } catch (error) {
      console.error('Error fetching completions:', error)
    } finally {
      setLoading(false)
    }
  }

  const submitMissionCompletion = async (missionId: string) => {
    setSubmitting(missionId)
    
    try {
      const { error } = await supabase
        .from('chore_completions')
        .insert([{
          chore_id: missionId,
          child_id: profile?.id,
          status: 'pending'
        }])

      if (error) throw error

      // Refresh completions to show the new submission
      fetchMyCompletions()
    } catch (error) {
      console.error('Error submitting mission completion:', error)
    } finally {
      setSubmitting(null)
    }
  }

  const getCompletionStatus = (missionId: string) => {
    const completion = completions.find(c => c.chore_id === missionId)
    return completion?.status
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="text-white text-xs px-3 py-1 rounded-full font-medium" style={{ backgroundColor: '#00BBDD' }}>⏳ Pending Review</span>
      case 'approved':
        return <span className="text-white text-xs px-3 py-1 rounded-full font-medium" style={{ backgroundColor: '#99CC66' }}>✅ Approved</span>
      case 'rejected':
        return <span className="text-white text-xs px-3 py-1 rounded-full font-medium" style={{ backgroundColor: '#E66666' }}>❌ Needs Redo</span>
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="p-6 rounded-lg shadow-lg border-2 text-center animate-pulse" style={{ backgroundColor: '#FFDD00', borderColor: '#FFD700' }}>
        <p className="text-gray-800 font-medium">Loading your missions, Agent...</p>
      </div>
    )
  }

  const availableMissions = missions.filter(mission => {
    const status = getCompletionStatus(mission.id)
    return !status || status === 'rejected'
  })

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="text-center p-4 sm:p-6 rounded-lg shadow-lg border-2 mx-2 sm:mx-0" style={{ backgroundColor: '#FF9933', borderColor: '#FF8C00' }}>
        <h2 className="bungee-regular text-xl sm:text-2xl text-white">🎯 Available Missions</h2>
        <p className="text-sm sm:text-base text-white">Choose your next mission, Agent {profile?.name}!</p>
      </div>

      {availableMissions.length === 0 ? (
        <div className="rounded-lg shadow-lg border-2 p-6 sm:p-8 text-center mx-2 sm:mx-0" style={{ backgroundColor: '#99CC66', borderColor: '#9ACD32' }}>
          <p className="text-white font-medium text-sm sm:text-base">No missions available right now. Great job completing everything!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 px-2 sm:px-0">
          {availableMissions.map((mission, index) => {
            const status = getCompletionStatus(mission.id)
            const isSubmitting = submitting === mission.id
            
            // Cycle through colors for mission cards
            const colors = [
              { bg: '#FFDD00', border: '#FFD700', text: 'text-gray-800' },
              { bg: '#00BBDD', border: '#00BCD4', text: 'text-white' },
              { bg: '#99CC66', border: '#9ACD32', text: 'text-white' },
              { bg: '#E66666', border: '#E56E6E', text: 'text-white' }
            ]
            const cardColor = colors[index % colors.length]
            
            return (
              <div key={mission.id} className="rounded-lg shadow-lg border-2 p-4 sm:p-6" style={{ backgroundColor: cardColor.bg, borderColor: cardColor.border }}>
                <div className="flex justify-between items-start mb-3">
                  <h3 className={`font-bold text-sm sm:text-base ${cardColor.text}`}>{mission.title}</h3>
                  <span className={`text-sm sm:text-lg font-bold ${cardColor.text} flex-shrink-0 ml-2`}>⭐ {mission.points}</span>
                </div>
                
                <p className={`${cardColor.text} text-xs sm:text-sm mb-4 opacity-90`}>{mission.description}</p>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="flex items-center space-x-2 flex-wrap">
                    {mission.recurring && (
                      <span className="text-white text-xs px-2 sm:px-3 py-1 rounded-full font-medium" style={{ backgroundColor: '#FF9933' }}>🔄 Recurring</span>
                    )}
                    {getStatusBadge(status || 'available')}
                  </div>
                  
                  <button
                    onClick={() => submitMissionCompletion(mission.id)}
                    disabled={isSubmitting || status === 'pending'}
                    className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 flex-shrink-0 ${
                      status === 'pending'
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-white text-gray-800 hover:bg-gray-100 shadow-md hover:shadow-lg'
                    }`}
                  >
                    {isSubmitting ? '⏳ Submitting...' : 
                     status === 'pending' ? '✓ Submitted' : 
                     status === 'rejected' ? '🔄 Resubmit' : 
                     '✓ Mark Complete'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Recent Mission History */}
      <div className="rounded-lg shadow-lg border-2 mx-2 sm:mx-0" style={{ backgroundColor: '#F0F8FF', borderColor: '#00BBDD' }}>
        <div className="px-4 sm:px-6 py-4 rounded-t-lg" style={{ backgroundColor: '#00BBDD' }}>
          <h3 className="bungee-regular text-base sm:text-lg text-white">Recent Mission History</h3>
        </div>
        <div className="p-4 sm:p-6">
          {completions.length === 0 ? (
            <p className="text-gray-700 text-center py-4 text-sm sm:text-base">
              No missions completed yet. Start your first mission above!
            </p>
          ) : (
            <div className="space-y-3">
              {completions.slice(0, 5).map((completion) => (
                <div key={completion.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 px-3 sm:px-4 rounded-lg space-y-2 sm:space-y-0" style={{ backgroundColor: 'rgba(255, 221, 0, 0.1)' }}>
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-gray-800 text-sm sm:text-base block sm:inline">{completion.chore.title}</span>
                    <span className="text-xs sm:text-sm text-gray-600 block sm:inline sm:ml-2">
                      ({new Date(completion.completed_at).toLocaleDateString()})
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className="font-bold text-gray-800 text-sm sm:text-base">⭐ {completion.chore.points}</span>
                    {getStatusBadge(completion.status)}
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