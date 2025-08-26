# Real-time Infrastructure Documentation

## Overview

The real-time infrastructure provides robust, scalable real-time synchronization for chore status updates between parent and child dashboards. It's built on top of Supabase's real-time capabilities with enhanced error handling, automatic reconnection, and user context filtering.

## Core Components

### 1. `useRealtimeChores` Hook

The main hook for managing real-time chore subscriptions with connection management and error handling.

```typescript
import { useRealtimeChores } from '@/lib/hooks/useRealtimeChores'

const realtimeChores = useRealtimeChores({
  onChoreUpdate: (event) => {
    // Handle chore table changes
    console.log('Chore updated:', event)
  },
  onChoreCompletionUpdate: (event) => {
    // Handle chore completion changes
    console.log('Completion updated:', event)
  },
  onProfileUpdate: (event) => {
    // Handle profile/points changes
    console.log('Profile updated:', event)
  },
  onError: (error) => {
    console.error('Real-time error:', error)
  },
  onConnectionChange: (connected) => {
    console.log('Connection changed:', connected)
  }
})
```

### 2. `RealtimeProvider` Context

Global context provider for managing real-time state across the application.

```typescript
import { RealtimeProvider, useRealtime } from '@/lib/realtime-context'

// In your app layout
<RealtimeProvider>
  <YourApp />
</RealtimeProvider>

// In components
const { connectionStatus, lastSyncTime, pendingUpdates } = useRealtime()
```

### 3. `ConnectionStatus` Component

Visual indicator for real-time connection status.

```typescript
import { ConnectionStatus } from '@/lib/realtime-context'

<ConnectionStatus showDetails />
```

## Usage Patterns

### Parent Dashboard Implementation

```typescript
'use client'

import { useRealtimeChores } from '@/lib/hooks/useRealtimeChores'
import { useAuth } from '@/lib/auth-context'

export default function ParentDashboard() {
  const { profile } = useAuth()
  const [pendingApprovals, setPendingApprovals] = useState([])

  const realtimeChores = useRealtimeChores({
    onChoreCompletionUpdate: (event) => {
      if (event.eventType === 'INSERT' && event.new?.status === 'pending') {
        // New chore completion pending approval
        fetchPendingApprovals()
      } else if (event.eventType === 'UPDATE' && event.old?.status === 'pending') {
        // Chore approval status changed
        fetchPendingApprovals()
      }
    },
    onError: (error) => {
      console.error('Real-time sync error:', error)
      // Optionally show user notification
    }
  })

  useEffect(() => {
    if (profile?.role === 'parent') {
      // Subscribe to parent-specific updates
      realtimeChores.subscribe({
        parentId: profile.id,
        events: ['INSERT', 'UPDATE', 'DELETE']
      })
    }

    return () => realtimeChores.unsubscribe()
  }, [profile])

  // ... rest of component
}
```

### Child Dashboard Implementation

```typescript
'use client'

import { useRealtimeChores } from '@/lib/hooks/useRealtimeChores'
import { useAuth } from '@/lib/auth-context'

export default function ChildDashboard() {
  const { profile } = useAuth()
  const [points, setPoints] = useState(0)
  const [choreStatuses, setChoreStatuses] = useState({})

  const realtimeChores = useRealtimeChores({
    onChoreCompletionUpdate: (event) => {
      if (event.new?.child_id === profile?.id) {
        // Update chore status for this child
        setChoreStatuses(prev => ({
          ...prev,
          [event.new.chore_id]: event.new.status
        }))
      }
    },
    onProfileUpdate: (event) => {
      if (event.new?.id === profile?.id) {
        // Update points and rank
        setPoints(event.new.points)
      }
    }
  })

  useEffect(() => {
    if (profile?.role === 'child') {
      // Subscribe to child-specific updates
      realtimeChores.subscribe({
        childId: profile.id,
        events: ['INSERT', 'UPDATE']
      })
    }

    return () => realtimeChores.unsubscribe()
  }, [profile])

  // ... rest of component
}
```

## Subscription Filtering

The system supports flexible filtering based on user context:

