import { NextRequest, NextResponse } from 'next/server'
import { validateVoiceCoachEnvironment } from '../../../../lib/env-validation'

/**
 * Test endpoint to verify all Voice Coach API routes are working
 * GET /api/voice-coach/test-routes
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateVoiceCoachEnvironment()
    
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        message: 'Voice Coach environment not properly configured',
        errors: validation.errors
      }, { status: 500 })
    }
    
    const baseUrl = new URL(request.url).origin
    const testResults = {
      environment: 'configured',
      routes: {} as Record<string, any>
    }
    
    // Test environment validation route
    try {
      const envResponse = await fetch(`${baseUrl}/api/voice-coach/validate-env`)
      testResults.routes.validateEnv = {
        status: envResponse.status,
        working: envResponse.ok
      }
    } catch (error) {
      testResults.routes.validateEnv = {
        status: 'error',
        working: false,
        error: 'Route not accessible'
      }
    }
    
    // Test AssemblyAI token route
    try {
      const tokenResponse = await fetch(`${baseUrl}/api/voice-coach/assemblyai-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      testResults.routes.assemblyaiToken = {
        status: tokenResponse.status,
        working: tokenResponse.ok || tokenResponse.status === 429 // Rate limited is OK
      }
    } catch (error) {
      testResults.routes.assemblyaiToken = {
        status: 'error',
        working: false,
        error: 'Route not accessible'
      }
    }
    
    // Test ElevenLabs characters route
    try {
      const charactersResponse = await fetch(`${baseUrl}/api/voice-coach/elevenlabs-speech`)
      testResults.routes.elevenLabsCharacters = {
        status: charactersResponse.status,
        working: charactersResponse.ok
      }
    } catch (error) {
      testResults.routes.elevenLabsCharacters = {
        status: 'error',
        working: false,
        error: 'Route not accessible'
      }
    }
    
    // Count working routes
    const workingRoutes = Object.values(testResults.routes).filter(r => r.working).length
    const totalRoutes = Object.keys(testResults.routes).length
    
    return NextResponse.json({
      success: workingRoutes === totalRoutes,
      message: `${workingRoutes}/${totalRoutes} routes working correctly`,
      details: testResults,
      availableRoutes: [
        'GET /api/voice-coach/validate-env - Environment validation',
        'POST /api/voice-coach/assemblyai-token - Get AssemblyAI session token',
        'POST /api/voice-coach/assemblyai-transcribe - Transcribe audio',
        'GET /api/voice-coach/assemblyai-transcribe?id=<id> - Check transcription status',
        'POST /api/voice-coach/gemini-response - Generate AI response',
        'POST /api/voice-coach/elevenlabs-speech - Synthesize speech',
        'GET /api/voice-coach/elevenlabs-speech - Get available characters',
        'GET /api/voice-coach/test-routes - This test endpoint'
      ]
    })
    
  } catch (error) {
    console.error('Test routes error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to test routes',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}