# 🚦 Usage Limits System

This document explains the usage limits system implemented for Chore Champion to provide a great user experience while managing API costs.

## Overview

The usage limits system allows users to experience the full functionality of Chore Champion while preventing excessive API usage. When users reach their daily limits, they see a friendly popup explaining the situation.

## Daily Limits

### Default Limits
- **AI Coach Conversations**: 50 requests per day
- **Voice Messages (TTS)**: 30 requests per day

### Limit Reset
- All limits reset at midnight (server time)
- Users are clearly informed when limits will reset

## User Experience

### Before Hitting Limits
- Users can use all features normally
- Usage status is displayed in the child dashboard
- Progress bars show remaining usage

### When Limits Are Reached
- Friendly popup modal explains the situation
- Users can continue using other app features
- Clear messaging about when limits reset
- No harsh error messages or broken functionality

### Fallback Behavior
- **AI Coach**: Text-based responses still work
- **Voice Messages**: Browser text-to-speech as fallback
- **Core Features**: Chore management, progress tracking, etc. continue working

## Technical Implementation

### Database Schema
```sql
CREATE TABLE user_usage (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  date DATE NOT NULL,
  ai_requests INTEGER DEFAULT 0,
  tts_requests INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date)
);
```

### API Integration
- Usage tracking in `/api/ai-coach/route.ts`
- Usage tracking in `/api/tts/route.ts`
- Usage status endpoint at `/api/usage/route.ts`

### Frontend Components
- `UsageLimitModal.tsx` - Friendly popup when limits reached
- `UsageStatus.tsx` - Shows current usage with progress bars
- Integrated into `AIVoiceCoach.tsx` component

## Configuration

### Adjusting Limits
Edit the limits in `lib/usage-tracker.ts`:

```typescript
export const DEFAULT_LIMITS: UsageLimit = {
  aiRequests: 50, // AI coach requests per day
  ttsRequests: 30, // Voice messages per day
  dailyLimit: true
};
```

### Database Maintenance
- Old usage records are automatically cleaned up (keeps 30 days)
- Indexes ensure fast queries
- Row Level Security protects user data

## Benefits

### For Users
- ✅ Full experience until limits reached
- ✅ Clear communication about limits
- ✅ No broken functionality
- ✅ Fair daily allowance for typical usage

### For Developers
- ✅ Predictable API costs
- ✅ Prevents abuse
- ✅ Graceful degradation
- ✅ Easy to monitor and adjust

## Monitoring

### Usage Analytics
- Track daily usage patterns
- Monitor limit hit rates
- Identify popular features
- Adjust limits based on data

### Cost Management
- Predictable daily API costs
- Early warning for unusual usage
- Ability to scale limits with user base

## Future Enhancements

### Potential Improvements
- **Premium Tiers**: Higher limits for paid users
- **Usage Rollover**: Unused daily limits carry over
- **Smart Limits**: Adjust based on user behavior
- **Family Sharing**: Share limits across family members

### Analytics Dashboard
- Usage trends over time
- Popular features and characters
- Cost per user metrics
- Limit effectiveness analysis

---

This system ensures Chore Champion remains accessible and enjoyable while maintaining sustainable operation costs.