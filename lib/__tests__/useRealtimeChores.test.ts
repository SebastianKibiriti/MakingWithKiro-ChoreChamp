import { renderHook, act } from '@testing-library/react'
import { useRealtimeChores } from '../hooks/useRealtimeChores'
import { RealtimeProvider } from '../realtime-context'
import React from 'react'

// Mock Supabase
jest.mock('../supabase', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn((callback) => {
        // Simulate successful subscription
        setTimeout(() => callback('SUBSCRIBED'), 0)
        return Promise.resolve()
      }),
      unsubscribe: jest.fn()
    }))
  }
}))

const wrapper = ({ children }: { children: React.ReactNode }) => (
  React.createElement(RealtimeProvider, { children })
)

describe('useRealtimeChores', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with disconnected state', () => {
    const { result } = renderHook(() => useRealtimeChores(), { wrapper })
    
    expect(result.current.isConnected).toBe(false)
    expect(result.current.lastUpdate).toBe(null)
    expect(result.current.error).toBe(null)
  })

  it('should provide subscribe and unsubscribe methods', () => {
    const { result } = renderHook(() => useRealtimeChores(), { wrapper })
    
    expect(typeof result.current.subscribe).toBe('function')
    expect(typeof result.current.unsubscribe).toBe('function')
    expect(typeof result.current.retryConnection).toBe('function')
  })

  it('should handle subscription with filters', async () => {
    const onChoreUpdate = jest.fn()
    const { result } = renderHook(() => useRealtimeChores({ onChoreUpdate }), { wrapper })
    
    act(() => {
      result.current.subscribe({
        parentId: 'test-parent-id',
        events: ['INSERT', 'UPDATE']
      })
    })

    // Wait for subscription to be processed
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    expect(result.current.isConnected).toBe(true)
  })

  it('should clean up subscriptions on unsubscribe', () => {
    const { result } = renderHook(() => useRealtimeChores(), { wrapper })
    
    act(() => {
      result.current.subscribe({
        parentId: 'test-parent-id',
        events: ['INSERT']
      })
    })

    act(() => {
      result.current.unsubscribe()
    })

    expect(result.current.isConnected).toBe(false)
  })
})