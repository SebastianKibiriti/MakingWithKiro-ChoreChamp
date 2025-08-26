'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'

interface Chore {
  id: string
  title: string
  description: string
  points: number
  assigned_to?: string
  recurring: boolean
  created_at: string
}

interface Child {
  id: string
  name: string
  rank: string
  points: number
}

export default function ChoreManager() {
  const { profile } = useAuth()
  const [chores, setChores] = useState<Chore[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newChore, setNewChore] = useState({
    title: '',
    description: '',
    points: 10,
    assigned_to: '',
    recurring: false
  })

  useEffect(() => {
    if (profile?.role === 'parent') {
      fetchChores()
      fetchChildren()
    }
  }, [profile])

  const fetchChores = async () => {
    try {
      const { data, error } = await supabase
        .from('chores')
        .select('*')
        .eq('parent_id', profile?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setChores(data || [])
    } catch (error) {
      console.error('Error fetching chores:', error)
    }
  }

  const fetchChildren = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('parent_id', profile?.id)
        .eq('role', 'child')

      if (error) throw error
      setChildren(data || [])
    } catch (error) {
      console.error('Error fetching children:', error)
    } finally {
      setLoading(false)
    }
  }

  const createChore = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const choreData = {
        ...newChore,
        parent_id: profile?.id,
        assigned_to: newChore.assigned_to || null
      }

      const { error } = await supabase
        .from('chores')
        .insert([choreData])

      if (error) throw error

      // Reset form and refresh chores
      setNewChore({
        title: '',
        description: '',
        points: 10,
        assigned_to: '',
        recurring: false
      })
      setShowCreateForm(false)
      fetchChores()
    } catch (error) {
      console.error('Error creating chore:', error)
    }
  }

  const deleteChore = async (choreId: string) => {
    try {
      const { error } = await supabase
        .from('chores')
        .delete()
        .eq('id', choreId)

      if (error) throw error
      fetchChores()
    } catch (error) {
      console.error('Error deleting chore:', error)
    }
  }

  if (loading) {
    return <div className="animate-pulse">Loading chores...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Chore Management</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          {showCreateForm ? 'Cancel' : 'Create New Chore'}
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium mb-4">Create New Chore</h3>
          <form onSubmit={createChore} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={newChore.title}
                onChange={(e) => setNewChore({ ...newChore, title: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={newChore.description}
                onChange={(e) => setNewChore({ ...newChore, description: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500"
                rows={3}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Points</label>
              <input
                type="number"
                value={newChore.points}
                onChange={(e) => setNewChore({ ...newChore, points: parseInt(e.target.value) })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Assign to Child (Optional)</label>
              <select
                value={newChore.assigned_to}
                onChange={(e) => setNewChore({ ...newChore, assigned_to: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Unassigned (any child can do it)</option>
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={newChore.recurring}
                onChange={(e) => setNewChore({ ...newChore, recurring: e.target.checked })}
                className="mr-2"
              />
              <label className="text-sm text-gray-700">Recurring chore</label>
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Create Chore
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium">Active Chores ({chores.length})</h3>
        </div>
        <div className="p-6">
          {chores.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No chores created yet. Create your first chore to get started!
            </p>
          ) : (
            <div className="space-y-4">
              {chores.map((chore) => {
                const assignedChild = children.find(c => c.id === chore.assigned_to)
                return (
                  <div key={chore.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{chore.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{chore.description}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span>⭐ {chore.points} points</span>
                          <span>
                            👤 {assignedChild ? assignedChild.name : 'Unassigned'}
                          </span>
                          {chore.recurring && <span>🔄 Recurring</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteChore(chore.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}