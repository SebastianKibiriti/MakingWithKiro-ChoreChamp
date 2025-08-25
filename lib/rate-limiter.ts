import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

export function rateLimit(config: RateLimitConfig) {
  return {
    check: (identifier: string): { success: boolean; limit: number; remaining: number; resetTime: number } => {
      const now = Date.now()
      const key = identifier
      
      // Clean up expired entries
      if (store[key] && now > store[key].resetTime) {
        delete store[key]
      }
      
      // Initialize or get current state
      if (!store[key]) {
        store[key] = {
          count: 0,
          resetTime: now + config.windowMs
        }
      }
      
      const current = store[key]
      const success = current.count < config.maxRequests
      
      if (success) {
        current.count++
      }
      
      return {
        success,
        limit: config.maxRequests,
        remaining: Math.max(0, config.maxRequests - current.count),
        resetTime: current.resetTime
      }
    }
  }
}

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return 'unknown'
}

// Rate limiting middleware
export async function withRateLimit(
  request: NextRequest,
  limiter: ReturnType<typeof rateLimit>
): Promise<NextResponse | null> {
  const ip = getClientIP(request)
  const result = limiter.check(ip)
  
  if (!result.success) {
    return NextResponse.json(
      { 
        error: 'Too many requests',
        limit: result.limit,
        remaining: result.remaining,
        resetTime: result.resetTime
      },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime.toString(),
        }
      }
    )
  }
  
  return null
}

// Default rate limiter for API routes
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100 // limit each IP to 100 requests per windowMs
})

// Stricter rate limiter for AI services
export const aiServiceRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10 // limit each IP to 10 requests per minute
})

// Voice coach specific rate limiters
export const voiceCoachRateLimiters = {
  token: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 20 // 20 token requests per 5 minutes
  }),
  assemblyai: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30 // 30 transcription requests per minute
  }),
  elevenlabs: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20 // 20 speech generation requests per minute
  }),
  gemini: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30 // 30 AI response requests per minute
  })
}