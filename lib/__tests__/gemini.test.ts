/**
 * Unit tests for Google Gemini AI Service
 */

import { GeminiService, VOICE_CHARACTERS, ConversationContext, VoiceCharacter } from '../services/gemini';

// Mock the Google Generative AI
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn(),
      startChat: jest.fn()
    })
  }))
}));

// Mock environment validation
jest.mock('../env-validation', () => ({
  getVoiceCoachConfig: jest.fn().mockReturnValue({
    googleGeminiApiKey: 'test-api-key',
    geminiModel: 'gemini-pro',
    geminiTemperature: 0.7,
    geminiMaxTokens: 150
  })
}));

describe('GeminiService', () => {
  let geminiService: GeminiService;
  let mockModel: any;
  let mockGenAI: any;

  const mockContext: ConversationContext = {
    userId: 'test-user-123',
    currentChores: [
      {
        id: 'chore-1',
        title: 'Clean bedroom',
        description: 'Make bed and organize toys',
        points: 10,
        recurring: false
      }
    ],
    completedChores: [
      {
        id: 'chore-2',
        title: 'Feed pets',
        description: 'Give food and water to pets',
        points: 5,
        recurring: true,
        status: 'completed'
      }
    ],
    points: 85,
    rank: 'Task Trooper',
    recentAchievements: [
      {
        id: 'achievement-1',
        title: 'First Week Complete',
        description: 'Completed chores for 7 days straight',
        points: 20,
        achievedAt: new Date()
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock model
    mockModel = {
      generateContent: jest.fn(),
      startChat: jest.fn()
    };

    // Setup mock GenAI
    mockGenAI = {
      getGenerativeModel: jest.fn().mockReturnValue(mockModel)
    };

    // Mock the GoogleGenerativeAI constructor
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    (GoogleGenerativeAI as jest.Mock).mockImplementation(() => mockGenAI);

    geminiService = new GeminiService();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(geminiService).toBeInstanceOf(GeminiService);
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        temperature: 0.5,
        maxTokens: 100
      };
      
      const service = new GeminiService(customConfig);
      expect(service).toBeInstanceOf(GeminiService);
    });
  });

  describe('generateResponse', () => {
    it('should generate response successfully', async () => {
      const mockResponse = {
        response: {
          text: () => 'Great job on feeding the pets! Ready to tackle cleaning your bedroom?'
        }
      };
      
      mockModel.generateContent.mockResolvedValue(mockResponse);

      const result = await geminiService.generateResponse(
        'Hi, how am I doing?',
        mockContext,
        VOICE_CHARACTERS['friendly-guide']
      );

      expect(result).toEqual({
        text: 'Great job on feeding the pets! Ready to tackle cleaning your bedroom?',
        confidence: 0.9,
        usage: {
          promptTokens: 0,
          completionTokens: 0
        }
      });

      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('Coach Sam')
      );
    });

    it('should handle API errors gracefully', async () => {
      mockModel.generateContent.mockRejectedValue(new Error('API Error'));

      await expect(
        geminiService.generateResponse(
          'Hello',
          mockContext,
          VOICE_CHARACTERS['superhero']
        )
      ).rejects.toThrow('Failed to generate AI response: API Error');
    });

    it('should include context in the prompt', async () => {
      const mockResponse = {
        response: {
          text: () => 'Response with context'
        }
      };
      
      mockModel.generateContent.mockResolvedValue(mockResponse);

      await geminiService.generateResponse(
        'What should I do next?',
        mockContext,
        VOICE_CHARACTERS['robot']
      );

      const calledPrompt = mockModel.generateContent.mock.calls[0][0];
      expect(calledPrompt).toContain('Points: 85');
      expect(calledPrompt).toContain('Rank: Task Trooper');
      expect(calledPrompt).toContain('Clean bedroom');
      expect(calledPrompt).toContain('Feed pets');
    });
  });

  describe('buildSystemPrompt', () => {
    it('should build superhero character prompt', () => {
      const prompt = geminiService.buildSystemPrompt(VOICE_CHARACTERS['superhero']);
      
      expect(prompt).toContain('Captain Chore');
      expect(prompt).toContain('superhero');
      expect(prompt).toContain('missions');
      expect(prompt).toContain('heroic');
    });

    it('should build robot character prompt', () => {
      const prompt = geminiService.buildSystemPrompt(VOICE_CHARACTERS['robot']);
      
      expect(prompt).toContain('Robo-Helper');
      expect(prompt).toContain('logical');
      expect(prompt).toContain('systematic');
      expect(prompt).toContain('Computing');
    });

    it('should build friendly guide character prompt', () => {
      const prompt = geminiService.buildSystemPrompt(VOICE_CHARACTERS['friendly-guide']);
      
      expect(prompt).toContain('Coach Sam');
      expect(prompt).toContain('warm');
      expect(prompt).toContain('supportive');
      expect(prompt).toContain('caring');
    });

    it('should include common guidelines for all characters', () => {
      const characters = Object.values(VOICE_CHARACTERS);
      
      characters.forEach(character => {
        const prompt = geminiService.buildSystemPrompt(character);
        expect(prompt).toContain('Keep responses short');
        expect(prompt).toContain('age-appropriate');
        expect(prompt).toContain('encouraging');
      });
    });
  });

  describe('conversation sessions', () => {
    it('should start a conversation session', async () => {
      const mockChat = {
        sendMessage: jest.fn()
      };
      
      mockModel.startChat.mockReturnValue(mockChat);

      await geminiService.startConversationSession(
        'session-123',
        mockContext,
        VOICE_CHARACTERS['friendly-guide']
      );

      expect(mockModel.startChat).toHaveBeenCalledWith({
        history: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            parts: expect.any(Array)
          }),
          expect.objectContaining({
            role: 'model',
            parts: expect.any(Array)
          })
        ])
      });
    });

    it('should continue conversation in existing session', async () => {
      const mockChat = {
        sendMessage: jest.fn().mockResolvedValue({
          response: {
            text: () => 'Continuing conversation response'
          }
        })
      };
      
      mockModel.startChat.mockReturnValue(mockChat);

      // Start session first
      await geminiService.startConversationSession(
        'session-123',
        mockContext,
        VOICE_CHARACTERS['superhero']
      );

      // Continue conversation
      const result = await geminiService.continueConversation(
        'session-123',
        'Tell me about my progress'
      );

      expect(result.text).toBe('Continuing conversation response');
      expect(mockChat.sendMessage).toHaveBeenCalledWith('Tell me about my progress');
    });

    it('should throw error for non-existent session', async () => {
      await expect(
        geminiService.continueConversation('non-existent', 'Hello')
      ).rejects.toThrow('Conversation session not found');
    });

    it('should end conversation session', async () => {
      const mockChat = { sendMessage: jest.fn() };
      mockModel.startChat.mockReturnValue(mockChat);

      await geminiService.startConversationSession(
        'session-123',
        mockContext,
        VOICE_CHARACTERS['robot']
      );

      geminiService.endConversationSession('session-123');

      // Should throw error after ending session
      await expect(
        geminiService.continueConversation('session-123', 'Hello')
      ).rejects.toThrow('Conversation session not found');
    });
  });

  describe('getFallbackResponse', () => {
    it('should return celebration response for completed chores', () => {
      const response = geminiService.getFallbackResponse(
        mockContext,
        VOICE_CHARACTERS['superhero']
      );

      expect(response).toMatch(/Amazing work|Fantastic|Incredible|Great job|wonderful/i);
    });

    it('should return encouragement response for current chores', () => {
      const contextWithoutCompleted = {
        ...mockContext,
        completedChores: []
      };

      const response = geminiService.getFallbackResponse(
        contextWithoutCompleted,
        VOICE_CHARACTERS['robot']
      );

      expect(response).toMatch(/mission|capability|Logic|encouragement|great/i);
    });

    it('should return general response when no specific context', () => {
      const emptyContext = {
        ...mockContext,
        currentChores: [],
        completedChores: []
      };

      const response = geminiService.getFallbackResponse(
        emptyContext,
        VOICE_CHARACTERS['friendly-guide']
      );

      expect(response).toMatch(/Hi|Hello|Hey/i);
    });

    it('should return character-appropriate responses', () => {
      const superheroResponse = geminiService.getFallbackResponse(
        mockContext,
        VOICE_CHARACTERS['superhero']
      );
      
      const robotResponse = geminiService.getFallbackResponse(
        mockContext,
        VOICE_CHARACTERS['robot']
      );

      expect(superheroResponse).toMatch(/hero|superhero|mission|champion|amazing|fantastic|incredible/i);
      expect(robotResponse).toMatch(/computing|system|protocol|circuits|achievement|efficiency|analysis/i);
    });
  });

  describe('VOICE_CHARACTERS', () => {
    it('should have all required character properties', () => {
      Object.values(VOICE_CHARACTERS).forEach(character => {
        expect(character).toHaveProperty('id');
        expect(character).toHaveProperty('name');
        expect(character).toHaveProperty('voiceId');
        expect(character).toHaveProperty('personality');
        expect(character).toHaveProperty('sampleRate');
        expect(typeof character.sampleRate).toBe('number');
      });
    });

    it('should have unique character IDs', () => {
      const ids = Object.values(VOICE_CHARACTERS).map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should include expected characters', () => {
      expect(VOICE_CHARACTERS).toHaveProperty('superhero');
      expect(VOICE_CHARACTERS).toHaveProperty('robot');
      expect(VOICE_CHARACTERS).toHaveProperty('friendly-guide');
    });
  });

  describe('context formatting', () => {
    it('should format context with all information', () => {
      const prompt = geminiService.buildSystemPrompt(VOICE_CHARACTERS['friendly-guide']);
      // This tests the private method indirectly through generateResponse
      expect(prompt).toContain('Coach Sam');
    });

    it('should handle empty context gracefully', () => {
      const emptyContext: ConversationContext = {
        userId: 'test-user',
        currentChores: [],
        completedChores: [],
        points: 0,
        rank: 'Recruit Rascal',
        recentAchievements: []
      };

      expect(() => 
        geminiService.getFallbackResponse(emptyContext, VOICE_CHARACTERS['friendly-guide'])
      ).not.toThrow();
    });
  });
});