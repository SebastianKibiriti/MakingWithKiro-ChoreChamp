/**
 * ElevenLabs Text-to-Speech Service for Voice Coach
 * Handles audio synthesis with voice character management and playback
 */

import { getVoiceCoachConfig } from '../env-validation';

// Types for ElevenLabs service
export interface ElevenLabsConfig {
  apiKey: string;
  model: string;
  stability: number;
  similarityBoost: number;
  optimizeStreamingLatency: number;
}

export interface VoiceCharacter {
  id: string;
  name: string;
  voiceId: string;
  personality: string;
  sampleRate: number;
}

export interface AudioResult {
  audioData: ArrayBuffer;
  duration: number;
  format: string;
  url: string;
}

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

// Pre-configured voice characters matching the design document
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
 * ElevenLabs Text-to-Speech Service
 */
export class ElevenLabsService {
  private config: ElevenLabsConfig;
  private audioCache: Map<string, AudioResult> = new Map();
  private currentAudio: HTMLAudioElement | null = null;
  private isPlaying = false;

  constructor(config?: Partial<ElevenLabsConfig>) {
    const envConfig = getVoiceCoachConfig();
    
    this.config = {
      apiKey: envConfig.elevenLabsApiKey,
      model: envConfig.elevenLabsModel,
      stability: 0.5,
      similarityBoost: 0.75,
      optimizeStreamingLatency: 0,
      ...config
    };
  }

  /**
   * Synthesize speech from text using specified voice character
   */
  async synthesizeSpeech(text: string, character: VoiceCharacter): Promise<AudioResult> {
    if (!text.trim()) {
      throw new Error('Text cannot be empty');
    }

    // Check cache first
    const cacheKey = `${character.voiceId}-${this.hashText(text)}`;
    const cached = this.audioCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const voiceSettings: VoiceSettings = {
        stability: this.config.stability,
        similarity_boost: this.config.similarityBoost,
        style: 0,
        use_speaker_boost: true
      };

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${character.voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.config.apiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: this.config.model,
          voice_settings: voiceSettings,
          optimize_streaming_latency: this.config.optimizeStreamingLatency,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      const audioData = await response.arrayBuffer();
      
      // Create blob URL for audio playback
      const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(audioBlob);

      // Estimate duration (rough calculation based on text length and speaking rate)
      const estimatedDuration = this.estimateAudioDuration(text);

      const result: AudioResult = {
        audioData,
        duration: estimatedDuration,
        format: 'audio/mpeg',
        url
      };

      // Cache the result
      this.audioCache.set(cacheKey, result);

      return result;
    } catch (error) {
      console.error('ElevenLabs synthesis error:', error);
      throw new Error(`Failed to synthesize speech: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Play audio with proper cleanup and event handling
   */
  async playAudio(audioResult: AudioResult): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Stop any currently playing audio
        this.stopAudio();

        // Create new audio element
        this.currentAudio = new Audio(audioResult.url);
        this.currentAudio.preload = 'auto';

        // Set up event listeners
        this.currentAudio.onloadeddata = () => {
          console.log('Audio loaded and ready to play');
        };

        this.currentAudio.onplay = () => {
          this.isPlaying = true;
          console.log('Audio playback started');
        };

        this.currentAudio.onended = () => {
          this.isPlaying = false;
          this.cleanup();
          console.log('Audio playback completed');
          resolve();
        };

        this.currentAudio.onerror = (error) => {
          this.isPlaying = false;
          this.cleanup();
          console.error('Audio playback error:', error);
          reject(new Error('Audio playback failed'));
        };

        this.currentAudio.onpause = () => {
          this.isPlaying = false;
          console.log('Audio playback paused');
        };

        // Start playback
        this.currentAudio.play().catch((error) => {
          this.isPlaying = false;
          this.cleanup();
          reject(new Error(`Failed to start audio playback: ${error.message}`));
        });

      } catch (error) {
        reject(new Error(`Audio setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  /**
   * Stop currently playing audio
   */
  stopAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.cleanup();
    }
    this.isPlaying = false;
  }

  /**
   * Check if audio is currently playing
   */
  isAudioPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get available voice characters
   */
  getAvailableVoices(): VoiceCharacter[] {
    return Object.values(VOICE_CHARACTERS);
  }

  /**
   * Get voice character by ID
   */
  getVoiceCharacter(characterId: string): VoiceCharacter | null {
    return VOICE_CHARACTERS[characterId] || null;
  }

  /**
   * Preload character voices for faster synthesis
   */
  async preloadCharacterVoices(characters: VoiceCharacter[]): Promise<void> {
    const preloadPromises = characters.map(async (character) => {
      try {
        // Preload with a short test phrase
        await this.synthesizeSpeech("Hello!", character);
        console.log(`Preloaded voice for ${character.name}`);
      } catch (error) {
        console.warn(`Failed to preload voice for ${character.name}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Clear audio cache to free memory
   */
  clearCache(): void {
    // Revoke blob URLs to prevent memory leaks
    this.audioCache.forEach((result) => {
      URL.revokeObjectURL(result.url);
    });
    this.audioCache.clear();
  }

  /**
   * Get cache size for monitoring
   */
  getCacheSize(): number {
    return this.audioCache.size;
  }

  /**
   * Estimate audio duration based on text length
   * Average speaking rate is about 150-160 words per minute
   */
  private estimateAudioDuration(text: string): number {
    const words = text.trim().split(/\s+/).length;
    const wordsPerMinute = 155; // Average speaking rate
    const durationMinutes = words / wordsPerMinute;
    return Math.max(durationMinutes * 60, 1); // Minimum 1 second
  }

  /**
   * Create a simple hash of text for caching
   */
  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Clean up current audio resources
   */
  private cleanup(): void {
    if (this.currentAudio) {
      // Remove event listeners to prevent memory leaks
      this.currentAudio.onloadeddata = null;
      this.currentAudio.onplay = null;
      this.currentAudio.onended = null;
      this.currentAudio.onerror = null;
      this.currentAudio.onpause = null;
      
      this.currentAudio = null;
    }
  }

  /**
   * Dispose of the service and clean up all resources
   */
  dispose(): void {
    this.stopAudio();
    this.clearCache();
    console.log('ElevenLabsService disposed');
  }
}

/**
 * Create a singleton instance of ElevenLabsService
 */
let elevenLabsServiceInstance: ElevenLabsService | null = null;

export function getElevenLabsService(): ElevenLabsService {
  if (!elevenLabsServiceInstance) {
    elevenLabsServiceInstance = new ElevenLabsService();
  }
  return elevenLabsServiceInstance;
}

/**
 * Factory function to create ElevenLabsService instance with custom config
 */
export function createElevenLabsService(config?: Partial<ElevenLabsConfig>): ElevenLabsService {
  return new ElevenLabsService(config);
}