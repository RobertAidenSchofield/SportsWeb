import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Creates an authenticated Supabase client using Clerk's JWT template.
 * This injects the Clerk user token so Supabase RLS policies (requesting_user_id) take effect.
 */
export function createClerkSupabaseClient(clerkToken?: string): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY',
    );
  }

  const options = clerkToken
    ? { global: { headers: { Authorization: `Bearer ${clerkToken}` } } }
    : undefined;

  return createClient(supabaseUrl, supabaseAnonKey, options);
}

/**
 * Server-only admin client utilizing the Service Role Key.
 * Bypasses RLS for system operations like Clerk webhooks, batch worker aggregation, and cron jobs.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Public/Anon client for general public queries (e.g. searching cached teams).
 */
export function getSupabaseAnonClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY',
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

