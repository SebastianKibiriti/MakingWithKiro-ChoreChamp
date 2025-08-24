'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { 
  MicrophoneIcon, 
  StopIcon, 
  SpeakerWaveIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import { AssemblyAIService, TranscriptionResult } from '../lib/services/assemblyai'
import { GeminiService, VoiceCharacter, VOICE_CHARACTERS } from '../lib/services/gemini'
import { ElevenLabsService, AudioResult } from '../lib/services/elevenlabs'
import { ConversationManager, getConversationManager } from '../lib/conversation-manager'
import { getVoiceCoachConfig } from '../lib/env-validation'

// Voice Coach States
type VoiceCoachState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error'

// Props interface
export interface VoiceCoachProps {
  userId: string
  isEnabled: boolean
  selectedCharacter?: string
  onInteractionComplete?: (interaction: VoiceInteraction) => void
  onError?: (error: string) => void
  className?: string
}

// Voice interaction interface
interface VoiceInteraction {
  id: string
  timestamp: Date
  userInput: string
  aiResponse: string
  character: string
  duration: number
}

// Error types
type VoiceCoachError = 'microphone' | 'network' | 'service' | 'permission' | 'unknown'

interface ErrorState {
  type: VoiceCoachError
  message: string
  canRetry: boolean
}

/**
 * Main Voice Coach Component
 * Provides interactive voice conversation with AI coach
 */
