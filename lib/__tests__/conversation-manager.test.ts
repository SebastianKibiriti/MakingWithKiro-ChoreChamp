/**
 * Unit tests for Conversation Manager
 */

import { ConversationManager, UserContext } from '../conversation-manager';
import { GeminiService } from '../services/gemini';

// Mock Supabase
const mockSupabaseChain = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn(),
  raw: jest.fn()
};

jest.mock('../../supabase', () => ({
  supabase: mockSupabaseChain
}));

// Mock ranks
jest.mock('../../ranks', () => ({
  getRankByPoints: jest.fn().mockReturnValue({
    id: 'task-trooper',
    name: 'Task Trooper',
    pointsRequired: 50,
    description: 'Getting the hang of helping out!',
    color: 'bg-green-500',
    icon: '⭐'
  })
}));

describe('ConversationManager', () => {
  let conversationManager: ConversationManager;
  let mockGeminiService: jest.Mocked<GeminiService>;
  let mockSupabase: any;

  const mockUserProfile = {
    id: 'user-123',
    name: 'Test Child',
    role: 'child' as const,
    points: 85,
    rank: 'Task Trooper',
    parent_id: 'parent-123',
    email: 'child@test.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  const mockChores = [
    {
      id: 'chore-1',
      title: 'Clean bedroom',
      description: 'Make bed and organize toys',
      points: 10,
      parent_id: 'parent-123',
      assigned_to: 'user-123',
      recurring: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ];

  const mockCompletedChores = [
    {
      id: 'completion-1',
      chore_id: 'chore-2',
      child_id: 'user-123',
      status: 'approved' as const,
      completed_at: new Date().toISOString(),
      chores: {
        id: 'chore-2',
        title: 'Feed pets',
        description: 'Give food and water to pets',
        points: 5,
        parent_id: 'parent-123',
        assigned_to: 'user-123',
        recurring: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset all mock functions to return this for chaining
    Object.keys(mockSupabaseChain).forEach(key => {
      if (key !== 'single' && key !== 'raw') {
        (mockSupabaseChain as any)[key].mockReturnThis();
      }
    });

    // Setup mock Supabase
    mockSupabase = mockSupabaseChain;
    
    // Setup mock Gemini service
    mockGeminiService = {
      generateResponse: jest.fn(),
      startConversationSession: jest.fn(),
      continueConversation: jest.fn(),
      endConversationSession: jest.fn(),
      buildSystemPrompt: jest.fn(),
      getFallbackResponse: jest.fn()
    } as any;

    conversationManager = new ConversationManager(mockGeminiService);
  });

  describe('startSession', () => {
    it('should start a new conversation session successfully', async () => {
      // Mock database responses in sequence
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockUserProfile, error: null }) // Profile query
        .mockResolvedValueOnce({ data: mockChores, error: null }) // Current chores query  
        .mockResolvedValueOnce({ data: mockCompletedChores, error: null }) // Completed chores query
        .mockResolvedValueOnce({ // Session insert
          data: {
            id: 'session-123',
            user_id: 'user-123',
            start_time: new Date().toISOString(),
            total_interactions: 0,
            total_duration: 0,
            character_used: 'friendly-guide'
          },
          error: null
        });

      // Mock the eq method to return the data directly for chores queries
      mockSupabase.eq
        .mockResolvedValueOnce({ data: mockChores, error: null })
        .mockResolvedValueOnce({ data: mockCompletedChores, error: null });

      const session = await conversationManager.startSession('user-123', 'friendly-guide');

      expect(session).toMatchObject({
        id: 'session-123',
        userId: 'user-123',
        characterUsed: 'friendly-guide',
        totalInteractions: 0,
        totalDuration: 0
      });

      expect(session.context).toMatchObject({
        userId: 'user-123',
        points: 85,
        rank: 'Task Trooper'
      });
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      await expect(
        conversationManager.startSession('user-123')
      ).rejects.toThrow('Failed to create conversation session: Database error');
    });
  });

  describe('getUserContext', () => {
    it('should get complete user context', async () => {
      // Mock all database queries
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockUserProfile, error: null });
      
      mockSupabase.eq
        .mockReturnValueOnce({ data: mockChores, error: null })
        .mockReturnValueOnce({ data: mockCompletedChores, error: null });

      const context = await conversationManager.getUserContext('user-123');

      expect(context).toMatchObject({
        profile: {
          id: 'user-123',
          name: 'Test Child',
          role: 'child',
          points: 85
        },
        currentChores: expect.arrayContaining([
          expect.objectContaining({
            title: 'Clean bedroom',
            points: 10
          })
        ]),
        completedToday: expect.arrayContaining([
          expect.objectContaining({
            title: 'Feed pets',
            points: 5,
            status: 'completed'
          })
        ]),
        points: 85,
        rank: 'Task Trooper'
      });

      expect(context.recentAchievements).toHaveLength(1);
      expect(context.recentAchievements[0]).toMatchObject({
        title: 'Daily Progress',
        description: 'Completed 1 chore today',
        points: 5
      });
    });

    it('should handle missing chores gracefully', async () => {
      mockSupabase.single.mockResolvedValue({ data: mockUserProfile, error: null });
      mockSupabase.eq
        .mockReturnValueOnce({ data: null, error: { message: 'No chores found' } })
        .mockReturnValueOnce({ data: null, error: { message: 'No completions found' } });

      const context = await conversationManager.getUserContext('user-123');

      expect(context.currentChores).toEqual([]);
      expect(context.completedToday).toEqual([]);
      expect(context.recentAchievements).toEqual([]);
    });

    it('should throw error for missing user profile', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'User not found' }
      });

      await expect(
        conversationManager.getUserContext('invalid-user')
      ).rejects.toThrow('Failed to get user profile: User not found');
    });
  });

  describe('addInteraction', () => {
    it('should add interaction to session successfully', async () => {
      // First start a session
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'session-123',
          user_id: 'user-123',
          start_time: new Date().toISOString(),
          total_interactions: 0,
          total_duration: 0,
          character_used: 'friendly-guide'
        },
        error: null
      });

      // Mock other required queries for startSession
      mockSupabase.eq
        .mockReturnValueOnce({ data: [mockUserProfile], error: null })
        .mockReturnValueOnce({ data: mockChores, error: null })
        .mockReturnValueOnce({ data: mockCompletedChores, error: null });

      const session = await conversationManager.startSession('user-123');

      // Mock insert and update for addInteraction
      mockSupabase.insert.mockResolvedValue({ data: {}, error: null });
      mockSupabase.update.mockResolvedValue({ data: {}, error: null });

      await conversationManager.addInteraction(
        session.id,
        'Hello coach!',
        'Hi there! Ready to tackle some chores?',
        30
      );

      expect(mockSupabase.insert).toHaveBeenCalledWith({
        session_id: session.id,
        user_input: 'Hello coach!',
        ai_response: 'Hi there! Ready to tackle some chores?',
        character: 'friendly-guide',
        duration: 30,
        confidence_score: 0.9
      });

      expect(mockSupabase.update).toHaveBeenCalledWith({
        total_interactions: 1,
        total_duration: 30
      });
    });

    it('should throw error for non-existent session', async () => {
      await expect(
        conversationManager.addInteraction(
          'non-existent',
          'Hello',
          'Hi',
          10
        )
      ).rejects.toThrow('Conversation session not found');
    });
  });

  describe('endSession', () => {
    it('should end session successfully', async () => {
      // Start a session first
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'session-123',
          user_id: 'user-123',
          start_time: new Date().toISOString(),
          total_interactions: 0,
          total_duration: 0,
          character_used: 'friendly-guide'
        },
        error: null
      });

      mockSupabase.eq
        .mockReturnValueOnce({ data: [mockUserProfile], error: null })
        .mockReturnValueOnce({ data: mockChores, error: null })
        .mockReturnValueOnce({ data: mockCompletedChores, error: null });

      const session = await conversationManager.startSession('user-123');

      // Mock update for endSession
      mockSupabase.update.mockResolvedValue({ data: {}, error: null });

      await conversationManager.endSession(session.id);

      expect(mockSupabase.update).toHaveBeenCalledWith({
        end_time: expect.any(String),
        total_interactions: 0,
        total_duration: 0
      });

      expect(mockGeminiService.endConversationSession).toHaveBeenCalledWith(session.id);
    });

    it('should throw error for non-existent session', async () => {
      await expect(
        conversationManager.endSession('non-existent')
      ).rejects.toThrow('Conversation session not found');
    });
  });

  describe('formatContextForAI', () => {
    it('should format user context correctly', () => {
      const userContext: UserContext = {
        profile: {
          id: 'user-123',
          name: 'Test Child',
          role: 'child',
          points: 85,
          rank: 'Task Trooper'
        },
        currentChores: [
          {
            id: 'chore-1',
            title: 'Clean bedroom',
            description: 'Make bed',
            points: 10,
            recurring: false
          }
        ],
        completedToday: [
          {
            id: 'chore-2',
            title: 'Feed pets',
            description: 'Give food to pets',
            points: 5,
            recurring: true,
            status: 'completed'
          }
        ],
        points: 85,
        rank: 'Task Trooper',
        streaks: {
          currentStreak: 3,
          longestStreak: 7
        },
        recentAchievements: [
          {
            id: 'achievement-1',
            title: 'Daily Progress',
            description: 'Completed 1 chore today',
            points: 5,
            achievedAt: new Date()
          }
        ]
      };

      const aiContext = conversationManager.formatContextForAI(userContext);

      expect(aiContext).toMatchObject({
        userId: 'user-123',
        currentChores: userContext.currentChores,
        completedChores: userContext.completedToday,
        points: 85,
        rank: 'Task Trooper',
        recentAchievements: userContext.recentAchievements
      });
    });
  });

  describe('checkUsageLimits', () => {
    it('should return usage within limits', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          usage_today: 900, // 15 minutes in seconds
          daily_limit_minutes: 30,
          last_reset_date: new Date().toISOString().split('T')[0]
        },
        error: null
      });

      const result = await conversationManager.checkUsageLimits('user-123');

      expect(result).toEqual({
        withinLimits: true,
        usageToday: 900,
        dailyLimit: 1800 // 30 minutes in seconds
      });
    });

    it('should return usage exceeded limits', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          usage_today: 2000, // Over 30 minutes
          daily_limit_minutes: 30,
          last_reset_date: new Date().toISOString().split('T')[0]
        },
        error: null
      });

      const result = await conversationManager.checkUsageLimits('user-123');

      expect(result).toEqual({
        withinLimits: false,
        usageToday: 2000,
        dailyLimit: 1800
      });
    });

    it('should handle missing settings gracefully', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' }
      });

      const result = await conversationManager.checkUsageLimits('user-123');

      expect(result).toEqual({
        withinLimits: true,
        usageToday: 0,
        dailyLimit: 1800 // Default 30 minutes
      });
    });
  });

  describe('getConversationHistory', () => {
    it('should retrieve conversation history', async () => {
      const mockHistory = [
        {
          id: 'interaction-1',
          timestamp: new Date().toISOString(),
          user_input: 'Hello',
          ai_response: 'Hi there!',
          character: 'friendly-guide',
          duration: 30,
          conversation_sessions: { user_id: 'user-123' }
        }
      ];

      mockSupabase.limit.mockResolvedValue({
        data: mockHistory,
        error: null
      });

      const history = await conversationManager.getConversationHistory('user-123', 5);

      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        id: 'interaction-1',
        userInput: 'Hello',
        aiResponse: 'Hi there!',
        character: 'friendly-guide',
        duration: 30
      });
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.limit.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const history = await conversationManager.getConversationHistory('user-123');

      expect(history).toEqual([]);
    });
  });
});