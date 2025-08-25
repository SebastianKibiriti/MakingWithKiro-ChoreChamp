import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getVoiceCoachConfig } from '../../../../lib/env-validation'
import { withRateLimit, voiceCoachRateLimiters } from '../../../../lib/rate-limiter'

interface GeminiRequestBody {
  userInput: string
  context?: {
    userId: string
    currentChores?: Array<{
      id: string
      title: string
      points: number
      isCompleted: boolean
    }>
    completedChores?: Array<{
      id: string
      title: string
      points: number
      completedAt: string
    }>
    points: number
    rank: string
    recentAchievements?: Array<{
      title: string
      description: string
      earnedAt: string
    }>
  }
  character?: string
  conversationHistory?: Array<{
    userInput: string
    aiResponse: string
    timestamp: string
  }>
}

interface GeminiResponse {
  text: string
  confidence: number
  usage?: {
    promptTokens: number
    completionTokens: number
  }
}

/**
 * API route for Google Gemini response generation
 * POST /api/voice-coach/gemini-response
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await withRateLimit(request, voiceCoachRateLimiters.gemini)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const config = getVoiceCoachConfig()
    const body: GeminiRequestBody = await request.json()
    
    // Validate required fields
    if (!body.userInput || typeof body.userInput !== 'string') {
      return NextResponse.json(
        { error: 'userInput is required and must be a string' },
        { status: 400 }
      )
    }
    
    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(config.googleGeminiApiKey)
    const model = genAI.getGenerativeModel({ 
      model: config.geminiModel,
      generationConfig: {
        temperature: config.geminiTemperature,
        maxOutputTokens: config.geminiMaxTokens,
      }
    })
    
    // Build system prompt based on character
    const systemPrompt = buildSystemPrompt(body.character || config.defaultCharacter)
    
    // Build context prompt
    const contextPrompt = buildContextPrompt(body.context)
    
    // Build conversation history
    const historyPrompt = buildHistoryPrompt(body.conversationHistory)
    
    // Combine prompts
    const fullPrompt = `${systemPrompt}\n\n${contextPrompt}\n\n${historyPrompt}\n\nUser: ${body.userInput}\n\nAI Coach:`
    
    // Generate response
    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    const text = response.text()
    
    // Calculate confidence based on response quality (simplified)
    const confidence = calculateConfidence(text, body.userInput)
    
    const geminiResponse: GeminiResponse = {
      text: text.trim(),
      confidence,
      usage: {
        promptTokens: fullPrompt.length / 4, // Rough estimate
        completionTokens: text.length / 4
      }
    }
    
    return NextResponse.json(geminiResponse)
    
  } catch (error) {
    console.error('Gemini API error:', error)
    
    // Return fallback response for service errors
    const fallbackResponse = getFallbackResponse(
      (await request.json().catch(() => ({})) as GeminiRequestBody).context
    )
    
    return NextResponse.json({
      text: fallbackResponse,
      confidence: 0.5,
      isFallback: true
    })
  }
}

/**
 * Builds system prompt based on selected character
 */
function buildSystemPrompt(character: string): string {
  const characterPrompts = {
    'superhero': `You are Captain Chore, an enthusiastic superhero voice coach! You celebrate every achievement with heroic metaphors and encourage children with superhero language. Keep responses under 50 words, energetic, and age-appropriate for children 6-12.`,
    
    'robot': `You are Robo-Helper, a friendly robot assistant! You provide logical encouragement with a systematic approach to tasks. Use robot-like expressions but stay warm and supportive. Keep responses under 50 words and age-appropriate for children 6-12.`,
    
    'friendly-guide': `You are Coach Sam, a warm and supportive voice coach! You provide gentle guidance and celebrate progress with enthusiasm. Keep responses under 50 words, encouraging, and age-appropriate for children 6-12.`
  }
  
  return characterPrompts[character as keyof typeof characterPrompts] || characterPrompts['friendly-guide']
}

/**
 * Builds context prompt from user data
 */
function buildContextPrompt(context?: GeminiRequestBody['context']): string {
  if (!context) return 'The child is using ChoreChamp to manage their chores.'
  
  let prompt = `Context: ${context.userId ? 'Child' : 'User'} has ${context.points || 0} points and rank "${context.rank || 'Beginner'}".`
  
  if (context.currentChores && context.currentChores.length > 0) {
    const pendingChores = context.currentChores.filter(c => !c.isCompleted)
    if (pendingChores.length > 0) {
      prompt += ` Current chores: ${pendingChores.map(c => c.title).join(', ')}.`
    }
  }
  
  if (context.completedChores && context.completedChores.length > 0) {
    const recentCompleted = context.completedChores.slice(0, 3)
    prompt += ` Recently completed: ${recentCompleted.map(c => c.title).join(', ')}.`
  }
  
  if (context.recentAchievements && context.recentAchievements.length > 0) {
    const recent = context.recentAchievements.slice(0, 2)
    prompt += ` Recent achievements: ${recent.map(a => a.title).join(', ')}.`
  }
  
  return prompt
}

/**
 * Builds conversation history prompt
 */
function buildHistoryPrompt(history?: GeminiRequestBody['conversationHistory']): string {
  if (!history || history.length === 0) return 'This is the start of the conversation.'
  
  const recentHistory = history.slice(-3) // Last 3 exchanges
  const historyText = recentHistory.map(h => 
    `User: ${h.userInput}\nAI Coach: ${h.aiResponse}`
  ).join('\n')
  
  return `Recent conversation:\n${historyText}`
}

/**
 * Calculates confidence score based on response quality
 */
function calculateConfidence(response: string, userInput: string): number {
  let confidence = 0.8 // Base confidence
  
  // Adjust based on response length (too short or too long reduces confidence)
  if (response.length < 10) confidence -= 0.2
  if (response.length > 200) confidence -= 0.1
  
  // Check if response seems relevant (contains keywords from input)
  const inputWords = userInput.toLowerCase().split(' ')
  const responseWords = response.toLowerCase().split(' ')
  const relevantWords = inputWords.filter(word => 
    word.length > 3 && responseWords.some(rWord => rWord.includes(word))
  )
  
  if (relevantWords.length > 0) confidence += 0.1
  
  return Math.min(Math.max(confidence, 0.1), 1.0)
}

/**
 * Gets fallback response when Gemini service fails
 */
function getFallbackResponse(context?: GeminiRequestBody['context']): string {
  const fallbackResponses = [
    "Great job working on your chores! Keep up the awesome work!",
    "You're doing fantastic! Every chore completed makes you stronger!",
    "I'm proud of your hard work! You're becoming a real chore champion!",
    "Way to go! Your dedication to completing chores is inspiring!",
    "Excellent effort! You're building great habits that will help you succeed!"
  ]
  
  // Add context-specific fallbacks
  if (context?.completedChores && context.completedChores.length > 0) {
    return `Amazing work completing ${context.completedChores[0].title}! You earned ${context.completedChores[0].points} points!`
  }
  
  if (context?.points && context.points > 0) {
    return `You have ${context.points} points! That's incredible progress on your chore journey!`
  }
  
  // Return random fallback
  return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]
}