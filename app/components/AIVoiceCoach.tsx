'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Send, Volume2, Bot } from 'lucide-react'

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
  { id: 'pirate', name: 'Pirate', icon: '🏴‍☠️' }
]

export default function AIVoiceCoach({ profile }: AIVoiceCoachProps) {
  const [selectedVoice, setSelectedVoice] = useState('superhero')
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'coach',
      content: `Hi ${profile?.name || 'Champion'}! I'm your AI coach. Ask me anything about chores - how to do them, tips to make them easier, or just chat for motivation!`,
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
          character: selectedCharacter.id
        }),
      })

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
      pirate: ['Google UK English Male', 'Microsoft Mark', 'Alex']
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
      case 'pirate':
        utterance.rate = 1.0
        utterance.pitch = 0.85
        utterance.volume = 0.95
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
      // Call AI coach API
      console.log('Sending request to AI coach:', { message, character: selectedCharacter.name, profile })
      
      const response = await fetch('/api/ai-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          character: selectedCharacter.name,
          profile: profile
        }),
      })

      console.log('Response status:', response.status)
      
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
        content: "I'm having trouble connecting right now, but I'm here to help! Try asking me about specific chores like 'How do I clean my room?' or 'Tips for doing dishes faster?'",
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
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <Bot className="w-6 h-6 text-blue-600 mr-2" />
        <h2 className="text-xl font-semibold">AI Chore Coach</h2>
      </div>

      <div className="space-y-4">
        {/* Voice Character Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Choose your coach:
            </label>
            <button
              onClick={() => {
                const testMessages = {
                  superhero: "Hey there, hero! I'm your superhero coach, ready to help you conquer any chore challenge with amazing power!",
                  robot: "BEEP BEEP! Greetings, human. I am your robotic assistant, programmed to optimize your household efficiency protocols.",
                  wizard: "Greetings, young apprentice! I am your wise wizard coach, here to share magical secrets of household enchantments.",
                  pirate: "Ahoy there, matey! I'm your pirate coach, ready to help ye navigate the treacherous waters of household chores!"
                }
                const message = testMessages[selectedCharacter.id as keyof typeof testMessages]
                speakText(message)
              }}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center"
              disabled={isSpeaking || isGeneratingAudio}
            >
              <Volume2 className="w-3 h-3 mr-1" />
              {isGeneratingAudio ? 'Generating...' : isSpeaking ? 'Speaking...' : 'Test Voice'}
            </button>
          </div>
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
                <div className="text-xs font-medium text-gray-900">{character.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="bg-white rounded-lg border h-64 overflow-y-auto p-4 space-y-3">
          {chatMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {message.type === 'coach' && (
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">{selectedCharacter.icon}</span>
                      <span className="text-xs font-medium text-gray-900">{selectedCharacter.name}</span>
                    </div>
                    <button
                      onClick={() => speakText(message.content)}
                      className="text-blue-600 hover:text-blue-800 p-1"
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
              <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
                <div className="flex items-center">
                  <span className="text-lg mr-2">{selectedCharacter.icon}</span>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Voice Input Status */}
        {isListening && (
          <div className="bg-red-100 border border-red-300 rounded-lg p-3">
            <div className="flex items-center">
              <Mic className="w-4 h-4 text-red-600 mr-2 animate-pulse" />
              <span className="text-red-700 font-medium">Listening...</span>
            </div>
            {transcript && (
              <p className="text-red-600 text-sm mt-1">"{transcript}"</p>
            )}
          </div>
        )}

        {/* Audio Generation Status */}
        {isGeneratingAudio && (
          <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
            <div className="flex items-center">
              <div className="flex space-x-1 mr-2">
                <div className="w-2 h-2 bg-yellow-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-yellow-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-yellow-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-yellow-700 font-medium">Generating {selectedCharacter.name} voice...</span>
            </div>
          </div>
        )}

        {/* Speaking Status */}
        {isSpeaking && !isGeneratingAudio && (
          <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Volume2 className="w-4 h-4 text-blue-600 mr-2 animate-pulse" />
                <span className="text-blue-700 font-medium">{selectedCharacter.name} is speaking...</span>
              </div>
              <button
                onClick={stopSpeaking}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
              >
                Stop
              </button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <div className="flex-1 flex space-x-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Ask me about chores or type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              disabled={isProcessing}
            />
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`px-3 py-2 rounded-lg transition-colors ${
                isListening
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-600 hover:bg-gray-700 text-white'
              }`}
              disabled={isProcessing}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>
          <button
            type="submit"
            disabled={!textInput.trim() || isProcessing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="text-xs text-gray-500 text-center">
          💡 Try asking: "How do I clean my room?" or "Tips for doing dishes faster?"
        </div>
      </div>
    </div>
  )
}