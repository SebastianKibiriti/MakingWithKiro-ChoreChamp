# Voice Coach API Documentation

This document describes the API routes for the AI Voice Coach feature in ChoreChamp.

## Overview

The Voice Coach API provides endpoints for:
- Speech-to-text transcription using AssemblyAI
- AI response generation using Google Gemini
- Text-to-speech synthesis using ElevenLabs
- Environment validation and testing

All routes include rate limiting and comprehensive error handling with fallback mechanisms.

## Authentication

All API routes are server-side only and use API keys stored in environment variables. No client-side authentication is required.

## Rate Limits

- **Gemini API**: 10 requests per minute
- **ElevenLabs API**: 20 requests per minute  
- **AssemblyAI API**: 30 requests per minute
- **Token Generation**: 5 requests per minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Timestamp when limit resets
- `Retry-After`: Seconds to wait before retrying (on 429 errors)

## Endpoints

### Environment Validation

#### GET /api/voice-coach/validate-env

Validates that all required environment variables are properly configured.

**Response:**
```json
{
  "success": true,
  "message": "Voice Coach environment is properly configured",
  "config": {
    "geminiModel": "gemini-pro",
    "geminiTemperature": 0.7,
    "geminiMaxTokens": 150,
    "assemblyAiSampleRate": 16000,
    "elevenLabsModel": "eleven_monolingual_v1",
    "defaultCharacter": "friendly-guide",
    "maxSessionMinutes": 10,
    "dailyLimitMinutes": 30,
    "hasGeminiKey": true,
    "hasAssemblyAiKey": true,
    "hasElevenLabsKey": true
  }
}
```

### AssemblyAI Integration

#### POST /api/voice-coach/assemblyai-token

Generates a secure session token for AssemblyAI real-time transcription.

**Response:**
```json
{
  "token": "session_token_here",
  "expires_in": 3600
}
```

#### POST /api/voice-coach/assemblyai-transcribe

Transcribes audio data using AssemblyAI.

**Request Body:**
```json
{
  "audioData": "base64_encoded_audio_data", // OR
  "audioUrl": "https://example.com/audio.wav",
  "language": "en_us", // optional
  "wordBoost": ["chore", "task"], // optional
  "punctuate": true, // optional
  "formatText": true // optional
}
```

**Response:**
```json
{
  "text": "I finished cleaning my room",
  "confidence": 0.95,
  "words": [
    {
      "text": "I",
      "start": 0.0,
      "end": 0.1,
      "confidence": 0.99
    }
  ],
  "isFinal": true,
  "audioId": "transcript_id"
}
```

#### GET /api/voice-coach/assemblyai-transcribe?id=transcript_id

Checks the status of a transcription job.

**Response:**
```json
{
  "status": "completed",
  "text": "I finished cleaning my room",
  "confidence": 0.95,
  "isFinal": true,
  "audioId": "transcript_id"
}
```

### Google Gemini Integration

#### POST /api/voice-coach/gemini-response

Generates AI responses using Google Gemini.

**Request Body:**
```json
{
  "userInput": "I finished cleaning my room",
  "context": {
    "userId": "user_123",
    "currentChores": [
      {
        "id": "chore_1",
        "title": "Clean bedroom",
        "points": 10,
        "isCompleted": true
      }
    ],
    "completedChores": [],
    "points": 150,
    "rank": "Chore Champion",
    "recentAchievements": []
  },
  "character": "superhero", // optional
  "conversationHistory": [ // optional
    {
      "userInput": "Hi there",
      "aiResponse": "Hello! Ready to tackle some chores?",
      "timestamp": "2024-01-01T12:00:00Z"
    }
  ]
}
```

**Response:**
```json
{
  "text": "Fantastic work, Chore Champion! You've earned 10 points for cleaning your bedroom. Your dedication is truly heroic!",
  "confidence": 0.9,
  "usage": {
    "promptTokens": 120,
    "completionTokens": 25
  }
}
```

### ElevenLabs Integration

#### POST /api/voice-coach/elevenlabs-speech

Converts text to speech using ElevenLabs.

**Request Body:**
```json
{
  "text": "Great job completing your chores!",
  "character": "superhero", // optional
  "voiceSettings": { // optional
    "stability": 0.75,
    "similarityBoost": 0.75,
    "style": 0.0,
    "useSpeakerBoost": true
  }
}
```

**Response:**
- Content-Type: `audio/mpeg`
- Binary audio data
- Headers:
  - `X-Voice-Character`: Character used
  - `X-Voice-Name`: Character display name
  - `Cache-Control`: Caching instructions

