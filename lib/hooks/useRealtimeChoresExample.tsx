'use client'

import React from 'react'
import { useRealtimeChores } from './useRealtimeChores'
import { ConnectionStatus } from '../realtime-context'

interface RealtimeChoresExampleProps {
  userId: string
  userRole: 'parent' | 'child'
}

/**
 * Example component demonstrating how to use the useRealtimeChores hook
 * This shows the basic pattern for implementing real-time chore synchronization
 */
export function RealtimeChoresExample({ userId, userRole }: RealtimeChoresExampleProps) {
  const [choreUpdates, setChoreUpdates] = React.useState<any[]>([])
  const [completionUpdates, setCompletionUpdates] = React.useState<any[]>([])
  const [profileUpdates, setProfileUpdates] = React.useState<any[]>([])

  const realtimeChores = useRealtimeChores({
    onChoreUpdate: (event) => {
      console.log('Chore update received:', event)
      setChoreUpdates(prev => [...prev.slice(-9), event]) // Keep last 10 updates
    },
    onChoreCompletionUpdate: (event) => {
      console.log('Chore completion update received:', event)
      setCompletionUpdates(prev => [...prev.slice(-9), event]) // Keep last 10 updates
    },
    onProfileUpdate: (event) => {
      console.log('Profile update received:', event)
      setProfileUpdates(prev => [...prev.slice(-9), event]) // Keep last 10 updates
    },
    onError: (error) => {
      console.error('Real-time error:', error)
    },
    onConnectionChange: (connected) => {
      console.log('Connection status changed:', connected)
    }
  })

  React.useEffect(() => {
    // Subscribe based on user role
    const filters = {
      events: ['INSERT', 'UPDATE', 'DELETE'] as ('INSERT' | 'UPDATE' | 'DELETE')[],
      ...(userRole === 'parent' ? { parentId: userId } : { childId: userId })
    }

    realtimeChores.subscribe(filters)

    // Cleanup on unmount
    return () => {
      realtimeChores.unsubscribe()
    }
  }, [userId, userRole, realtimeChores])

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          Real-time Chore Updates ({userRole})
        </h2>
        <ConnectionStatus showDetails />
      </div>

      {realtimeChores.error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {realtimeChores.error}
          <button
            onClick={realtimeChores.retryConnection}
            className="ml-2 px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Chore Updates</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {choreUpdates.length === 0 ? (
              <p className="text-gray-500 text-sm">No updates yet</p>
            ) : (
              choreUpdates.map((update, index) => (
                <div key={index} className="p-2 bg-blue-50 rounded text-sm">
                  <div className="font-medium">{update.eventType}</div>
                  <div className="text-gray-600">
                    {update.new?.title || update.old?.title || 'Unknown chore'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Completion Updates</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {completionUpdates.length === 0 ? (
              <p className="text-gray-500 text-sm">No updates yet</p>
            ) : (
              completionUpdates.map((update, index) => (
                <div key={index} className="p-2 bg-green-50 rounded text-sm">
                  <div className="font-medium">{update.eventType}</div>
                  <div className="text-gray-600">
                    Status: {update.new?.status || update.old?.status || 'Unknown'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Profile Updates</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {profileUpdates.length === 0 ? (
              <p className="text-gray-500 text-sm">No updates yet</p>
            ) : (
              profileUpdates.map((update, index) => (
                <div key={index} className="p-2 bg-yellow-50 rounded text-sm">
                  <div className="font-medium">{update.eventType}</div>
                  <div className="text-gray-600">
                    Points: {update.new?.points || update.old?.points || 0}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>Connection Status: {realtimeChores.isConnected ? '🟢 Connected' : '🔴 Disconnected'}</p>
        {realtimeChores.lastUpdate && (
          <p>Last Update: {realtimeChores.lastUpdate.toLocaleTimeString()}</p>
        )}
      </div>
    </div>
  )
}