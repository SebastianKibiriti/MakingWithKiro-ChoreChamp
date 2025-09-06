'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth-context';
import { getUserUsageClient, DEFAULT_LIMITS } from '../lib/usage-tracker';
import { supabase } from '../lib/supabase';

export default function UsageStatus() {
  const { user } = useAuth();
  const [usage, setUsage] = useState({ aiRequests: 0, ttsRequests: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchUsage();
    }
  }, [user?.id]);

  const fetchUsage = async () => {
    if (!user?.id) return;
    
    try {
      const currentUsage = await getUserUsageClient(supabase, user.id);
      setUsage(currentUsage);
    } catch (error) {
      console.error('Error fetching usage:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !user) {
    return null;
  }

  const aiRemaining = Math.max(0, DEFAULT_LIMITS.aiRequests - usage.aiRequests);
  const ttsRemaining = Math.max(0, DEFAULT_LIMITS.ttsRequests - usage.ttsRequests);

  const getProgressColor = (used: number, limit: number) => {
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Daily Usage</h3>
      
      <div className="space-y-3">
        {/* AI Coach Usage */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600">🤖 AI Coach Chats</span>
            <span className="text-xs font-medium text-gray-700">
              {usage.aiRequests}/{DEFAULT_LIMITS.aiRequests}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(usage.aiRequests, DEFAULT_LIMITS.aiRequests)}`}
              style={{ width: `${Math.min(100, (usage.aiRequests / DEFAULT_LIMITS.aiRequests) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {aiRemaining > 0 ? `${aiRemaining} chats remaining` : 'Daily limit reached'}
          </p>
        </div>

        {/* Voice Messages Usage */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600">🔊 Voice Messages</span>
            <span className="text-xs font-medium text-gray-700">
              {usage.ttsRequests}/{DEFAULT_LIMITS.ttsRequests}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(usage.ttsRequests, DEFAULT_LIMITS.ttsRequests)}`}
              style={{ width: `${Math.min(100, (usage.ttsRequests / DEFAULT_LIMITS.ttsRequests) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {ttsRemaining > 0 ? `${ttsRemaining} voice messages remaining` : 'Daily limit reached'}
          </p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500 text-center">
          ⏰ Limits reset at midnight
        </p>
      </div>
    </div>
  );
}