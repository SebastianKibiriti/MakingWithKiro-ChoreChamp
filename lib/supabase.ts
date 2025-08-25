import { createClient } from '@supabase/supabase-js'

// Get environment variables with fallbacks
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://placeholder.supabase.co'
let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'placeholder-key'

// Clean and validate URL
function cleanSupabaseUrl(url: string): string {
  if (!url || url.includes('your_supabase_project_url') || url.includes('placeholder')) {
    return 'https://placeholder.supabase.co'
  }
  
  // Remove trailing slash
  const cleaned = url.endsWith('/') ? url.slice(0, -1) : url
  
  // For supabase.co domains, trust they're valid
  if (cleaned.includes('.supabase.co')) {
    return cleaned
  }
  
  // Validate URL format for other domains
  try {
    new URL(cleaned)
    return cleaned
  } catch {
    // Only warn in development or when not in build process
    if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
      console.warn('Invalid Supabase URL, using placeholder')
    }
    return 'https://placeholder.supabase.co'
  }
}

const cleanUrl = cleanSupabaseUrl(supabaseUrl)
const cleanKey = supabaseAnonKey.includes('your_supabase_anon_key') ? 'placeholder-key' : supabaseAnonKey

export const supabase = createClient(cleanUrl, cleanKey)