import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";

// Character-specific voice IDs from ElevenLabs
const CHARACTER_VOICES = {
  superhero: "Sth0oyItcRdvk3sFrPiq", // Noku - superhero voice
  robot: "ZD29qZCdYhhdqzBLRKNH", // Female humanoid - robotic voice
  wizard: "wgHvco1wiREKN0BdyVx5", // Drew - wise wizard voice
  pirate: "onwK4e9ZLuTAKqWW03F9", // Josh - gruff, adventurous male
};

export async function POST(request: NextRequest) {
  try {
    const { text, character } = await request.json();

    if (!ELEVENLABS_API_KEY) {
      console.log('ElevenLabs API key not found, falling back to browser TTS');
      return NextResponse.json({ 
        error: 'ElevenLabs API key not configured',
        fallback: true 
      }, { status: 400 });
    }

    const voiceId = CHARACTER_VOICES[character as keyof typeof CHARACTER_VOICES] || CHARACTER_VOICES.superhero;
    
    console.log(`Generating TTS for ${character} with voice ${voiceId}`);

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

    // Character-specific voice settings
    const voiceSettings = {
      superhero: {
        stability: 0.75,
        similarity_boost: 0.8,
        style: 0.2,
        use_speaker_boost: true
      },
      robot: {
        stability: 0.9,
        similarity_boost: 0.6,
        style: 0.1,
        use_speaker_boost: false
      },
      wizard: {
        stability: 0.8,
        similarity_boost: 0.9,
        style: 0.4,
        use_speaker_boost: true
      },
      pirate: {
        stability: 0.7,
        similarity_boost: 0.8,
        style: 0.3,
        use_speaker_boost: true
      }
    };

    const settings = voiceSettings[character as keyof typeof voiceSettings] || voiceSettings.superhero;

    const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: 'eleven_monolingual_v1',
        voice_settings: settings
      }),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    
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