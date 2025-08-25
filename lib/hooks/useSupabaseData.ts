import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export function useDashboardStats(userId?: string, role?: string) {
  const [stats, setStats] = useState({
    totalChores: 0,
    completedChores: 0,
    totalPoints: 0,
    currentPoints: 0,
    pendingApprovals: 0,
    availableMissions: 0,
    completedToday: 0,
    totalChildren: 0,
    activeChores: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Mock data for now
    setStats({
      totalChores: 12,
      completedChores: 8,
      totalPoints: 450,
      currentPoints: 450,
      pendingApprovals: 3,
      availableMissions: 5,
      completedToday: 2,
      totalChildren: 2,
      activeChores: 4
    })
    setLoading(false)
    setError(null)
  }, [userId, role])

  return { stats, loading, error }
}

interface Child {
  id: string
  name: string
  rank: string
  points: number
  completedToday: number
}

export function useChildren(parentId?: string) {
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Mock data for now
    setChildren([
      {
        id: '1',
        name: 'Alex',
        rank: 'Private',
        points: 125,
        completedToday: 2
      },
      {
        id: '2',
        name: 'Sam',
        rank: 'Corporal',
        points: 275,
        completedToday: 1
      }
    ])
    setLoading(false)
    setError(null)
  }, [parentId])

  return { children, loading, error }
}

interface Mission {
  id: string
  title: string
  description: string
  points: number
  difficulty: 'easy' | 'medium' | 'hard'
}

export function useAvailableMissions(userId?: string) {
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Mock data for now
    setMissions([
      {
        id: '1',
        title: 'Clean Your Room',
        description: 'Make bed, organize toys, vacuum floor',
        points: 50,
        difficulty: 'easy'
      },
      {
        id: '2',
        title: 'Help with Dishes',
        description: 'Load dishwasher and wipe counters',
        points: 30,
        difficulty: 'easy'
      },
      {
        id: '3',
        title: 'Take Out Trash',
        description: 'Empty all trash cans and take to curb',
        points: 25,
        difficulty: 'easy'
      },
      {
        id: '4',
        title: 'Organize Bookshelf',
        description: 'Sort books by size and category',
        points: 40,
        difficulty: 'medium'
      }
    ])
    setLoading(false)
    setError(null)
  }, [userId])

  return { missions, loading, error }
}