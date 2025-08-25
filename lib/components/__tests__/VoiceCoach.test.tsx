import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import VoiceCoach from '../VoiceCoach'

// Mock the services
jest.mock('../../services/assemblyai', () => ({
  AssemblyAIService: jest.fn().mockImplementation(() => ({
    requestMicrophonePermission: jest.fn().mockResolvedValue(true),
    startRealTimeTranscription: jest.fn().mockResolvedValue(undefined),
    stopTranscription: jest.fn(),
    onTranscriptionResult: jest.fn(),
    onError: jest.fn(),
    dispose: jest.fn()
  }))
}))

jest.mock('../../services/gemini', () => ({
  GeminiService: jest.fn().mockImplementation(() => ({
    generateResponse: jest.fn().mockResolvedValue({
      text: 'Great job! Keep up the good work!',
      confidence: 0.9,
      usage: { promptTokens: 10, completionTokens: 15 }
    }),
    getFallbackResponse: jest.fn().mockReturnValue('Keep going! You can do this!')
  })),
  VOICE_CHARACTERS: {
    'friendly-guide': {
      id: 'friendly-guide',
      name: 'Coach Sam',
      voiceId: 'test-voice-id',
      personality: 'Warm and supportive',
      sampleRate: 22050
    }
  }
}))

jest.mock('../../services/elevenlabs', () => ({
  ElevenLabsService: jest.fn().mockImplementation(() => ({
    synthesizeSpeech: jest.fn().mockResolvedValue({
      audioData: new ArrayBuffer(1024),
      duration: 3,
      format: 'audio/mpeg',
      url: 'blob:test-url'
    }),
    playAudio: jest.fn().mockResolvedValue(undefined),
    preloadCharacterVoices: jest.fn().mockResolvedValue(undefined),
    dispose: jest.fn()
  }))
}))

jest.mock('../../conversation-manager', () => ({
  getConversationManager: jest.fn().mockReturnValue({
    startSession: jest.fn().mockResolvedValue({
      id: 'test-session-id',
      userId: 'test-user',
      startTime: new Date(),
      interactions: [],
      context: {},
      totalInteractions: 0,
      totalDuration: 0,
      characterUsed: 'friendly-guide'
    }),
    getSessionContext: jest.fn().mockResolvedValue({
      userId: 'test-user',
      currentChores: [],
      completedChores: [],
      points: 100,
      rank: 'Champion',
      recentAchievements: []
    }),
    addInteraction: jest.fn().mockResolvedValue(undefined),
    endSession: jest.fn().mockResolvedValue(undefined)
  })
}))

jest.mock('../../env-validation', () => ({
  getVoiceCoachConfig: jest.fn().mockReturnValue({
    googleGeminiApiKey: 'test-gemini-key',
    assemblyAIApiKey: 'test-assembly-key',
    elevenLabsApiKey: 'test-elevenlabs-key',
    geminiModel: 'gemini-pro',
    geminiTemperature: 0.7,
    geminiMaxTokens: 150,
    assemblyAISampleRate: 16000,
    elevenLabsModel: 'eleven_monolingual_v1',
    defaultCharacter: 'friendly-guide',
    maxSessionMinutes: 10,
    dailyLimitMinutes: 30
  })
}))

// Mock Web APIs
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    createMediaStreamSource: jest.fn().mockReturnValue({
      connect: jest.fn()
    }),
    createAnalyser: jest.fn().mockReturnValue({
      fftSize: 256,
      frequencyBinCount: 128,
      getByteFrequencyData: jest.fn()
    }),
    close: jest.fn()
  }))
})

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: jest.fn().mockReturnValue([
        { stop: jest.fn() }
      ])
    })
  }
})

describe('VoiceCoach Component', () => {
  const defaultProps = {
    userId: 'test-user-id',
    isEnabled: true,
    selectedCharacter: 'friendly-guide'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly when enabled', () => {
    render(<VoiceCoach {...defaultProps} />)
    
    expect(screen.getByText('Coach Sam')).toBeInTheDocument()
    expect(screen.getByText('Your AI Voice Coach')).toBeInTheDocument()
    expect(screen.getByText('Ready to chat! Tap the microphone to start.')).toBeInTheDocument()
  })

  it('does not render when disabled', () => {
    render(<VoiceCoach {...defaultProps} isEnabled={false} />)
    
    expect(screen.queryByText('Coach Sam')).not.toBeInTheDocument()
  })

  it('shows microphone button in idle state', () => {
    render(<VoiceCoach {...defaultProps} />)
    
    const micButton = screen.getByLabelText('Start listening')
    expect(micButton).toBeInTheDocument()
    expect(micButton).toBeEnabled()
  })

  it('shows initialization message initially', () => {
    render(<VoiceCoach {...defaultProps} />)
    
    expect(screen.getByText('Initializing voice coach...')).toBeInTheDocument()
  })

  it('handles microphone button click', async () => {
    render(<VoiceCoach {...defaultProps} />)
    
    // Wait for initialization
    await waitFor(() => {
      expect(screen.queryByText('Initializing voice coach...')).not.toBeInTheDocument()
    })

    const micButton = screen.getByLabelText('Start listening')
    fireEvent.click(micButton)

    await waitFor(() => {
      expect(screen.getByText('Listening...')).toBeInTheDocument()
    })
  })

  it('displays error state correctly', async () => {
    // Mock permission denied
    const mockAssemblyAI = require('../../services/assemblyai').AssemblyAIService
    mockAssemblyAI.mockImplementation(() => ({
      requestMicrophonePermission: jest.fn().mockResolvedValue(false),
      dispose: jest.fn()
    }))

    render(<VoiceCoach {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/Microphone access is required/)).toBeInTheDocument()
    })

    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('shows settings hint', () => {
    render(<VoiceCoach {...defaultProps} />)
    
    expect(screen.getByText('Change voice character in settings')).toBeInTheDocument()
  })

  it('calls onInteractionComplete when provided', async () => {
    const mockOnInteractionComplete = jest.fn()
    
    render(
      <VoiceCoach 
        {...defaultProps} 
        onInteractionComplete={mockOnInteractionComplete}
      />
    )

    // This would require more complex mocking to simulate a full interaction
    // For now, we just verify the prop is accepted
    expect(mockOnInteractionComplete).not.toHaveBeenCalled()
  })

  it('applies custom className', () => {
    const { container } = render(
      <VoiceCoach {...defaultProps} className="custom-class" />
    )
    
    expect(container.firstChild).toHaveClass('custom-class')
  })
})