```typescript
// Parent subscription - receives all chores for their family
realtimeChores.subscribe({
  parentId: 'parent-uuid',
  events: ['INSERT', 'UPDATE', 'DELETE']
})

// Child subscription - receives only relevant updates
realtimeChores.subscribe({
  childId: 'child-uuid',
  events: ['INSERT', 'UPDATE']
})

// Specific chore subscription
realtimeChores.subscribe({
  choreIds: ['chore-1', 'chore-2'],
  events: ['UPDATE']
})
```

## Error Handling & Reconnection

The system includes automatic reconnection with exponential backoff:

- **Automatic Retry**: Attempts to reconnect on connection loss
- **Exponential Backoff**: Delays between retries increase exponentially
- **Max Attempts**: Stops after 5 failed attempts
- **Fallback Strategy**: Components should implement polling fallback
- **User Feedback**: Connection status is available to show users

```typescript
const realtimeChores = useRealtimeChores({
  onError: (error) => {
    // Handle errors gracefully
    if (error.includes('Maximum reconnection attempts')) {
      // Switch to polling mode
      startPollingFallback()
    }
  },
  onConnectionChange: (connected) => {
    if (!connected) {
      // Show offline indicator
      setOfflineMode(true)
    } else {
      // Re-sync data when reconnected
      refreshData()
      setOfflineMode(false)
    }
  }
})
```

## Performance Considerations

### Memory Management
- Subscriptions are automatically cleaned up on component unmount
- Event history is limited to prevent memory leaks
- Debouncing prevents UI flickering from rapid updates

### Network Efficiency
- Filtered subscriptions reduce unnecessary data transfer
- Batched updates minimize processing overhead
- Connection pooling reduces resource usage

### Scalability
- User-specific filtering ensures data isolation
- Row Level Security (RLS) policies are respected
- Subscription registry prevents duplicate connections

## Testing

The infrastructure includes comprehensive testing:

```bash
# Run real-time infrastructure tests
npm test -- lib/__tests__/useRealtimeChores.test.ts

# Run all tests
npm test
```

## Migration from Basic Subscriptions

To migrate existing basic real-time subscriptions:

1. **Replace basic subscriptions**:
   ```typescript
   // Old way
   const subscription = supabase
     .channel('basic_channel')
     .on('postgres_changes', { event: '*', schema: 'public', table: 'chores' }, callback)
     .subscribe()

   // New way
   const realtimeChores = useRealtimeChores({ onChoreUpdate: callback })
   realtimeChores.subscribe({ parentId: userId, events: ['INSERT', 'UPDATE'] })
   ```

2. **Add proper cleanup**:
   ```typescript
   useEffect(() => {
     // Subscribe
     realtimeChores.subscribe(filters)
     
     // Cleanup automatically handled
     return () => realtimeChores.unsubscribe()
   }, [dependencies])
   ```

3. **Add error handling**:
   ```typescript
   const realtimeChores = useRealtimeChores({
     onError: (error) => {
       // Handle errors appropriately
       showErrorNotification(error)
     }
   })
   ```

## Best Practices

1. **Always clean up subscriptions** in useEffect cleanup
2. **Filter subscriptions** based on user context to reduce data transfer
3. **Handle connection errors** gracefully with fallback strategies
4. **Debounce rapid updates** to prevent UI flickering
5. **Show connection status** to users for transparency
6. **Test offline scenarios** to ensure graceful degradation
7. **Monitor subscription performance** in production

## Troubleshooting

### Common Issues

1. **Subscriptions not working**:
   - Check Supabase RLS policies
   - Verify user authentication
   - Check network connectivity

2. **Memory leaks**:
   - Ensure proper cleanup in useEffect
   - Check for duplicate subscriptions
   - Monitor subscription registry

3. **Performance issues**:
   - Use specific filters instead of broad subscriptions
   - Implement debouncing for rapid updates
   - Check for unnecessary re-renders

### Debug Mode

Enable debug logging:

```typescript
const realtimeChores = useRealtimeChores({
  onChoreUpdate: (event) => {
    console.log('DEBUG: Chore update', event)
  },
  onError: (error) => {
    console.error('DEBUG: Real-time error', error)
  }
})
```

## Future Enhancements

- Offline queue for failed operations
- Advanced conflict resolution
- Real-time analytics and monitoring
- Performance metrics dashboard
- Advanced filtering options