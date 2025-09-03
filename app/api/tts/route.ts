import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_MODEL = process.env.ELEVENLABS_MODEL || 'eleven_turbo_v2_5';
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";

// Character-specific voice IDs from ElevenLabs
const CHARACTER_VOICES = {
  superhero: "Sth0oyItcRdvk3sFrPiq", // ElevenLabs voice ID for superhero
  robot: "ZD29qZCdYhhdqzBLRKNH", // ElevenLabs voice ID for robot
  wizard: "V33LkP9pVLdcjeB2y5Na", // ElevenLabs voice ID for wizard
  genz: "h8LZpYr8y3VBz0q2x0LP", // ElevenLabs voice ID for Gen Z
};

export async function POST(request: NextRequest) {
  try {
    const { text, character } = await request.json();
    
    console.log(`TTS API received request - character: "${character}", text length: ${text?.length || 0}`);

    if (!ELEVENLABS_API_KEY) {
      console.log('ElevenLabs API key not found, falling back to browser TTS');
      return NextResponse.json({ 
        error: 'ElevenLabs API key not configured',
        fallback: true 
      }, { status: 400 });
    }

    const voiceId = CHARACTER_VOICES[character as keyof typeof CHARACTER_VOICES] || CHARACTER_VOICES.superhero;
    
    console.log(`Generating TTS for character "${character}" with voice ID "${voiceId}"`);
    console.log(`Using ElevenLabs model: "${ELEVENLABS_MODEL}"`);
    console.log(`Available characters:`, Object.keys(CHARACTER_VOICES));

    // Clean text for better speech synthesis
    const cleanTextForSpeech = (inputText: string): string => {
      return inputText
        // Remove emojis
        .replace(/[🦸‍♂️🤖🧙‍♂️🏴‍☠️⭐💡]/g, '')
        // Remove markdown formatting
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold **text**
        .replace(/\*(.*?)\*/g, '$1')     // Remove italic *text*
        .replace(/__(.*?)__/g, '$1')     // Remove underline __text__
        .replace(/_(.*?)_/g, '$1')       // Remove italic _text_
        .replace(/`(.*?)`/g, '$1')       // Remove code `text`
        .replace(/#{1,6}\s/g, '')        // Remove headers # ## ###
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links [text](url)
        // Remove other special characters that might cause speech issues
        .replace(/[*#_`~]/g, '')         // Remove remaining markdown chars
        .replace(/\s+/g, ' ')            // Normalize whitespace
        .trim()
    }
    
    const cleanText = cleanTextForSpeech(text);

    // Use default ElevenLabs voice settings for all characters
    const defaultSettings = {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true
    };

    const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: ELEVENLABS_MODEL,
        voice_settings: defaultSettings
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`ElevenLabs TTS successful - generated ${audioBuffer.byteLength} bytes of audio`);
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('TTS API Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'TTS generation failed',
      fallback: true 
    }, { status: 500 });
  }
}