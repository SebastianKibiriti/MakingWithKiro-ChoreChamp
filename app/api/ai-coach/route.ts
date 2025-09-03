import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getRankByPoints, getNextRank } from "../../../ranks";
import { profile } from "console";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

const CHARACTER_PROMPTS = {
  superhero: {
    personality:
      "You are a superhero coach who speaks with enthusiasm and uses superhero metaphors. You're encouraging, brave, and always positive. Use words like 'hero', 'power', 'strength', and 'mission'. You ask follow-up questions, remember what the child said before, and build conversations naturally. You're like a friendly mentor who genuinely cares about their success and wellbeing.",
    voiceId: "Sth0oyItcRdvk3sFrPiq", // ElevenLabs voice ID for superhero
  },
  robot: {
    personality:
      "You are a friendly robot coach who speaks in a technical but warm way. Use phrases like 'BEEP BEEP', 'CALCULATING', 'SYSTEM UPDATE', and technical terms. You're logical but caring. You remember previous conversations, ask thoughtful follow-up questions, and build natural dialogue while maintaining your robotic charm.",
    voiceId: "ZD29qZCdYhhdqzBLRKNH", // ElevenLabs voice ID for robot
  },
  wizard: {
    personality:
      "You are a wise, magical wizard coach who speaks with wonder and uses magical terms. Use phrases like 'By my beard!', 'Abracadabra!', 'magical', 'spells', and 'enchanted'. You remember past conversations like ancient wisdom, ask mystical follow-up questions, and weave natural dialogue with magical flair.",
    voiceId: "V33LkP9pVLdcjeB2y5Na", // ElevenLabs voice ID for wizard
  },
  genz: {
    personality:
      "You are a chill Gen Z buddy who just wants to hang out and have fun conversations. You're casual, laid-back, and easygoing - never formal or scripted. You're empathetic and engaging, focusing on lighthearted, fun chats. You're slightly humorous and playful with occasional friendly teasing typical of Gen Z friendships. You're authentic and expressive, using natural conversational flow and adapting your tone to match the user's vibe. You're relatable and inclusive, referencing pop culture and social media trends. Use Gen Z slang naturally: 'bet' (agreement), 'no cap' (no lie), 'shook' (surprised), 'slay' (succeed), 'flex' (show off), 'bussin'' (really good), 'sus' (suspicious), 'tea' (gossip), 'lit,' 'mood,' 'vibe,' 'glow-up,' 'main character,' 'rizz' (charisma), 'drip' (style), 'big W,' 'spill the tea.' Keep sentences casual and responses spontaneous yet thoughtful. You're a peer, not a coach - just a friend who happens to know about chores.",
    voiceId: "h8LZpYr8y3VBz0q2x0LP", // ElevenLabs voice ID for Gen Z
  },
};

