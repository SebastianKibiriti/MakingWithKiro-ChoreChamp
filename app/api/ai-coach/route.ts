import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getRankByPoints, getNextRank } from "../../../lib/ranks";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

const CHARACTER_PROMPTS = {
  superhero: {
    personality:
      "You are a superhero coach who speaks with enthusiasm and uses superhero metaphors. You're encouraging, brave, and always positive. Use words like 'hero', 'power', 'strength', and 'mission'.",
    voiceId: "Sth0oyItcRdvk3sFrPiq", // ElevenLabs voice ID for Noku
  },
  robot: {
    personality:
      "You are a friendly robot coach who speaks in a technical but warm way. Use phrases like 'BEEP BEEP', 'CALCULATING', 'SYSTEM UPDATE', and technical terms. You're logical but caring.",
    voiceId: "ZEcx3Wdpj4EvM8PltzHY", // ElevenLabs voice ID for new robot voice
  },
  wizard: {
    personality:
      "You are a wise, magical wizard coach who speaks with wonder and uses magical terms. Use phrases like 'By my beard!', 'Abracadabra!', 'magical', 'spells', and 'enchanted'.",
    voiceId: "wgHvco1wiREKN0BdyVx5", // ElevenLabs voice ID for Drew
  },
  pirate: {
    personality:
      "You are a friendly pirate coach who speaks like a classic pirate. Use 'Ahoy!', 'Shiver me timbers!', 'Yo ho ho!', nautical terms, and pirate expressions. You're adventurous and fun.",
    voiceId: "onwK4e9ZLuTAKqWW03F9", // ElevenLabs voice ID for pirate voice
  },
};

