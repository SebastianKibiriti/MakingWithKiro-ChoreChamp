'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Shield, Users, Trophy, Star } from 'lucide-react'

export default function HomePage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              role: 'parent'
            }
          }
        })
        if (error) throw error
        
        // Manually create profile if trigger fails
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email,
              name,
              role: 'parent',
              points: 0,
              rank: 'recruit-rascal'
            })
          
          if (profileError) {
            console.error('Profile creation error:', profileError)
          }
        }
        
        alert('Check your email for the confirmation link!')
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        if (error) throw error
        window.location.href = '/dashboard'
      }
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-army-50 to-army-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center mb-4">
            <Shield className="w-12 h-12 text-army-600 mr-3" />
            <h1 className="text-4xl font-bold text-army-800">Chore Champion</h1>
          </div>
          <p className="text-xl text-army-600 max-w-2xl mx-auto">
            Transform household chores into exciting missions for your family
          </p>
        </div> 
       {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="card text-center">
            <Users className="w-12 h-12 text-army-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Dual Dashboard</h3>
            <p className="text-gray-600">Separate interfaces for parents and children, tailored to their needs</p>
          </div>
          <div className="card text-center">
            <Trophy className="w-12 h-12 text-army-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Army Ranks</h3>
            <p className="text-gray-600">Progress through 9 unique ranks as you complete more chores</p>
          </div>
          <div className="card text-center">
            <Star className="w-12 h-12 text-army-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">AI Voice Coach</h3>
            <p className="text-gray-600">Personalized encouragement and guidance from AI companions</p>
          </div>
        </div>

        {/* Auth Form */}
        <div className="max-w-md mx-auto">
          <div className="card">
            <h2 className="text-2xl font-bold text-center mb-6">
              {isSignUp ? 'Join Chore Champion' : 'Welcome Back'}
            </h2>
            
            <form onSubmit={handleAuth} className="space-y-4">
              {isSignUp && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-army-500"
                    required
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-army-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-army-500"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50"
              >
                {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
              </button>
            </form>
            
            <div className="text-center mt-4 space-y-2">
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-army-600 hover:text-army-700 text-sm block w-full"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
              
              <div className="border-t pt-3">
                <p className="text-xs text-gray-500 mb-2">Are you a child?</p>
                <a
                  href="/child-login"
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <Star className="w-4 h-4 mr-1" />
                  Go to Mission Hub
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}