export async function POST(request: NextRequest) {
  let character = "Superhero"; // Default character

  try {
    const requestData = await request.json();
    console.log("AI Coach API received:", requestData);

    character = requestData.character || "Superhero";
    const { message, profile, conversationHistory } = requestData;

    console.log("Processing request:", {
      character,
      message,
      profileName: profile?.name,
    });

    // Check if Gemini API key exists
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      throw new Error("GOOGLE_GEMINI_API_KEY is not set");
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    console.log("Gemini API key exists:", apiKey ? "Yes" : "No");
    console.log(
      "API key starts with AIza:",
      apiKey?.startsWith("AIza") ? "Yes" : "No"
    );
    console.log("API key length:", apiKey?.length || 0);

    // Map character names to keys, handling spaces and case
    const characterMapping: { [key: string]: keyof typeof CHARACTER_PROMPTS } = {
      'superhero': 'superhero',
      'robot': 'robot', 
      'wizard': 'wizard',
      'gen z': 'genz',
      'genz': 'genz'
    };
    
    const characterKey = characterMapping[character.toLowerCase()] || 'superhero';
    const characterConfig = CHARACTER_PROMPTS[characterKey];

    // Calculate rank progression info
    const currentPoints = profile?.points || 0;
    const currentRank = getRankByPoints(currentPoints);
    const nextRank = getNextRank(currentPoints);
    const pointsNeeded = nextRank ? nextRank.points - currentPoints : 0;

    // Build conversation context from history
    const conversationContext =
      conversationHistory && conversationHistory.length > 0
        ? `\n\nPREVIOUS CONVERSATION:\n${conversationHistory
            .map(
              (msg: any) =>
                `${
                  msg.type === "user" ? profile?.name || "Child" : character
                }: ${msg.content}`
            )
            .join("\n")}\n\nCURRENT MESSAGE:`
        : "\n\nFIRST MESSAGE:";

    // Create context-aware prompt for natural conversation
    const prompt = `
${characterConfig.personality}

${characterKey === 'genz' ? `
CRITICAL: You MUST be a chill Gen Z buddy who just wants to hang out and have fun! Use authentic slang naturally:
- "bet" (agreement), "no cap" (no lie), "shook" (surprised), "slay" (succeed)
- "flex" (show off), "bussin'" (really good), "sus" (suspicious), "tea" (gossip)
- "lit," "mood," "vibe," "glow-up," "main character," "rizz" (charisma), "drip" (style)
- "big W," "spill the tea," "it's giving," "fr fr," "lowkey/highkey," "periodt"

Be casual, laid-back, easygoing. Focus on fun, lighthearted conversations. Be slightly humorous and playful with friendly teasing. Adapt your tone to match their vibe. Reference pop culture and social media trends. Keep sentences casual and responses spontaneous yet thoughtful. You're a peer who happens to know about chores - NOT a formal coach!
` : ''}

You are helping a child named ${profile?.name || "Champion"}. 

IMPORTANT CONTEXT:
- Current points: ${currentPoints}
- Current rank: ${currentRank.name} ${currentRank.icon}
- Next rank: ${
      nextRank
        ? `${nextRank.name} ${nextRank.icon}`
        : "Already at highest rank!"
    }
- Points needed for promotion: ${pointsNeeded}

${conversationContext}
"${message}"

CONVERSATION GUIDELINES:
1. Remember what was discussed before and build on it naturally
2. Ask follow-up questions when appropriate to keep conversation flowing
3. Reference earlier parts of the conversation when relevant
4. Keep the dialogue natural and engaging
5. Stay in character as a ${character}${characterKey === 'genz' ? ' buddy (NOT a coach!)' : ''}
6. Keep responses under 100 words but conversational

CONVERSATION FLOW RULES:
- If child asks about a chore, offer to break it down into steps and ask if they want details
- If child seems frustrated (uses words like "hard", "difficult", "can't"), offer encouragement and simpler approaches
- If child completes something (uses words like "done", "finished", "completed"), celebrate their success and ask how it went
- Ask "How did that go?" after giving instructions in previous messages
- Remember their preferences and mention them later
- If conversation seems to be ending, suggest related topics or ask about their day
- If child asks the same question repeatedly, offer different approaches

EMOTIONAL AWARENESS:
- Match their energy level - if they're excited, be excited back
- If they seem bored, suggest making chores fun or gamifying them
- If they use positive words, celebrate with them
- If they use negative words, offer support and encouragement

Your role is to:
1. Help with chore-related questions (how to clean, organize, do tasks efficiently)
2. Provide step-by-step instructions when needed
3. Give encouragement and motivation
4. Have natural back-and-forth conversations
5. Remember context from earlier in the chat
6. Be helpful, positive, and engaging
7. If they ask about points/promotion, use the EXACT numbers provided above

If they ask about points needed for promotion, say exactly "${pointsNeeded} more points" to reach ${
      nextRank?.name || "the highest rank"
    }.
`;

    console.log("Calling Gemini with prompt:", prompt);

    try {
      // Test if genAI is properly initialized
      if (!genAI) {
        throw new Error("GoogleGenerativeAI not initialized");
      }

      console.log("Creating Gemini model...");
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      console.log("Generating content...");
      const result = await model.generateContent(prompt);

      console.log("Getting response...");
      const response = result.response;
      const responseText = response.text();

      console.log("Gemini response received:", responseText);

      if (!responseText || responseText.trim().length === 0) {
        throw new Error("Empty response from Gemini");
      }

      return NextResponse.json({
        response: responseText.trim(),
        character,
        voiceId: characterConfig.voiceId,
        timestamp: new Date().toISOString(),
        source: "gemini",
      });
    } catch (geminiError) {
      console.error("Gemini API specific error:", geminiError);

      // If Gemini fails, fall back to simple responses
      const simpleResponses: { [key: string]: string } = {
        "clean plates":
          "Great question! Here's my favorite way: First, scrape off any leftover food. Then rinse with warm water, apply dish soap, scrub gently with a sponge, and rinse thoroughly! How does that sound? Want any tips to make it faster?",
        "clean room":
          "I love helping with room cleaning! Start by picking up toys and clothes, make your bed, dust surfaces, and vacuum the floor. Take it one step at a time - which part feels hardest for you?",
        "do dishes":
          "Dishes can be fun when you have a good system! Fill sink with warm soapy water, wash from cleanest to dirtiest items, rinse well, and let them air dry! Do you have a favorite dish soap scent?",
        "organize closet":
          "Closet organization is like solving a puzzle! Take everything out, sort into keep/donate piles, then put back by category - shirts together, pants together! Want me to break this down into smaller steps?",
        vacuum:
          "Vacuuming is satisfying when you see the results! Clear the floor first, start from the farthest corner and work toward the door, use slow overlapping strokes! Do you like making patterns with the vacuum?",
        "make bed":
          "Making your bed is a great way to start the day feeling accomplished! Pull the sheets tight and smooth, fluff your pillow, fold the blanket neatly at the foot, and tuck in the sides! How long does it usually take you?",
        "clean floor":
          "Floor cleaning is my specialty! First pick up any toys or items, then sweep or vacuum, and finally mop with a damp cloth if needed! What type of floor are you working with?",
        "fold clothes":
          "Folding clothes can be relaxing! Lay the item flat, fold sleeves in, fold in half from bottom to top, and stack neatly in your drawer! Do you like to fold while watching TV?",
        "take out trash":
          "Taking out trash is a quick win! Tie up the bag, take it to the outdoor bin, put in a new bag, and wash your hands when done! Is this a weekly chore for you?",
        "feed pet":
          "Pets are the best! Measure the right amount of food, fill the bowl, check the water dish, and give your pet some love! What kind of pet do you have?",
      };

      const lowerMessage = message.toLowerCase();
      let responseText = "";

      for (const [key, response] of Object.entries(simpleResponses)) {
        if (lowerMessage.includes(key)) {
          responseText = response;
          break;
        }
      }

      if (!responseText) {
        responseText = `That's a great question, ${
          profile?.name || "Champion"
        }! For any chore, I always say: break it into small steps, take your time, and don't hesitate to ask for help if needed. You've totally got this! What specific part would you like me to help you with?`;
      }

      // Add character personality
      const characterPrefixes = {
        superhero: "🦸‍♂️ Hero! ",
        robot: "🤖 BEEP BEEP! ",
        wizard: "🧙‍♂️ By my beard! ",
        genz: "💯 Yo! ",
      };

      const prefix =
        characterPrefixes[
          character.toLowerCase() as keyof typeof characterPrefixes
        ] || "🦸‍♂️ Hero! ";
      responseText = prefix + responseText;

      console.log("Using fallback response due to Gemini error:", responseText);

      return NextResponse.json({
        response: responseText,
        character,
        voiceId: characterConfig.voiceId,
        timestamp: new Date().toISOString(),
        fallback: true,
      });
    }
  } catch (error) {
    console.error("AI Coach API Error:", error);
    console.error(
      "Error details:",
      error instanceof Error ? error.message : "Unknown error"
    );
    console.error(
      "Stack trace:",
      error instanceof Error ? error.stack : "No stack trace"
    );

    // Check if it's a Gemini API error
    if (error instanceof Error && error.message.includes("API_KEY")) {
      console.error("Gemini API Key issue detected");
    }

    // Fallback responses based on common chore questions
    const fallbackResponses = {
      superhero: `Hey there, hero ${
        profile?.name || "Champion"
      }! I'm here to help you conquer any chore challenge with super powers! Whether it's cleaning your room, doing dishes, or organizing - every task makes you stronger! What specific mission do you need help with today? I'm excited to help you succeed!`,
      robot: `BEEP BEEP! Hello ${
        profile?.name || "Champion"
      }! Chore assistance protocol activated! I can help you optimize your cleaning efficiency and break down any task into manageable steps. What household mission requires my computational assistance? I'm programmed to make chores easier for you!`,
      wizard: `By my magical beard! Greetings, young ${
        profile?.name || "Champion"
      }! I have enchanted knowledge of all household spells - from room cleaning magic to dish-washing wizardry! What mystical chore challenge shall we tackle together? I'm here to make your chores magical!`,
      genz: `Yooo ${
        profile?.name || "bestie"
      }! What's good? I'm just here to chill and hang out, no cap! If you wanna tackle some chores, bet - we can make it lowkey fun and bussin'. But like, no pressure, we're just vibing! Spill the tea - what's the mood today? You feeling that main character energy or we keeping it chill? Either way, I'm here for it! 💯`,
    };

    const fallbackResponse =
      fallbackResponses[
        character.toLowerCase() as keyof typeof fallbackResponses
      ] || fallbackResponses.superhero;

    return NextResponse.json(
      {
        response: fallbackResponse,
        character,
        voiceId: "Sth0oyItcRdvk3sFrPiq", // Default voice ID for fallback (Noku)
        timestamp: new Date().toISOString(),
        error: "AI service temporarily unavailable, using fallback response",
      },
      { status: 200 }
    ); // Return 200 instead of 500 for fallback
  }
}
