'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Users, CheckCircle, Clock, Trophy } from 'lucide-react'
import CreateChoreModal from './CreateChoreModal'
import CreateChildModal from './CreateChildModal'
import CreateRewardModal from './CreateRewardModal'
import { getRankByPoints } from '@/lib/ranks'

interface ParentDashboardProps {
  profile: any
}

export default function ParentDashboard({ profile }: ParentDashboardProps) {
  const [children, setChildren] = useState<any[]>([])
  const [chores, setChores] = useState<any[]>([])
  const [pendingCompletions, setPendingCompletions] = useState<any[]>([])
  const [rewards, setRewards] = useState<any[]>([])
  const [showCreateChore, setShowCreateChore] = useState(false)
  const [showCreateChild, setShowCreateChild] = useState(false)
  const [showCreateReward, setShowCreateReward] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    // Fetch children
    const { data: childrenData } = await supabase
      .from('profiles')
      .select('*')
      .eq('parent_id', profile.id)
      .eq('role', 'child')

    setChildren(childrenData || [])

    // Fetch chores
    const { data: choresData } = await supabase
      .from('chores')
      .select('*')
      .eq('parent_id', profile.id)

    setChores(choresData || [])

    // Fetch pending completions with a simpler approach
    // First get all pending completions
    const { data: allCompletions, error: completionsError } = await supabase
      .from('chore_completions')
      .select('*')
      .eq('status', 'pending')
    
    console.log('All pending completions:', allCompletions)
    
    // Then get the related data for each completion
    const enrichedCompletions = []
    if (allCompletions) {
      for (const completion of allCompletions) {
        // Get chore details
        const { data: choreData } = await supabase
          .from('chores')
          .select('title, points, parent_id')
          .eq('id', completion.chore_id)
          .single()
        
        // Get child details
        const { data: childData } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', completion.child_id)
          .single()
        
        // Only include if this chore belongs to the current parent
        if (choreData?.parent_id === profile.id) {
          enrichedCompletions.push({
            ...completion,
            chores: choreData,
            profiles: childData
          })
        }
      }
    }
    
    console.log('Enriched completions for parent:', enrichedCompletions)
    console.log('Parent ID:', profile.id)
    console.log('Completions error:', completionsError)
    
    setPendingCompletions(enrichedCompletions)

    // Fetch rewards
    const { data: rewardsData } = await supabase
      .from('rewards')
      .select('*')
      .eq('parent_id', profile.id)

    setRewards(rewardsData || [])
  }

  const approveCompletion = async (completionId: string, childId: string, points: number) => {
    try {
      console.log('Approving completion:', { completionId, childId, points })
      
      // Update completion status
      const { error: completionError } = await supabase
        .from('chore_completions')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: profile.id
        })
        .eq('id', completionId)

      if (completionError) {
        console.error('Error updating completion:', completionError)
        throw completionError
      }

      // Get current child data from database (not from state)
      const { data: currentChild, error: childError } = await supabase
        .from('profiles')
        .select('points, name')
        .eq('id', childId)
        .single()

      if (childError) {
        console.error('Error fetching child:', childError)
        throw childError
      }

      if (currentChild) {
        const newPoints = currentChild.points + points
        const newRank = getRankByPoints(newPoints)
        
        console.log('Updating child:', { 
          childId, 
          oldPoints: currentChild.points, 
          newPoints, 
          newRank: newRank.name 
        })
        
        const { data: updateResult, error: updateError } = await supabase
          .from('profiles')
          .update({
            points: newPoints,
            rank: newRank.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', childId)
          .select()

        if (updateError) {
          console.error('Error updating child profile:', updateError)
          throw updateError
        }
        
        console.log('Profile update result:', updateResult)
        
        // Verify the update worked
        const { data: verifyData } = await supabase
          .from('profiles')
          .select('points, rank')
          .eq('id', childId)
          .single()
        
        console.log('Verification query result:', verifyData)
        
        // Show success message
        alert(`✅ Approved! ${currentChild.name} earned ${points} points and is now ${newRank.name}!`)
      }

      // Refresh data
      await fetchData()
    } catch (error) {
      console.error('Error approving completion:', error)
      alert(`Error approving chore: ${error.message}`)
    }
  }

  const rejectCompletion = async (completionId: string) => {
    try {
      await supabase
        .from('chore_completions')
        .update({
          status: 'rejected',
          approved_at: new Date().toISOString(),
          approved_by: profile.id
        })
        .eq('id', completionId)

      fetchData()
      alert('❌ Chore completion rejected.')
    } catch (error) {
      console.error('Error rejecting completion:', error)
      alert('Error rejecting chore. Please try again.')
    }
  }

  return (
    <div className="space-y-8">


      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-army-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Children</p>
              <p className="text-2xl font-bold">{children.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Active Chores</p>
              <p className="text-2xl font-bold">{chores.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Pending Approvals</p>
              <p className="text-2xl font-bold text-orange-600">{pendingCompletions.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <Trophy className="w-8 h-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Rewards</p>
              <p className="text-2xl font-bold">{rewards.length}</p>
            </div>
          </div>
        </div>
      </div>      {
/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={() => setShowCreateChild(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Child
        </button>
        <button
          onClick={() => setShowCreateChore(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Chore
        </button>
        <button
          onClick={() => setShowCreateReward(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Reward
        </button>
      </div>

      {/* Children Overview */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Your Children</h2>
        {children.length === 0 ? (
          <p className="text-gray-600">No children added yet. Click "Add Child" to get started!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {children.map((child) => {
              const rank = getRankByPoints(child.points)
              return (
                <div key={child.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg">{child.name}</h3>
                  <div className="mt-2">
                    <span className={`rank-badge ${rank.color} text-white`}>
                      {rank.icon} {rank.name}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{child.points} points</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pending Approvals */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Pending Approvals ({pendingCompletions.length})</h2>
        {pendingCompletions.length === 0 ? (
          <p className="text-gray-600">No pending approvals at the moment.</p>
        ) : (
          <div className="space-y-3">
            {pendingCompletions.map((completion) => (
              <div key={completion.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div>
                  <p className="font-medium">{completion.chores?.title || 'Unknown Chore'}</p>
                  <p className="text-sm text-gray-600">Completed by {completion.profiles?.name || 'Unknown Child'}</p>
                  <p className="text-sm text-army-600 font-medium">+{completion.chores?.points || 0} points</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => approveCompletion(completion.id, completion.child_id, completion.chores?.points || 0)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                  >
                    ✅ Approve
                  </button>
                  <button
                    onClick={() => rejectCompletion(completion.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateChild && (
        <CreateChildModal
          parentId={profile.id}
          onClose={() => setShowCreateChild(false)}
          onSuccess={() => {
            setShowCreateChild(false)
            fetchData()
          }}
        />
      )}

      {showCreateChore && (
        <CreateChoreModal
          parentId={profile.id}
          children={children}
          onClose={() => setShowCreateChore(false)}
          onSuccess={() => {
            setShowCreateChore(false)
            fetchData()
          }}
        />
      )}

      {showCreateReward && (
        <CreateRewardModal
          parentId={profile.id}
          onClose={() => setShowCreateReward(false)}
          onSuccess={() => {
            setShowCreateReward(false)
            fetchData()
          }}
        />
      )}
    </div>
  )
}