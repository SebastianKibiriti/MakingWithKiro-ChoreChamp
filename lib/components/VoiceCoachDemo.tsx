'use client'

import React, { useState } from 'react'
import VoiceCoach from './VoiceCoach'
import { VOICE_CHARACTERS } from '../lib/services/gemini'

/**
 * Demo component to showcase the VoiceCoach functionality
 * This can be used for testing and demonstration purposes
 */
export default function VoiceCoachDemo() {
  const [isEnabled, setIsEnabled] = useState(true)
  const [selectedCharacter, setSelectedCharacter] = useState('friendly-guide')
  const [interactions, setInteractions] = useState<any[]>([])

  const handleInteractionComplete = (interaction: any) => {
    setInteractions(prev => [...prev, interaction])
    console.log('Voice interaction completed:', interaction)
  }

  const handleError = (error: string) => {
    console.error('Voice coach error:', error)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AI Voice Coach Demo
        </h1>
        <p className="text-gray-600">
          Test the voice coach functionality with different characters and settings
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Settings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Enable/Disable Toggle */}
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Enable Voice Coach
              </span>
            </label>
          </div>

          {/* Character Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Voice Character
            </label>
            <select
              value={selectedCharacter}
              onChange={(e) => setSelectedCharacter(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              {Object.values(VOICE_CHARACTERS).map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name} - {character.personality.substring(0, 50)}...
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Voice Coach Component */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-center">Voice Coach</h2>
        <VoiceCoach
          userId="demo-user-123"
          isEnabled={isEnabled}
          selectedCharacter={selectedCharacter}
          onInteractionComplete={handleInteractionComplete}
          onError={handleError}
          className="max-w-md mx-auto"
        />
      </div>

      {/* Interaction History */}
      {interactions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Interaction History</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {interactions.map((interaction, index) => (
              <div key={index} className="border-l-4 border-indigo-500 pl-4 py-2">
                <div className="text-sm text-gray-500 mb-1">
                  {new Date(interaction.timestamp).toLocaleTimeString()} - {interaction.character}
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium text-blue-600">You:</span>
                    <span className="ml-2 text-gray-800">{interaction.userInput}</span>
                  </div>
                  <div>
                    <span className="font-medium text-green-600">Coach:</span>
                    <span className="ml-2 text-gray-800">{interaction.aiResponse}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Duration: {interaction.duration}s
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-blue-900">How to Use</h2>
        <div className="space-y-2 text-blue-800">
          <p>1. Make sure your microphone is connected and working</p>
          <p>2. Click the microphone button to start listening</p>
          <p>3. Speak clearly about your chores or ask for encouragement</p>
          <p>4. The AI coach will respond with personalized guidance</p>
          <p>5. Try different voice characters to see how they respond differently</p>
        </div>
      </div>

      {/* Technical Info */}
      <div className="bg-gray-100 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Technical Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Speech-to-Text</h3>
            <p className="text-gray-600">AssemblyAI real-time transcription</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-700 mb-2">AI Processing</h3>
            <p className="text-gray-600">Google Gemini for contextual responses</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Text-to-Speech</h3>
            <p className="text-gray-600">ElevenLabs for natural voice synthesis</p>
          </div>
        </div>
      </div>
    </div>
  )
}