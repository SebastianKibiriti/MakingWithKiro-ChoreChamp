'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../supabase'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../lib/auth-context'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { profile, session } = useAuth()

  // Handle redirection when auth state changes
  useEffect(() => {
    if (session && profile) {
      console.log('Auth state changed, redirecting user:', profile.role)
      if (profile.role === 'parent') {
        router.replace('/parent/dashboard')
      } else if (profile.role === 'child') {
        router.replace('/child/dashboard')
      }
    }
  }, [session, profile, router])

  const testConnection = async () => {
    setError(null)
    try {
      console.log('Testing Supabase connection...')
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      
      const { data, error } = await supabase.from('profiles').select('count').limit(1)
      
      if (error) {
        setError(`❌ Connection test failed: ${error.message}`)
        console.error('Connection test error:', error)
      } else {
        setError('✅ Connection successful! You can now try logging in.')
        console.log('Connection test successful:', data)
      }
    } catch (err: any) {
      setError(`❌ Connection test failed: ${err.message}`)
      console.error('Connection test error:', err)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      console.log('Attempting to sign in...')
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Authentication error:', error)
        setError(error.message)
        return
      }

      if (data.user) {
        console.log('User authenticated successfully:', data.user.id)
        
        // Fetch user profile to determine role for redirection
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()

        if (profileError) {
          console.error('Profile fetch error:', profileError)
          setError('Error fetching user profile. Please try again.')
          return
        }

        console.log('User profile loaded:', profile)
        
        // Direct redirection - don't wait for auth context
        console.log('Login successful, redirecting immediately...')
        if (profile.role === 'parent') {
          console.log('Redirecting to parent dashboard')
          window.location.href = '/parent/dashboard'
        } else if (profile.role === 'child') {
          console.log('Redirecting to child dashboard')
          window.location.href = '/child/dashboard'
        } else {
          console.error('Unknown role:', profile.role)
          setError('Invalid user role. Please contact support.')
        }
      }
    } catch (error: any) {
      console.error('Login error:', error)
      setError(`Login failed: ${error.message || 'Please check your connection and try again.'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to Chore Champion
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={testConnection}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Test Connection
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}