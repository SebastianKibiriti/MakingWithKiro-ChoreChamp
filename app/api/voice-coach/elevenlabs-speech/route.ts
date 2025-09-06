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
    voiceId: 'ZD29qZCdYhhdqzBLRKNH', // ElevenLabs voice ID for robot
    description: 'Friendly robot assistant'
  },
  'wizard': {
    id: 'wizard',
    name: 'Wizard Guide',
    voiceId: 'V33LkP9pVLdcjeB2y5Na', // ElevenLabs voice ID for wizard
    description: 'Magical wizard mentor'
  },
  'genz': {
    id: 'genz',
    name: 'Gen Z Buddy',
    voiceId: 'h8LZpYr8y3VBz0q2x0LP', // ElevenLabs voice ID for Gen Z
    description: 'Chill Gen Z friend'
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
    
    // Check if ElevenLabs API key is configured
    if (!config.elevenLabsApiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      )
    }
    
    const body: ElevenLabsRequestBody = await request.json()
    
    // Validate required fields
    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json(
        { error: 'text is required and must be a string' },
        { status: 400 }
      )
    }
    
    // Clean text for speech synthesis (remove markdown and special characters)
    const cleanTextForSpeech = (text: string): string => {
      return text
        // Remove markdown formatting
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold **text**
        .replace(/\*(.*?)\*/g, '$1')     // Remove italic *text*
        .replace(/__(.*?)__/g, '$1')     // Remove underline __text__
        .replace(/_(.*?)_/g, '$1')       // Remove italic _text_
        .replace(/`(.*?)`/g, '$1')       // Remove code `text`
        .replace(/#{1,6}\s/g, '')        // Remove headers # ## ###
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links [text](url)
        // Remove other special characters that might cause speech issues
        .replace(/[*#_`~]/g, '')         // Remove remaining markdown chars
        .replace(/\s+/g, ' ')            // Normalize whitespace
        .trim()
    }
    
    const cleanedText = cleanTextForSpeech(body.text)
    
    // Validate text length (ElevenLabs has limits)
    if (cleanedText.length > 5000) {
      return NextResponse.json(
        { error: 'Text too long. Maximum 5000 characters allowed.' },
        { status: 400 }
      )
    }
    
    // Get voice character configuration
    const character = body.character || config.defaultCharacter || 'friendly-guide'
    const voiceConfig = VOICE_CHARACTERS[character] || VOICE_CHARACTERS['friendly-guide']
    
    // Prepare voice settings with character-specific optimizations
    const getOptimizedVoiceSettings = (character: string) => {
      const baseSettings = {
        stability: body.voiceSettings?.stability ?? 0.75,
        similarity_boost: body.voiceSettings?.similarityBoost ?? 0.75,
        style: body.voiceSettings?.style ?? 0.0,
        use_speaker_boost: body.voiceSettings?.useSpeakerBoost ?? true
      }
      
      // Optimize settings for GenZ character for faster, more natural speech
      if (character === 'genz') {
        return {
          stability: body.voiceSettings?.stability ?? 0.5, // Lower stability for more dynamic speech
          similarity_boost: body.voiceSettings?.similarityBoost ?? 0.8, // Higher similarity for consistency
          style: body.voiceSettings?.style ?? 0.2, // Add slight style for personality
          use_speaker_boost: body.voiceSettings?.useSpeakerBoost ?? true
        }
      }
      
      return baseSettings
    }
    
    const voiceSettings = getOptimizedVoiceSettings(character)
    
    // Prepare request body with optimizations for speed
    const requestBody = {
      text: cleanedText,
      model_id: config.elevenLabsModel || 'eleven_turbo_v2_5', // Ensure we use the fastest model
      voice_settings: voiceSettings,
      // Add optimization flags for faster processing
      optimize_streaming_latency: character === 'genz' ? 4 : 0, // Max optimization for GenZ
      output_format: 'mp3_44100_128' // Optimized format for web playback
    }
    
    // Call ElevenLabs API with timeout for faster response
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
    
    try {
      const elevenLabsResponse = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceConfig.voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': config.elevenLabsApiKey || '',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        }
      )
      
      clearTimeout(timeoutId)
    
      if (!elevenLabsResponse.ok) {
        const errorText = await elevenLabsResponse.text()
        console.error('ElevenLabs API error:', errorText)
        
        // Return fallback response
        return NextResponse.json(
          { 
            error: 'Speech synthesis failed',
            fallback: true,
            text: cleanedText // Return cleaned text for browser TTS fallback
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
      
    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('ElevenLabs API timeout')
        return NextResponse.json(
          { 
            error: 'Speech synthesis timeout - please try again',
            fallback: true,
            text: cleanedText
          },
          { status: 408 }
        )
      }
      
      throw fetchError // Re-throw other errors to be handled by outer catch
    }

    
  } catch (error) {
    console.error('ElevenLabs speech synthesis error:', error)
    
    // Return fallback response for client-side TTS
    try {
      const body: ElevenLabsRequestBody = await request.json()
      const cleanedText = body.text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/[*#_`~]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      
      return NextResponse.json(
        { 
          error: 'Speech synthesis service unavailable',
          fallback: true,
          text: cleanedText
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