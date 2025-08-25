import { renderHook, act } from '@testing-library/react';
import { useAssemblyAI, UseAssemblyAIOptions } from '../hooks/useAssemblyAI';

// Mock the AssemblyAI service
jest.mock('../services/assemblyai', () => ({
  AssemblyAIService: jest.fn().mockImplementation(() => ({
    requestMicrophonePermission: jest.fn(),
    startRealTimeTranscription: jest.fn(),
    stopTranscription: jest.fn(),
    isTranscribing: jest.fn(),
    onTranscriptionResult: jest.fn(),
    onError: jest.fn(),
    dispose: jest.fn(),
  })),
}));

describe('useAssemblyAI', () => {
  let mockService: any;
  let defaultOptions: UseAssemblyAIOptions;

  beforeEach(() => {
    const { AssemblyAIService } = require('../services/assemblyai');
    mockService = {
      requestMicrophonePermission: jest.fn(),
      startRealTimeTranscription: jest.fn(),
      stopTranscription: jest.fn(),
      isTranscribing: jest.fn().mockReturnValue(false),
      onTranscriptionResult: jest.fn(),
      onError: jest.fn(),
      dispose: jest.fn(),
    };
    
    AssemblyAIService.mockImplementation(() => mockService);

    defaultOptions = {
      apiKey: 'test-api-key',
      sampleRate: 16000,
      wordBoost: ['test', 'words'],
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useAssemblyAI(defaultOptions));

      expect(result.current.isTranscribing).toBe(false);
      expect(result.current.isInitializing).toBe(false);
      expect(result.current.currentTranscript).toBe('');
      expect(result.current.finalTranscript).toBe('');
      expect(result.current.error).toBe(null);
      expect(result.current.hasPermission).toBe(false);
    });

    it('should create AssemblyAI service with correct config', () => {
      const { AssemblyAIService } = require('../services/assemblyai');
      
      renderHook(() => useAssemblyAI(defaultOptions));

      expect(AssemblyAIService).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        sampleRate: 16000,
        wordBoost: ['test', 'words'],
      });
    });

    it('should set up transcription and error callbacks', () => {
      renderHook(() => useAssemblyAI(defaultOptions));

      expect(mockService.onTranscriptionResult).toHaveBeenCalledWith(expect.any(Function));
      expect(mockService.onError).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('requestPermission', () => {
    it('should request microphone permission successfully', async () => {
      mockService.requestMicrophonePermission.mockResolvedValue(true);
      
      const { result } = renderHook(() => useAssemblyAI(defaultOptions));

      await act(async () => {
        const granted = await result.current.requestPermission();
        expect(granted).toBe(true);
      });

      expect(result.current.hasPermission).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('should handle permission denial', async () => {
      mockService.requestMicrophonePermission.mockResolvedValue(false);
      
      const { result } = renderHook(() => useAssemblyAI(defaultOptions));

      await act(async () => {
        const granted = await result.current.requestPermission();
        expect(granted).toBe(false);
      });

      expect(result.current.hasPermission).toBe(false);
    });

    it('should handle permission request errors', async () => {
      const error = new Error('Permission request failed');
      mockService.requestMicrophonePermission.mockRejectedValue(error);
      
      const { result } = renderHook(() => useAssemblyAI(defaultOptions));

      await act(async () => {
        const granted = await result.current.requestPermission();
        expect(granted).toBe(false);
      });

      expect(result.current.error).toBe('Permission request failed');
    });
  });

  describe('startTranscription', () => {
    it('should start transcription successfully', async () => {
      mockService.startRealTimeTranscription.mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useAssemblyAI(defaultOptions));

      await act(async () => {
        await result.current.startTranscription();
      });

      expect(mockService.startRealTimeTranscription).toHaveBeenCalled();
      expect(result.current.isTranscribing).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('should handle transcription start errors', async () => {
      const error = new Error('Failed to start transcription');
      mockService.startRealTimeTranscription.mockRejectedValue(error);
      
      const { result } = renderHook(() => useAssemblyAI(defaultOptions));

      await act(async () => {
        await result.current.startTranscription();
      });

      expect(result.current.error).toBe('Failed to start transcription');
      expect(result.current.isTranscribing).toBe(false);
    });

    it('should not start if already transcribing', async () => {
      const { result } = renderHook(() => useAssemblyAI(defaultOptions));
      
      // Simulate already transcribing
      act(() => {
        (result.current as any).isTranscribing = true;
      });

      await act(async () => {
        await result.current.startTranscription();
      });

      expect(mockService.startRealTimeTranscription).not.toHaveBeenCalled();
    });

    it('should clear transcripts when starting', async () => {
      mockService.startRealTimeTranscription.mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useAssemblyAI(defaultOptions));

      // Set some initial transcript values
      act(() => {
        (result.current as any).currentTranscript = 'old current';
        (result.current as any).finalTranscript = 'old final';
      });

      await act(async () => {
        await result.current.startTranscription();
      });

      expect(result.current.currentTranscript).toBe('');
      expect(result.current.finalTranscript).toBe('');
    });
  });

  describe('stopTranscription', () => {
    it('should stop transcription', () => {
      const { result } = renderHook(() => useAssemblyAI(defaultOptions));
      
      // Simulate transcribing state
      act(() => {
        (result.current as any).isTranscribing = true;
      });

      act(() => {
        result.current.stopTranscription();
      });

      expect(mockService.stopTranscription).toHaveBeenCalled();
      expect(result.current.isTranscribing).toBe(false);
      expect(result.current.currentTranscript).toBe('');
    });

    it('should not stop if not transcribing', () => {
      const { result } = renderHook(() => useAssemblyAI(defaultOptions));

      act(() => {
        result.current.stopTranscription();
      });

      expect(mockService.stopTranscription).not.toHaveBeenCalled();
    });
  });

  describe('transcription callbacks', () => {
    it('should handle partial transcription results', () => {
      const onTranscription = jest.fn();
      const options = { ...defaultOptions, onTranscription };
      
      const { result } = renderHook(() => useAssemblyAI(options));

      // Get the transcription callback that was set up
      const transcriptionCallback = mockService.onTranscriptionResult.mock.calls[0][0];

      // Simulate partial transcription result
      act(() => {
        transcriptionCallback({
          text: 'Hello world',
          confidence: 0.95,
          isFinal: false,
          timestamp: Date.now(),
        });
      });

      expect(result.current.currentTranscript).toBe('Hello world');
      expect(result.current.finalTranscript).toBe('');
      expect(onTranscription).toHaveBeenCalledWith({
        text: 'Hello world',
        confidence: 0.95,
        isFinal: false,
        timestamp: expect.any(Number),
      });
    });

    it('should handle final transcription results', () => {
      const onTranscription = jest.fn();
      const options = { ...defaultOptions, onTranscription };
      
      const { result } = renderHook(() => useAssemblyAI(options));

      // Get the transcription callback that was set up
      const transcriptionCallback = mockService.onTranscriptionResult.mock.calls[0][0];

      // Simulate final transcription result
      act(() => {
        transcriptionCallback({
          text: 'Complete sentence',
          confidence: 0.98,
          isFinal: true,
          timestamp: Date.now(),
        });
      });

      expect(result.current.currentTranscript).toBe('');
      expect(result.current.finalTranscript).toBe(' Complete sentence');
      expect(onTranscription).toHaveBeenCalledWith({
        text: 'Complete sentence',
        confidence: 0.98,
        isFinal: true,
        timestamp: expect.any(Number),
      });
    });

    it('should handle error callbacks', () => {
      const onError = jest.fn();
      const options = { ...defaultOptions, onError };
      
      const { result } = renderHook(() => useAssemblyAI(options));

      // Get the error callback that was set up
      const errorCallback = mockService.onError.mock.calls[0][0];

      // Simulate error
      const error = new Error('Test error');
      act(() => {
        errorCallback(error);
      });

      expect(result.current.error).toBe('Test error');
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe('cleanup', () => {
    it('should dispose service on unmount', () => {
      const { unmount } = renderHook(() => useAssemblyAI(defaultOptions));

      unmount();

      expect(mockService.dispose).toHaveBeenCalled();
    });

    it('should recreate service when config changes', () => {
      const { AssemblyAIService } = require('../services/assemblyai');
      const { rerender } = renderHook(
        (options) => useAssemblyAI(options),
        { initialProps: defaultOptions }
      );

      expect(AssemblyAIService).toHaveBeenCalledTimes(1);

      // Change the API key
      const newOptions = { ...defaultOptions, apiKey: 'new-api-key' };
      rerender(newOptions);

      expect(mockService.dispose).toHaveBeenCalled();
      expect(AssemblyAIService).toHaveBeenCalledTimes(2);
      expect(AssemblyAIService).toHaveBeenLastCalledWith({
        apiKey: 'new-api-key',
        sampleRate: 16000,
        wordBoost: ['test', 'words'],
      });
    });
  });
});