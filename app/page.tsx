'use client'

import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  const goToLogin = () => {
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Chore Champion
          </h1>
          <p className="text-gray-600 mb-8">
            Please log in to access your dashboard
          </p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={goToLogin}
            className="w-full flex justify-center py-4 px-6 border border-transparent text-lg font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            🔐 Login to Access Your Dashboard
          </button>
        </div>
        
        <div className="text-center text-sm text-gray-500">
          <p>New to Chore Champion? <a href="/auth/signup" className="text-indigo-600 hover:text-indigo-500">Sign up here</a></p>
        </div>
      </div>
    </div>
  )
}