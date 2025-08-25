/**
 * Google Gemini AI Service for Voice Coach
 * Handles AI conversation and response generation with context awareness
 */

import { GoogleGenerativeAI, GenerativeModel, ChatSession } from '@google/generative-ai';
import { getVoiceCoachConfig } from '../env-validation';

// Types for Gemini service
export interface GeminiConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface ConversationContext {
  userId: string;
  currentChores: Chore[];
  completedChores: Chore[];
  points: number;
  rank: string;
  recentAchievements: Achievement[];
  conversationHistory?: VoiceInteraction[];
}

export interface GeminiResponse {
  text: string;
  confidence: number;
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface VoiceCharacter {
  id: string;
  name: string;
  voiceId: string;
  personality: string;
  sampleRate: number;
}

export interface Chore {
  id: string;
  title: string;
  description: string;
  points: number;
  assigned_to?: string;
  recurring: boolean;
  status?: 'pending' | 'completed' | 'approved';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  points: number;
  achievedAt: Date;
}

export interface VoiceInteraction {
  id: string;
  timestamp: Date;
  userInput: string;
  aiResponse: string;
  character: string;
  duration: number;
}

// Pre-defined voice characters with their personalities
export const VOICE_CHARACTERS: Record<string, VoiceCharacter> = {
  'superhero': {
    id: 'superhero',
    name: 'Captain Chore',
    voiceId: '21m00Tcm4TlvDq8ikWAM',
    personality: 'Enthusiastic superhero who celebrates every achievement and encourages with heroic metaphors',
    sampleRate: 22050
  },
  'robot': {
    id: 'robot',
    name: 'Robo-Helper',
    voiceId: 'AZnzlk1XvdvUeBnXmlld',
    personality: 'Friendly robot assistant with logical encouragement and systematic approach to tasks',
    sampleRate: 22050
  },
  'friendly-guide': {
    id: 'friendly-guide',
    name: 'Coach Sam',
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    personality: 'Warm, supportive coach who provides gentle guidance and celebrates progress',
    sampleRate: 22050
  }
};

/**
 * Google Gemini AI Service for generating contextual responses
 */
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private config: GeminiConfig;
  private activeSessions: Map<string, ChatSession> = new Map();

