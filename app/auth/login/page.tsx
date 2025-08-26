'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../lib/auth-context'
import Link from 'next/link'
import LoadingSpinner from '../../../components/LoadingSpinner'

export default function LoginPage() {
  const [step, setStep] = useState<'role' | 'login'>('role')
  const [selectedRole, setSelectedRole] = useState<'parent' | 'child' | null>(null)
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

  const handleRoleSelection = (role: 'parent' | 'child') => {
    setSelectedRole(role)
    setStep('login')
    setError(null)
  }

  const handleBackToRoleSelection = () => {
    setStep('role')
    setSelectedRole(null)
    setEmail('')
    setPassword('')
    setError(null)
  }



  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      console.log('Attempting to sign in as:', selectedRole)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Authentication error:', error)
        setError(error.message)
        setLoading(false)
        return
      }

      // Verify the user's role matches the selected role
      if (data.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()

        if (profileError) {
          console.error('Profile fetch error:', profileError)
          setError('Failed to verify account. Please try again.')
          setLoading(false)
          return
        }

        if (profileData.role !== selectedRole) {
          setError(`This account is registered as a ${profileData.role}, but you selected ${selectedRole}. Please choose the correct role or use a different account.`)
          await supabase.auth.signOut()
          setLoading(false)
          return
        }
      }

      console.log('Login successful - auth context will handle redirect')
      // Don't set loading to false here - let the useEffect handle the redirect
    } catch (error: any) {
      console.error('Login error:', error)
      setError(`Login failed: ${error.message || 'Please check your connection and try again.'}`)
      setLoading(false)
    }
  }, [email, password, selectedRole])

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
            {step === 'role' ? 'Choose your role to continue' : `Sign in as ${selectedRole}`}
          </p>
        </div>

        {step === 'role' ? (
          // Role Selection Step
          <div className="mt-8 space-y-6">
            <div className="space-y-4">
              <button
                onClick={() => handleRoleSelection('parent')}
                className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-lg font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <span className="mr-3">👨‍👩‍👧‍👦</span>
                I am a Parent
              </button>
              
              <button
                onClick={() => handleRoleSelection('child')}
                className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-lg font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                <span className="mr-3">🧒</span>
                I am a Child
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
          </div>
        ) : (
          // Login Form Step
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={handleBackToRoleSelection}
                className="text-sm text-indigo-600 hover:text-indigo-500 flex items-center"
              >
                ← Back to role selection
              </button>
              <div className="flex items-center">
                <span className="text-2xl mr-2">{selectedRole === 'parent' ? '👨‍👩‍👧‍👦' : '🧒'}</span>
                <span className="text-sm font-medium text-gray-700 capitalize">{selectedRole}</span>
              </div>
            </div>

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
              <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">{error}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                  selectedRole === 'parent' 
                    ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500' 
                    : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                }`}
              >
                {loading ? 'Signing in...' : `Sign in as ${selectedRole}`}
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
        )}
      </div>
    </div>
  )
}