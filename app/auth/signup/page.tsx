'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../lib/auth-context'
import Link from 'next/link'
import LoadingSpinner from '../../../components/LoadingSpinner'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'parent' | 'child'>('parent')
  const [parentEmail, setParentEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()
  const { session, profile } = useAuth()

  // Redirect if already authenticated
  useEffect(() => {
    if (session && profile) {
      if (profile.role === 'parent') {
        router.replace('/parent/dashboard')
      } else if (profile.role === 'child') {
        router.replace('/child/dashboard')
      }
    }
  }, [session, profile, router])

  // Prevent rendering signup form if user is already authenticated
  if (session && profile) {
    return <LoadingSpinner message="Redirecting to your dashboard..." />
  }

  const handleSignUp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    if (role === 'child' && !parentEmail) {
      setError('Parent email is required for child accounts')
      setLoading(false)
      return
    }

    try {
      console.log('Creating new user account...')
      
      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) {
        console.error('Sign up error:', authError)
        setError(authError.message)
        return
      }

      if (!authData.user) {
        setError('Failed to create user account')
        return
      }

      console.log('User account created:', authData.user.id)

      // Handle child account creation
      if (role === 'child') {
        // Find parent by email
        const { data: parentData, error: parentError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', parentEmail)
          .eq('role', 'parent')
          .single()

        if (parentError || !parentData) {
          console.error('Parent not found:', parentError)
          setError('Parent account not found. Please check the parent email address.')
          return
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
          console.error('Profile creation error:', profileError)
          setError('Failed to create user profile. Please try again.')
          return
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
          console.error('Profile creation error:', profileError)
          setError('Failed to create user profile. Please try again.')
          return
        }
      }

      console.log('Profile created successfully')
      setSuccess('Account created successfully! Please check your email to verify your account, then sign in.')
      
      // Clear form
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setName('')
      setParentEmail('')
      
    } catch (error: any) {
      console.error('Sign up error:', error)
      setError(`Sign up failed: ${error.message || 'Please try again.'}`)
    } finally {
      setLoading(false)
    }
  }, [email, password, confirmPassword, name, role, parentEmail])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Join Chore Champion
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create your account to get started
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Type
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="role"
                  value="parent"
                  checked={role === 'parent'}
                  onChange={(e) => setRole(e.target.value as 'parent' | 'child')}
                  className="mr-2"
                />
                Parent
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="role"
                  value="child"
                  checked={role === 'child'}
                  onChange={(e) => setRole(e.target.value as 'parent' | 'child')}
                  className="mr-2"
                />
                Child
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {role === 'child' && (
              <div>
                <label htmlFor="parentEmail" className="block text-sm font-medium text-gray-700">
                  Parent's Email Address
                </label>
                <input
                  id="parentEmail"
                  name="parentEmail"
                  type="email"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter your parent's email address"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Your parent must already have an account
                </p>
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Create a password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="text-green-600 text-sm text-center bg-green-50 p-3 rounded-md">
              {success}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                Sign in here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}