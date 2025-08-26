'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface Profile {
  id: string
  email: string
  role: 'parent' | 'child'
  name: string
  parent_id?: string
  rank?: string
  points: number
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  signUp: (email: string, password: string, name: string, role: 'parent' | 'child', parentEmail?: string) => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        setProfile(null)
      } else {
        setProfile(data)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const signUp = useCallback(async (email: string, password: string, name: string, role: 'parent' | 'child', parentEmail?: string) => {
    try {
      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) {
        return { success: false, error: authError.message }
      }

      if (!authData.user) {
        return { success: false, error: 'Failed to create user account' }
      }

      // Handle child account creation
      if (role === 'child') {
        if (!parentEmail) {
          return { success: false, error: 'Parent email is required for child accounts' }
        }

        // Find parent by email
        const { data: parentData, error: parentError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', parentEmail)
          .eq('role', 'parent')
          .single()

        if (parentError || !parentData) {
          return { success: false, error: 'Parent account not found. Please check the parent email address.' }
        }

        // Create child profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: authData.user.email!,
            role: 'child',
            name,
            parent_id: parentData.id,
            points: 0,
          })

        if (profileError) {
          return { success: false, error: 'Failed to create user profile. Please try again.' }
        }
      } else {
        // Create parent profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: authData.user.email!,
            role: 'parent',
            name,
            points: 0,
          })

        if (profileError) {
          return { success: false, error: 'Failed to create user profile. Please try again.' }
        }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message || 'Sign up failed. Please try again.' }
    }
  }, [])

  const contextValue = useMemo(() => ({
    user,
    session,
    profile,
    loading,
    signOut,
    signUp
  }), [user, session, profile, loading, signOut, signUp])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}