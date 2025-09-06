import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get user ID from the request headers (set by middleware)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract user from JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('user_usage')
      .select('ai_requests, tts_requests')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching usage:', error);
      return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
    }

    const usage = {
      aiRequests: data?.ai_requests || 0,
      ttsRequests: data?.tts_requests || 0,
      limits: {
        aiRequests: 50,
        ttsRequests: 30
      },
      remaining: {
        aiRequests: Math.max(0, 50 - (data?.ai_requests || 0)),
        ttsRequests: Math.max(0, 30 - (data?.tts_requests || 0))
      }
    };

    return NextResponse.json(usage);
  } catch (error) {
    console.error('Usage API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}