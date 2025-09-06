import { createClient } from '@supabase/supabase-js';

// Create server-side Supabase client only when needed
function getServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export interface UsageLimit {
  aiRequests: number;
  ttsRequests: number;
  dailyLimit: boolean;
}

export const DEFAULT_LIMITS: UsageLimit = {
  aiRequests: 50, // 50 AI coach requests per day
  ttsRequests: 30, // 30 text-to-speech requests per day
  dailyLimit: true
};

// Server-side function for API routes
export async function getUserUsage(userId: string): Promise<{ aiRequests: number; ttsRequests: number }> {
  const supabase = getServerSupabase();
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('user_usage')
    .select('ai_requests, tts_requests')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (error || !data) {
    return { aiRequests: 0, ttsRequests: 0 };
  }

  return {
    aiRequests: data.ai_requests || 0,
    ttsRequests: data.tts_requests || 0
  };
}

// Client-side function for components
export async function getUserUsageClient(supabaseClient: any, userId: string): Promise<{ aiRequests: number; ttsRequests: number }> {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabaseClient
    .from('user_usage')
    .select('ai_requests, tts_requests')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (error || !data) {
    return { aiRequests: 0, ttsRequests: 0 };
  }

  return {
    aiRequests: data.ai_requests || 0,
    ttsRequests: data.tts_requests || 0
  };
}

export async function incrementUsage(userId: string, type: 'ai' | 'tts'): Promise<boolean> {
  const supabase = getServerSupabase();
  const today = new Date().toISOString().split('T')[0];
  
  // Get current usage
  const currentUsage = await getUserUsage(userId);
  
  // Check limits
  if (type === 'ai' && currentUsage.aiRequests >= DEFAULT_LIMITS.aiRequests) {
    return false; // Limit exceeded
  }
  if (type === 'tts' && currentUsage.ttsRequests >= DEFAULT_LIMITS.ttsRequests) {
    return false; // Limit exceeded
  }

  // Increment usage
  const { error } = await supabase
    .from('user_usage')
    .upsert({
      user_id: userId,
      date: today,
      ai_requests: type === 'ai' ? currentUsage.aiRequests + 1 : currentUsage.aiRequests,
      tts_requests: type === 'tts' ? currentUsage.ttsRequests + 1 : currentUsage.ttsRequests,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,date'
    });

  return !error;
}

export async function checkUsageLimit(userId: string, type: 'ai' | 'tts'): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const usage = await getUserUsage(userId);
  const limit = type === 'ai' ? DEFAULT_LIMITS.aiRequests : DEFAULT_LIMITS.ttsRequests;
  const current = type === 'ai' ? usage.aiRequests : usage.ttsRequests;
  
  return {
    allowed: current < limit,
    remaining: Math.max(0, limit - current),
    limit
  };
}