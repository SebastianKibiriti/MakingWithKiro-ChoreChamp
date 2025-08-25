# Design Document

## Overview

The Dual Dashboard System provides role-based interfaces for Chore Champion, with a comprehensive parent management dashboard and an engaging child mission hub. The design emphasizes clear separation of concerns, intuitive navigation, and age-appropriate interfaces that align with each user type's needs and capabilities.

## Architecture

### Route Structure
```
/auth/login - Unified login page with role detection
/parent/ - Parent dashboard routes (protected)
  ├── /parent/dashboard - Main overview
  ├── /parent/chores - Chore management
  ├── /parent/children - Child management
  ├── /parent/rewards - Reward configuration
  ├── /parent/analytics - Progress analytics
  └── /parent/approvals - Pending approvals
/child/ - Child dashboard routes (protected)
  ├── /child/dashboard - Mission hub
  ├── /child/missions - Available missions
  ├── /child/progress - Rank progression
  └── /child/rewards - Available rewards
```

### Authentication Flow
1. User logs in through unified login page
2. System checks user role from Supabase profile
3. Redirects to appropriate dashboard based on role
4. Route guards prevent unauthorized access

### State Management
- **Supabase Real-time**: Live updates for chore completions, approvals
- **React Context**: User session, role, and profile data
- **Local State**: Component-specific UI state and form data

## Components and Interfaces

### Shared Components

#### Layout Components
```typescript
// Shared layout wrapper
interface DashboardLayoutProps {
  children: React.ReactNode
  userRole: 'parent' | 'child'
  userProfile: Profile
}

// Navigation component
interface NavigationProps {
  role: 'parent' | 'child'
  currentPath: string
}

// Header with user info and logout
interface HeaderProps {
  user: Profile
  onLogout: () => void
}
```

#### UI Components
```typescript
// Reusable card component
interface CardProps {
  title: string
  children: React.ReactNode
  className?: string
  actions?: React.ReactNode
}

// Progress bar for ranks
interface ProgressBarProps {
  current: number
  max: number
  label: string
  color?: string
}

// Rank badge display
interface RankBadgeProps {
  rank: Rank
  size?: 'small' | 'medium' | 'large'
}
```

### Parent Dashboard Components

#### Overview Dashboard
```typescript
interface ParentDashboardProps {
  children: Profile[]
  pendingApprovals: ChoreCompletion[]
  recentActivity: Activity[]
}

// Key metrics display
interface MetricsCardProps {
  title: string
  value: number | string
  trend?: 'up' | 'down' | 'stable'
  icon: React.ReactNode
}

// Child summary cards
interface ChildSummaryProps {
  child: Profile
  completedToday: number
  currentStreak: number
  pendingTasks: number
}
```

#### Chore Management
```typescript
interface ChoreManagerProps {
  chores: Chore[]
  children: Profile[]
  onCreateChore: (chore: CreateChoreData) => void
  onUpdateChore: (id: string, updates: UpdateChoreData) => void
  onDeleteChore: (id: string) => void
}

interface ChoreFormProps {
  chore?: Chore
  children: Profile[]
  onSubmit: (data: ChoreFormData) => void
  onCancel: () => void
}

interface ChoreListProps {
  chores: Chore[]
  onEdit: (chore: Chore) => void
  onDelete: (id: string) => void
  onAssign: (choreId: string, childId: string) => void
}
```

#### Approval Workflow
```typescript
interface ApprovalQueueProps {
  pendingApprovals: ChoreCompletion[]
  onApprove: (id: string) => void
  onReject: (id: string, reason: string) => void
}

interface ApprovalCardProps {
  completion: ChoreCompletion
  chore: Chore
  child: Profile
  onApprove: () => void
  onReject: (reason: string) => void
}
```

### Child Dashboard Components

#### Mission Hub
```typescript
interface ChildDashboardProps {
  child: Profile
  availableMissions: Chore[]
  completedToday: ChoreCompletion[]
  currentRank: Rank
  nextRank: Rank | null
}

interface RankProgressProps {
  currentRank: Rank
  nextRank: Rank | null
  currentPoints: number
  showAnimation?: boolean
}

interface MissionCardProps {
  chore: Chore
  onSelect: () => void
  onComplete: () => void
  status: 'available' | 'in-progress' | 'pending' | 'completed'
}
```

#### Mission Interface
```typescript
interface MissionDetailProps {
  chore: Chore
  onSubmitCompletion: (notes?: string) => void
  onCancel: () => void
}

interface MissionListProps {
  missions: Chore[]
  completions: ChoreCompletion[]
  onSelectMission: (chore: Chore) => void
}
```

## Data Models

### Enhanced Profile Model
```typescript
interface Profile {
  id: string
  email: string
  role: 'parent' | 'child'
  name: string
  parent_id?: string
  rank?: string
  points: number
  avatar?: string
  preferences?: UserPreferences
  created_at: string
  updated_at: string
}

interface UserPreferences {
  theme?: 'light' | 'dark'
  notifications?: boolean
  voiceCoach?: boolean
  language?: string
}
```

### Activity Tracking
```typescript
interface Activity {
  id: string
  type: 'chore_completed' | 'rank_promoted' | 'reward_earned'
  user_id: string
  description: string
  points_awarded?: number
  created_at: string
}

interface DashboardStats {
  totalPoints: number
  completedToday: number
  currentStreak: number
  weeklyCompletion: number
  monthlyCompletion: number
}
```

## Error Handling

### Authentication Errors
- Invalid credentials: Show user-friendly error message
- Session expired: Redirect to login with notification
- Role mismatch: Redirect to appropriate dashboard

### Data Loading Errors
- Network issues: Show retry button with offline indicator
- Permission errors: Display access denied message
- Data corruption: Fallback to cached data or safe defaults

### Form Validation
- Real-time validation for form inputs
- Clear error messages with suggestions
- Prevent submission of invalid data

### Supabase Integration Errors
- Connection failures: Queue operations for retry
- Rate limiting: Show appropriate user feedback
- Data conflicts: Implement optimistic updates with rollback

## Testing Strategy

### Unit Testing
- Component rendering and props handling
- Utility functions (rank calculations, date formatting)
- Form validation logic
- State management functions

### Integration Testing
- Authentication flow and role-based routing
- Supabase data operations (CRUD operations)
- Real-time subscription handling
- Cross-component communication

### End-to-End Testing
- Complete user workflows (login → dashboard → actions)
- Parent approval workflow
- Child mission completion flow
- Multi-device responsive behavior

### Accessibility Testing
- Keyboard navigation support
- Screen reader compatibility
- Color contrast compliance
- Focus management

## Performance Considerations

### Optimization Strategies
- Lazy loading for dashboard components
- Memoization of expensive calculations (rank progress)
- Efficient Supabase queries with proper indexing
- Image optimization for avatars and icons

### Caching Strategy
- Cache user profiles and preferences
- Store frequently accessed data (ranks, chores)
- Implement stale-while-revalidate for real-time data
- Offline support for core functionality

### Bundle Optimization
- Code splitting by role (parent/child components)
- Tree shaking for unused dependencies
- Optimize bundle size for mobile devices
- Progressive loading of non-critical features

## Security Considerations

### Role-Based Access Control
- Server-side route protection
- Component-level permission checks
- Supabase Row Level Security policies
- Secure API endpoints

### Data Protection
- Input sanitization and validation
- XSS prevention in user-generated content
- CSRF protection for state-changing operations
- Secure handling of sensitive data

### Privacy Measures
- Child data protection compliance
- Minimal data collection
- Secure data transmission (HTTPS)
- Regular security audits