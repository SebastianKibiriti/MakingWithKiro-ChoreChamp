'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Send, Volume2, Bot } from 'lucide-react'
import UsageLimitModal from '../../components/UsageLimitModal'
import { useAuth } from '../../lib/auth-context'

interface AIVoiceCoachProps {
  profile: any
}

interface ChatMessage {
  id: string
  type: 'user' | 'coach'
  content: string
  timestamp: Date
}

const VOICE_CHARACTERS = [
  { id: 'superhero', name: 'Superhero', icon: '🦸‍♂️' },
  { id: 'robot', name: 'Robot', icon: '🤖' },
  { id: 'wizard', name: 'Wizard', icon: '🧙‍♂️' },
  { id: 'genz', name: 'Gen Z', icon: '💯' }
]

const CONVERSATION_STARTERS = [
  "How do I clean my room?",
  "I'm feeling lazy today...",
  "What's the fastest way to do dishes?",
  "Can you help me organize my closet?",
  "I finished my chores! What now?",
  "I'm having trouble staying motivated"
]

export default function AIVoiceCoach({ profile }: AIVoiceCoachProps) {
  const { user } = useAuth()
  const [selectedVoice, setSelectedVoice] = useState('superhero')
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [showUsageLimitModal, setShowUsageLimitModal] = useState(false)
  const [usageLimitInfo, setUsageLimitInfo] = useState({ type: 'ai' as 'ai' | 'tts', remaining: 0, limit: 0 })
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'coach',
      content: `Hey there, ${profile?.name || 'Champion'}! I'm your AI coach and I'm excited to chat with you! Whether you need help with chores, want tips to make them easier, or just need some motivation - I'm here for you. What's on your mind today?`,
      timestamp: new Date()
    }
  ])
  const [transcript, setTranscript] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  
  const recognition = useRef<any>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const selectedCharacter = VOICE_CHARACTERS.find(char => char.id === selectedVoice) || VOICE_CHARACTERS[0]

  // Initialize speech recognition and synthesis
  useEffect(() => {
    // Speech Recognition
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      recognition.current = new (window as any).webkitSpeechRecognition()
      recognition.current.continuous = false
      recognition.current.interimResults = true
      recognition.current.lang = 'en-US'

      recognition.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('')
        
        setTranscript(transcript)
        
        if (event.results[0].isFinal) {
          setTextInput(transcript)
          setIsListening(false)
        }
      }

      recognition.current.onerror = () => {
        setIsListening(false)
      }

      recognition.current.onend = () => {
        setIsListening(false)
      }
    }

    // Load voices for speech synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Load voices
      window.speechSynthesis.getVoices()
    }
  }, [])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const startListening = () => {
    if (recognition.current) {
      setIsListening(true)
      setTranscript('')
      recognition.current.start()
    }
  }

  const stopListening = () => {
    if (recognition.current) {
      recognition.current.stop()
      setIsListening(false)
    }
  }

  const speakText = async (text: string) => {
    console.log('speakText called with:', text)
    
    // Stop any current speech
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    setIsGeneratingAudio(true)
    setIsSpeaking(false)

    try {
      // Try ElevenLabs first for high-quality voices
      console.log('Attempting ElevenLabs TTS...')
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          character: selectedCharacter.id,
          userId: user?.id
        }),
      })

      if (response.status === 429) {
        // Handle usage limit exceeded
        const errorData = await response.json()
        if (errorData.error === 'USAGE_LIMIT_EXCEEDED') {
          setUsageLimitInfo({
            type: 'tts',
            remaining: errorData.remaining,
            limit: errorData.limit
          })
          setShowUsageLimitModal(true)
          setIsGeneratingAudio(false)
          return
        }
      }

      if (response.ok && response.headers.get('content-type')?.includes('audio')) {
        console.log('ElevenLabs TTS successful')
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        
        setIsGeneratingAudio(false)
        setIsSpeaking(true)
        
        audio.onplay = () => {
          console.log('ElevenLabs audio started')
        }
        audio.onended = () => {
          console.log('ElevenLabs audio ended')
          setIsSpeaking(false)
          URL.revokeObjectURL(audioUrl)
        }
        audio.onerror = (error) => {
          console.log('ElevenLabs audio error:', error)
          setIsSpeaking(false)
          URL.revokeObjectURL(audioUrl)
          fallbackToWebSpeech(text)
        }
        
        await audio.play()
        return
      } else {
        console.log('ElevenLabs failed, falling back to browser TTS')
        setIsGeneratingAudio(false)
        fallbackToWebSpeech(text)
      }
    } catch (error) {
      console.log('ElevenLabs error:', error)
      setIsGeneratingAudio(false)
      fallbackToWebSpeech(text)
    }
  }

  const fallbackToWebSpeech = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.log('speechSynthesis not available in this browser')
      setIsSpeaking(false)
      setIsGeneratingAudio(false)
      return
    }

    // Clean the text (remove emojis and special characters for better speech)
    const cleanText = text.replace(/[🦸‍♂️🤖🧙‍♂️🏴‍☠️⭐💡]/g, '').trim()
    console.log('Using browser TTS for:', cleanText)

    setIsSpeaking(true)
    const utterance = new SpeechSynthesisUtterance(cleanText)
    
    // Get available voices
    const voices = window.speechSynthesis.getVoices()
    
    // Character-specific voice selection for browser TTS
    const voicePreferences = {
      superhero: ['Google US English Female', 'Microsoft Zira', 'Samantha'],
      robot: ['Google UK English Male', 'Microsoft David', 'Daniel'],
      wizard: ['Google UK English Male', 'Microsoft George', 'Oliver'],
      genz: ['Google US English Female', 'Microsoft Zira', 'Samantha']
    }

    const characterKey = selectedCharacter.id as keyof typeof voicePreferences
    const preferredVoices = voicePreferences[characterKey] || voicePreferences.superhero

    // Find the best available voice
    let selectedVoice = null
    for (const voiceName of preferredVoices) {
      selectedVoice = voices.find(voice => voice.name.includes(voiceName))
      if (selectedVoice) break
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice
    }

    // Enhanced character-specific speech settings
    switch (selectedCharacter.id) {
      case 'superhero':
        utterance.rate = 1.15
        utterance.pitch = 1.2
        utterance.volume = 0.9
        break
      case 'robot':
        utterance.rate = 0.85
        utterance.pitch = 0.7
        utterance.volume = 0.8
        break
      case 'wizard':
        utterance.rate = 0.75
        utterance.pitch = 0.8
        utterance.volume = 0.9
        break
      case 'genz':
        // Optimized settings for Gen Z - faster, more energetic speech
        utterance.rate = 1.1 // Slightly faster than default
        utterance.pitch = 1.0 // Normal pitch
        utterance.volume = 0.9 // Clear volume
        break
    }

    utterance.onstart = () => {
      console.log('Browser TTS started')
    }
    utterance.onend = () => {
      console.log('Browser TTS ended')
      setIsSpeaking(false)
    }
    utterance.onerror = (error) => {
      console.log('Browser TTS error:', error)
      setIsSpeaking(false)
    }

    window.speechSynthesis.speak(utterance)
  }

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      setIsGeneratingAudio(false)
    }
  }

  const sendMessage = async (message: string) => {
    if (!message.trim()) return

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date()
    }

    setChatMessages(prev => [...prev, userMessage])
    setTextInput('')
    setIsProcessing(true)

    try {
      // Call AI coach API with conversation history for natural flow
      const recentHistory = chatMessages.slice(-6) // Send last 6 messages for context
      console.log('Sending request to AI coach:', { message, character: selectedCharacter.name, profile, conversationHistory: recentHistory })
      
      const response = await fetch('/api/ai-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          character: selectedCharacter.name,
          profile: profile,
          conversationHistory: recentHistory,
          userId: user?.id
        }),
      })

      console.log('Response status:', response.status)
      
      if (response.status === 429) {
        // Handle usage limit exceeded
        const errorData = await response.json()
        if (errorData.error === 'USAGE_LIMIT_EXCEEDED') {
          setUsageLimitInfo({
            type: 'ai',
            remaining: errorData.remaining,
            limit: errorData.limit
          })
          setShowUsageLimitModal(true)
          setIsProcessing(false)
          return
        }
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('AI coach response:', data)

      // Clean the response for both display and speech
      const rawResponse = data.response || 'Sorry, I had trouble understanding that. Can you try asking again?'
      const cleanResponse = rawResponse.replace(/[🦸‍♂️🤖🧙‍♂️🏴‍☠️⭐💡]/g, '').trim()
      
      // Add coach response
      const coachMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'coach',
        content: cleanResponse,
        timestamp: new Date()
      }

      setChatMessages(prev => [...prev, coachMessage])
      
      // Speak the response (already clean)
      speakText(cleanResponse)
    } catch (error) {
      console.error('Error calling AI coach:', error)
      
      // Fallback response
      const fallbackMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'coach',
        content: "Oops! I'm having a little trouble connecting right now, but don't worry - I'm still here to help you! What chore are you working on? I'd love to chat about it and help you tackle it step by step!",
        timestamp: new Date()
      }

      setChatMessages(prev => [...prev, fallbackMessage])
      
      // Speak the fallback response
      speakText(fallbackMessage.content)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(textInput)
  }

  return (
    <div>
      <div className="flex items-center mb-4">
        <Bot className="w-6 h-6 text-gray-700 mr-2" />
        <h2 className="bungee-regular text-xl text-gray-800">AI Chore Coach</h2>
      </div>

      <div className="space-y-4">
        {/* Voice Character Selection */}
        <div className="p-3 sm:p-4 rounded-lg shadow-lg border-2" style={{ backgroundColor: '#FFDD00', borderColor: '#FFD700' }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-2 sm:space-y-0">
            <label className="block text-xs sm:text-sm font-medium text-gray-800">
              Choose your coach:
            </label>
            <button
              onClick={() => {
                const testMessages = {
                  superhero: "Hey there, hero! I'm your superhero coach, ready to help you conquer any chore challenge with amazing power!",
                  robot: "BEEP BEEP! Greetings, human. I am your robotic assistant, programmed to optimize your household efficiency protocols.",
                  wizard: "Greetings, young apprentice! I am your wise wizard coach, here to share magical secrets of household enchantments.",
                  genz: "Yo! No cap, I'm your Gen Z coach and I'm here to help you absolutely slay these chores! It's giving main character energy, fr fr!"
                }
                const message = testMessages[selectedCharacter.id as keyof typeof testMessages]
                speakText(message)
              }}
              className="px-2 sm:px-3 py-1 text-white rounded text-xs sm:text-sm flex items-center shadow-md hover:shadow-lg transition-all duration-200 flex-shrink-0"
              style={{ backgroundColor: '#FF9933' }}
              disabled={isSpeaking || isGeneratingAudio}
            >
              <Volume2 className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">{isGeneratingAudio ? 'Generating...' : isSpeaking ? 'Speaking...' : 'Test Voice'}</span>
              <span className="sm:hidden">Test</span>
            </button>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:space-x-2 gap-2 sm:gap-0">
            {VOICE_CHARACTERS.map((character, index) => {
              const colors = ['#FF9933', '#99CC66', '#00BBDD', '#E66666']
              const isSelected = selectedVoice === character.id
              return (
                <button
                  key={character.id}
                  onClick={() => setSelectedVoice(character.id)}
                  className={`p-2 sm:p-3 rounded-lg border-2 transition-all duration-200 ${
                    isSelected ? 'transform scale-105 shadow-lg' : 'hover:scale-102 shadow-md'
                  }`}
                  style={{
                    backgroundColor: isSelected ? colors[index] : 'white',
                    borderColor: colors[index],
                    color: isSelected ? 'white' : '#374151'
                  }}
                >
                  <div className="text-xl sm:text-2xl mb-1">{character.icon}</div>
                  <div className="text-xs font-medium">{character.name}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="rounded-lg border-2 h-64 overflow-y-auto p-4 space-y-3" style={{ backgroundColor: 'white', borderColor: '#00BBDD' }}>
          {chatMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.type === 'user'
                    ? 'text-white'
                    : 'text-gray-800'
                }`}
                style={{
                  backgroundColor: message.type === 'user' ? '#00BBDD' : '#F0F8FF'
                }}
              >
                {message.type === 'coach' && (
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">{selectedCharacter.icon}</span>
                      <span className="text-xs font-medium text-gray-900">{selectedCharacter.name}</span>
                    </div>
                    <button
                      onClick={() => speakText(message.content)}
                      className="p-1 rounded hover:shadow-md transition-all duration-200"
                      style={{ color: '#00BBDD' }}
                      title="Speak this message"
                    >
                      <Volume2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <p className="text-sm">{message.content}</p>
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="text-gray-800 px-4 py-2 rounded-lg" style={{ backgroundColor: '#F0F8FF' }}>
                <div className="flex items-center">
                  <span className="text-lg mr-2">{selectedCharacter.icon}</span>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#00BBDD' }}></div>
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#00BBDD', animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#00BBDD', animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Voice Input Status */}
        {isListening && (
          <div className="border-2 rounded-lg p-3" style={{ backgroundColor: '#E66666', borderColor: '#E56E6E' }}>
            <div className="flex items-center">
              <Mic className="w-4 h-4 text-white mr-2 animate-pulse" />
              <span className="text-white font-medium">Listening...</span>
            </div>
            {transcript && (
              <p className="text-white text-sm mt-1">"{transcript}"</p>
            )}
          </div>
        )}

        {/* Audio Generation Status */}
        {isGeneratingAudio && (
          <div className="border-2 rounded-lg p-3" style={{ backgroundColor: '#FFDD00', borderColor: '#FFD700' }}>
            <div className="flex items-center">
              <div className="flex space-x-1 mr-2">
                <div className="w-2 h-2 bg-gray-800 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-800 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-800 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-gray-800 font-medium">Generating {selectedCharacter.name} voice...</span>
            </div>
          </div>
        )}

        {/* Speaking Status */}
        {isSpeaking && !isGeneratingAudio && (
          <div className="border-2 rounded-lg p-3" style={{ backgroundColor: '#99CC66', borderColor: '#9ACD32' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Volume2 className="w-4 h-4 text-white mr-2 animate-pulse" />
                <span className="text-white font-medium">{selectedCharacter.name} is speaking...</span>
              </div>
              <button
                onClick={stopSpeaking}
                className="px-2 py-1 bg-white text-gray-800 hover:bg-gray-100 rounded text-sm shadow-md hover:shadow-lg transition-all duration-200"
              >
                Stop
              </button>
            </div>
          </div>
        )}

        {/* Conversation Starters */}
        {chatMessages.length <= 1 && (
          <div className="p-3 sm:p-4 rounded-lg shadow-lg border-2" style={{ backgroundColor: '#F0F8FF', borderColor: '#00BBDD' }}>
            <h4 className="text-sm font-medium text-gray-800 mb-2">💡 Try asking me:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CONVERSATION_STARTERS.map((starter, index) => (
                <button
                  key={index}
                  onClick={() => setTextInput(starter)}
                  className="text-left p-2 text-xs sm:text-sm text-gray-700 hover:text-white rounded-md transition-all duration-200 hover:shadow-md"
                  style={{ 
                    backgroundColor: 'rgba(255, 221, 0, 0.1)',
                    border: '1px solid rgba(255, 221, 0, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFDD00'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 221, 0, 0.1)'
                  }}
                >
                  "{starter}"
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <div className="flex space-x-2 flex-1">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Ask me about chores..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm min-w-0"
              disabled={isProcessing}
            />
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className="px-3 py-2 rounded-lg transition-all duration-200 text-white shadow-md hover:shadow-lg flex-shrink-0"
              style={{
                backgroundColor: isListening ? '#E66666' : '#00BBDD'
              }}
              disabled={isProcessing}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>
          <button
            type="submit"
            disabled={!textInput.trim() || isProcessing}
            className="px-4 py-2 disabled:bg-gray-300 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex-shrink-0"
            style={{
              backgroundColor: !textInput.trim() || isProcessing ? '#9CA3AF' : '#99CC66'
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="text-xs text-center p-2 rounded-lg" style={{ backgroundColor: '#F0F8FF', color: '#374151' }}>
          💡 {chatMessages.length <= 2 
            ? `I love chatting about chores, motivation, and helping you succeed! What would you like to talk about?`
            : `Keep the conversation going! Ask me follow-up questions or tell me how things are going.`
          }
        </div>
      </div>

      {/* Usage Limit Modal */}
      <UsageLimitModal
        isOpen={showUsageLimitModal}
        onClose={() => setShowUsageLimitModal(false)}
        limitType={usageLimitInfo.type}
        remaining={usageLimitInfo.remaining}
        limit={usageLimitInfo.limit}
      />
    </div>
  )
}