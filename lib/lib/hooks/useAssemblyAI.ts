import { useCallback, useEffect, useRef, useState } from 'react';
import { AssemblyAIService, AssemblyAIConfig, TranscriptionResult } from '../services/assemblyai';

export interface UseAssemblyAIOptions {
  apiKey: string;
  sampleRate?: number;
  wordBoost?: string[];
  onTranscription?: (result: TranscriptionResult) => void;
  onError?: (error: Error) => void;
}

export interface UseAssemblyAIReturn {
  isTranscribing: boolean;
  isInitializing: boolean;
  currentTranscript: string;
  finalTranscript: string;
  error: string | null;
  hasPermission: boolean;
  startTranscription: () => Promise<void>;
  stopTranscription: () => void;
  requestPermission: () => Promise<boolean>;
}

export function useAssemblyAI(options: UseAssemblyAIOptions): UseAssemblyAIReturn {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  
  const serviceRef = useRef<AssemblyAIService | null>(null);

  // Initialize service
  useEffect(() => {
    const config: AssemblyAIConfig = {
      apiKey: options.apiKey,
      sampleRate: options.sampleRate || 16000,
      wordBoost: options.wordBoost,
    };

    serviceRef.current = new AssemblyAIService(config);

    // Set up callbacks
    serviceRef.current.onTranscriptionResult((result: TranscriptionResult) => {
      if (result.isFinal) {
        setFinalTranscript(prev => prev + ' ' + result.text);
        setCurrentTranscript('');
      } else {
        setCurrentTranscript(result.text);
      }
      
      options.onTranscription?.(result);
    });

    serviceRef.current.onError((error: Error) => {
      setError(error.message);
      setIsTranscribing(false);
      setIsInitializing(false);
      options.onError?.(error);
    });

    return () => {
      serviceRef.current?.dispose();
    };
  }, [options.apiKey, options.sampleRate, options.wordBoost]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!serviceRef.current) return false;
    
    try {
      setError(null);
      const granted = await serviceRef.current.requestMicrophonePermission();
      setHasPermission(granted);
      return granted;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Permission request failed';
      setError(errorMessage);
      return false;
    }
  }, []);

  const startTranscription = useCallback(async (): Promise<void> => {
    if (!serviceRef.current || isTranscribing) return;

    try {
      setError(null);
      setIsInitializing(true);
      setCurrentTranscript('');
      setFinalTranscript('');

      await serviceRef.current.startRealTimeTranscription();
      setIsTranscribing(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start transcription';
      setError(errorMessage);
    } finally {
      setIsInitializing(false);
    }
  }, [isTranscribing]);

  const stopTranscription = useCallback((): void => {
    if (!serviceRef.current || !isTranscribing) return;

    serviceRef.current.stopTranscription();
    setIsTranscribing(false);
    setCurrentTranscript('');
  }, [isTranscribing]);

  return {
    isTranscribing,
    isInitializing,
    currentTranscript,
    finalTranscript,
    error,
    hasPermission,
    startTranscription,
    stopTranscription,
    requestPermission,
  };
}