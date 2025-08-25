interface VoiceCoachConfig {
  googleGeminiApiKey?: string
  elevenLabsApiKey?: string
  assemblyAIApiKey?: string
  geminiModel?: string
  geminiTemperature?: number
  geminiMaxTokens?: number
  assemblyAISampleRate?: number
  elevenLabsModel?: string
  defaultCharacter?: string
  maxSessionMinutes?: number
  dailyLimitMinutes?: number
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  config?: VoiceCoachConfig
}

export function validateVoiceCoachEnvironment(): ValidationResult {
  const errors: string[] = []
  
  const config: VoiceCoachConfig = {
    googleGeminiApiKey: process.env.GOOGLE_GEMINI_API_KEY,
    elevenLabsApiKey: process.env.ELEVENLABS_API_KEY,
    assemblyAIApiKey: process.env.ASSEMBLYAI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL || 'gemini-pro',
    geminiTemperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
    geminiMaxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '150'),
    assemblyAISampleRate: parseInt(process.env.ASSEMBLYAI_SAMPLE_RATE || '16000'),
    elevenLabsModel: process.env.ELEVENLABS_MODEL || 'eleven_monolingual_v1',
    defaultCharacter: process.env.VOICE_COACH_DEFAULT_CHARACTER || 'friendly-guide',
    maxSessionMinutes: parseInt(process.env.VOICE_COACH_MAX_SESSION_MINUTES || '10'),
    dailyLimitMinutes: parseInt(process.env.VOICE_COACH_DAILY_LIMIT_MINUTES || '30')
  }

  if (!config.googleGeminiApiKey) {
    errors.push('GOOGLE_GEMINI_API_KEY is required')
  }

  if (!config.elevenLabsApiKey) {
    errors.push('ELEVENLABS_API_KEY is required')
  }

  if (!config.assemblyAIApiKey) {
    errors.push('ASSEMBLYAI_API_KEY is required')
  }

  return {
    isValid: errors.length === 0,
    errors,
    config
  }
}

export function getVoiceCoachConfig(): VoiceCoachConfig {
  const validation = validateVoiceCoachEnvironment()
  return validation.config || {}
}