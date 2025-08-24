# AI Voice Coach Environment Setup

This document outlines the environment configuration required for the AI Voice Coach feature.

## Required Dependencies

The following packages are required and have been installed:

- `@google/generative-ai` (^0.2.1) - Google Gemini AI integration
- `assemblyai` (^4.0.0) - Speech-to-text transcription
- `elevenlabs` (^1.59.0) - Text-to-speech synthesis
- `axios` (^1.11.0) - HTTP client for API calls

## Environment Variables

Copy `.env.local.example` to `.env.local` and configure the following variables:

### Required API Keys

```env
# AI Voice Coach API Keys
GOOGLE_GEMINI_API_KEY=your_google_gemini_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
```

### Optional Configuration (with defaults)

```env
# Google Gemini Configuration
GEMINI_MODEL=gemini-pro
GEMINI_TEMPERATURE=0.7
GEMINI_MAX_TOKENS=150

# AssemblyAI Configuration
ASSEMBLYAI_SAMPLE_RATE=16000

# ElevenLabs Configuration
ELEVENLABS_MODEL=eleven_monolingual_v1

# Voice Coach Settings
VOICE_COACH_DEFAULT_CHARACTER=friendly-guide
VOICE_COACH_MAX_SESSION_MINUTES=10
VOICE_COACH_DAILY_LIMIT_MINUTES=30
```

## API Key Setup

### Google Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env.local` file

### AssemblyAI API Key
1. Sign up at [AssemblyAI](https://www.assemblyai.com/)
2. Get your API key from the dashboard
3. Add it to your `.env.local` file

### ElevenLabs API Key
1. Sign up at [ElevenLabs](https://elevenlabs.io/)
2. Get your API key from your profile
3. Add it to your `.env.local` file

## Environment Validation

You can validate your environment configuration by visiting:
```
http://localhost:3000/api/voice-coach/validate-env
```

This endpoint will return:
- ✅ Success if all required variables are properly configured
- ❌ Error with details about missing or invalid configuration

## Environment Validation Utility

The `lib/env-validation.ts` utility provides:

- `validateVoiceCoachEnvironment()` - Validates all environment variables
- `getVoiceCoachConfig()` - Returns validated configuration or throws error
- `isVoiceCoachConfigured()` - Quick check if environment is ready

## Security Notes

- Never commit your `.env.local` file to version control
- API keys are sensitive and should be kept secure
- The validation endpoint does not expose actual API key values
- All API calls should be made server-side to protect keys

## Next Steps

Once environment is configured:
1. Verify configuration using the validation endpoint
2. Proceed with implementing the Voice Coach services
3. Test each service integration individually