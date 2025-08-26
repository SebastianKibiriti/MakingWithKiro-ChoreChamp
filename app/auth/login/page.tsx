'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../lib/auth-context'
import Link from 'next/link'
import LoadingSpinner from '../../../components/LoadingSpinner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { profile, session, loading: authLoading } = useAuth()

  // Handle redirection when auth state changes
  useEffect(() => {
    console.log('Auth state check:', { session: !!session, profile: !!profile, role: profile?.role })
    
    if (session && profile) {
      console.log('Auth state changed, redirecting user:', profile.role)
      // Redirect to the redirect page which will handle the final redirect
      window.location.href = '/auth/redirect'
    }
  }, [session, profile])

  const testConnection = useCallback(async () => {
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
  }, [])

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      console.log('Attempting to sign in...')
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Authentication error:', error)
        setError(error.message)
        setLoading(false)
        return
      }

      console.log('Login successful - auth context will handle redirect')
      // Don't set loading to false here - let the useEffect handle the redirect
    } catch (error: any) {
      console.error('Login error:', error)
      setError(`Login failed: ${error.message || 'Please check your connection and try again.'}`)
      setLoading(false)
    }
  }, [email, password])

  // Show loading while auth context is initializing or user is authenticated
  if (authLoading || (session && profile)) {
    return <LoadingSpinner message={authLoading ? "Loading..." : "Redirecting to your dashboard..."} />
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

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
                Sign up here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}