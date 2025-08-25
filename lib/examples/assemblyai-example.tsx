import React, { useState } from 'react';
import { useAssemblyAI } from '../hooks/useAssemblyAI';

/**
 * Example component demonstrating how to use the AssemblyAI service
 * This is for demonstration purposes and shows the basic integration
 */
export function AssemblyAIExample() {
  const [apiKey] = useState(process.env.NEXT_PUBLIC_ASSEMBLYAI_API_KEY || '');
  
  const {
    isTranscribing,
    isInitializing,
    currentTranscript,
    finalTranscript,
    error,
    hasPermission,
    startTranscription,
    stopTranscription,
    requestPermission,
  } = useAssemblyAI({
    apiKey,
    sampleRate: 16000,
    wordBoost: ['chore', 'task', 'complete', 'done'],
    onTranscription: (result) => {
      console.log('Transcription result:', result);
    },
    onError: (error) => {
      console.error('AssemblyAI error:', error);
    },
  });

  const handleStartTranscription = async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        alert('Microphone permission is required for voice transcription');
        return;
      }
    }
    
    try {
      await startTranscription();
    } catch (error) {
      console.error('Failed to start transcription:', error);
    }
  };

  const handleStopTranscription = () => {
    stopTranscription();
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">AssemblyAI Speech-to-Text Demo</h2>
      
      {/* Status indicators */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${hasPermission ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm">
            Microphone: {hasPermission ? 'Granted' : 'Not granted'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            isTranscribing ? 'bg-blue-500 animate-pulse' : 
            isInitializing ? 'bg-yellow-500' : 'bg-gray-300'
          }`} />
          <span className="text-sm">
            Status: {
              isInitializing ? 'Initializing...' :
              isTranscribing ? 'Listening' : 'Stopped'
            }
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-4 space-x-2">
        {!hasPermission && (
          <button
            onClick={requestPermission}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Request Permission
          </button>
        )}
        
        {!isTranscribing ? (
          <button
            onClick={handleStartTranscription}
            disabled={isInitializing}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {isInitializing ? 'Starting...' : 'Start Listening'}
          </button>
        ) : (
          <button
            onClick={handleStopTranscription}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Stop Listening
          </button>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Transcription display */}
      <div className="space-y-3">
        {currentTranscript && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <h3 className="font-semibold text-blue-800 mb-1">Current (partial):</h3>
            <p className="text-blue-700 italic">{currentTranscript}</p>
          </div>
        )}
        
        {finalTranscript && (
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <h3 className="font-semibold text-green-800 mb-1">Final transcript:</h3>
            <p className="text-green-700">{finalTranscript}</p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 text-sm text-gray-600">
        <h4 className="font-semibold mb-2">Instructions:</h4>
        <ol className="list-decimal list-inside space-y-1">
          <li>Click "Request Permission" to allow microphone access</li>
          <li>Click "Start Listening" to begin speech recognition</li>
          <li>Speak clearly into your microphone</li>
          <li>Watch the partial transcription update in real-time</li>
          <li>Final transcriptions appear when you pause speaking</li>
          <li>Click "Stop Listening" when done</li>
        </ol>
      </div>
    </div>
  );
}