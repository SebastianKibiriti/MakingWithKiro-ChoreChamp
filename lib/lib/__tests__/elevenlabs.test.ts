/**
 * Unit tests for ElevenLabs Text-to-Speech Service
 */

import { ElevenLabsService, VOICE_CHARACTERS, VoiceCharacter, AudioResult } from '../services/elevenlabs';

// Mock environment validation
jest.mock('../env-validation', () => ({
  getVoiceCoachConfig: jest.fn().mockReturnValue({
    elevenLabsApiKey: 'test-api-key',
    elevenLabsModel: 'eleven_monolingual_v1'
  })
}));

// Mock fetch globally
global.fetch = jest.fn();

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock HTMLAudioElement
class MockAudioElement {
  public onloadeddata: (() => void) | null = null;
  public onplay: (() => void) | null = null;
  public onended: (() => void) | null = null;
  public onerror: ((error: any) => void) | null = null;
  public onpause: (() => void) | null = null;
  public currentTime = 0;
  public preload = '';
  
  constructor(public src?: string) {}
  
  play(): Promise<void> {
    // Call onplay immediately to set isPlaying flag
    this.onplay?.();
    setTimeout(() => this.onended?.(), 100);
    return Promise.resolve();
  }
  
  pause(): void {
    this.onpause?.();
  }
}

global.Audio = MockAudioElement as any;