#### GET /api/voice-coach/elevenlabs-speech

Gets available voice characters.

**Response:**
```json
{
  "characters": [
    {
      "id": "superhero",
      "name": "Captain Chore",
      "description": "Enthusiastic superhero coach"
    },
    {
      "id": "robot",
      "name": "Robo-Helper", 
      "description": "Friendly robot assistant"
    },
    {
      "id": "friendly-guide",
      "name": "Coach Sam",
      "description": "Warm and supportive coach"
    }
  ],
  "defaultCharacter": "friendly-guide"
}
```

### Testing

#### GET /api/voice-coach/test-routes

Tests all Voice Coach API routes and returns status information.

**Response:**
```json
{
  "success": true,
  "message": "3/3 routes working correctly",
  "details": {
    "environment": "configured",
    "routes": {
      "validateEnv": {
        "status": 200,
        "working": true
      },
      "assemblyaiToken": {
        "status": 200,
        "working": true
      },
      "elevenLabsCharacters": {
        "status": 200,
        "working": true
      }
    }
  },
  "availableRoutes": [
    "GET /api/voice-coach/validate-env - Environment validation",
    "POST /api/voice-coach/assemblyai-token - Get AssemblyAI session token",
    "POST /api/voice-coach/assemblyai-transcribe - Transcribe audio",
    "GET /api/voice-coach/assemblyai-transcribe?id=<id> - Check transcription status",
    "POST /api/voice-coach/gemini-response - Generate AI response",
    "POST /api/voice-coach/elevenlabs-speech - Synthesize speech",
    "GET /api/voice-coach/elevenlabs-speech - Get available characters",
    "GET /api/voice-coach/test-routes - This test endpoint"
  ]
}
```

## Error Handling

All endpoints return consistent error responses with fallback information:

```json
{
  "error": "Service temporarily unavailable",
  "type": "SERVICE_UNAVAILABLE",
  "fallbackAvailable": true,
  "retryAfter": 30
}
```

### Error Types

- `VALIDATION_ERROR`: Invalid request parameters
- `RATE_LIMIT_ERROR`: Too many requests
- `SERVICE_UNAVAILABLE`: External service down
- `API_KEY_ERROR`: Authentication failed
- `QUOTA_EXCEEDED`: API quota exceeded
- `AUDIO_PROCESSING_ERROR`: Audio processing failed
- `TRANSCRIPTION_ERROR`: Speech-to-text failed
- `AI_GENERATION_ERROR`: AI response generation failed
- `SPEECH_SYNTHESIS_ERROR`: Text-to-speech failed
- `INTERNAL_ERROR`: Server error

### Fallback Mechanisms

When services fail, the API provides fallback options:

1. **AssemblyAI failure**: Suggests browser Speech Recognition API
2. **Gemini failure**: Returns pre-configured encouraging responses
3. **ElevenLabs failure**: Returns text for browser Text-to-Speech API

## Environment Variables

Required environment variables:

```env
# Google Gemini
GOOGLE_GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-pro
GEMINI_TEMPERATURE=0.7
GEMINI_MAX_TOKENS=150

# AssemblyAI
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
ASSEMBLYAI_SAMPLE_RATE=16000

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_MODEL=eleven_monolingual_v1

# Voice Coach Settings
VOICE_COACH_DEFAULT_CHARACTER=friendly-guide
VOICE_COACH_MAX_SESSION_MINUTES=10
VOICE_COACH_DAILY_LIMIT_MINUTES=30
```

## Usage Examples

### Complete Voice Interaction Flow

1. **Get session token** (for real-time transcription):
   ```javascript
   const tokenResponse = await fetch('/api/voice-coach/assemblyai-token', {
     method: 'POST'
   });
   const { token } = await tokenResponse.json();
   ```

2. **Transcribe audio**:
   ```javascript
   const transcribeResponse = await fetch('/api/voice-coach/assemblyai-transcribe', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       audioData: base64AudioData,
       language: 'en_us'
     })
   });
   const { text } = await transcribeResponse.json();
   ```

3. **Generate AI response**:
   ```javascript
   const aiResponse = await fetch('/api/voice-coach/gemini-response', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       userInput: text,
       context: userContext,
       character: 'superhero'
     })
   });
   const { text: aiText } = await aiResponse.json();
   ```

4. **Synthesize speech**:
   ```javascript
   const speechResponse = await fetch('/api/voice-coach/elevenlabs-speech', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       text: aiText,
       character: 'superhero'
     })
   });
   const audioBlob = await speechResponse.blob();
   ```

This completes the full voice interaction cycle from speech input to audio output.