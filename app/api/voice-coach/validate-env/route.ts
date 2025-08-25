import { NextResponse } from 'next/server';
import { validateVoiceCoachEnvironment } from '@/lib/lib/env-validation';

/**
 * API route to validate Voice Coach environment configuration
 * GET /api/voice-coach/validate-env
 */
export async function GET() {
  try {
    const validation = validateVoiceCoachEnvironment();
    
    if (validation.isValid) {
      return NextResponse.json({
        success: true,
        message: 'Voice Coach environment is properly configured',
        config: {
          // Return non-sensitive configuration info
          geminiModel: validation.config?.geminiModel,
          geminiTemperature: validation.config?.geminiTemperature,
          geminiMaxTokens: validation.config?.geminiMaxTokens,
          assemblyAiSampleRate: validation.config?.assemblyAISampleRate,
          elevenLabsModel: validation.config?.elevenLabsModel,
          defaultCharacter: validation.config?.defaultCharacter,
          maxSessionMinutes: validation.config?.maxSessionMinutes,
          dailyLimitMinutes: validation.config?.dailyLimitMinutes,
          // Don't return API keys for security
          hasGeminiKey: !!validation.config?.googleGeminiApiKey,
          hasAssemblyAiKey: !!validation.config?.assemblyAIApiKey,
          hasElevenLabsKey: !!validation.config?.elevenLabsApiKey
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Voice Coach environment validation failed',
        errors: validation.errors
      }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Error validating environment',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
