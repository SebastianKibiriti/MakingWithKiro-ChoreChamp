import { NextRequest, NextResponse } from 'next/server'
import { getVoiceCoachConfig } from '../../../../lib/env-validation'
import { withRateLimit, voiceCoachRateLimiters } from '../../../../lib/rate-limiter'

interface ElevenLabsRequestBody {
  text: string
  character?: string
  voiceSettings?: {
    stability?: number
    similarityBoost?: number
    style?: number
    useSpeakerBoost?: boolean
  }
}

interface VoiceCharacter {
  id: string
  name: string
  voiceId: string
  description: string
}

// Voice character configurations
const VOICE_CHARACTERS: Record<string, VoiceCharacter> = {
  'superhero': {
    id: 'superhero',
    name: 'Captain Chore',
    voiceId: '21m00Tcm4TlvDq8ikWAM', // Josh - energetic male voice
    description: 'Enthusiastic superhero coach'
  },
  'robot': {
    id: 'robot',
    name: 'Robo-Helper',
    voiceId: 'AZnzlk1XvdvUeBnXmlld', // Rachel - clear female voice
    description: 'Friendly robot assistant'
  },
  'friendly-guide': {
    id: 'friendly-guide',
    name: 'Coach Sam',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - warm female voice
    description: 'Warm and supportive coach'
  }
}

/**
 * API route for ElevenLabs text-to-speech synthesis
 * POST /api/voice-coach/elevenlabs-speech
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await withRateLimit(request, voiceCoachRateLimiters.elevenlabs)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const config = getVoiceCoachConfig()
    const body: ElevenLabsRequestBody = await request.json()
    
    // Validate required fields
    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json(
        { error: 'text is required and must be a string' },
        { status: 400 }
      )
    }
    
    // Validate text length (ElevenLabs has limits)
    if (body.text.length > 5000) {
      return NextResponse.json(
        { error: 'Text too long. Maximum 5000 characters allowed.' },
        { status: 400 }
      )
    }
    
    // Get voice character configuration
    const character = body.character || config.defaultCharacter
    const voiceConfig = VOICE_CHARACTERS[character] || VOICE_CHARACTERS['friendly-guide']
    
    // Prepare voice settings
    const voiceSettings = {
      stability: body.voiceSettings?.stability ?? 0.75,
      similarity_boost: body.voiceSettings?.similarityBoost ?? 0.75,
      style: body.voiceSettings?.style ?? 0.0,
      use_speaker_boost: body.voiceSettings?.useSpeakerBoost ?? true
    }
    
    // Call ElevenLabs API
    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceConfig.voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': config.elevenLabsApiKey,
        },
        body: JSON.stringify({
          text: body.text,
          model_id: config.elevenLabsModel,
          voice_settings: voiceSettings
        }),
      }
    )
    
    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text()
      console.error('ElevenLabs API error:', errorText)
      
      // Return fallback response
      return NextResponse.json(
        { 
          error: 'Speech synthesis failed',
          fallback: true,
          text: body.text // Return text for browser TTS fallback
        },
        { status: 500 }
      )
    }
    
    // Get audio data
    const audioBuffer = await elevenLabsResponse.arrayBuffer()
    
    // Return audio response with proper headers
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'X-Voice-Character': character,
        'X-Voice-Name': voiceConfig.name,
      },
    })
    
  } catch (error) {
    console.error('ElevenLabs speech synthesis error:', error)
    
    // Return fallback response for client-side TTS
    try {
      const body: ElevenLabsRequestBody = await request.json()
      return NextResponse.json(
        { 
          error: 'Speech synthesis service unavailable',
          fallback: true,
          text: body.text
        },
        { status: 503 }
      )
    } catch {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * GET endpoint to retrieve available voice characters
 * GET /api/voice-coach/elevenlabs-speech
 */
export async function GET() {
  try {
    const characters = Object.values(VOICE_CHARACTERS).map(char => ({
      id: char.id,
      name: char.name,
      description: char.description
      // Don't expose voiceId for security
    }))
    
    return NextResponse.json({
      characters,
      defaultCharacter: 'friendly-guide'
    })
    
  } catch (error) {
    console.error('Error fetching voice characters:', error)
    return NextResponse.json(
      { error: 'Failed to fetch voice characters' },
      { status: 500 }
    )
  }
}