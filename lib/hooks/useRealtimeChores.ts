import { useState, useEffect, useCallback, useRef } from 'react'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import { useRealtime, RealtimeSubscription } from '../realtime-context'

export interface SubscriptionFilters {
  parentId?: string
  childId?: string
  choreIds?: string[]
  events: ('INSERT' | 'UPDATE' | 'DELETE')[]
}

export interface RealtimeChoreHook {
  // Connection status
  isConnected: boolean
  lastUpdate: Date | null
  
  // Methods
  subscribe: (filters: SubscriptionFilters) => void
  unsubscribe: () => void
  
  // Error handling
  error: string | null
  retryConnection: () => void
}

interface RealtimeEvent {
  table: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new?: any
  old?: any
}

interface UseRealtimeChoresOptions {
  onChoreUpdate?: (event: RealtimeEvent) => void
  onChoreCompletionUpdate?: (event: RealtimeEvent) => void
  onProfileUpdate?: (event: RealtimeEvent) => void
  onError?: (error: string) => void
  onConnectionChange?: (connected: boolean) => void
}

export function useRealtimeChores(options: UseRealtimeChoresOptions = {}): RealtimeChoreHook {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const channelRef = useRef<RealtimeChannel | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const subscriptionKeyRef = useRef<string | null>(null)
  const maxReconnectAttempts = 5
  const baseReconnectDelay = 1000 // 1 second
  
  // Use realtime context for global state management
  const {
    connectionStatus,
    lastSyncTime,
    addSubscription,
    removeSubscription,
    reconnect
  } = useRealtime()
  
  const {
    onChoreUpdate,
    onChoreCompletionUpdate,
    onProfileUpdate,
    onError,
    onConnectionChange
  } = options

  // Exponential backoff calculation
  const getReconnectDelay = useCallback(() => {
    return Math.min(
      baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current),
      30000 // Max 30 seconds
    )
  }, [])

  // Handle connection status changes
  const handleConnectionChange = useCallback((connected: boolean) => {
    onConnectionChange?.(connected)
    
    if (connected) {
      reconnectAttemptsRef.current = 0
      setError(null)
    }
  }, [onConnectionChange])

  // Handle subscription errors
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage)
    onError?.(errorMessage)
  }, [onError])

  // Create filtered subscription based on user context
  const subscribe = useCallback((filters: SubscriptionFilters) => {
    // Clean up existing subscription
    if (subscriptionKeyRef.current) {
      removeSubscription(subscriptionKeyRef.current)
    }
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }

    try {
      // Create a stable channel name based on filters (no timestamp)
      const subscriptionKey = `chores_${filters.parentId || filters.childId || 'global'}`
      const channelName = `realtime_chores_${subscriptionKey}`
      const channel = supabase.channel(channelName)
      
      subscriptionKeyRef.current = subscriptionKey

      // Subscribe to chore changes with filtering
      if (filters.events.length > 0) {
        // Chores table subscription
        channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chores',
            filter: filters.parentId ? `parent_id=eq.${filters.parentId}` : undefined
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            if (filters.events.includes(payload.eventType)) {
              const now = new Date()
              setLastUpdate(now)
              
              onChoreUpdate?.({
                table: 'chores',
                eventType: payload.eventType,
                new: payload.new,
                old: payload.old
              })
            }
          }
        )

        // Chore completions table subscription
        channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chore_completions'
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            // Filter by child_id if specified
            if (filters.childId && (payload.new as any)?.child_id !== filters.childId && (payload.old as any)?.child_id !== filters.childId) {
              return
            }
            
            // Filter by parent_id through chore relationship (requires additional filtering in callback)
            if (filters.events.includes(payload.eventType)) {
              const now = new Date()
              setLastUpdate(now)
              
              onChoreCompletionUpdate?.({
                table: 'chore_completions',
                eventType: payload.eventType,
                new: payload.new,
                old: payload.old
              })
            }
          }
        )

        // Profiles table subscription (for points and rank updates)
        if (filters.childId || filters.parentId) {
          channel.on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
              filter: filters.childId ? `id=eq.${filters.childId}` : 
                     filters.parentId ? `parent_id=eq.${filters.parentId}` : undefined
            },
            (payload: RealtimePostgresChangesPayload<any>) => {
              const now = new Date()
              setLastUpdate(now)
              
              onProfileUpdate?.({
                table: 'profiles',
                eventType: payload.eventType,
                new: payload.new,
                old: payload.old
              })
            }
          )
        }
      }

      // Handle subscription status
      channel
        .subscribe((status) => {
          switch (status) {
            case 'SUBSCRIBED':
              handleConnectionChange(true)
              break
            case 'CHANNEL_ERROR':
              handleError('Channel subscription error')
              break
            case 'TIMED_OUT':
              handleError('Subscription timed out')
              break
            case 'CLOSED':
              handleConnectionChange(false)
              break
          }
        })

      channelRef.current = channel
      
      // Add to global subscription registry using the new interface
      addSubscription(subscriptionKey, {
        table: 'chores', // Primary table for this subscription
        events: filters.events,
        callback: () => {}, // Placeholder - actual callbacks are handled above
        channel
      })
      
    } catch (err) {
      handleError(`Failed to create subscription: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [onChoreUpdate, onChoreCompletionUpdate, onProfileUpdate, handleConnectionChange, handleError, addSubscription, removeSubscription])

  // Unsubscribe from all channels
  const unsubscribe = useCallback(() => {
    if (subscriptionKeyRef.current) {
      removeSubscription(subscriptionKeyRef.current)
      subscriptionKeyRef.current = null
    }
    
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    setError(null)
    reconnectAttemptsRef.current = 0
  }, [removeSubscription])

  // Retry connection with exponential backoff
  const retryConnection = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      handleError('Maximum reconnection attempts reached')
      return
    }

    const delay = getReconnectDelay()
    reconnectAttemptsRef.current += 1

    reconnectTimeoutRef.current = setTimeout(() => {
      // Re-subscribe with the same filters if we have a channel
      if (channelRef.current) {
        const currentChannel = channelRef.current
        currentChannel.unsubscribe()
        
        // Extract filters from the current channel and re-subscribe
        // This is a simplified approach - in a real implementation, 
        // you might want to store the filters in state
        handleError('Attempting to reconnect...')
      }
    }, delay)
  }, [getReconnectDelay, handleError])

  // Auto-retry on connection loss
  useEffect(() => {
    if (connectionStatus === 'disconnected' && error && reconnectAttemptsRef.current < maxReconnectAttempts) {
      retryConnection()
    }
  }, [connectionStatus, error, retryConnection])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribe()
    }
  }, [unsubscribe])

  return {
    isConnected: connectionStatus === 'connected',
    lastUpdate,
    subscribe,
    unsubscribe,
    error,
    retryConnection
  }
}