'use client'

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'

export interface RealtimeSubscription {
  id: string
  channel: RealtimeChannel
  table: string
  events: ('INSERT' | 'UPDATE' | 'DELETE')[]
  filter?: {
    column: string
    value: any
    operator?: 'eq' | 'in' | 'neq'
  }
  callback: (payload: any) => void
  errorHandler?: (error: Error) => void
  createdAt: Date
}

export interface RealtimeContextType {
  // Connection status
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting'
  lastSyncTime: Date | null
  pendingUpdates: number
  
  // Subscription management
  subscriptions: Map<string, RealtimeSubscription>
  addSubscription: (key: string, subscription: Omit<RealtimeSubscription, 'id' | 'createdAt'>) => void
  removeSubscription: (key: string) => void
  
  // Connection management
  reconnect: () => void
  isHealthy: boolean
}

const RealtimeContext = createContext<RealtimeContextType | null>(null)

interface RealtimeProviderProps {
  children: React.ReactNode
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected')
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [pendingUpdates, setPendingUpdates] = useState(0)
  const [subscriptions] = useState(new Map<string, RealtimeSubscription>())
  const [isHealthy, setIsHealthy] = useState(true)
  
  // Refs for cleanup and connection management
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const healthCheckIntervalRef = useRef<NodeJS.Timeout>()
  const mountedRef = useRef(true)
  
  // Connection health monitoring
  const checkConnectionHealth = useCallback(() => {
    if (!mountedRef.current) return
    
    const now = new Date()
    const timeSinceLastSync = lastSyncTime ? now.getTime() - lastSyncTime.getTime() : 0
    
    // Consider connection unhealthy if no sync in 30 seconds and we have active subscriptions
    const isCurrentlyHealthy = subscriptions.size === 0 || timeSinceLastSync < 30000
    
    if (isCurrentlyHealthy !== isHealthy) {
      setIsHealthy(isCurrentlyHealthy)
    }
  }, [lastSyncTime, subscriptions.size, isHealthy])
  
