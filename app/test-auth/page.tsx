'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth-context'

export default function TestAuthPage() {
  const [testResult, setTestResult] = useState<string>('')
  const { user, profile, session, loading } = useAuth()

  const runTests = async () => {
    setTestResult('Running tests...\n')
    
    try {
      // Test 1: Basic connection
      setTestResult(prev => prev + '1. Testing basic connection...\n')
      const { data: connectionTest, error: connectionError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)
      
      if (connectionError) {
        setTestResult(prev => prev + `❌ Connection failed: ${connectionError.message}\n`)
        return
      } else {
        setTestResult(prev => prev + '✅ Connection successful\n')
      }

      // Test 2: Auth state
      setTestResult(prev => prev + '\n2. Checking auth state...\n')
      setTestResult(prev => prev + `Session: ${session ? '✅ Active' : '❌ None'}\n`)
      setTestResult(prev => prev + `User: ${user ? '✅ ' + user.email : '❌ None'}\n`)
      setTestResult(prev => prev + `Profile: ${profile ? '✅ ' + profile.name + ' (' + profile.role + ')' : '❌ None'}\n`)
      setTestResult(prev => prev + `Loading: ${loading ? 'Yes' : 'No'}\n`)

      // Test 3: Manual session check
      setTestResult(prev => prev + '\n3. Manual session check...\n')
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        setTestResult(prev => prev + `❌ Session error: ${sessionError.message}\n`)
      } else if (sessionData.session) {
        setTestResult(prev => prev + `✅ Session found: ${sessionData.session.user.email}\n`)
        
        // Test 4: Manual profile fetch
        setTestResult(prev => prev + '\n4. Manual profile fetch...\n')
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionData.session.user.id)
          .single()
        
        if (profileError) {
          setTestResult(prev => prev + `❌ Profile error: ${profileError.message}\n`)
        } else {
          setTestResult(prev => prev + `✅ Profile found: ${profileData.name} (${profileData.role})\n`)
        }
      } else {
        setTestResult(prev => prev + '❌ No active session\n')
      }

    } catch (error: any) {
      setTestResult(prev => prev + `❌ Test failed: ${error.message}\n`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Authentication Test Page</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Current Auth State</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
            <p><strong>Session:</strong> {session ? 'Active' : 'None'}</p>
            <p><strong>User:</strong> {user ? user.email : 'None'}</p>
            <p><strong>Profile:</strong> {profile ? `${profile.name} (${profile.role})` : 'None'}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <button
            onClick={runTests}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 mb-4"
          >
            Run Authentication Tests
          </button>
          
          {testResult && (
            <div className="bg-gray-100 p-4 rounded-md">
              <pre className="text-sm whitespace-pre-wrap">{testResult}</pre>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Environment Check</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set'}</p>
            <p><strong>Supabase Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? 'Set' : 'Not set'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}