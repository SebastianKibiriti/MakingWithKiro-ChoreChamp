/**
 * Conversation Manager for AI Voice Coach
 * Manages conversation state, context, and history
 */

import { supabase, Database } from '../supabase';
import { GeminiService, ConversationContext, VoiceInteraction, Chore, Achievement } from './services/gemini';
import { getRankByPoints } from '../ranks';

export interface ConversationSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  interactions: VoiceInteraction[];
  context: ConversationContext;
  totalInteractions: number;
  totalDuration: number;
  characterUsed: string;
}

export interface UserProfile {
  id: string;
  name: string;
  role: 'parent' | 'child';
  points: number;
  rank?: string;
  parent_id?: string;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastCompletionDate?: Date;
}

export interface UserContext {
  profile: UserProfile;
  currentChores: Chore[];
  completedToday: Chore[];
  points: number;
  rank: string;
  streaks: StreakInfo;
  recentAchievements: Achievement[];
}

/**
 * Manages conversation sessions and context for the AI Voice Coach
 */
export class ConversationManager {
  private geminiService: GeminiService;
  private activeSessions: Map<string, ConversationSession> = new Map();

  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService;
  }

  /**
   * Start a new conversation session
   */
  async startSession(userId: string, characterId: string = 'friendly-guide'): Promise<ConversationSession> {
    try {
      // Get user context
      const context = await this.getUserContext(userId);
      const conversationContext = this.formatContextForAI(context);

      // Create session in database
      const { data: sessionData, error } = await supabase
        .from('conversation_sessions')
        .insert({
          user_id: userId,
          character_used: characterId,
          start_time: new Date().toISOString(),
          total_interactions: 0,
          total_duration: 0
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create conversation session: ${error.message}`);
      }

      const session: ConversationSession = {
        id: sessionData.id,
        userId,
        startTime: new Date(sessionData.start_time),
        interactions: [],
        context: conversationContext,
        totalInteractions: 0,
        totalDuration: 0,
        characterUsed: characterId
      };

      // Store in memory
      this.activeSessions.set(session.id, session);

      return session;
    } catch (error) {
      console.error('Failed to start conversation session:', error);
      throw error;
    }
  }

  /**
   * Add an interaction to a conversation session
   */
  async addInteraction(
    sessionId: string,
    userInput: string,
    aiResponse: string,
    duration: number
  ): Promise<void> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Conversation session not found');
      }

      const interaction: VoiceInteraction = {
        id: `interaction-${Date.now()}`,
        timestamp: new Date(),
        userInput,
        aiResponse,
        character: session.characterUsed,
        duration
      };

      // Add to session
      session.interactions.push(interaction);
      session.totalInteractions++;
      session.totalDuration += duration;

      // Save to database
      await supabase
        .from('voice_interactions')
        .insert({
          session_id: sessionId,
          user_input: userInput,
          ai_response: aiResponse,
          character: session.characterUsed,
          duration,
          confidence_score: 0.9 // Default confidence
        });

      // Update session in database
      await supabase
        .from('conversation_sessions')
        .update({
          total_interactions: session.totalInteractions,
          total_duration: session.totalDuration
        })
        .eq('id', sessionId);

    } catch (error) {
      console.error('Failed to add interaction:', error);
      throw error;
    }
  }

  /**
   * Get conversation session context
   */
  async getSessionContext(sessionId: string): Promise<ConversationContext> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Conversation session not found');
    }

    // Refresh context with latest user data
    const userContext = await this.getUserContext(session.userId);
    const conversationContext = this.formatContextForAI(userContext);
    
    // Include conversation history
    conversationContext.conversationHistory = session.interactions.slice(-5); // Last 5 interactions

    // Update session context
    session.context = conversationContext;
    this.activeSessions.set(sessionId, session);

    return conversationContext;
  }

  /**
   * End a conversation session
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Conversation session not found');
      }

      // Update database
      await supabase
        .from('conversation_sessions')
        .update({
          end_time: new Date().toISOString(),
          total_interactions: session.totalInteractions,
          total_duration: session.totalDuration
        })
        .eq('id', sessionId);

      // Clean up Gemini session
      this.geminiService.endConversationSession(sessionId);

      // Remove from memory
      this.activeSessions.delete(sessionId);

    } catch (error) {
      console.error('Failed to end conversation session:', error);
      throw error;
    }
  }

  /**
   * Get user context from database
   */
  async getUserContext(userId: string): Promise<UserContext> {
    try {
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        throw new Error(`Failed to get user profile: ${profileError.message}`);
      }

      // Get current chores (assigned to user)
      const { data: currentChores, error: choresError } = await supabase
        .from('chores')
        .select('*')
        .eq('assigned_to', userId);

      if (choresError) {
        console.warn('Failed to get current chores:', choresError.message);
      }

      // Get completed chores for today
      const today = new Date().toISOString().split('T')[0];
      const { data: completedToday, error: completedError } = await supabase
        .from('chore_completions')
        .select(`
          *,
          chores (*)
        `)
        .eq('child_id', userId)
        .gte('completed_at', `${today}T00:00:00.000Z`)
        .lt('completed_at', `${today}T23:59:59.999Z`);

      if (completedError) {
        console.warn('Failed to get completed chores:', completedError.message);
      }

      // Calculate rank
      const rank = getRankByPoints(profile.points);

      // Format chores data
      const formattedCurrentChores: Chore[] = (currentChores || []).map(chore => ({
        id: chore.id,
        title: chore.title,
        description: chore.description,
        points: chore.points,
        assigned_to: chore.assigned_to,
        recurring: chore.recurring
      }));

      const formattedCompletedChores: Chore[] = (completedToday || []).map(completion => ({
        id: completion.chores.id,
        title: completion.chores.title,
        description: completion.chores.description,
        points: completion.chores.points,
        assigned_to: completion.chores.assigned_to,
        recurring: completion.chores.recurring,
        status: 'completed'
      }));

      // Calculate streaks (simplified for now)
      const streaks: StreakInfo = {
        currentStreak: 0, // TODO: Implement streak calculation
        longestStreak: 0,
        lastCompletionDate: completedToday && completedToday.length > 0 
          ? new Date(completedToday[0].completed_at) 
          : undefined
      };

      // Get recent achievements (mock for now)
      const recentAchievements: Achievement[] = [];
      if (formattedCompletedChores.length > 0) {
        recentAchievements.push({
          id: 'daily-completion',
          title: 'Daily Progress',
          description: `Completed ${formattedCompletedChores.length} chore${formattedCompletedChores.length > 1 ? 's' : ''} today`,
          points: formattedCompletedChores.reduce((sum, chore) => sum + chore.points, 0),
          achievedAt: new Date()
        });
      }

      return {
        profile: {
          id: profile.id,
          name: profile.name,
          role: profile.role,
          points: profile.points,
          rank: profile.rank,
          parent_id: profile.parent_id
        },
        currentChores: formattedCurrentChores,
        completedToday: formattedCompletedChores,
        points: profile.points,
        rank: rank.name,
        streaks,
        recentAchievements
      };

    } catch (error) {
      console.error('Failed to get user context:', error);
      throw error;
    }
  }

  /**
   * Format user context for AI processing
   */
  formatContextForAI(context: UserContext): ConversationContext {
    return {
      userId: context.profile.id,
      currentChores: context.currentChores,
      completedChores: context.completedToday,
      points: context.points,
      rank: context.rank,
      recentAchievements: context.recentAchievements
    };
  }

  /**
   * Update context after an interaction (for tracking usage, achievements, etc.)
   */
  async updateContextAfterInteraction(
    userId: string,
    interaction: VoiceInteraction
  ): Promise<void> {
    try {
      // Update daily usage tracking
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('voice_coach_settings')
        .upsert({
          user_id: userId,
          usage_today: supabase.raw('usage_today + ?', [interaction.duration]),
          last_reset_date: today
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.warn('Failed to update usage tracking:', error.message);
      }

    } catch (error) {
      console.error('Failed to update context after interaction:', error);
    }
  }

  /**
   * Get conversation history for a user
   */
  async getConversationHistory(
    userId: string,
    limit: number = 10
  ): Promise<VoiceInteraction[]> {
    try {
      const { data, error } = await supabase
        .from('voice_interactions')
        .select(`
          *,
          conversation_sessions!inner (user_id)
        `)
        .eq('conversation_sessions.user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to get conversation history: ${error.message}`);
      }

      return (data || []).map(interaction => ({
        id: interaction.id,
        timestamp: new Date(interaction.timestamp),
        userInput: interaction.user_input,
        aiResponse: interaction.ai_response,
        character: interaction.character,
        duration: interaction.duration
      }));

    } catch (error) {
      console.error('Failed to get conversation history:', error);
      return [];
    }
  }

  /**
   * Check if user has exceeded daily usage limits
   */
  async checkUsageLimits(userId: string): Promise<{
    withinLimits: boolean;
    usageToday: number;
    dailyLimit: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('voice_coach_settings')
        .select('usage_today, daily_limit_minutes, last_reset_date')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        throw new Error(`Failed to check usage limits: ${error.message}`);
      }

      const today = new Date().toISOString().split('T')[0];
      const usageToday = data?.last_reset_date === today ? (data.usage_today || 0) : 0;
      const dailyLimit = data?.daily_limit_minutes || 30; // Default 30 minutes

      return {
        withinLimits: usageToday < dailyLimit * 60, // Convert minutes to seconds
        usageToday,
        dailyLimit: dailyLimit * 60
      };

    } catch (error) {
      console.error('Failed to check usage limits:', error);
      // Default to allowing usage if check fails
      return {
        withinLimits: true,
        usageToday: 0,
        dailyLimit: 30 * 60
      };
    }
  }
}

/**
 * Create a singleton instance of ConversationManager
 */
let conversationManagerInstance: ConversationManager | null = null;

export function getConversationManager(geminiService: GeminiService): ConversationManager {
  if (!conversationManagerInstance) {
    conversationManagerInstance = new ConversationManager(geminiService);
  }
  return conversationManagerInstance;
}