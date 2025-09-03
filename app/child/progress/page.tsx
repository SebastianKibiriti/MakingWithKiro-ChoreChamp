'use client'

import { useAuth } from '@/lib/auth-context'
import { ARMY_RANKS, getRankByPoints, getNextRank, getAllPrivilegesForRank, Rank } from '@/ranks'
import { useEffect, useState } from 'react'

interface ChildProfile {
  id: string
  name: string
  points: number
}

export default function ChildProgress() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<ChildProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedRank, setSelectedRank] = useState<Rank | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const openRankModal = (rank: Rank) => {
    setSelectedRank(rank)
    setIsModalOpen(true)
  }

  const closeRankModal = () => {
    setIsModalOpen(false)
    setTimeout(() => setSelectedRank(null), 300) // Delay to allow animation
  }

  useEffect(() => {
    if (user) {
      // For now, using mock data - replace with actual Supabase call
      setProfile({
        id: user.id,
        name: user.user_metadata?.name || 'Champion',
        points: 2500 // Mock points - replace with actual data
      })
      setLoading(false)
    }
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-indigo-700">Loading your progress...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center text-indigo-700">
        Please log in to view your progress.
      </div>
    )
  }

  const currentRank = getRankByPoints(profile.points)
  const nextRank = getNextRank(profile.points)
  const pointsToNext = nextRank ? nextRank.pointsRequired - profile.points : 0
  const progressPercent = nextRank 
    ? ((profile.points - currentRank.pointsRequired) / (nextRank.pointsRequired - currentRank.pointsRequired)) * 100
    : 100

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-indigo-900">🏆 Rank Progress</h1>
        <p className="text-indigo-700">Track your advancement through the ranks, {profile.name}!</p>
      </div>

      {/* Current Status Card - Full Width */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-6 rounded-lg shadow-lg text-white">
        <div className="text-center">
          <div className="text-4xl mb-2">{currentRank.icon}</div>
          <h2 className="text-2xl font-bold">{currentRank.name}</h2>
          <p className="text-lg opacity-90">{profile.points} Total Points</p>
          
          {nextRank && (
            <div className="mt-4">
              <p className="text-sm opacity-80">Next Rank: {nextRank.name}</p>
              <p className="text-sm opacity-80">{pointsToNext} points to go!</p>
              
              {/* Progress Bar */}
              <div className="w-full bg-white/30 rounded-full h-3 mt-2">
                <div 
                  className="bg-white h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs mt-1 opacity-70">{Math.round(progressPercent)}% to next rank</p>
            </div>
          )}
          
          {!nextRank && (
            <div className="mt-4">
              <p className="text-lg font-semibold">🎉 Maximum Rank Achieved! 🎉</p>
              <p className="text-sm opacity-80">You're the ultimate Chore Champion!</p>
            </div>
          )}
        </div>
      </div>

      {/* Privileges Section - Side by Side Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Privileges Card */}
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow-lg border border-indigo-200">
          <h3 className="text-xl font-bold text-indigo-900 mb-4 text-center">
            🎁 Your Current Privileges
          </h3>
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center mb-3">
              <div className="text-2xl mr-3">{currentRank.icon}</div>
              <h4 className="text-lg font-bold text-green-800">{currentRank.name} Benefits</h4>
            </div>
            <div className="space-y-2">
              {getAllPrivilegesForRank(currentRank).map((privilege, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="text-green-600 mt-1">✅</div>
                  <p className="text-green-700 text-sm">{privilege}</p>
                </div>
              ))}
            </div>
            {getAllPrivilegesForRank(currentRank).length === 0 && (
              <p className="text-green-700 text-sm italic">No special privileges yet - keep earning points!</p>
            )}
          </div>
        </div>

        {/* Next Rank Privileges Card */}
        {nextRank && (
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow-lg border border-indigo-200">
            <h3 className="text-xl font-bold text-indigo-900 mb-4 text-center">
              🔮 Next Rank Rewards
            </h3>
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center mb-3">
                <div className="text-2xl mr-3">{nextRank.icon}</div>
                <h4 className="text-lg font-bold text-blue-800">{nextRank.name}</h4>
              </div>
              <p className="text-blue-700 text-sm mb-2">
                <strong>{pointsToNext} more points</strong> to unlock:
              </p>
              <div className="space-y-2">
                {nextRank.privileges.filter(p => !p.startsWith("All privileges of")).map((privilege, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className="text-blue-600 mt-1">🔒</div>
                    <p className="text-blue-700 text-sm">{privilege}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* If at max rank, show achievement card */}
        {!nextRank && (
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow-lg border border-indigo-200">
            <h3 className="text-xl font-bold text-indigo-900 mb-4 text-center">
              🏆 Maximum Achievement
            </h3>
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200 text-center">
              <div className="text-4xl mb-3">👑</div>
              <h4 className="text-lg font-bold text-purple-800 mb-2">Ultimate Champion!</h4>
              <p className="text-purple-700 text-sm">
                You've reached the highest rank and unlocked all possible privileges. 
                You're a true Chore Champion legend!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* All Ranks Display - Grid Layout */}
      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow-lg border border-indigo-200">
        <h3 className="text-xl font-bold text-indigo-900 mb-6 text-center">🎖️ All Army Ranks</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ARMY_RANKS.map((rank, index) => {
            const isCurrentRank = rank.name === currentRank.name
            const isAchieved = profile.points >= rank.pointsRequired
            const isNext = nextRank && rank.name === nextRank.name
            
            return (
              <div
                key={rank.name}
                onClick={() => openRankModal(rank)}
                className={`p-4 rounded-lg border-2 transition-all duration-300 cursor-pointer hover:shadow-lg hover:scale-105 ${
                  isCurrentRank
                    ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-yellow-400 shadow-lg transform scale-105'
                    : isAchieved
                    ? 'bg-green-50 border-green-300 hover:bg-green-100'
                    : isNext
                    ? 'bg-blue-50 border-blue-300 hover:bg-blue-100'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="text-center mb-3">
                  <div className="text-3xl mb-2">{rank.icon}</div>
                  <h4 className={`font-bold text-lg ${
                    isCurrentRank ? 'text-orange-800' : 
                    isAchieved ? 'text-green-800' : 
                    isNext ? 'text-blue-800' : 'text-gray-600'
                  }`}>
                    {rank.name}
                  </h4>
                  <div className={`font-bold text-sm ${
                    isCurrentRank ? 'text-orange-800' : 
                    isAchieved ? 'text-green-800' : 
                    isNext ? 'text-blue-800' : 'text-gray-600'
                  }`}>
                    {rank.pointsRequired.toLocaleString()} pts
                  </div>
                </div>
                
                <p className={`text-xs text-center mb-3 ${
                  isCurrentRank ? 'text-orange-700' : 
                  isAchieved ? 'text-green-700' : 
                  isNext ? 'text-blue-700' : 'text-gray-500'
                }`}>
                  {rank.description}
                </p>
                
                <div className="text-center">
                  {isCurrentRank && (
                    <div className="bg-orange-200 text-orange-800 px-2 py-1 rounded-full text-xs font-bold">
                      ⭐ You are here!
                    </div>
                  )}
                  
                  {isAchieved && !isCurrentRank && (
                    <div className="bg-green-200 text-green-800 px-2 py-1 rounded-full text-xs font-bold">
                      ✅ Achieved
                    </div>
                  )}
                  
                  {isNext && (
                    <div className="bg-blue-200 text-blue-800 px-2 py-1 rounded-full text-xs font-bold">
                      🎯 Next: {pointsToNext} pts
                    </div>
                  )}
                  
                  {!isAchieved && !isNext && (
                    <div className="bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-xs">
                      {(rank.pointsRequired - profile.points).toLocaleString()} pts needed
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Motivational Section */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-lg shadow-lg text-white text-center">
        <h3 className="text-xl font-bold mb-2">Keep Going, Champion! 💪</h3>
        <p className="opacity-90">
          {nextRank 
            ? `You're ${pointsToNext} points away from becoming a ${nextRank.name}!`
            : "You've reached the highest rank! You're a true Chore Champion!"
          }
        </p>
        {nextRank && (
          <p className="text-sm opacity-80 mt-2">
            Complete more chores to earn points and advance through the ranks!
          </p>
        )}
      </div>

      {/* Rank Details Modal */}
      {isModalOpen && selectedRank && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            className={`bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 ${
              isModalOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
            }`}
          >
            {/* Modal Header */}
            <div className={`p-6 rounded-t-lg ${selectedRank.color} text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-4xl">{selectedRank.icon}</div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedRank.name}</h2>
                    <p className="text-lg opacity-90">{selectedRank.pointsRequired.toLocaleString()} Points Required</p>
                  </div>
                </div>
                <button
                  onClick={closeRankModal}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Status Badge */}
              <div className="mb-4 text-center">
                {selectedRank.name === currentRank.name && (
                  <div className="inline-block bg-orange-100 text-orange-800 px-4 py-2 rounded-full font-bold">
                    ⭐ Your Current Rank!
                  </div>
                )}
                {profile.points >= selectedRank.pointsRequired && selectedRank.name !== currentRank.name && (
                  <div className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full font-bold">
                    ✅ Rank Achieved
                  </div>
                )}
                {nextRank && selectedRank.name === nextRank.name && (
                  <div className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-bold">
                    🎯 Next Rank ({pointsToNext} points to go!)
                  </div>
                )}
                {profile.points < selectedRank.pointsRequired && (!nextRank || selectedRank.name !== nextRank.name) && (
                  <div className="inline-block bg-gray-100 text-gray-600 px-4 py-2 rounded-full">
                    🔒 {(selectedRank.pointsRequired - profile.points).toLocaleString()} points needed
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-2">About This Rank</h3>
                <p className="text-gray-600 leading-relaxed">{selectedRank.description}</p>
              </div>

              {/* Privileges */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-3">Rank Privileges</h3>
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
                  <div className="space-y-2">
                    {getAllPrivilegesForRank(selectedRank).map((privilege, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <div className="text-blue-600 mt-1">
                          {profile.points >= selectedRank.pointsRequired ? '✅' : '🔒'}
                        </div>
                        <p className="text-blue-700 text-sm">{privilege}</p>
                      </div>
                    ))}
                  </div>
                  {getAllPrivilegesForRank(selectedRank).length === 0 && (
                    <p className="text-blue-700 text-sm italic">No special privileges for this rank.</p>
                  )}
                </div>
              </div>

              {/* Progress Information */}
              {profile.points < selectedRank.pointsRequired && (
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Progress to This Rank</h3>
                  <div className="bg-gray-100 rounded-full h-4 mb-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min((profile.points / selectedRank.pointsRequired) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 text-center">
                    {profile.points} / {selectedRank.pointsRequired.toLocaleString()} points 
                    ({Math.round((profile.points / selectedRank.pointsRequired) * 100)}%)
                  </p>
                </div>
              )}

              {/* Motivational Message */}
              <div className="text-center">
                {selectedRank.name === currentRank.name && (
                  <p className="text-orange-600 font-medium">
                    🎉 Congratulations! You've achieved this rank and unlocked all its privileges!
                  </p>
                )}
                {nextRank && selectedRank.name === nextRank.name && (
                  <p className="text-blue-600 font-medium">
                    🚀 This is your next goal! Keep completing chores to reach it!
                  </p>
                )}
                {profile.points < selectedRank.pointsRequired && (!nextRank || selectedRank.name !== nextRank.name) && (
                  <p className="text-gray-600">
                    💪 Keep working towards this amazing rank! Every chore completed gets you closer!
                  </p>
                )}
                {profile.points >= selectedRank.pointsRequired && selectedRank.name !== currentRank.name && (
                  <p className="text-green-600 font-medium">
                    ✨ You've already mastered this rank! Great job, Champion!
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 rounded-b-lg text-center">
              <button
                onClick={closeRankModal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}