export async function POST(request: NextRequest) {
  let character = "Superhero"; // Default character

  try {
    const requestData = await request.json();
    console.log('AI Coach API received:', requestData);
    
    character = requestData.character || "Superhero";
    const { message, profile } = requestData;
    
    console.log('Processing request:', { character, message, profileName: profile?.name });
    
    // Check if Gemini API key exists
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not set');
    }
    
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    console.log('Gemini API key exists:', apiKey ? 'Yes' : 'No');
    console.log('API key starts with AIza:', apiKey?.startsWith('AIza') ? 'Yes' : 'No');
    console.log('API key length:', apiKey?.length || 0);

    const characterKey = character.toLowerCase() as keyof typeof CHARACTER_PROMPTS;
    const characterConfig = CHARACTER_PROMPTS[characterKey] || CHARACTER_PROMPTS.superhero;

    // Calculate rank progression info
    const currentPoints = profile?.points || 0;
    const currentRank = getRankByPoints(currentPoints);
    const nextRank = getNextRank(currentPoints);
    const pointsNeeded = nextRank ? nextRank.points - currentPoints : 0;

    // Create context-aware prompt for chore assistance
    const prompt = `
${characterConfig.personality}

You are an AI chore coach helping a child named ${profile?.name || 'Champion'}. 

IMPORTANT CONTEXT:
- Current points: ${currentPoints}
- Current rank: ${currentRank.name} ${currentRank.icon}
- Next rank: ${nextRank ? `${nextRank.name} ${nextRank.icon}` : 'Already at highest rank!'}
- Points needed for promotion: ${pointsNeeded}

They are asking: "${message}"

Your role is to:
1. Help with chore-related questions (how to clean, organize, do tasks efficiently)
2. Provide step-by-step instructions when needed
3. Give encouragement and motivation
4. Stay in character as a ${character}
5. Keep responses appropriate for children
6. Be helpful, positive, and engaging
7. If they ask about points/promotion, use the EXACT numbers provided above

If they ask about points needed for promotion, say exactly "${pointsNeeded} more points" to reach ${nextRank?.name || 'the highest rank'}.

Keep your response under 100 words and very helpful!
`;

    console.log('Calling Gemini with prompt:', prompt);
    
    try {
      // Test if genAI is properly initialized
      if (!genAI) {
        throw new Error('GoogleGenerativeAI not initialized');
      }
      
      console.log('Creating Gemini model...');
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      console.log('Generating content...');
      const result = await model.generateContent(prompt);
      
      console.log('Getting response...');
      const response = result.response;
      const responseText = response.text();
      
      console.log('Gemini response received:', responseText);
      
      if (!responseText || responseText.trim().length === 0) {
        throw new Error('Empty response from Gemini');
      }
      
      return NextResponse.json({
        response: responseText.trim(),
        character,
        voiceId: characterConfig.voiceId,
        timestamp: new Date().toISOString(),
        source: 'gemini'
      });
      
    } catch (geminiError) {
      console.error('Gemini API specific error:', geminiError);
      
      // If Gemini fails, fall back to simple responses
      const simpleResponses: { [key: string]: string } = {
        'clean plates': 'First, scrape off any leftover food. Then rinse with warm water, apply dish soap, scrub gently with a sponge, and rinse thoroughly!',
        'clean room': 'Start by picking up toys and clothes, make your bed, dust surfaces, and vacuum the floor. Take it one step at a time!',
        'do dishes': 'Fill sink with warm soapy water, wash from cleanest to dirtiest items, rinse well, and let them air dry!',
        'organize closet': 'Take everything out, sort into keep/donate piles, then put back by category - shirts together, pants together!',
        'vacuum': 'Clear the floor first, start from the farthest corner and work toward the door, use slow overlapping strokes!',
        'make bed': 'Pull the sheets tight and smooth, fluff your pillow, fold the blanket neatly at the foot, and tuck in the sides!',
        'clean floor': 'First pick up any toys or items, then sweep or vacuum, and finally mop with a damp cloth if needed!',
        'fold clothes': 'Lay the item flat, fold sleeves in, fold in half from bottom to top, and stack neatly in your drawer!',
        'take out trash': 'Tie up the bag, take it to the outdoor bin, put in a new bag, and wash your hands when done!',
        'feed pet': 'Measure the right amount of food, fill the bowl, check the water dish, and give your pet some love!'
      };
      
      const lowerMessage = message.toLowerCase();
      let responseText = '';
      
      for (const [key, response] of Object.entries(simpleResponses)) {
        if (lowerMessage.includes(key)) {
          responseText = response;
          break;
        }
      }
      
      if (!responseText) {
        responseText = `Great question! For any chore, remember: break it into small steps, take your time, and ask for help if needed. You've got this, ${profile?.name || 'Champion'}!`;
      }
      
      // Add character personality
      const characterPrefixes = {
        superhero: '🦸‍♂️ Hero! ',
        robot: '🤖 BEEP BEEP! ',
        wizard: '🧙‍♂️ By my beard! ',
        pirate: '🏴‍☠️ Ahoy matey! '
      };
      
      const prefix = characterPrefixes[character.toLowerCase() as keyof typeof characterPrefixes] || '🦸‍♂️ Hero! ';
      responseText = prefix + responseText;
      
      console.log('Using fallback response due to Gemini error:', responseText);
      
      return NextResponse.json({
        response: responseText,
        character,
        voiceId: characterConfig.voiceId,
        timestamp: new Date().toISOString(),
        fallback: true
      });
    }


  } catch (error) {
    console.error("AI Coach API Error:", error);
    console.error("Error details:", error instanceof Error ? error.message : 'Unknown error');
    console.error("Stack trace:", error instanceof Error ? error.stack : 'No stack trace');

    // Check if it's a Gemini API error
    if (error instanceof Error && error.message.includes('API_KEY')) {
      console.error("Gemini API Key issue detected");
    }

    // Fallback responses based on common chore questions
    const fallbackResponses = {
      superhero: `Hey hero! I'm here to help you conquer any chore challenge! Whether it's cleaning your room, doing dishes, or organizing - every task makes you stronger! What specific chore do you need help with?`,
      robot: `BEEP BEEP! Chore assistance protocol activated! I can help you optimize your cleaning efficiency and break down any task into manageable steps. What household mission requires my computational assistance?`,
      wizard: `By my magical beard! I have enchanted knowledge of all household spells - from room cleaning magic to dish-washing wizardry! What mystical chore challenge shall we tackle together?`,
      pirate: `Ahoy there, matey! This old sea dog knows all about keeping a ship (and house) shipshape! From swabbing decks to organizing treasure, I'll help ye navigate any chore adventure!`,
    };

    const fallbackResponse = fallbackResponses[character.toLowerCase() as keyof typeof fallbackResponses] || fallbackResponses.superhero;

    return NextResponse.json({
      response: fallbackResponse,
      character,
      voiceId: "Sth0oyItcRdvk3sFrPiq", // Default voice ID for fallback (Noku)
      timestamp: new Date().toISOString(),
      error: "AI service temporarily unavailable, using fallback response"
    }, { status: 200 }); // Return 200 instead of 500 for fallback
  }
}
