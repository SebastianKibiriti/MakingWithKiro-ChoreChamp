'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Shield, Star } from 'lucide-react'

export default function ChildLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
      
      // Check if user is a child
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()
      
      if (profile?.role !== 'child') {
        alert('This login is for children only. Parents should use the main login.')
        await supabase.auth.signOut()
        return
      }
      
      window.location.href = '/dashboard'
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center mb-4">
            <Star className="w-12 h-12 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-blue-800">Mission Hub</h1>
          </div>
          <p className="text-xl text-blue-600 max-w-2xl mx-auto">
            Welcome back, Chore Champion! Ready for your next mission?
          </p>
        </div>

        {/* Fun Graphics */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎖️</div>
          <p className="text-lg text-gray-600">Enter your credentials to access your missions!</p>
        </div>

        {/* Login Form */}
        <div className="max-w-md mx-auto">
          <div className="card bg-white">
            <h2 className="text-2xl font-bold text-center mb-6 text-blue-800">
              Child Login
            </h2>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your password"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-colors disabled:opacity-50"
              >
                {loading ? 'Logging in...' : '🚀 Enter Mission Hub'}
              </button>
            </form>
            
            <div className="text-center mt-6">
              <a
                href="/"
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                ← Back to main page
              </a>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="max-w-md mx-auto mt-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">Need Help?</h3>
            <p className="text-sm text-yellow-700">
              Ask your parent for your email and password. They created your account when they added you to Chore Champion!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}