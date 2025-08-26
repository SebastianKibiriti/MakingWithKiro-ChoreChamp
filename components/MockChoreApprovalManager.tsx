'use client'

import { useState, useEffect } from 'react'
import { getCompletions, approveCompletion, rejectCompletion, subscribe } from '../lib/mock-data-store'

interface MockChoreCompletion {
  id: string
  chore_id: string
  child_name: string
  status: 'pending' | 'approved' | 'rejected'
  completed_at: string
  chore: {
    title: string
    description: string
    points: number
  }
}

const mockCompletions: MockChoreCompletion[] = [
  {
    id: '1',
    chore_id: 'chore-1',
    child_name: 'Alex',
    status: 'pending',
    completed_at: new Date().toISOString(),
    chore: {
      title: 'Clean Kitchen',
      description: 'Wipe counters and load dishwasher',
      points: 25
    }
  },
  {
    id: '2',
    chore_id: 'chore-2',
    child_name: 'Sam',
    status: 'pending',
    completed_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    chore: {
      title: 'Feed the Dog',
      description: 'Fill food and water bowls',
      points: 10
    }
  },
  {
    id: '3',
    chore_id: 'chore-3',
    child_name: 'Alex',
    status: 'pending',
    completed_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    chore: {
      title: 'Take Out Trash',
      description: 'Empty all trash cans and take to curb',
      points: 15
    }
  }
]

export default function MockChoreApprovalManager() {
  const [completions, setCompletions] = useState(
    getCompletions().filter(c => c.status === 'pending')
  )

  useEffect(() => {
    // Subscribe to data changes
    const unsubscribe = subscribe(() => {
      setCompletions(getCompletions().filter(c => c.status === 'pending'))
    })
    
    return unsubscribe
  }, [])

  const handleApproval = (completionId: string, status: 'approved' | 'rejected') => {
    if (status === 'approved') {
      approveCompletion(completionId)
    } else {
      rejectCompletion(completionId)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">
        Pending Approvals ({completions.length}) - Mock Mode
      </h2>

      {completions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No pending chore completions to review.</p>
          <p className="text-sm text-gray-400 mt-2">
            In mock mode - try refreshing to see sample completions again
          </p>
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
                    <span>👤 {completion.child_name}</span>
                    <span>⭐ {completion.chore.points} points</span>
                    <span>🕒 {new Date(completion.completed_at).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleApproval(completion.id, 'approved')}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => handleApproval(completion.id, 'rejected')}
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
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 text-sm">
          <strong>Mock Mode:</strong> This is a demonstration interface. In the real app, approvals would:
        </p>
        <ul className="text-blue-700 text-sm mt-2 ml-4 list-disc">
          <li>Update the child's points in real-time</li>
          <li>Send notifications to the child's dashboard</li>
          <li>Update completion status in the database</li>
          <li>Sync across all connected devices</li>
        </ul>
      </div>
    </div>
  )
}