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
  
  // Validate URL format
  try {
    new URL(cleaned)
    return cleaned
  } catch {
    console.warn('Invalid Supabase URL, using placeholder')
    return 'https://placeholder.supabase.co'
  }
}

const cleanUrl = cleanSupabaseUrl(supabaseUrl)
const cleanKey = supabaseAnonKey.includes('your_supabase_anon_key') ? 'placeholder-key' : supabaseAnonKey

export const supabase = createClient(cleanUrl, cleanKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          role: 'parent' | 'child'
          name: string
          parent_id?: string
          rank?: string
          points: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role: 'parent' | 'child'
          name: string
          parent_id?: string
          rank?: string
          points?: number
        }
        Update: {
          id?: string
          email?: string
          role?: 'parent' | 'child'
          name?: string
          parent_id?: string
          rank?: string
          points?: number
          updated_at?: string
        }
      }
      chores: {
        Row: {
          id: string
          title: string
          description: string
          points: number
          parent_id: string
          assigned_to?: string
          recurring: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          title: string
          description: string
          points: number
          parent_id: string
          assigned_to?: string
          recurring?: boolean
        }
        Update: {
          title?: string
          description?: string
          points?: number
          assigned_to?: string
          recurring?: boolean
          updated_at?: string
        }
      }
      chore_completions: {
        Row: {
          id: string
          chore_id: string
          child_id: string
          status: 'pending' | 'approved' | 'rejected'
          completed_at: string
          approved_at?: string
          approved_by?: string
        }
        Insert: {
          chore_id: string
          child_id: string
          status?: 'pending' | 'approved' | 'rejected'
        }
        Update: {
          status?: 'pending' | 'approved' | 'rejected'
          approved_at?: string
          approved_by?: string
        }
      }
      rewards: {
        Row: {
          id: string
          title: string
          description: string
          points_required: number
          parent_id: string
          rank_required?: string
          created_at: string
        }
        Insert: {
          title: string
          description: string
          points_required: number
          parent_id: string
          rank_required?: string
        }
        Update: {
          title?: string
          description?: string
          points_required?: number
          rank_required?: string
        }
      }
    }
  }
}