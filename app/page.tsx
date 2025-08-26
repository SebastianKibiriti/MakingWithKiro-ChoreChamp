'use client'

import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  const goToParentDashboard = () => {
    router.push('/parent/dashboard')
  }

  const goToChildDashboard = () => {
    router.push('/child/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Chore Champion
          </h1>
          <p className="text-gray-600 mb-8">
            Choose your dashboard (Auth disabled for testing)
          </p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={goToParentDashboard}
            className="w-full flex justify-center py-4 px-6 border border-transparent text-lg font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            🏠 Parent Dashboard
          </button>
          
          <button
            onClick={goToChildDashboard}
            className="w-full flex justify-center py-4 px-6 border border-transparent text-lg font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
          >
            🎮 Child Dashboard
          </button>
        </div>
        
        <div className="text-center text-sm text-gray-500">
          <p>Click either button to access the respective dashboard</p>
        </div>
      </div>
    </div>
  )
}