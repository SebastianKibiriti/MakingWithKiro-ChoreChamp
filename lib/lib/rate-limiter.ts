/**
 * Rate limiting utility for Voice Coach API routes
 * Implements token bucket algorithm for rate limiting
 */

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  keyGenerator?: (request: Request) => string
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
}

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, {
  tokens: number
  lastRefill: number
  resetTime: number
}>()

/**
 * Rate limiter implementation using token bucket algorithm
 */
export class RateLimiter {
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  /**
   * Check if request is within rate limit
   */
  async checkLimit(request: Request): Promise<RateLimitResult> {
    const key = this.config.keyGenerator ? 
      this.config.keyGenerator(request) : 
      this.getDefaultKey(request)
    
    const now = Date.now()
    const windowStart = now - this.config.windowMs
    
    // Get or create bucket for this key
    let bucket = rateLimitStore.get(key)
    
    if (!bucket) {
      bucket = {
        tokens: this.config.maxRequests,
        lastRefill: now,
        resetTime: now + this.config.windowMs
      }
      rateLimitStore.set(key, bucket)
    }
    
    // Refill tokens based on time passed
    const timePassed = now - bucket.lastRefill
    const tokensToAdd = Math.floor(timePassed / this.config.windowMs * this.config.maxRequests)
    
    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(this.config.maxRequests, bucket.tokens + tokensToAdd)
      bucket.lastRefill = now
      bucket.resetTime = now + this.config.windowMs
    }
    
    // Check if request can be processed
    if (bucket.tokens > 0) {
      bucket.tokens--
      rateLimitStore.set(key, bucket)
      
      return {
        success: true,
        limit: this.config.maxRequests,
        remaining: bucket.tokens,
        resetTime: bucket.resetTime
      }
    }
    
    return {
      success: false,
      limit: this.config.maxRequests,
      remaining: 0,
      resetTime: bucket.resetTime
    }
  }

  /**
   * Generate default key from request (IP address)
   */
  private getDefaultKey(request: Request): string {
    // Try to get real IP from headers (for production with proxies)
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }
    
    if (realIp) {
      return realIp
    }
    
    // Fallback to a default key for development
    return 'default-client'
  }
}

/**
 * Pre-configured rate limiters for different Voice Coach endpoints
 */
export const voiceCoachRateLimiters = {
  // Gemini API - more restrictive due to cost
  gemini: new RateLimiter({
    maxRequests: 10, // 10 requests per minute
    windowMs: 60 * 1000,
  }),
  
  // ElevenLabs API - moderate limits
  elevenlabs: new RateLimiter({
    maxRequests: 20, // 20 requests per minute
    windowMs: 60 * 1000,
  }),
  
  // AssemblyAI API - more generous for transcription
  assemblyai: new RateLimiter({
    maxRequests: 30, // 30 requests per minute
    windowMs: 60 * 1000,
  }),
  
  // Token generation - very restrictive
  token: new RateLimiter({
    maxRequests: 5, // 5 tokens per minute
    windowMs: 60 * 1000,
  })
}

/**
 * Middleware function to apply rate limiting to API routes
 */
export async function withRateLimit(
  request: Request,
  rateLimiter: RateLimiter
): Promise<Response | null> {
  const result = await rateLimiter.checkLimit(request)
  
  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        resetTime: result.resetTime
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime.toString(),
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
        }
      }
    )
  }
  
  // Add rate limit headers to successful responses
  return null // Continue processing
}

/**
 * Clean up old entries from rate limit store (call periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now()
  
  const entries = Array.from(rateLimitStore.entries())
  for (const [key, bucket] of entries) {
    if (bucket.resetTime < now - 60000) { // Remove entries older than 1 minute past reset
      rateLimitStore.delete(key)
    }
  }
}

// Clean up every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000)
}