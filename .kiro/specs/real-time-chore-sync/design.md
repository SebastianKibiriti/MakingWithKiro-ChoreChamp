# Design Document

## Overview

This design implements a comprehensive real-time synchronization system for chore status updates using Supabase's real-time capabilities. The system will eliminate the need for manual page refreshes by automatically updating both parent and child dashboards when chore statuses change.

The current implementation already has basic real-time subscriptions, but they have issues with subscription cleanup, filtering, and error handling. This design addresses these problems and adds robust real-time synchronization.

## Architecture

### Current State Analysis
- Both dashboards already have basic real-time subscriptions
- ChoreApprovalManager has a subscription for new completions only
- Subscriptions are not properly filtered by user context
- No error handling or reconnection logic
- No batching of rapid updates
- Memory leaks due to improper cleanup

### Proposed Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Child Dashboard│    │  Supabase RT    │    │ Parent Dashboard│
│                 │    │   Channels      │    │                 │
│ - Complete Chore│───▶│                 │───▶│ - Show Pending  │
│ - View Status   │◄───│  chore_updates  │◄───│ - Approve/Reject│
│ - Update Points │    │  profile_updates│    │ - Update Stats  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Components and Interfaces

### 1. Real-time Hook (`useRealtimeChores`)
A custom React hook that manages real-time subscriptions for chore-related updates.

```typescript
interface RealtimeChoreHook {
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

interface SubscriptionFilters {
  parentId?: string
  childId?: string
  choreIds?: string[]
  events: ('INSERT' | 'UPDATE' | 'DELETE')[]
}
```

### 2. Real-time Context Provider (`RealtimeProvider`)
A context provider that manages global real-time state and provides connection status to all components.

```typescript
interface RealtimeContextType {
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting'
  lastSyncTime: Date | null
  pendingUpdates: number
  
  // Global subscription management
  subscriptions: Map<string, RealtimeSubscription>
  addSubscription: (key: string, subscription: RealtimeSubscription) => void
  removeSubscription: (key: string) => void
}
```

### 3. Enhanced Dashboard Components
Updated parent and child dashboards with improved real-time capabilities.

#### Parent Dashboard Updates
- Real-time pending approvals counter
- Instant removal of approved/rejected chores
- Live statistics updates
- Connection status indicator

#### Child Dashboard Updates  
- Instant status updates for completed chores
- Real-time points and rank progression
- Live mission availability updates
- Visual feedback for approval/rejection

### 4. Optimistic Updates System
Implement optimistic updates for better user experience during network delays.

```typescript
interface OptimisticUpdate {
  id: string
  type: 'chore_completion' | 'chore_approval' | 'points_update'
  data: any
  timestamp: Date
  confirmed: boolean
}
```

## Data Models

### Enhanced Subscription Configuration
```typescript
interface SubscriptionConfig {
  table: 'chores' | 'chore_completions' | 'profiles'
  events: ('INSERT' | 'UPDATE' | 'DELETE')[]
  filter?: {
    column: string
    value: any
    operator?: 'eq' | 'in' | 'neq'
  }
  callback: (payload: any) => void
  errorHandler?: (error: Error) => void
}
```

### Real-time Event Payloads
```typescript
interface ChoreCompletionEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new?: ChoreCompletion
  old?: ChoreCompletion
  table: 'chore_completions'
}

interface ProfileUpdateEvent {
  eventType: 'UPDATE'
  new: Profile
  old: Profile
  table: 'profiles'
}
```

## Error Handling

### Connection Management
1. **Automatic Reconnection**: Implement exponential backoff for reconnection attempts
2. **Fallback Polling**: Use periodic data fetching when real-time connection fails
3. **User Feedback**: Display connection status and sync indicators
4. **Graceful Degradation**: App remains functional without real-time updates

### Error Recovery Strategies
```typescript
interface ErrorRecoveryConfig {
  maxRetries: number
  retryDelay: number
  fallbackToPolling: boolean
  userNotification: boolean
}
```

### Conflict Resolution
- Use server timestamps to resolve conflicts
- Implement last-write-wins for simple updates
- Queue conflicting updates for manual resolution

## Testing Strategy

### Unit Tests
- Real-time hook functionality
- Subscription management
- Error handling scenarios
- Optimistic update logic

### Integration Tests
- End-to-end chore completion flow
- Multi-user concurrent updates
- Network interruption scenarios
- Cross-dashboard synchronization

### Performance Tests
- Memory leak detection
- Subscription cleanup verification
- Large dataset handling
- Concurrent user simulation

### Manual Testing Scenarios
1. **Basic Flow**: Child completes chore → Parent sees pending → Parent approves → Child sees update
2. **Network Issues**: Disconnect/reconnect during operations
3. **Multiple Children**: Concurrent chore completions
4. **Multiple Parents**: Same child, multiple parent accounts
5. **Rapid Updates**: Quick succession of approvals/rejections

## Implementation Phases

### Phase 1: Core Real-time Infrastructure
- Create `useRealtimeChores` hook
- Implement `RealtimeProvider` context
- Add connection status management
- Basic error handling and reconnection

### Phase 2: Dashboard Integration
- Update parent dashboard with real-time subscriptions
- Update child dashboard with real-time subscriptions
- Replace existing basic subscriptions
- Add loading states and error indicators

### Phase 3: Optimistic Updates
- Implement optimistic UI updates
- Add conflict resolution
- Handle network delay scenarios
- Improve user experience during slow connections

### Phase 4: Advanced Features
- Batch update processing
- Advanced filtering and performance optimization
- Comprehensive error recovery
- Analytics and monitoring

## Security Considerations

### Row Level Security (RLS)
- Ensure real-time subscriptions respect existing RLS policies
- Filter events based on user permissions
- Prevent unauthorized data access through subscriptions

### Data Validation
- Validate all real-time payloads before processing
- Sanitize data to prevent XSS attacks
- Implement rate limiting for subscription events

### Authentication
- Verify user authentication before establishing subscriptions
- Handle authentication state changes
- Clean up subscriptions on logout

## Performance Optimizations

### Subscription Management
- Use single channel per user with multiple table listeners
- Implement subscription pooling for related components
- Debounce rapid successive updates

### Memory Management
- Proper cleanup of event listeners
- Garbage collection of old optimistic updates
- Limit subscription history retention

### Network Efficiency
- Minimize payload size in real-time events
- Use efficient JSON serialization
- Implement compression for large updates

## Monitoring and Analytics

### Real-time Metrics
- Connection uptime and stability
- Event processing latency
- Subscription success/failure rates
- User engagement with real-time features

### Error Tracking
- Connection failure patterns
- Subscription error rates
- Performance bottlenecks
- User-reported sync issues