import { AssemblyAIService, AssemblyAIConfig, TranscriptionResult } from '../services/assemblyai';

// Mock the AssemblyAI client
jest.mock('assemblyai', () => ({
  AssemblyAI: jest.fn().mockImplementation(() => ({
    realtime: {
      createTemporaryToken: jest.fn(),
    },
  })),
}));

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(public url: string) {
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }

  send(data: string) {
    // Mock send functionality
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }
}

// Mock MediaRecorder
class MockMediaRecorder {
  static isTypeSupported = jest.fn().mockReturnValue(true);
  
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  state = 'inactive';

  constructor(public stream: MediaStream, public options?: MediaRecorderOptions) {}

  start(timeslice?: number) {
    this.state = 'recording';
    // Simulate data available event
    setTimeout(() => {
      const mockBlob = new Blob(['mock audio data'], { type: 'audio/webm' });
      const event = new BlobEvent('dataavailable', { data: mockBlob });
      this.ondataavailable?.(event);
    }, 100);
  }

  stop() {
    this.state = 'inactive';
  }
}

// Mock navigator.mediaDevices
const mockGetUserMedia = jest.fn();
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
});

// Mock FileReader
class MockFileReader {
  onloadend: ((event: ProgressEvent<FileReader>) => void) | null = null;
  result: string | ArrayBuffer | null = null;

  readAsDataURL(blob: Blob) {
    // Simulate reading as data URL
    setTimeout(() => {
      this.result = 'data:audio/webm;base64,bW9jayBhdWRpbyBkYXRh';
      this.onloadend?.(new ProgressEvent('loadend'));
    }, 10);
  }
}

// Mock fetch for API calls
global.fetch = jest.fn();

// Set up global mocks
(global as any).WebSocket = MockWebSocket;
(global as any).MediaRecorder = MockMediaRecorder;
(global as any).FileReader = MockFileReader;