  // Start health monitoring
  useEffect(() => {
    healthCheckIntervalRef.current = setInterval(checkConnectionHealth, 5000)
    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current)
      }
    }
  }, [checkConnectionHealth])

  // Monitor Supabase connection status with a single stable channel
  useEffect(() => {
    if (!mountedRef.current) return
    
    // Use a stable channel name to avoid creating multiple connections
    const channel = supabase.channel('global-connection-monitor')
    
    channel.subscribe((status) => {
      if (!mountedRef.current) return
      
      switch (status) {
        case 'SUBSCRIBED':
          setConnectionStatus('connected')
          setLastSyncTime(new Date())
          break
        case 'CHANNEL_ERROR':
        case 'TIMED_OUT':
        case 'CLOSED':
          setConnectionStatus('disconnected')
          break
        default:
          break
      }
    })
    
    return () => {
      channel.unsubscribe()
    }
  }, [])
  
  // Reconnection logic with exponential backoff
  const reconnect = useCallback(() => {
    if (!mountedRef.current) return
    
    setConnectionStatus('reconnecting')
    
    // Clear existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    // Attempt to reestablish all subscriptions
    const reestablishSubscriptions = async () => {
      try {
        subscriptions.forEach(async (subscription, key) => {
          // Unsubscribe old channel
          await subscription.channel.unsubscribe()
          
          // Create new channel and resubscribe
          const newChannel = supabase.channel(`realtime-${key}-${Date.now()}`)
          
          let channelBuilder = newChannel.on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: subscription.table,
              ...(subscription.filter && {
                filter: `${subscription.filter.column}=${subscription.filter.operator || 'eq'}.${subscription.filter.value}`
              })
            },
            (payload) => {
              if (!mountedRef.current) return
              
              setLastSyncTime(new Date())
              setPendingUpdates(prev => prev + 1)
              
              try {
                subscription.callback(payload)
                // Decrement pending updates after successful processing
                setPendingUpdates(prev => Math.max(0, prev - 1))
              } catch (error) {
                console.error('Error processing realtime update:', error)
                if (subscription.errorHandler) {
                  subscription.errorHandler(error as Error)
                }
              }
            }
          )
          
          await channelBuilder.subscribe()
          
          // Update subscription with new channel
          subscriptions.set(key, {
            ...subscription,
            channel: newChannel
          })
        })
        
        if (mountedRef.current) {
          setConnectionStatus('connected')
        }
      } catch (error) {
        console.error('Failed to reconnect:', error)
        if (mountedRef.current) {
          setConnectionStatus('disconnected')
          
          // Retry with exponential backoff
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              reconnect()
            }
          }, Math.min(30000, 1000 * Math.pow(2, subscriptions.size))) // Max 30 seconds
        }
      }
    }
    
    reestablishSubscriptions()
  }, [subscriptions])
  
  // Add subscription function with stable channel names
  const addSubscription = useCallback((key: string, subscriptionConfig: Omit<RealtimeSubscription, 'id' | 'createdAt'>) => {
    if (!mountedRef.current) return
    
    // Remove existing subscription if it exists
    if (subscriptions.has(key)) {
      removeSubscription(key)
    }
    
    // Use stable channel name without timestamp to prevent multiple connections
    const channel = supabase.channel(`realtime-${key}`)
    
    const subscription: RealtimeSubscription = {
      id: key,
      createdAt: new Date(),
      ...subscriptionConfig,
      channel
    }
    
    // Set up the subscription
    let channelBuilder = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: subscription.table,
        ...(subscription.filter && {
          filter: `${subscription.filter.column}=${subscription.filter.operator || 'eq'}.${subscription.filter.value}`
        })
      },
      (payload) => {
        if (!mountedRef.current) return
        
        setLastSyncTime(new Date())
        setPendingUpdates(prev => prev + 1)
        
        try {
          subscription.callback(payload)
          // Decrement pending updates after successful processing
          setPendingUpdates(prev => Math.max(0, prev - 1))
        } catch (error) {
          console.error('Error processing realtime update:', error)
          if (subscription.errorHandler) {
            subscription.errorHandler(error as Error)
          }
        }
      }
    )
    
    // Subscribe to the channel with less aggressive reconnection
    channelBuilder.subscribe((status) => {
      if (!mountedRef.current) return
      
      switch (status) {
        case 'SUBSCRIBED':
          setConnectionStatus('connected')
          setLastSyncTime(new Date())
          break
        case 'CHANNEL_ERROR':
        case 'TIMED_OUT':
        case 'CLOSED':
          setConnectionStatus('disconnected')
          // Only attempt reconnection if we don't already have a timeout pending
          if (!reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectTimeoutRef.current = undefined
              if (mountedRef.current) {
                reconnect()
              }
            }, 5000) // Increased delay to 5 seconds
          }
          break
        default:
          break
      }
    })
    
    subscriptions.set(key, subscription)
  }, [reconnect, subscriptions])
  
  // Remove subscription function
  const removeSubscription = useCallback((key: string) => {
    const subscription = subscriptions.get(key)
    if (subscription) {
      subscription.channel.unsubscribe()
      subscriptions.delete(key)
    }
  }, [subscriptions])

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    
    return () => {
      mountedRef.current = false
      
      // Clear timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current)
      }
      
      // Unsubscribe from all channels
      subscriptions.forEach((subscription) => {
        subscription.channel.unsubscribe()
      })
      subscriptions.clear()
    }
  }, [subscriptions])
  
  const contextValue: RealtimeContextType = {
    connectionStatus,
    lastSyncTime,
    pendingUpdates,
    subscriptions,
    addSubscription,
    removeSubscription,
    reconnect,
    isHealthy
  }
  
  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  )
}

// Custom hook to use the realtime context
export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider')
  }
  return context
}

// Connection status indicator component
export interface ConnectionStatusProps {
  className?: string
  showDetails?: boolean
}

export function ConnectionStatus({ className = '', showDetails = false }: ConnectionStatusProps) {
  const { connectionStatus, lastSyncTime, pendingUpdates, isHealthy, reconnect } = useRealtime()

  const getStatusColor = () => {
    if (!isHealthy) return 'text-orange-600'
    
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600'
      case 'reconnecting':
        return 'text-yellow-600'
      case 'disconnected':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusIcon = () => {
    if (!isHealthy) return '🟠'
    
    switch (connectionStatus) {
      case 'connected':
        return '🟢'
      case 'reconnecting':
        return '🟡'
      case 'disconnected':
        return '🔴'
      default:
        return '⚪'
    }
  }

  const getStatusText = () => {
    if (!isHealthy) return 'Connection Issues'
    
    switch (connectionStatus) {
      case 'connected':
        return 'Connected'
      case 'reconnecting':
        return 'Reconnecting...'
      case 'disconnected':
        return 'Disconnected'
      default:
        return 'Unknown'
    }
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="text-sm">
        {getStatusIcon()} <span className={getStatusColor()}>{getStatusText()}</span>
      </span>
      
      {showDetails && (
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          {lastSyncTime && (
            <span>Last sync: {lastSyncTime.toLocaleTimeString()}</span>
          )}
          {pendingUpdates > 0 && (
            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
              {pendingUpdates} pending
            </span>
          )}
          {(connectionStatus === 'disconnected' || !isHealthy) && (
            <button
              onClick={reconnect}
              className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs hover:bg-blue-200 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  )
}

