import { NextRequest, NextResponse } from 'next/server'
import { getVoiceCoachConfig } from '../../../../lib/env-validation'
import { withRateLimit, voiceCoachRateLimiters } from '../../../../lib/rate-limiter'

interface TranscriptionRequestBody {
  audioData?: string // Base64 encoded audio data
  audioUrl?: string // URL to audio file
  language?: string
  wordBoost?: string[]
  punctuate?: boolean
  formatText?: boolean
}

interface TranscriptionResponse {
  text: string
  confidence: number
  words?: Array<{
    text: string
    start: number
    end: number
    confidence: number
  }>
  isFinal: boolean
  audioId?: string
}

/**
 * API route for AssemblyAI transcription
 * POST /api/voice-coach/assemblyai-transcribe
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await withRateLimit(request, voiceCoachRateLimiters.assemblyai)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const config = getVoiceCoachConfig()
    
    // Check if AssemblyAI API key is configured
    if (!config.assemblyAIApiKey) {
      return NextResponse.json(
        { error: 'AssemblyAI API key not configured' },
        { status: 500 }
      )
    }
    
    const body: TranscriptionRequestBody = await request.json()
    
    // Validate input
    if (!body.audioData && !body.audioUrl) {
      return NextResponse.json(
        { error: 'Either audioData or audioUrl is required' },
        { status: 400 }
      )
    }
    
    let audioUrl = body.audioUrl
    
    // If audio data is provided, upload it first
    if (body.audioData) {
      try {
        // Convert base64 to buffer
        const audioBuffer = Buffer.from(body.audioData, 'base64')
        
        // Upload audio to AssemblyAI
        const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.assemblyAIApiKey}`,
            'Content-Type': 'application/octet-stream',
          },
          body: audioBuffer,
        })
        
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text()
          console.error('AssemblyAI upload failed:', errorText)
          return NextResponse.json(
            { error: 'Failed to upload audio data' },
            { status: 500 }
          )
        }
        
        const uploadData = await uploadResponse.json()
        audioUrl = uploadData.upload_url
        
      } catch (error) {
        console.error('Audio upload error:', error)
        return NextResponse.json(
          { error: 'Failed to process audio data' },
          { status: 500 }
        )
      }
    }
    
    // Prepare transcription request
    const transcriptionRequest = {
      audio_url: audioUrl,
      language_code: body.language || 'en_us',
      punctuate: body.punctuate ?? true,
      format_text: body.formatText ?? true,
      word_boost: body.wordBoost || [],
      // Optimize for voice coach use case
      speaker_labels: false,
      auto_chapters: false,
      entity_detection: false,
      sentiment_analysis: false,
      auto_highlights: false,
      content_safety: true, // Important for child safety
    }
    
    // Submit transcription job
    const transcribeResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.assemblyAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transcriptionRequest),
    })
    
    if (!transcribeResponse.ok) {
      const errorText = await transcribeResponse.text()
      console.error('AssemblyAI transcription failed:', errorText)
      return NextResponse.json(
        { error: 'Failed to start transcription' },
        { status: 500 }
      )
    }
    
    const transcribeData = await transcribeResponse.json()
    const transcriptId = transcribeData.id
    
    // Poll for completion (with timeout)
    const maxAttempts = 30 // 30 seconds max
    let attempts = 0
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
      
      const statusResponse = await fetch(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        {
          headers: {
            'Authorization': `Bearer ${config.assemblyAIApiKey}`,
          },
        }
      )
      
      if (!statusResponse.ok) {
        console.error('Failed to check transcription status')
        break
      }
      
      const statusData = await statusResponse.json()
      
      if (statusData.status === 'completed') {
        // Return successful transcription
        const response: TranscriptionResponse = {
          text: statusData.text || '',
          confidence: statusData.confidence || 0.8,
          words: statusData.words?.map((word: any) => ({
            text: word.text,
            start: word.start,
            end: word.end,
            confidence: word.confidence
          })),
          isFinal: true,
          audioId: transcriptId
        }
        
        return NextResponse.json(response)
        
      } else if (statusData.status === 'error') {
        console.error('AssemblyAI transcription error:', statusData.error)
        return NextResponse.json(
          { error: 'Transcription failed', details: statusData.error },
          { status: 500 }
        )
      }
      
      attempts++
    }
    
    // Timeout reached
    return NextResponse.json(
      { error: 'Transcription timeout' },
      { status: 408 }
    )
    
  } catch (error) {
    console.error('AssemblyAI transcription API error:', error)
    
    // Return fallback response suggesting browser speech recognition
    return NextResponse.json(
      { 
        error: 'Transcription service unavailable',
        fallback: true,
        suggestion: 'Try using browser speech recognition'
      },
      { status: 503 }
    )
  }
}

/**
 * GET endpoint to check transcription status
 * GET /api/voice-coach/assemblyai-transcribe?id=transcript_id
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const transcriptId = searchParams.get('id')
    
    if (!transcriptId) {
      return NextResponse.json(
        { error: 'Transcript ID is required' },
        { status: 400 }
      )
    }
    
    const config = getVoiceCoachConfig()
    
    const statusResponse = await fetch(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
      {
        headers: {
          'Authorization': `Bearer ${config.assemblyAIApiKey}`,
        },
      }
    )
    
    if (!statusResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch transcription status' },
        { status: 500 }
      )
    }
    
    const statusData = await statusResponse.json()
    
    const response: Partial<TranscriptionResponse> = {
      text: statusData.text || '',
      confidence: statusData.confidence || 0,
      isFinal: statusData.status === 'completed',
      audioId: transcriptId
    }
    
    if (statusData.status === 'error') {
      return NextResponse.json(
        { error: 'Transcription failed', details: statusData.error },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      status: statusData.status,
      ...response
    })
    
  } catch (error) {
    console.error('Error checking transcription status:', error)
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    )
  }
}