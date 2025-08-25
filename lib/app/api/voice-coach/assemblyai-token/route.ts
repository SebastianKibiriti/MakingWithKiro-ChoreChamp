import { NextRequest, NextResponse } from 'next/server'
import { getVoiceCoachConfig } from '../../../../lib/env-validation'
import { withRateLimit, voiceCoachRateLimiters } from '../../../../lib/rate-limiter'

/**
 * API route to generate AssemblyAI session token for real-time transcription
 * This keeps the API key secure on the server side
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await withRateLimit(request, voiceCoachRateLimiters.token)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const config = getVoiceCoachConfig()
    
    // Generate a temporary token for AssemblyAI real-time service
    const response = await fetch('https://api.assemblyai.com/v2/realtime/token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.assemblyAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expires_in: 3600, // Token expires in 1 hour
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('AssemblyAI token generation failed:', errorText)
      return NextResponse.json(
        { error: 'Failed to generate session token' },
        { status: 500 }
      )
    }

    const data = await response.json()
    
    return NextResponse.json({
      token: data.token,
      expires_in: data.expires_in,
    })
    
  } catch (error) {
    console.error('AssemblyAI token API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}