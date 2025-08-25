'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { Database } from '../../supabase'

type Profile = Database['public']['Tables']['profiles']['Row']
type Chore = Database['public']['Tables']['chores']['Row']
type ChoreCompletion = Database['public']['Tables']['chore_completions']['Row']

// Hook for fetching children profiles (for parents)
export function useChildren(parentId: string | undefined) {
  const [children, setChildren] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!parentId) {
      setLoading(false)
      return
    }

    async function fetchChildren() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('parent_id', parentId)
          .eq('role', 'child')

        if (error) {
          setError(error.message)
        } else {
          setChildren(data || [])
        }
      } catch (err) {
        setError('Failed to fetch children')
      } finally {
        setLoading(false)
      }
    }

    fetchChildren()
  }, [parentId])

  return { children, loading, error }
}

// Hook for fetching chores
export function useChores(parentId: string | undefined) {
  const [chores, setChores] = useState<Chore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!parentId) {
      setLoading(false)
      return
    }

    async function fetchChores() {
      try {
        const { data, error } = await supabase
          .from('chores')
          .select('*')
          .eq('parent_id', parentId)

        if (error) {
          setError(error.message)
        } else {
          setChores(data || [])
        }
      } catch (err) {
        setError('Failed to fetch chores')
      } finally {
        setLoading(false)
      }
    }

    fetchChores()
  }, [parentId])

  return { chores, loading, error }
}

// Hook for fetching pending approvals
export function usePendingApprovals(parentId: string | undefined) {
  const [approvals, setApprovals] = useState<(ChoreCompletion & { chore: Chore; child: Profile })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!parentId) {
      setLoading(false)
      return
    }

    async function fetchApprovals() {
      try {
        const { data, error } = await supabase
          .from('chore_completions')
          .select(`
            *,
            chore:chores(*),
            child:profiles(*)
          `)
          .eq('status', 'pending')
          .eq('chores.parent_id', parentId)

        if (error) {
          setError(error.message)
        } else {
          setApprovals(data || [])
        }
      } catch (err) {
        setError('Failed to fetch pending approvals')
      } finally {
        setLoading(false)
      }
    }

    fetchApprovals()
  }, [parentId])

  return { approvals, loading, error }
}

// Hook for fetching child's available chores/missions
export function useAvailableMissions(childId: string | undefined) {
  const [missions, setMissions] = useState<Chore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!childId) {
      setLoading(false)
      return
    }

    async function fetchMissions() {
      try {
        // Get chores that are either assigned to this child or unassigned
        const { data, error } = await supabase
          .from('chores')
          .select('*')
          .or(`assigned_to.eq.${childId},assigned_to.is.null`)

        if (error) {
          setError(error.message)
        } else {
          setMissions(data || [])
        }
      } catch (err) {
        setError('Failed to fetch missions')
      } finally {
        setLoading(false)
      }
    }

    fetchMissions()
  }, [childId])

  return { missions, loading, error }
}

// Hook for fetching dashboard stats
export function useDashboardStats(userId: string | undefined, role: 'parent' | 'child') {
  const [stats, setStats] = useState({
    totalChildren: 0,
    pendingApprovals: 0,
    completedToday: 0,
    activeChores: 0,
    availableMissions: 0,
    currentPoints: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    async function fetchStats() {
      try {
        if (role === 'parent') {
          // Fetch parent stats
          const [childrenRes, approvalsRes, choresRes] = await Promise.all([
            supabase.from('profiles').select('id').eq('parent_id', userId).eq('role', 'child'),
            supabase.from('chore_completions').select('id').eq('status', 'pending'),
            supabase.from('chores').select('id').eq('parent_id', userId)
          ])

          const today = new Date().toISOString().split('T')[0]
          const completedTodayRes = await supabase
            .from('chore_completions')
            .select('id')
            .eq('status', 'approved')
            .gte('approved_at', today)

          setStats({
            totalChildren: childrenRes.data?.length || 0,
            pendingApprovals: approvalsRes.data?.length || 0,
            completedToday: completedTodayRes.data?.length || 0,
            activeChores: choresRes.data?.length || 0,
            availableMissions: 0,
            currentPoints: 0
          })
        } else {
          // Fetch child stats
          const [missionsRes, profileRes] = await Promise.all([
            supabase.from('chores').select('id').or(`assigned_to.eq.${userId},assigned_to.is.null`),
            supabase.from('profiles').select('points').eq('id', userId).single()
          ])

          const today = new Date().toISOString().split('T')[0]
          const completedTodayRes = await supabase
            .from('chore_completions')
            .select('id')
            .eq('child_id', userId)
            .gte('completed_at', today)

          setStats({
            totalChildren: 0,
            pendingApprovals: 0,
            completedToday: completedTodayRes.data?.length || 0,
            activeChores: 0,
            availableMissions: missionsRes.data?.length || 0,
            currentPoints: profileRes.data?.points || 0
          })
        }
      } catch (err) {
        setError('Failed to fetch dashboard stats')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [userId, role])

  return { stats, loading, error }
}