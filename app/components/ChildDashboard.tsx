'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Trophy, Star, CheckCircle, Clock } from 'lucide-react'
import { getRankByPoints, getNextRank, ARMY_RANKS } from '@/lib/ranks'
import AIVoiceCoach from './AIVoiceCoach'

interface ChildDashboardProps {
  profile: any
  onProfileUpdate?: () => void
}

export default function ChildDashboard({ profile: initialProfile, onProfileUpdate }: ChildDashboardProps) {
  const [availableChores, setAvailableChores] = useState<any[]>([])
  const [completedChores, setCompletedChores] = useState<any[]>([])
  const [availableRewards, setAvailableRewards] = useState<any[]>([])
  const [currentProfile, setCurrentProfile] = useState(initialProfile)

  const fetchProfileData = async () => {
    console.log('Fetching profile data for ID:', initialProfile.id)
    
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', initialProfile.id)
      .single()
    
    if (error) {
      console.error('Error fetching profile:', error)
    } else {
      console.log('Previous profile data:', currentProfile)
      console.log('New profile data from DB:', profileData)
      
      if (profileData.points !== currentProfile.points) {
        console.log(`Points changed: ${currentProfile.points} → ${profileData.points}`)
      }
      
      setCurrentProfile(profileData)
      if (onProfileUpdate) {
        onProfileUpdate()
      }
    }
  }

  useEffect(() => {
    fetchData()
    
    // Set up real-time subscription for profile updates
    const profileSubscription = supabase
      .channel(`profile-changes-${initialProfile.id}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'profiles',
          filter: `id=eq.${initialProfile.id}`
        }, 
        (payload) => {
          console.log('Profile updated via subscription:', payload)
          fetchProfileData()
        }
      )
      .subscribe()

    // Set up subscription for chore completion updates
    const completionSubscription = supabase
      .channel(`completion-changes-${initialProfile.id}`)
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chore_completions',
          filter: `child_id=eq.${initialProfile.id}`
        },
        (payload) => {
          console.log('Completion updated via subscription:', payload)
          fetchData()
          // Also refresh profile in case points changed
          setTimeout(fetchProfileData, 1000) // Small delay to ensure DB is updated
        }
      )
      .subscribe()

    return () => {
      profileSubscription.unsubscribe()
      completionSubscription.unsubscribe()
    }
  }, [])

  const fetchData = async () => {
    // Fetch available chores
    const { data: choresData } = await supabase
      .from('chores')
      .select('*')
      .or(`assigned_to.is.null,assigned_to.eq.${currentProfile.id}`)

    setAvailableChores(choresData || [])

    // Fetch completed chores
    const { data: completionsData } = await supabase
      .from('chore_completions')
      .select(`
        *,
        chores (title, points)
      `)
      .eq('child_id', currentProfile.id)
      .order('completed_at', { ascending: false })

    setCompletedChores(completionsData || [])

    // Fetch available rewards
    const currentRank = getRankByPoints(currentProfile.points)
    const { data: rewardsData } = await supabase
      .from('rewards')
      .select('*')
      .eq('parent_id', currentProfile.parent_id)
      .lte('points_required', currentProfile.points)

    setAvailableRewards(rewardsData || [])
  }

  const completeChore = async (choreId: string) => {
    await supabase
      .from('chore_completions')
      .insert({
        chore_id: choreId,
        child_id: currentProfile.id,
        status: 'pending'
      })

    fetchData()
  }

  const currentRank = getRankByPoints(currentProfile.points)
  const nextRank = getNextRank(currentProfile.points)
  const progressToNext = nextRank 
    ? ((currentProfile.points - currentRank.pointsRequired) / (nextRank.pointsRequired - currentRank.pointsRequired)) * 100
    : 100

  return (
    <div className="space-y-8">


      {/* Welcome Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-army-800 mb-2">
          Welcome to your Mission Hub, {currentProfile.name}!
        </h1>
        <div className="flex justify-center items-center space-x-4 mb-4">
          <span className={`rank-badge ${currentRank.color} text-white text-lg`}>
            {currentRank.icon} {currentRank.name}
          </span>
          <span className="text-xl font-semibold text-army-600">
            {currentProfile.points} Points
          </span>
        </div>
        <button
          onClick={() => {
            fetchProfileData()
            fetchData()
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
        >
          🔄 Refresh Progress
        </button>
      </div>

      {/* Rank Progress */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Rank Progress</h2>
        {nextRank ? (
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Progress to {nextRank.name}</span>
              <span className="text-sm text-gray-600">
                {currentProfile.points} / {nextRank.pointsRequired} points
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-army-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progressToNext}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {nextRank.pointsRequired - currentProfile.points} points to go!
            </p>
          </div>
        ) : (
          <div className="text-center">
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <p className="text-lg font-semibold">Congratulations!</p>
            <p className="text-gray-600">You've reached the highest rank!</p>
          </div>
        )}
      </div>

      {/* AI Voice Coach */}
      <AIVoiceCoach profile={currentProfile} />

      {/* Available Missions */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Star className="w-6 h-6 text-yellow-500 mr-2" />
          Available Missions
        </h2>
        {availableChores.length === 0 ? (
          <p className="text-gray-600">No missions available right now. Check back later!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableChores.map((chore) => (
              <div key={chore.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-lg">{chore.title}</h3>
                <p className="text-gray-600 text-sm mb-3">{chore.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-army-600 font-semibold">
                    +{chore.points} points
                  </span>
                  <button
                    onClick={() => completeChore(chore.id)}
                    className="btn-primary text-sm"
                  >
                    Complete Mission
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>      {
/* Available Rewards */}
      {availableRewards.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Trophy className="w-6 h-6 text-yellow-500 mr-2" />
            Available Rewards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableRewards.map((reward) => (
              <div key={reward.id} className="border rounded-lg p-4 bg-yellow-50">
                <h3 className="font-semibold text-lg">{reward.title}</h3>
                <p className="text-gray-600 text-sm mb-3">{reward.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-yellow-600 font-semibold">
                    {reward.points_required} points
                  </span>
                  <span className="text-green-600 font-semibold">
                    ✓ Unlocked!
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        {completedChores.length === 0 ? (
          <p className="text-gray-600">No completed missions yet. Start your first mission above!</p>
        ) : (
          <div className="space-y-3">
            {completedChores.slice(0, 5).map((completion) => (
              <div key={completion.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  {completion.status === 'approved' ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  ) : (
                    <Clock className="w-5 h-5 text-yellow-500 mr-3" />
                  )}
                  <div>
                    <p className="font-medium">{completion.chores?.title}</p>
                    <p className="text-sm text-gray-600">
                      {completion.status === 'approved' ? 'Approved' : 'Waiting for approval'}
                    </p>
                  </div>
                </div>
                <span className="text-army-600 font-semibold">
                  +{completion.chores?.points} points
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}