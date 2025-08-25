import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export function useDashboardStats() {
  const [stats, setStats] = useState({
    totalChores: 0,
    completedChores: 0,
    totalPoints: 0,
    pendingApprovals: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data for now
    setStats({
      totalChores: 12,
      completedChores: 8,
      totalPoints: 450,
      pendingApprovals: 3
    })
    setLoading(false)
  }, [])

  return { stats, loading }
}

export function useChildren() {
  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data for now
    setChildren([])
    setLoading(false)
  }, [])

  return { children, loading }
}

export function useAvailableMissions() {
  const [missions, setMissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data for now
    setMissions([])
    setLoading(false)
  }, [])

  return { missions, loading }
}