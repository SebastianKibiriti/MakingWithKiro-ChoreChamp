/**
 * Error handling utilities for Voice Coach API routes
 * Provides consistent error responses and logging
 */

export enum VoiceCoachErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  API_KEY_ERROR = 'API_KEY_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  AUDIO_PROCESSING_ERROR = 'AUDIO_PROCESSING_ERROR',
  TRANSCRIPTION_ERROR = 'TRANSCRIPTION_ERROR',
  AI_GENERATION_ERROR = 'AI_GENERATION_ERROR',
  SPEECH_SYNTHESIS_ERROR = 'SPEECH_SYNTHESIS_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export interface VoiceCoachError {
  type: VoiceCoachErrorType
  message: string
  details?: string
  statusCode: number
  fallbackAvailable?: boolean
  retryAfter?: number
}

export class VoiceCoachErrorHandler {
  /**
   * Handle AssemblyAI API errors
   */
  static handleAssemblyAIError(error: any, context?: string): VoiceCoachError {
    console.error(`AssemblyAI error ${context ? `(${context})` : ''}:`, error)
    
    if (error.status === 401) {
      return {
        type: VoiceCoachErrorType.API_KEY_ERROR,
        message: 'Speech recognition service authentication failed',
        statusCode: 500,
        fallbackAvailable: true
      }
    }
    
    if (error.status === 429) {
      return {
        type: VoiceCoachErrorType.QUOTA_EXCEEDED,
        message: 'Speech recognition quota exceeded',
        statusCode: 503,
        fallbackAvailable: true,
        retryAfter: 60
      }
    }
    
    if (error.status >= 500) {
      return {
        type: VoiceCoachErrorType.SERVICE_UNAVAILABLE,
        message: 'Speech recognition service temporarily unavailable',
        statusCode: 503,
        fallbackAvailable: true,
        retryAfter: 30
      }
    }
    
    return {
      type: VoiceCoachErrorType.TRANSCRIPTION_ERROR,
      message: 'Speech recognition failed',
      details: error.message,
      statusCode: 500,
      fallbackAvailable: true
    }
  }
  
  /**
   * Handle Google Gemini API errors
   */
  static handleGeminiError(error: any, context?: string): VoiceCoachError {
    console.error(`Gemini error ${context ? `(${context})` : ''}:`, error)
    
    if (error.status === 401 || error.message?.includes('API key')) {
      return {
        type: VoiceCoachErrorType.API_KEY_ERROR,
        message: 'AI service authentication failed',
        statusCode: 500,
        fallbackAvailable: true
      }
    }
    
    if (error.status === 429 || error.message?.includes('quota')) {
      return {
        type: VoiceCoachErrorType.QUOTA_EXCEEDED,
        message: 'AI service quota exceeded',
        statusCode: 503,
        fallbackAvailable: true,
        retryAfter: 60
      }
    }
    
    if (error.status >= 500) {
      return {
        type: VoiceCoachErrorType.SERVICE_UNAVAILABLE,
        message: 'AI service temporarily unavailable',
        statusCode: 503,
        fallbackAvailable: true,
        retryAfter: 30
      }
    }
    
    return {
      type: VoiceCoachErrorType.AI_GENERATION_ERROR,
      message: 'AI response generation failed',
      details: error.message,
      statusCode: 500,
      fallbackAvailable: true
    }
  }
  
  /**
   * Handle ElevenLabs API errors
   */
  static handleElevenLabsError(error: any, context?: string): VoiceCoachError {
    console.error(`ElevenLabs error ${context ? `(${context})` : ''}:`, error)
    
    if (error.status === 401) {
      return {
        type: VoiceCoachErrorType.API_KEY_ERROR,
        message: 'Speech synthesis service authentication failed',
        statusCode: 500,
        fallbackAvailable: true
      }
    }
    
    if (error.status === 429) {
      return {
        type: VoiceCoachErrorType.QUOTA_EXCEEDED,
        message: 'Speech synthesis quota exceeded',
        statusCode: 503,
        fallbackAvailable: true,
        retryAfter: 60
      }
    }
    
    if (error.status >= 500) {
      return {
        type: VoiceCoachErrorType.SERVICE_UNAVAILABLE,
        message: 'Speech synthesis service temporarily unavailable',
        statusCode: 503,
        fallbackAvailable: true,
        retryAfter: 30
      }
    }
    
    return {
      type: VoiceCoachErrorType.SPEECH_SYNTHESIS_ERROR,
      message: 'Speech synthesis failed',
      details: error.message,
      statusCode: 500,
      fallbackAvailable: true
    }
  }
  
  /**
   * Handle validation errors
   */
  static handleValidationError(message: string, details?: string): VoiceCoachError {
    return {
      type: VoiceCoachErrorType.VALIDATION_ERROR,
      message,
      details,
      statusCode: 400,
      fallbackAvailable: false
    }
  }
  
  /**
   * Handle audio processing errors
   */
  static handleAudioError(error: any, context?: string): VoiceCoachError {
    console.error(`Audio processing error ${context ? `(${context})` : ''}:`, error)
    
    return {
      type: VoiceCoachErrorType.AUDIO_PROCESSING_ERROR,
      message: 'Audio processing failed',
      details: error.message,
      statusCode: 500,
      fallbackAvailable: true
    }
  }
  
  /**
   * Handle generic internal errors
   */
  static handleInternalError(error: any, context?: string): VoiceCoachError {
    console.error(`Internal error ${context ? `(${context})` : ''}:`, error)
    
    return {
      type: VoiceCoachErrorType.INTERNAL_ERROR,
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      statusCode: 500,
      fallbackAvailable: false
    }
  }
  
  /**
   * Convert VoiceCoachError to HTTP Response
   */
  static toResponse(error: VoiceCoachError): Response {
    const responseBody = {
      error: error.message,
      type: error.type,
      fallbackAvailable: error.fallbackAvailable,
      ...(error.details && { details: error.details }),
      ...(error.retryAfter && { retryAfter: error.retryAfter })
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    if (error.retryAfter) {
      headers['Retry-After'] = error.retryAfter.toString()
    }
    
    return new Response(
      JSON.stringify(responseBody),
      {
        status: error.statusCode,
        headers
      }
    )
  }
}

/**
 * Fallback responses for different error scenarios
 */
export const FALLBACK_RESPONSES = {
  transcription: {
    message: 'Speech recognition is temporarily unavailable. Please try typing your message instead.',
    suggestion: 'Use browser speech recognition as fallback'
  },
  
  aiGeneration: {
    responses: [
      "Great job working on your chores! Keep up the awesome work!",
      "You're doing fantastic! Every chore completed makes you stronger!",
      "I'm proud of your hard work! You're becoming a real chore champion!",
      "Way to go! Your dedication to completing chores is inspiring!",
      "Excellent effort! You're building great habits that will help you succeed!"
    ]
  },
  
  speechSynthesis: {
    message: 'Voice playback is temporarily unavailable. The response will be shown as text instead.',
    suggestion: 'Use browser text-to-speech as fallback'
  }
}

/**
 * Get random fallback AI response
 */
export function getRandomFallbackResponse(): string {
  const responses = FALLBACK_RESPONSES.aiGeneration.responses
  return responses[Math.floor(Math.random() * responses.length)]
}