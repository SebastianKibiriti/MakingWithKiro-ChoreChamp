'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'
import { useRealtimeChores } from '../lib/hooks/useRealtimeChores'

interface ChoreCompletion {
  id: string
  chore_id: string
  child_id: string
  status: 'pending' | 'approved' | 'rejected'
  completed_at: string
  chore: {
    title: string
    description: string
    points: number
  }
  child: {
    name: string
    points: number
  }
}

export default function ChoreApprovalManager() {
  const { profile } = useAuth()
  const [completions, setCompletions] = useState<ChoreCompletion[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPendingCompletions = useCallback(async () => {
    if (!profile?.id) return
    
    try {
      // Get all pending completions for chores created by this parent
      const { data, error } = await supabase
        .from('chore_completions')
        .select(`
          *,
          chore:chores!inner(title, description, points, parent_id),
          child:profiles!chore_completions_child_id_fkey(name, points)
        `)
        .eq('chore.parent_id', profile.id)
        .eq('status', 'pending')
        .order('completed_at', { ascending: false })

      if (error) throw error
      setCompletions(data || [])
    } catch (error) {
      console.error('Error fetching pending completions:', error)
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  // Set up real-time subscriptions for comprehensive chore completion updates - memoized to prevent recreating
  const realtimeChores = useRealtimeChores(useMemo(() => ({
    onChoreCompletionUpdate: async (event) => {
      // Handle all chore completion events (INSERT, UPDATE, DELETE)
      console.log('ChoreApprovalManager - Completion update received:', event)
      
      // For completion events, verify this completion belongs to this parent's chores
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
            fetchPendingCompletions()
          }
        }
      } else if (event.eventType === 'DELETE') {
        // For deletions, refresh to remove from pending list
        fetchPendingCompletions()
      }
    },
    onError: (error) => {
      console.error('ChoreApprovalManager real-time error:', error)
    }
  }), [fetchPendingCompletions, profile?.id]))

  useEffect(() => {
    if (profile?.role === 'parent' && profile?.id) {
      fetchPendingCompletions()
      
      // Subscribe to real-time updates for chore completions with parent filtering
      realtimeChores.subscribe({
        parentId: profile.id,
        events: ['INSERT', 'UPDATE', 'DELETE']
      })

      // Proper cleanup function
      return () => {
        realtimeChores.unsubscribe()
      }
    }
  }, [profile?.id, profile?.role]) // Removed fetchPendingCompletions and realtimeChores from deps since they're now stable

  const handleApproval = async (completionId: string, status: 'approved' | 'rejected', childId: string, points: number) => {
    try {
      // Optimistic update: immediately remove from pending list
      setCompletions(prev => prev.filter(completion => completion.id !== completionId))

      // Update the completion status
      const { error: updateError } = await supabase
        .from('chore_completions')
        .update({
          status,
          approved_at: new Date().toISOString(),
          approved_by: profile?.id
        })
        .eq('id', completionId)

      if (updateError) throw updateError

      // If approved, update child's points
      if (status === 'approved') {
        const { data: childData, error: fetchError } = await supabase
          .from('profiles')
          .select('points')
          .eq('id', childId)
          .single()

        if (fetchError) throw fetchError

        const newPoints = (childData.points || 0) + points

        const { error: pointsError } = await supabase
          .from('profiles')
          .update({ points: newPoints })
          .eq('id', childId)

        if (pointsError) throw pointsError
      }

      // Note: We don't need to refresh the list here since optimistic update already handled it
      // and real-time subscriptions will handle any other updates
    } catch (error) {
      console.error('Error handling approval:', error)
      // On error, refresh the list to restore correct state
      fetchPendingCompletions()
    }
  }

  if (loading) {
    return <div className="animate-pulse">Loading pending approvals...</div>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">
        Pending Approvals ({completions.length})
      </h2>

      {completions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No pending chore completions to review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {completions.map((completion) => (
            <div key={completion.id} className="bg-white rounded-lg shadow border p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-medium text-gray-900">{completion.chore.title}</h3>
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                      Pending
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{completion.chore.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>👤 {completion.child.name}</span>
                    <span>⭐ {completion.chore.points} points</span>
                    <span>🕒 {new Date(completion.completed_at).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleApproval(
                      completion.id, 
                      'approved', 
                      completion.child_id, 
                      completion.chore.points
                    )}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => handleApproval(
                      completion.id, 
                      'rejected', 
                      completion.child_id, 
                      0
                    )}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
                  >
                    ✗ Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}