import { AssemblyAI } from 'assemblyai';

export interface AssemblyAIConfig {
  apiKey: string;
  sampleRate: number;
  wordBoost?: string[];
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  timestamp?: number;
}

export interface AudioInputConfig {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
}

export class AssemblyAIService {
  private client: AssemblyAI;
  private websocket: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private isRecording = false;
  private transcriptionCallback: ((result: TranscriptionResult) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;

  constructor(private config: AssemblyAIConfig) {
    this.client = new AssemblyAI({
      apiKey: config.apiKey,
    });
  }

  /**
   * Request microphone permissions and initialize audio input
   */
  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      
      // Store the stream for later use
      this.audioStream = stream;
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  /**
   * Start real-time transcription using WebSocket connection
   */
  async startRealTimeTranscription(): Promise<void> {
    if (this.isRecording) {
      throw new Error('Transcription is already in progress');
    }

    if (!this.audioStream) {
      const hasPermission = await this.requestMicrophonePermission();
      if (!hasPermission) {
        throw new Error('Microphone permission required for transcription');
      }
    }

    try {
      // Create WebSocket connection to AssemblyAI
      const response = await fetch('/api/voice-coach/assemblyai-token', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to get AssemblyAI session token');
      }
      
      const { token } = await response.json();
      
      // Connect to AssemblyAI real-time service
      this.websocket = new WebSocket(
        `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=${this.config.sampleRate}&token=${token}`
      );

      this.websocket.onopen = () => {
        console.log('AssemblyAI WebSocket connected');
        this.startAudioCapture();
      };

      this.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleTranscriptionMessage(data);
      };

      this.websocket.onerror = (error) => {
        console.error('AssemblyAI WebSocket error:', error);
        this.errorCallback?.(new Error('WebSocket connection error'));
      };

      this.websocket.onclose = () => {
        console.log('AssemblyAI WebSocket disconnected');
        this.cleanup();
      };

    } catch (error) {
      console.error('Failed to start real-time transcription:', error);
      throw error;
    }
  }

  /**
   * Start capturing audio from microphone
   */
  private startAudioCapture(): void {
    if (!this.audioStream) {
      throw new Error('Audio stream not available');
    }

    try {
      // Create MediaRecorder for audio capture
      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.websocket?.readyState === WebSocket.OPEN) {
          // Convert audio data to base64 and send to AssemblyAI
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = (reader.result as string).split(',')[1];
            this.websocket?.send(JSON.stringify({
              audio_data: base64Audio,
            }));
          };
          reader.readAsDataURL(event.data);
        }
      };

      this.mediaRecorder.start(100); // Send audio data every 100ms
      this.isRecording = true;
    } catch (error) {
      console.error('Failed to start audio capture:', error);
      throw new Error('Failed to start audio capture');
    }
  }

  /**
   * Handle incoming transcription messages from AssemblyAI
   */
  private handleTranscriptionMessage(data: any): void {
    if (data.message_type === 'FinalTranscript' || data.message_type === 'PartialTranscript') {
      const result: TranscriptionResult = {
        text: data.text || '',
        confidence: data.confidence || 0,
        isFinal: data.message_type === 'FinalTranscript',
        timestamp: Date.now(),
      };

      this.transcriptionCallback?.(result);
    } else if (data.message_type === 'SessionBegins') {
      console.log('AssemblyAI session started:', data.session_id);
    } else if (data.message_type === 'SessionTerminated') {
      console.log('AssemblyAI session terminated');
      this.cleanup();
    }
  }

  /**
   * Stop real-time transcription
   */
  stopTranscription(): void {
    this.isRecording = false;
    
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({ terminate_session: true }));
      this.websocket.close();
    }
    
    this.cleanup();
  }

  /**
   * Set callback for transcription results
   */
  onTranscriptionResult(callback: (result: TranscriptionResult) => void): void {
    this.transcriptionCallback = callback;
  }

  /**
   * Set callback for errors
   */
  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  /**
   * Check if transcription is currently active
   */
  isTranscribing(): boolean {
    return this.isRecording;
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    this.isRecording = false;
    this.mediaRecorder = null;
    this.websocket = null;
    
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
  }

  /**
   * Dispose of the service and clean up all resources
   */
  dispose(): void {
    this.stopTranscription();
    this.transcriptionCallback = null;
    this.errorCallback = null;
  }
}

/**
 * Factory function to create AssemblyAI service instance
 */
export function createAssemblyAIService(config: AssemblyAIConfig): AssemblyAIService {
  return new AssemblyAIService(config);
}