describe('AssemblyAIService', () => {
  let service: AssemblyAIService;
  let config: AssemblyAIConfig;
  let mockStream: MediaStream;

  beforeEach(() => {
    config = {
      apiKey: 'test-api-key',
      sampleRate: 16000,
      wordBoost: ['chore', 'task', 'complete'],
    };

    // Create mock MediaStream
    mockStream = {
      getTracks: jest.fn().mockReturnValue([
        { stop: jest.fn() }
      ]),
    } as any;

    mockGetUserMedia.mockResolvedValue(mockStream);
    
    // Mock fetch for token endpoint
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ token: 'mock-token' }),
    });

    service = new AssemblyAIService(config);
  });

  afterEach(() => {
    service.dispose();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(service).toBeInstanceOf(AssemblyAIService);
    });
  });

  describe('requestMicrophonePermission', () => {
    it('should request microphone permission successfully', async () => {
      const result = await service.requestMicrophonePermission();
      
      expect(result).toBe(true);
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    });

    it('should handle permission denial', async () => {
      mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));
      
      const result = await service.requestMicrophonePermission();
      
      expect(result).toBe(false);
    });
  });

  describe('startRealTimeTranscription', () => {
    it('should start transcription successfully', async () => {
      await service.requestMicrophonePermission();
      
      const startPromise = service.startRealTimeTranscription();
      
      // Wait for WebSocket to connect
      await new Promise(resolve => setTimeout(resolve, 20));
      
      await expect(startPromise).resolves.toBeUndefined();
      expect(global.fetch).toHaveBeenCalledWith('/api/voice-coach/assemblyai-token', {
        method: 'POST',
      });
    });

    it('should throw error if already recording', async () => {
      await service.requestMicrophonePermission();
      
      // Start first transcription
      const startPromise1 = service.startRealTimeTranscription();
      await new Promise(resolve => setTimeout(resolve, 20));
      await startPromise1;
      
      // Try to start second transcription - should fail
      await expect(service.startRealTimeTranscription()).rejects.toThrow(
        'Transcription is already in progress'
      );
    });

    it('should request permission if not already granted', async () => {
      // Don't pre-request permission for this test
      const startPromise = service.startRealTimeTranscription();
      
      // Wait for permission request and WebSocket connection
      await new Promise(resolve => setTimeout(resolve, 50));
      
      await expect(startPromise).resolves.toBeUndefined();
      expect(mockGetUserMedia).toHaveBeenCalled();
    });

    it('should handle API token fetch failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(service.startRealTimeTranscription()).rejects.toThrow(
        'Failed to get AssemblyAI session token'
      );
    });
  });

  describe('transcription callbacks', () => {
    let transcriptionCallback: jest.Mock;
    let errorCallback: jest.Mock;

    beforeEach(() => {
      transcriptionCallback = jest.fn();
      errorCallback = jest.fn();
      
      service.onTranscriptionResult(transcriptionCallback);
      service.onError(errorCallback);
    });

    it('should handle partial transcription messages', async () => {
      await service.requestMicrophonePermission();
      await service.startRealTimeTranscription();
      
      // Wait for WebSocket connection
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Simulate receiving a partial transcript
      const mockWebSocket = (service as any).websocket;
      const partialMessage = {
        message_type: 'PartialTranscript',
        text: 'Hello world',
        confidence: 0.95,
      };
      
      mockWebSocket.onmessage({
        data: JSON.stringify(partialMessage),
      });
      
      expect(transcriptionCallback).toHaveBeenCalledWith({
        text: 'Hello world',
        confidence: 0.95,
        isFinal: false,
        timestamp: expect.any(Number),
      });
    });

    it('should handle final transcription messages', async () => {
      await service.requestMicrophonePermission();
      await service.startRealTimeTranscription();
      
      // Wait for WebSocket connection
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Simulate receiving a final transcript
      const mockWebSocket = (service as any).websocket;
      const finalMessage = {
        message_type: 'FinalTranscript',
        text: 'Complete sentence',
        confidence: 0.98,
      };
      
      mockWebSocket.onmessage({
        data: JSON.stringify(finalMessage),
      });
      
      expect(transcriptionCallback).toHaveBeenCalledWith({
        text: 'Complete sentence',
        confidence: 0.98,
        isFinal: true,
        timestamp: expect.any(Number),
      });
    });

    it('should handle WebSocket errors', async () => {
      await service.requestMicrophonePermission();
      await service.startRealTimeTranscription();
      
      // Wait for WebSocket connection
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Simulate WebSocket error
      const mockWebSocket = (service as any).websocket;
      mockWebSocket.onerror(new Event('error'));
      
      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'WebSocket connection error',
        })
      );
    });
  });

  describe('stopTranscription', () => {
    it('should stop transcription and clean up resources', async () => {
      await service.requestMicrophonePermission();
      await service.startRealTimeTranscription();
      
      // Wait for setup
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(service.isTranscribing()).toBe(true);
      
      service.stopTranscription();
      
      expect(service.isTranscribing()).toBe(false);
    });

    it('should handle stopping when not recording', () => {
      expect(() => service.stopTranscription()).not.toThrow();
    });
  });

  describe('isTranscribing', () => {
    it('should return false initially', () => {
      expect(service.isTranscribing()).toBe(false);
    });

    it('should return true when transcribing', async () => {
      await service.requestMicrophonePermission();
      await service.startRealTimeTranscription();
      
      // Wait for setup
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(service.isTranscribing()).toBe(true);
    });
  });

  describe('dispose', () => {
    it('should clean up all resources', async () => {
      const transcriptionCallback = jest.fn();
      const errorCallback = jest.fn();
      
      service.onTranscriptionResult(transcriptionCallback);
      service.onError(errorCallback);
      
      await service.requestMicrophonePermission();
      await service.startRealTimeTranscription();
      
      service.dispose();
      
      expect(service.isTranscribing()).toBe(false);
    });
  });
});

describe('createAssemblyAIService', () => {
  it('should create a new service instance', () => {
    const config: AssemblyAIConfig = {
      apiKey: 'test-key',
      sampleRate: 16000,
    };
    
    const { createAssemblyAIService } = require('../services/assemblyai');
    const service = createAssemblyAIService(config);
    
    expect(service).toBeInstanceOf(AssemblyAIService);
  });
});