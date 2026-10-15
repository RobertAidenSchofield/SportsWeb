import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a singleton Supabase client for Client Components.
 * Handles browser cookie storage and real-time auth event listeners.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()!;

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

