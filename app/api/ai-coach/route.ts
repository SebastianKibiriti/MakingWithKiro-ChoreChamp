import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!)

const CHARACTER_PROMPTS = {
  superhero: {
    personality: "You are a superhero coach who speaks with enthusiasm and uses superhero metaphors. You're encouraging, brave, and always positive. Use words like 'hero', 'power', 'strength', and 'mission'.",
    voiceId: "21m00Tcm4TlvDq8ikWAM" // ElevenLabs voice ID for energetic male voice
  },
  robot: {
    personality: "You are a friendly robot coach who speaks in a technical but warm way. Use phrases like 'BEEP BEEP', 'CALCULATING', 'SYSTEM UPDATE', and technical terms. You're logical but caring.",
    voiceId: "EXAVITQu4vr4xnSDxMaL" // ElevenLabs voice ID for robotic voice
  },
  wizard: {
    personality: "You are a wise, magical wizard coach who speaks with wonder and uses magical terms. Use phrases like 'By my beard!', 'Abracadabra!', 'magical', 'spells', and 'enchanted'.",
    voiceId: "ErXwobaYiN019PkySvjV" // ElevenLabs voice ID for wise voice
  },
  pirate: {
    personality: "You are a friendly pirate coach who speaks like a classic pirate. Use 'Ahoy!', 'Shiver me timbers!', 'Yo ho ho!', nautical terms, and pirate expressions. You're adventurous and fun.",
    voiceId: "onwK4e9ZLuTAKqWW03F9" // ElevenLabs voice ID for pirate voice
  }
}

export async function POST(request: NextRequest) {
  let character = 'superhero' // Default character
  
  try {
    const requestData = await request.json()
    character = requestData.character || 'superhero'
    const { childName, currentPoints, currentRank, recentActivity } = requestData

    const characterConfig = CHARACTER_PROMPTS[character as keyof typeof CHARACTER_PROMPTS] || CHARACTER_PROMPTS.superhero

    // Create context-aware prompt for Gemini
    const prompt = `
${characterConfig.personality}

You are encouraging a child named ${childName} who:
- Currently has ${currentPoints} points
- Is at rank: ${currentRank}
- Recent activity: ${recentActivity || 'just completed some chores'}

Generate a short, encouraging message (1-2 sentences) that:
1. Acknowledges their progress
2. Motivates them to continue
3. Stays in character
4. Is appropriate for children
5. Mentions their name

Keep it under 50 words and very positive!
`

    const model = genAI.getGenerativeModel({ model: "gemini-pro" })
    const result = await model.generateContent(prompt)
    const response = await result.response
    const message = response.text()

    return NextResponse.json({ 
      message: message.trim(),
      character,
      voiceId: characterConfig.voiceId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('AI Coach API Error:', error)
    
    // Fallback to predefined messages if AI fails
    const fallbackMessages = {
      superhero: `Great job, hero! You're showing real superhero strength!`,
      robot: `BEEP BEEP! Excellent work detected! Your efficiency levels are impressive!`,
      wizard: `By my magical beard, you're casting powerful spells of helpfulness!`,
      pirate: `Ahoy there! Ye be the finest crew member on this household ship!`
    }
    
    const fallbackMessage = fallbackMessages[character as keyof typeof fallbackMessages] || fallbackMessages.superhero
    
    return NextResponse.json({ 
      message: fallbackMessage,
      character,
      voiceId: CHARACTER_PROMPTS[character as keyof typeof CHARACTER_PROMPTS]?.voiceId,
      timestamp: new Date().toISOString()
    })
  }
}