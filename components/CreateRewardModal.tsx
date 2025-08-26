'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X } from 'lucide-react'
import { ARMY_RANKS } from '@/lib/ranks'

interface CreateRewardModalProps {
  parentId: string
  onClose: () => void
  onSuccess: () => void
}

export default function CreateRewardModal({ parentId, onClose, onSuccess }: CreateRewardModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [pointsRequired, setPointsRequired] = useState(50)
  const [rankRequired, setRankRequired] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('rewards')
        .insert({
          title,
          description,
          points_required: pointsRequired,
          parent_id: parentId,
          rank_required: rankRequired || null
        })

      if (error) throw error

      onSuccess()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Create New Reward</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reward Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-army-500 text-gray-900"
              placeholder="e.g., Extra screen time"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-army-500 text-gray-900"
              rows={3}
              placeholder="Details about the reward"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Points Required
            </label>
            <input
              type="number"
              value={pointsRequired}
              onChange={(e) => setPointsRequired(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-army-500 text-gray-900"
              min={1}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Rank Required (optional)
            </label>
            <select
              value={rankRequired}
              onChange={(e) => setRankRequired(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-army-500 text-gray-900"
            >
              <option value="">No rank requirement</option>
              {ARMY_RANKS.map((rank) => (
                <option key={rank.name} value={rank.name}>
                  {rank.icon} {rank.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Reward'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}