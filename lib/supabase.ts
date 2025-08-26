import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Get environment variables with fallbacks
let supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://placeholder.supabase.co";
let supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "placeholder-key";

// Clean and validate URL
function cleanSupabaseUrl(url: string): string {
  if (
    !url ||
    url.includes("your_supabase_project_url") ||
    url.includes("placeholder")
  ) {
    return "https://placeholder.supabase.co";
  }

  // Remove trailing slash
  const cleaned = url.endsWith("/") ? url.slice(0, -1) : url;

  // For supabase.co domains, trust they're valid
  if (cleaned.includes(".supabase.co")) {
    return cleaned;
  }

  // Validate URL format for other domains
  try {
    new URL(cleaned);
    return cleaned;
  } catch {
    // Only warn in development or when not in build process
    if (
      process.env.NODE_ENV !== "production" &&
      typeof window !== "undefined"
    ) {
      console.warn("Invalid Supabase URL, using placeholder");
    }
    return "https://placeholder.supabase.co";
  }
}

const cleanUrl = cleanSupabaseUrl(supabaseUrl);
const cleanKey = supabaseAnonKey.includes("your_supabase_anon_key")
  ? "placeholder-key"
  : supabaseAnonKey;

// Singleton pattern to ensure only one Supabase client instance
// Use globalThis to persist across hot reloads in development
const globalForSupabase = globalThis as unknown as {
  supabaseInstance: SupabaseClient | undefined;
};

function createSupabaseClient(): SupabaseClient {
  if (globalForSupabase.supabaseInstance) {
    return globalForSupabase.supabaseInstance;
  }

  const client = createClient(cleanUrl, cleanKey, {
    auth: {
      // Use a unique storage key to avoid conflicts
      storageKey: "chore-champion-auth",
      // Persist session across tabs
      persistSession: true,
      // Detect session from URL on redirect
      detectSessionInUrl: true,
      // Auto refresh token
      autoRefreshToken: true,
    },
    // Reduce real-time connection conflicts
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  globalForSupabase.supabaseInstance = client;
  return client;
}

export const supabase = createSupabaseClient();

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: "parent" | "child";
          name: string;
          parent_id?: string;
          rank?: string;
          points: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role: "parent" | "child";
          name: string;
          parent_id?: string;
          rank?: string;
          points?: number;
        };
        Update: {
          id?: string;
          email?: string;
          role?: "parent" | "child";
          name?: string;
          parent_id?: string;
          rank?: string;
          points?: number;
          updated_at?: string;
        };
      };
      chores: {
        Row: {
          id: string;
          title: string;
          description: string;
          points: number;
          parent_id: string;
          assigned_to?: string;
          recurring: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title: string;
          description: string;
          points: number;
          parent_id: string;
          assigned_to?: string;
          recurring?: boolean;
        };
        Update: {
          title?: string;
          description?: string;
          points?: number;
          assigned_to?: string;
          recurring?: boolean;
          updated_at?: string;
        };
      };
      chore_completions: {
        Row: {
          id: string;
          chore_id: string;
          child_id: string;
          status: "pending" | "approved" | "rejected";
          completed_at: string;
          approved_at?: string;
          approved_by?: string;
        };
        Insert: {
          chore_id: string;
          child_id: string;
          status?: "pending" | "approved" | "rejected";
        };
        Update: {
          status?: "pending" | "approved" | "rejected";
          approved_at?: string;
          approved_by?: string;
        };
      };
      rewards: {
        Row: {
          id: string;
          title: string;
          description: string;
          points_required: number;
          parent_id: string;
          rank_required?: string;
          created_at: string;
        };
        Insert: {
          title: string;
          description: string;
          points_required: number;
          parent_id: string;
          rank_required?: string;
        };
        Update: {
          title?: string;
          description?: string;
          points_required?: number;
          rank_required?: string;
        };
      };
    };
  };
};
