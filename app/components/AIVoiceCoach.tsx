'use client'

import { useState } from 'react'
import { Mic, Volume2, Bot } from 'lucide-react'

interface AIVoiceCoachProps {
  profile: any
}

const VOICE_CHARACTERS = [
  { id: 'superhero', name: 'Superhero', icon: '🦸‍♂️' },
  { id: 'robot', name: 'Robot', icon: '🤖' },
  { id: 'wizard', name: 'Wizard', icon: '🧙‍♂️' },
  { id: 'pirate', name: 'Pirate', icon: '🏴‍☠️' }
]

const ENCOURAGEMENT_MESSAGES = [
  "Great job on completing your missions! You're becoming a true Chore Champion!",
  "I'm proud of how responsible you're being. Keep up the excellent work!",
  "You're making amazing progress! Your family is lucky to have such a helpful member.",
  "Every chore you complete makes you stronger and more capable. You're doing fantastic!",
  "I can see you're working hard to reach the next rank. You're almost there!"
]

export default function AIVoiceCoach({ profile }: AIVoiceCoachProps) {
  const [selectedVoice, setSelectedVoice] = useState('superhero')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentMessage, setCurrentMessage] = useState('')

  const playEncouragement = () => {
    const randomMessage = ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)]
    setCurrentMessage(randomMessage)
    setIsPlaying(true)

    // Simulate text-to-speech (in a real app, you'd integrate with a TTS service)
    setTimeout(() => {
      setIsPlaying(false)
    }, 3000)
  }

  const selectedCharacter = VOICE_CHARACTERS.find(char => char.id === selectedVoice) || VOICE_CHARACTERS[0]

  return (
    <div className="card bg-gradient-to-r from-blue-50 to-purple-50">
      <div className="flex items-center mb-4">
        <Bot className="w-6 h-6 text-blue-600 mr-2" />
        <h2 className="text-xl font-semibold">AI Voice Coach</h2>
      </div>

      <div className="space-y-4">
        {/* Voice Character Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Choose your coach:
          </label>
          <div className="flex space-x-2">
            {VOICE_CHARACTERS.map((character) => (
              <button
                key={character.id}
                onClick={() => setSelectedVoice(character.id)}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  selectedVoice === character.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">{character.icon}</div>
                <div className="text-xs font-medium">{character.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Current Coach Display */}
        <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
          <div className="flex items-center">
            <div className="text-3xl mr-3">{selectedCharacter.icon}</div>
            <div>
              <p className="font-semibold">{selectedCharacter.name} Coach</p>
              <p className="text-sm text-gray-600">Ready to encourage you!</p>
            </div>
          </div>
          
          <button
            onClick={playEncouragement}
            disabled={isPlaying}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              isPlaying
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isPlaying ? (
              <>
                <Volume2 className="w-4 h-4 mr-2 animate-pulse" />
                Speaking...
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Get Encouragement
              </>
            )}
          </button>
        </div>

        {/* Message Display */}
        {currentMessage && (
          <div className="p-4 bg-blue-100 rounded-lg border-l-4 border-blue-500">
            <div className="flex items-start">
              <div className="text-2xl mr-3">{selectedCharacter.icon}</div>
              <div>
                <p className="font-medium text-blue-800 mb-1">{selectedCharacter.name} says:</p>
                <p className="text-blue-700">{currentMessage}</p>
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 text-center">
          💡 Tip: Your AI coach can provide personalized encouragement and help you stay motivated!
        </div>
      </div>
    </div>
  )
}