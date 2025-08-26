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
        return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">⏳ Pending Review</span>
      case 'approved':
        return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">✅ Approved</span>
      case 'rejected':
        return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">❌ Needs Redo</span>
      default:
        return null
    }
  }

  if (loading) {
    return <div className="animate-pulse">Loading your missions, Agent...</div>
  }

  const availableMissions = missions.filter(mission => {
    const status = getCompletionStatus(mission.id)
    return !status || status === 'rejected'
  })

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-indigo-900">🎯 Available Missions</h2>
        <p className="text-indigo-700">Choose your next mission, Agent {profile?.name}!</p>
      </div>

      {availableMissions.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg border border-indigo-200 p-8 text-center">
          <p className="text-indigo-700">No missions available right now. Great job completing everything!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {availableMissions.map((mission) => {
            const status = getCompletionStatus(mission.id)
            const isSubmitting = submitting === mission.id
            
            return (
              <div key={mission.id} className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg border border-indigo-200 p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-indigo-900">{mission.title}</h3>
                  <span className="text-lg font-bold text-yellow-600">⭐ {mission.points}</span>
                </div>
                
                <p className="text-indigo-700 text-sm mb-4">{mission.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {mission.recurring && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">🔄 Recurring</span>
                    )}
                    {getStatusBadge(status || 'available')}
                  </div>
                  
                  <button
                    onClick={() => submitMissionCompletion(mission.id)}
                    disabled={isSubmitting || status === 'pending'}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      status === 'pending'
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
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
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg border border-indigo-200">
        <div className="px-6 py-4 border-b border-indigo-200">
          <h3 className="text-lg font-medium text-indigo-900">Recent Mission History</h3>
        </div>
        <div className="p-6">
          {completions.length === 0 ? (
            <p className="text-indigo-700 text-center py-4">
              No missions completed yet. Start your first mission above!
            </p>
          ) : (
            <div className="space-y-3">
              {completions.slice(0, 5).map((completion) => (
                <div key={completion.id} className="flex justify-between items-center py-2 border-b border-indigo-100 last:border-b-0">
                  <div>
                    <span className="font-medium text-indigo-900">{completion.chore.title}</span>
                    <span className="text-sm text-indigo-600 ml-2">
                      ({new Date(completion.completed_at).toLocaleDateString()})
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-600">⭐ {completion.chore.points}</span>
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