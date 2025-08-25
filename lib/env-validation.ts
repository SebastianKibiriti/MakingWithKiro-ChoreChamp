/**
 * Environment variable validation utility for AI Voice Coach
 * Validates required API keys and configuration values
 */

interface VoiceCoachEnvConfig {
  googleGeminiApiKey: string;
  assemblyAIApiKey: string;
  elevenLabsApiKey: string;
  geminiModel: string;
  geminiTemperature: number;
  geminiMaxTokens: number;
  assemblyAISampleRate: number;
  elevenLabsModel: string;
  defaultCharacter: string;
  maxSessionMinutes: number;
  dailyLimitMinutes: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  config?: VoiceCoachEnvConfig;
}

/**
 * Validates all required environment variables for the AI Voice Coach
 * @returns ValidationResult with validation status and configuration
 */
export function validateVoiceCoachEnvironment(): ValidationResult {
  const errors: string[] = [];
  
  // Required API keys
  const googleGeminiApiKey = process.env.GOOGLE_GEMINI_API_KEY;
  const assemblyAIApiKey = process.env.ASSEMBLYAI_API_KEY;
  const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!googleGeminiApiKey) {
    errors.push('GOOGLE_GEMINI_API_KEY is required');
  }
  
  if (!assemblyAIApiKey) {
    errors.push('ASSEMBLYAI_API_KEY is required');
  }
  
  if (!elevenLabsApiKey) {
    errors.push('ELEVENLABS_API_KEY is required');
  }
  
  // Optional configuration with defaults
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-pro';
  const geminiTemperature = parseFloat(process.env.GEMINI_TEMPERATURE || '0.7');
  const geminiMaxTokens = parseInt(process.env.GEMINI_MAX_TOKENS || '150');
  const assemblyAISampleRate = parseInt(process.env.ASSEMBLYAI_SAMPLE_RATE || '16000');
  const elevenLabsModel = process.env.ELEVENLABS_MODEL || 'eleven_monolingual_v1';
  const defaultCharacter = process.env.VOICE_COACH_DEFAULT_CHARACTER || 'friendly-guide';
  const maxSessionMinutes = parseInt(process.env.VOICE_COACH_MAX_SESSION_MINUTES || '10');
  const dailyLimitMinutes = parseInt(process.env.VOICE_COACH_DAILY_LIMIT_MINUTES || '30');
  
  // Validate numeric values
  if (isNaN(geminiTemperature) || geminiTemperature < 0 || geminiTemperature > 2) {
    errors.push('GEMINI_TEMPERATURE must be a number between 0 and 2');
  }
  
  if (isNaN(geminiMaxTokens) || geminiMaxTokens < 1) {
    errors.push('GEMINI_MAX_TOKENS must be a positive number');
  }
  
  if (isNaN(assemblyAISampleRate) || assemblyAISampleRate < 8000) {
    errors.push('ASSEMBLYAI_SAMPLE_RATE must be at least 8000');
  }
  
  if (isNaN(maxSessionMinutes) || maxSessionMinutes < 1) {
    errors.push('VOICE_COACH_MAX_SESSION_MINUTES must be a positive number');
  }
  
  if (isNaN(dailyLimitMinutes) || dailyLimitMinutes < 1) {
    errors.push('VOICE_COACH_DAILY_LIMIT_MINUTES must be a positive number');
  }
  
  if (errors.length > 0) {
    return {
      isValid: false,
      errors
    };
  }
  
  return {
    isValid: true,
    errors: [],
    config: {
      googleGeminiApiKey: googleGeminiApiKey!,
      assemblyAIApiKey: assemblyAIApiKey!,
      elevenLabsApiKey: elevenLabsApiKey!,
      geminiModel,
      geminiTemperature,
      geminiMaxTokens,
      assemblyAISampleRate,
      elevenLabsModel,
      defaultCharacter,
      maxSessionMinutes,
      dailyLimitMinutes
    }
  };
}

/**
 * Gets validated environment configuration or throws an error
 * @returns VoiceCoachEnvConfig
 * @throws Error if validation fails
 */
export function getVoiceCoachConfig(): VoiceCoachEnvConfig {
  const validation = validateVoiceCoachEnvironment();
  
  if (!validation.isValid) {
    throw new Error(
      `Voice Coach environment validation failed:\n${validation.errors.join('\n')}`
    );
  }
  
  return validation.config!;
}

/**
 * Checks if Voice Coach is properly configured
 * @returns boolean indicating if all required environment variables are set
 */
export function isVoiceCoachConfigured(): boolean {
  return validateVoiceCoachEnvironment().isValid;
}