describe('ElevenLabsService', () => {
  let elevenLabsService: ElevenLabsService;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  const mockAudioData = new ArrayBuffer(1024);
  const mockCharacter: VoiceCharacter = VOICE_CHARACTERS['friendly-guide'];

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    elevenLabsService = new ElevenLabsService();
  });

  afterEach(() => {
    elevenLabsService.dispose();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(elevenLabsService).toBeInstanceOf(ElevenLabsService);
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        stability: 0.8,
        similarityBoost: 0.9
      };
      
      const service = new ElevenLabsService(customConfig);
      expect(service).toBeInstanceOf(ElevenLabsService);
    });
  });

  describe('synthesizeSpeech', () => {
    it('should synthesize speech successfully', async () => {
      const mockResponse = {
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockAudioData)
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await elevenLabsService.synthesizeSpeech(
        'Hello, this is a test!',
        mockCharacter
      );

      expect(result).toEqual({
        audioData: mockAudioData,
        duration: expect.any(Number),
        format: 'audio/mpeg',
        url: 'blob:mock-url'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.elevenlabs.io/v1/text-to-speech/${mockCharacter.voiceId}`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': 'test-api-key'
          }),
          body: expect.stringContaining('Hello, this is a test!')
        })
      );
    });

    it('should throw error for empty text', async () => {
      await expect(
        elevenLabsService.synthesizeSpeech('', mockCharacter)
      ).rejects.toThrow('Text cannot be empty');

      await expect(
        elevenLabsService.synthesizeSpeech('   ', mockCharacter)
      ).rejects.toThrow('Text cannot be empty');
    });

    it('should handle API errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('Unauthorized')
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(
        elevenLabsService.synthesizeSpeech('Hello', mockCharacter)
      ).rejects.toThrow('ElevenLabs API error: 401 - Unauthorized');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        elevenLabsService.synthesizeSpeech('Hello', mockCharacter)
      ).rejects.toThrow('Failed to synthesize speech: Network error');
    });

    it('should use cache for repeated requests', async () => {
      const mockResponse = {
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockAudioData)
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);

      // First request
      const result1 = await elevenLabsService.synthesizeSpeech('Hello', mockCharacter);
      
      // Second request with same text and character
      const result2 = await elevenLabsService.synthesizeSpeech('Hello', mockCharacter);

      expect(result1).toBe(result2); // Should be the same cached object
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only one API call
    });

    it('should include correct voice settings in request', async () => {
      const mockResponse = {
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockAudioData)
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);

      await elevenLabsService.synthesizeSpeech('Test message', mockCharacter);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      
      expect(requestBody).toEqual({
        text: 'Test message',
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0,
          use_speaker_boost: true
        },
        optimize_streaming_latency: 0
      });
    });
  });

  describe('playAudio', () => {
    it('should play audio successfully', async () => {
      const audioResult: AudioResult = {
        audioData: mockAudioData,
        duration: 2.5,
        format: 'audio/mpeg',
        url: 'blob:mock-url'
      };

      const playPromise = elevenLabsService.playAudio(audioResult);
      
      expect(elevenLabsService.isAudioPlaying()).toBe(true);
      
      await playPromise;
      
      expect(elevenLabsService.isAudioPlaying()).toBe(false);
    });

    it('should handle audio playback errors', async () => {
      // Mock Audio to throw error on play
      const originalAudio = global.Audio;
      global.Audio = class extends MockAudioElement {
        play(): Promise<void> {
          setTimeout(() => this.onerror?.(new Error('Playback failed')), 0);
          return Promise.reject(new Error('Playback failed'));
        }
      } as any;

      const audioResult: AudioResult = {
        audioData: mockAudioData,
        duration: 2.5,
        format: 'audio/mpeg',
        url: 'blob:mock-url'
      };

      await expect(
        elevenLabsService.playAudio(audioResult)
      ).rejects.toThrow('Failed to start audio playback: Playback failed');

      global.Audio = originalAudio;
    });

    it('should stop previous audio before playing new audio', async () => {
      const audioResult1: AudioResult = {
        audioData: mockAudioData,
        duration: 2.5,
        format: 'audio/mpeg',
        url: 'blob:mock-url-1'
      };

      const audioResult2: AudioResult = {
        audioData: mockAudioData,
        duration: 3.0,
        format: 'audio/mpeg',
        url: 'blob:mock-url-2'
      };

      // Start first audio
      elevenLabsService.playAudio(audioResult1);
      expect(elevenLabsService.isAudioPlaying()).toBe(true);

      // Start second audio (should stop first)
      await elevenLabsService.playAudio(audioResult2);
      expect(elevenLabsService.isAudioPlaying()).toBe(false);
    });
  });

  describe('stopAudio', () => {
    it('should stop currently playing audio', async () => {
      const audioResult: AudioResult = {
        audioData: mockAudioData,
        duration: 2.5,
        format: 'audio/mpeg',
        url: 'blob:mock-url'
      };

      // Start playing
      elevenLabsService.playAudio(audioResult);
      expect(elevenLabsService.isAudioPlaying()).toBe(true);

      // Stop audio
      elevenLabsService.stopAudio();
      expect(elevenLabsService.isAudioPlaying()).toBe(false);
    });

    it('should handle stopping when no audio is playing', () => {
      expect(() => elevenLabsService.stopAudio()).not.toThrow();
      expect(elevenLabsService.isAudioPlaying()).toBe(false);
    });
  });

  describe('voice character management', () => {
    it('should return all available voice characters', () => {
      const voices = elevenLabsService.getAvailableVoices();
      
      expect(voices).toHaveLength(3);
      expect(voices.map(v => v.id)).toEqual(['superhero', 'robot', 'friendly-guide']);
    });

    it('should get voice character by ID', () => {
      const superhero = elevenLabsService.getVoiceCharacter('superhero');
      expect(superhero).toEqual(VOICE_CHARACTERS['superhero']);

      const nonExistent = elevenLabsService.getVoiceCharacter('non-existent');
      expect(nonExistent).toBeNull();
    });

    it('should preload character voices', async () => {
      const mockResponse = {
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockAudioData)
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);

      const characters = [VOICE_CHARACTERS['superhero'], VOICE_CHARACTERS['robot']];
      
      await elevenLabsService.preloadCharacterVoices(characters);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(elevenLabsService.getCacheSize()).toBe(2);
    });

    it('should handle preload failures gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const characters = [VOICE_CHARACTERS['friendly-guide']];
      
      // Should not throw error
      await expect(
        elevenLabsService.preloadCharacterVoices(characters)
      ).resolves.toBeUndefined();

      expect(elevenLabsService.getCacheSize()).toBe(0);
    });
  });

  describe('cache management', () => {
    it('should cache synthesized audio', async () => {
      const mockResponse = {
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockAudioData)
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);

      expect(elevenLabsService.getCacheSize()).toBe(0);

      await elevenLabsService.synthesizeSpeech('Test', mockCharacter);
      expect(elevenLabsService.getCacheSize()).toBe(1);

      await elevenLabsService.synthesizeSpeech('Another test', mockCharacter);
      expect(elevenLabsService.getCacheSize()).toBe(2);
    });

    it('should clear cache and revoke URLs', () => {
      // Add some items to cache first
      const service = new ElevenLabsService();
      
      // Simulate cached items
      service['audioCache'].set('test-key', {
        audioData: mockAudioData,
        duration: 1.0,
        format: 'audio/mpeg',
        url: 'blob:test-url'
      });

      expect(service.getCacheSize()).toBe(1);

      service.clearCache();

      expect(service.getCacheSize()).toBe(0);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
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
        expect(character.sampleRate).toBeGreaterThan(0);
      });
    });

    it('should have unique character IDs and voice IDs', () => {
      const ids = Object.values(VOICE_CHARACTERS).map(c => c.id);
      const voiceIds = Object.values(VOICE_CHARACTERS).map(c => c.voiceId);
      
      const uniqueIds = new Set(ids);
      const uniqueVoiceIds = new Set(voiceIds);
      
      expect(uniqueIds.size).toBe(ids.length);
      expect(uniqueVoiceIds.size).toBe(voiceIds.length);
    });

    it('should include expected characters', () => {
      expect(VOICE_CHARACTERS).toHaveProperty('superhero');
      expect(VOICE_CHARACTERS).toHaveProperty('robot');
      expect(VOICE_CHARACTERS).toHaveProperty('friendly-guide');

      expect(VOICE_CHARACTERS['superhero'].name).toBe('Captain Chore');
      expect(VOICE_CHARACTERS['robot'].name).toBe('Robo-Helper');
      expect(VOICE_CHARACTERS['friendly-guide'].name).toBe('Coach Sam');
    });
  });

  describe('audio duration estimation', () => {
    it('should estimate reasonable durations for different text lengths', async () => {
      const mockResponse = {
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockAudioData)
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);

      // Short text
      const shortResult = await elevenLabsService.synthesizeSpeech('Hi!', mockCharacter);
      expect(shortResult.duration).toBeGreaterThan(0);
      expect(shortResult.duration).toBeLessThan(2);

      // Long text
      const longText = 'This is a much longer piece of text that should take significantly more time to speak aloud when converted to speech.';
      const longResult = await elevenLabsService.synthesizeSpeech(longText, mockCharacter);
      expect(longResult.duration).toBeGreaterThan(shortResult.duration);
    });
  });

  describe('dispose', () => {
    it('should clean up all resources', () => {
      const service = new ElevenLabsService();
      
      // Add some cached items
      service['audioCache'].set('test', {
        audioData: mockAudioData,
        duration: 1.0,
        format: 'audio/mpeg',
        url: 'blob:test-url'
      });

      expect(service.getCacheSize()).toBe(1);

      service.dispose();

      expect(service.getCacheSize()).toBe(0);
      expect(service.isAudioPlaying()).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle malformed API responses', async () => {
      const mockResponse = {
        ok: true,
        arrayBuffer: jest.fn().mockRejectedValue(new Error('Invalid response'))
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(
        elevenLabsService.synthesizeSpeech('Hello', mockCharacter)
      ).rejects.toThrow('Failed to synthesize speech: Invalid response');
    });

    it('should handle audio setup failures', async () => {
      const audioResult: AudioResult = {
        audioData: mockAudioData,
        duration: 2.5,
        format: 'audio/mpeg',
        url: 'invalid-url'
      };

      // Mock Audio constructor to throw
      const originalAudio = global.Audio;
      global.Audio = jest.fn().mockImplementation(() => {
        throw new Error('Audio setup failed');
      });

      await expect(
        elevenLabsService.playAudio(audioResult)
      ).rejects.toThrow('Audio setup failed');

      global.Audio = originalAudio;
    });
  });
});