  constructor(config?: Partial<GeminiConfig>) {
    const envConfig = getVoiceCoachConfig();
    
    this.config = {
      apiKey: envConfig.googleGeminiApiKey,
      model: envConfig.geminiModel,
      temperature: envConfig.geminiTemperature,
      maxTokens: envConfig.geminiMaxTokens,
      ...config
    };

    this.genAI = new GoogleGenerativeAI(this.config.apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: this.config.model,
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxTokens,
      }
    });
  }

  /**
   * Generate AI response based on user input and context
   */
  async generateResponse(
    userInput: string,
    context: ConversationContext,
    character: VoiceCharacter
  ): Promise<GeminiResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(character);
      const contextPrompt = this.formatContextForPrompt(context);
      const conversationHistory = this.formatConversationHistory(context.conversationHistory || []);
      
      const fullPrompt = `${systemPrompt}\n\n${contextPrompt}\n\n${conversationHistory}\n\nUser: ${userInput}\n\nAssistant:`;
      
      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract usage information if available
      const usage = {
        promptTokens: 0, // Gemini doesn't provide detailed token usage in free tier
        completionTokens: 0
      };
      
      return {
        text: text.trim(),
        confidence: 0.9, // Default confidence since Gemini doesn't provide this
        usage
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Failed to generate AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Start a conversation session with memory
   */
  async startConversationSession(
    sessionId: string,
    context: ConversationContext,
    character: VoiceCharacter
  ): Promise<void> {
    const systemPrompt = this.buildSystemPrompt(character);
    const contextPrompt = this.formatContextForPrompt(context);
    
    const chat = this.model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${contextPrompt}` }]
        },
        {
          role: 'model',
          parts: [{ text: 'I understand! I\'m ready to help and encourage you with your chores. What would you like to talk about?' }]
        }
      ]
    });
    
    this.activeSessions.set(sessionId, chat);
  }

  /**
   * Continue conversation in an existing session
   */
  async continueConversation(
    sessionId: string,
    userInput: string
  ): Promise<GeminiResponse> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Conversation session not found');
    }

    try {
      const result = await session.sendMessage(userInput);
      const response = await result.response;
      const text = response.text();
      
      return {
        text: text.trim(),
        confidence: 0.9,
        usage: {
          promptTokens: 0,
          completionTokens: 0
        }
      };
    } catch (error) {
      console.error('Gemini conversation error:', error);
      throw new Error(`Failed to continue conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * End a conversation session and clean up memory
   */
  endConversationSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
  }

  /**
   * Build system prompt based on voice character
   */
  buildSystemPrompt(character: VoiceCharacter): string {
    const basePrompt = `You are ${character.name}, an AI voice coach for children in a chore management app called ChoreChamp. Your personality: ${character.personality}.

IMPORTANT GUIDELINES:
- Keep responses short (1-3 sentences max) since this is voice interaction
- Be encouraging, positive, and age-appropriate for children
- Reference the child's chores, points, and rank when relevant
- Celebrate achievements and provide gentle motivation for incomplete tasks
- Use simple language that children can understand
- Stay in character as ${character.name}
- Focus on being helpful and supportive about chores and responsibilities`;

    // Add character-specific personality traits
    switch (character.id) {
      case 'superhero':
        return `${basePrompt}

CHARACTER TRAITS:
- Use superhero language and metaphors (missions, powers, heroic deeds)
- Call chores "missions" and completed tasks "heroic achievements"
- Be enthusiastic and energetic
- Reference superpowers when encouraging the child`;

      case 'robot':
        return `${basePrompt}

CHARACTER TRAITS:
- Use logical, systematic language
- Occasionally use robot-like expressions ("Computing... Success!")
- Focus on efficiency and organization
- Be friendly but slightly mechanical in speech patterns`;

      case 'friendly-guide':
      default:
        return `${basePrompt}

CHARACTER TRAITS:
- Be warm, caring, and supportive like a favorite teacher or coach
- Use encouraging phrases and positive reinforcement
- Focus on growth and learning from experiences
- Be patient and understanding`;
    }
  }

  /**
   * Format user context for AI prompt
   */
  private formatContextForPrompt(context: ConversationContext): string {
    const { currentChores, completedChores, points, rank, recentAchievements } = context;
    
    let contextStr = `CHILD'S CURRENT STATUS:
- Points: ${points}
- Rank: ${rank}`;

    if (currentChores.length > 0) {
      contextStr += `\n- Current Chores: ${currentChores.map(c => `"${c.title}" (${c.points} points)`).join(', ')}`;
    }

    if (completedChores.length > 0) {
      contextStr += `\n- Recently Completed: ${completedChores.map(c => `"${c.title}"`).join(', ')}`;
    }

    if (recentAchievements.length > 0) {
      contextStr += `\n- Recent Achievements: ${recentAchievements.map(a => a.title).join(', ')}`;
    }

    return contextStr;
  }

  /**
   * Format conversation history for context
   */
  private formatConversationHistory(history: VoiceInteraction[]): string {
    if (history.length === 0) return '';
    
    const recentHistory = history.slice(-5); // Keep last 5 interactions for context
    const formatted = recentHistory.map(interaction => 
      `User: ${interaction.userInput}\nAssistant: ${interaction.aiResponse}`
    ).join('\n\n');
    
    return `RECENT CONVERSATION:\n${formatted}`;
  }

  /**
   * Get fallback response for when Gemini service fails
   */
  getFallbackResponse(context: ConversationContext, character: VoiceCharacter): string {
    const responses = this.getFallbackResponses(character);
    
    // Choose response based on context
    if (context.completedChores.length > 0) {
      return responses.celebration[Math.floor(Math.random() * responses.celebration.length)];
    } else if (context.currentChores.length > 0) {
      return responses.encouragement[Math.floor(Math.random() * responses.encouragement.length)];
    } else {
      return responses.general[Math.floor(Math.random() * responses.general.length)];
    }
  }

  /**
   * Get character-specific fallback responses
   */
  private getFallbackResponses(character: VoiceCharacter) {
    switch (character.id) {
      case 'superhero':
        return {
          celebration: [
            "Amazing work, hero! You've completed another mission!",
            "Fantastic! Your superhero powers are growing stronger!",
            "Incredible job! You're becoming a true chore champion!"
          ],
          encouragement: [
            "Every superhero has missions to complete. You've got this!",
            "Use your amazing powers to tackle those chores!",
            "Heroes never give up! Let's get those missions done!"
          ],
          general: [
            "Hello there, superhero! Ready for some heroic chore missions?",
            "Greetings, champion! What adventures await us today?",
            "Hey hero! I'm here to help you with your important missions!"
          ]
        };

      case 'robot':
        return {
          celebration: [
            "Computing... Success! Task completion detected. Excellent work!",
            "Achievement unlocked! Your efficiency levels are impressive!",
            "System analysis complete: Outstanding performance detected!"
          ],
          encouragement: [
            "Initiating motivation protocol: You have the capability to succeed!",
            "Processing encouragement... You're doing great! Keep going!",
            "Logic suggests: Completing chores leads to maximum satisfaction!"
          ],
          general: [
            "Greetings! Robo-Helper online and ready to assist!",
            "System ready! How can I help optimize your chore completion today?",
            "Hello! My circuits are buzzing with excitement to help you!"
          ]
        };

      case 'friendly-guide':
      default:
        return {
          celebration: [
            "Wonderful job! I'm so proud of what you've accomplished!",
            "That's fantastic! You're really showing great responsibility!",
            "Excellent work! You should feel proud of yourself!"
          ],
          encouragement: [
            "I believe in you! Take it one step at a time!",
            "You're doing great! Every small step counts!",
            "Keep going! I know you can do this!"
          ],
          general: [
            "Hi there! I'm so happy to chat with you today!",
            "Hello! I'm here to help and cheer you on!",
            "Hey! Ready to talk about how awesome you're doing?"
          ]
        };
    }
  }
}

/**
 * Create a singleton instance of GeminiService
 */
let geminiServiceInstance: GeminiService | null = null;

export function getGeminiService(): GeminiService {
  if (!geminiServiceInstance) {
    geminiServiceInstance = new GeminiService();
  }
  return geminiServiceInstance;
}