export default function VoiceCoach({
  userId,
  isEnabled,
  selectedCharacter = 'friendly-guide',
  onInteractionComplete,
  onError,
  className = ''
}: VoiceCoachProps) {
  // State management
  const [state, setState] = useState<VoiceCoachState>('idle')
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [lastResponse, setLastResponse] = useState('')
  const [error, setError] = useState<ErrorState | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [hasPermission, setHasPermission] = useState(false)

  // Service instances
  const assemblyAIRef = useRef<AssemblyAIService | null>(null)
  const geminiServiceRef = useRef<GeminiService | null>(null)
  const elevenLabsRef = useRef<ElevenLabsService | null>(null)
  const conversationManagerRef = useRef<ConversationManager | null>(null)
  const currentSessionRef = useRef<string | null>(null)

  // Audio visualization
  const [audioLevel, setAudioLevel] = useState(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Get current character
  const currentCharacter = VOICE_CHARACTERS[selectedCharacter] || VOICE_CHARACTERS['friendly-guide']

  /**
   * Initialize services and check permissions
   */
  const initializeServices = useCallback(async () => {
    if (isInitialized) return

    try {
      const config = getVoiceCoachConfig()

      // Initialize services
      assemblyAIRef.current = new AssemblyAIService({
        apiKey: config.assemblyAIApiKey,
        sampleRate: config.assemblyAISampleRate
      })

      geminiServiceRef.current = new GeminiService()
      elevenLabsRef.current = new ElevenLabsService()
      conversationManagerRef.current = getConversationManager(geminiServiceRef.current)

      // Check microphone permission
      const hasPermission = await assemblyAIRef.current.requestMicrophonePermission()
      setHasPermission(hasPermission)

      if (!hasPermission) {
        setError({
          type: 'permission',
          message: 'Microphone access is required for voice chat. Please allow microphone access and try again.',
          canRetry: true
        })
        return
      }

      // Preload character voices
      await elevenLabsRef.current.preloadCharacterVoices([currentCharacter])

      setIsInitialized(true)
      setError(null)

    } catch (err) {
      console.error('Failed to initialize voice coach services:', err)
      setError({
        type: 'service',
        message: 'Failed to initialize voice services. Please try again.',
        canRetry: true
      })
    }
  }, [isInitialized, currentCharacter])

  /**
   * Start listening for user input
   */
  const startListening = useCallback(async () => {
    if (!isInitialized || !assemblyAIRef.current || state !== 'idle') return

    try {
      setState('listening')
      setCurrentTranscript('')
      setError(null)

      // Set up transcription callbacks
      assemblyAIRef.current.onTranscriptionResult((result: TranscriptionResult) => {
        setCurrentTranscript(result.text)
        
        // If we have a final result with meaningful content, process it
        if (result.isFinal && result.text.trim().length > 0) {
          processUserInput(result.text.trim())
        }
      })

      assemblyAIRef.current.onError((error: Error) => {
        console.error('Transcription error:', error)
        setError({
          type: 'service',
          message: 'Speech recognition failed. Please try again.',
          canRetry: true
        })
        setState('idle')
      })

      // Start transcription
      await assemblyAIRef.current.startRealTimeTranscription()
      
      // Start audio visualization
      startAudioVisualization()

    } catch (err) {
      console.error('Failed to start listening:', err)
      setError({
        type: 'microphone',
        message: 'Could not start listening. Please check your microphone.',
        canRetry: true
      })
      setState('idle')
    }
  }, [isInitialized, state])

  /**
   * Stop listening
   */
  const stopListening = useCallback(() => {
    try {
      if (assemblyAIRef.current && typeof assemblyAIRef.current.stopTranscription === 'function') {
        assemblyAIRef.current.stopTranscription()
      }
      stopAudioVisualization()
      
      if (state === 'listening') {
        setState('idle')
      }
    } catch (error) {
      console.warn('Error stopping transcription:', error)
    }
  }, [state])

  /**
   * Process user input and generate AI response
   */
  const processUserInput = useCallback(async (userInput: string) => {
    if (!conversationManagerRef.current || !geminiServiceRef.current || !elevenLabsRef.current) {
      return
    }

    try {
      setState('processing')
      stopListening()

      // Start or continue conversation session
      if (!currentSessionRef.current) {
        const session = await conversationManagerRef.current.startSession(userId, currentCharacter.id)
        currentSessionRef.current = session.id
      }

      // Get conversation context
      const context = await conversationManagerRef.current.getSessionContext(currentSessionRef.current)

      // Generate AI response
      const aiResponse = await geminiServiceRef.current.generateResponse(
        userInput,
        context,
        currentCharacter
      )

      setLastResponse(aiResponse.text)

      // Convert to speech
      setState('speaking')
      const audioResult = await elevenLabsRef.current.synthesizeSpeech(
        aiResponse.text,
        currentCharacter
      )

      // Play audio
      await elevenLabsRef.current.playAudio(audioResult)

      // Record interaction
      const interaction: VoiceInteraction = {
        id: `interaction-${Date.now()}`,
        timestamp: new Date(),
        userInput,
        aiResponse: aiResponse.text,
        character: currentCharacter.id,
        duration: audioResult.duration
      }

      await conversationManagerRef.current.addInteraction(
        currentSessionRef.current,
        userInput,
        aiResponse.text,
        audioResult.duration
      )

      // Notify parent component
      onInteractionComplete?.(interaction)

      setState('idle')

    } catch (err) {
      console.error('Failed to process user input:', err)
      
      // Try fallback response
      await handleServiceError(err as Error, userInput)
    }
  }, [userId, currentCharacter, onInteractionComplete])

  /**
   * Handle service errors with fallback responses
   */
  const handleServiceError = useCallback(async (error: Error, userInput?: string) => {
    console.error('Voice coach service error:', error)

    try {
      // Try to provide a fallback response
      if (geminiServiceRef.current && elevenLabsRef.current && userInput) {
        const fallbackResponse = geminiServiceRef.current.getFallbackResponse(
          { userId, currentChores: [], completedChores: [], points: 0, rank: 'Beginner', recentAchievements: [] },
          currentCharacter
        )

        setLastResponse(fallbackResponse)
        setState('speaking')

        const audioResult = await elevenLabsRef.current.synthesizeSpeech(fallbackResponse, currentCharacter)
        await elevenLabsRef.current.playAudio(audioResult)
        
        setState('idle')
        return
      }
    } catch (fallbackError) {
      console.error('Fallback response failed:', fallbackError)
    }

    // If all else fails, show error
    setError({
      type: 'service',
      message: 'Voice coach is temporarily unavailable. Please try again.',
      canRetry: true
    })
    setState('error')
    onError?.('Voice coach service error')
  }, [userId, currentCharacter, onError])

  /**
   * Start audio visualization
   */
  const startAudioVisualization = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const source = audioContextRef.current.createMediaStreamSource(stream)
      
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      source.connect(analyserRef.current)

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)

      const updateAudioLevel = () => {
        if (analyserRef.current && state === 'listening') {
          analyserRef.current.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
          setAudioLevel(average / 255) // Normalize to 0-1
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
        }
      }

      updateAudioLevel()
    } catch (err) {
      console.warn('Audio visualization failed:', err)
    }
  }, [state])

  /**
   * Stop audio visualization
   */
  const stopAudioVisualization = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    setAudioLevel(0)
  }, [])

  /**
   * Retry after error
   */
  const retryAfterError = useCallback(() => {
    setError(null)
    setState('idle')
    if (error?.type === 'permission') {
      initializeServices()
    }
  }, [error, initializeServices])

  /**
   * Clean up resources
   */
  const cleanup = useCallback(() => {
    try {
      stopListening()
      stopAudioVisualization()
      
      if (currentSessionRef.current && conversationManagerRef.current) {
        conversationManagerRef.current.endSession(currentSessionRef.current)
        currentSessionRef.current = null
      }

      if (assemblyAIRef.current && typeof assemblyAIRef.current.dispose === 'function') {
        assemblyAIRef.current.dispose()
      }
      if (elevenLabsRef.current && typeof elevenLabsRef.current.dispose === 'function') {
        elevenLabsRef.current.dispose()
      }
      if (audioContextRef.current && typeof audioContextRef.current.close === 'function') {
        audioContextRef.current.close()
      }
    } catch (error) {
      console.warn('Error during VoiceCoach cleanup:', error)
    }
  }, [stopListening, stopAudioVisualization])

  // Initialize services on mount
  useEffect(() => {
    if (isEnabled) {
      initializeServices()
    }
    return cleanup
  }, [isEnabled, initializeServices, cleanup])

  // Handle component unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  // Don't render if not enabled
  if (!isEnabled) {
    return null
  }

  return (
    <div className={`voice-coach-container ${className}`}>
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
              <SpeakerWaveIcon className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {currentCharacter.name}
            </h3>
          </div>
          <p className="text-sm text-gray-600">
            Your AI Voice Coach
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-800 mb-2">{error.message}</p>
                {error.canRetry && (
                  <button
                    onClick={retryAfterError}
                    className="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-md transition-colors"
                  >
                    Try Again
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Interface */}
        {!error && (
          <>
            {/* Visual Feedback */}
            <div className="mb-6">
              {/* Audio Visualization */}
              {state === 'listening' && (
                <div className="flex justify-center items-center space-x-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-indigo-500 rounded-full transition-all duration-150"
                      style={{
                        width: '4px',
                        height: `${8 + (audioLevel * 20)}px`,
                        opacity: 0.3 + (audioLevel * 0.7),
                        animationDelay: `${i * 100}ms`
                      }}
                    />
                  ))}
                </div>
              )}

              {/* State Indicator */}
              <div className="text-center">
                {state === 'idle' && (
                  <p className="text-gray-600">Ready to chat! Tap the microphone to start.</p>
                )}
                {state === 'listening' && (
                  <div>
                    <p className="text-indigo-600 font-medium mb-2">Listening...</p>
                    {currentTranscript && (
                      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                        "{currentTranscript}"
                      </p>
                    )}
                  </div>
                )}
                {state === 'processing' && (
                  <p className="text-yellow-600 font-medium">Thinking...</p>
                )}
                {state === 'speaking' && (
                  <div>
                    <p className="text-green-600 font-medium mb-2">Speaking...</p>
                    {lastResponse && (
                      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                        "{lastResponse}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Control Button */}
            <div className="flex justify-center">
              {state === 'listening' ? (
                <button
                  onClick={stopListening}
                  className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
                  aria-label="Stop listening"
                >
                  <StopIcon className="w-8 h-8" />
                </button>
              ) : (
                <button
                  onClick={startListening}
                  disabled={!isInitialized || state !== 'idle'}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors shadow-lg ${
                    !isInitialized || state !== 'idle'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                  }`}
                  aria-label="Start listening"
                >
                  <MicrophoneIcon className="w-8 h-8" />
                </button>
              )}
            </div>

            {/* Status Text */}
            <div className="text-center mt-4">
              {!isInitialized && (
                <p className="text-sm text-gray-500">Initializing voice coach...</p>
              )}
              {isInitialized && !hasPermission && (
                <p className="text-sm text-red-600">Microphone permission required</p>
              )}
              {isInitialized && hasPermission && state === 'idle' && (
                <p className="text-sm text-gray-500">Tap to start voice chat</p>
              )}
            </div>
          </>
        )}

        {/* Settings Hint */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
            <Cog6ToothIcon className="w-4 h-4" />
            <span>Change voice character in settings</span>
          </div>
        </div>
      </div>
    </div>
  )
}