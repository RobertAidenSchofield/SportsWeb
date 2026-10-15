import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only admin client utilizing the Service Role Key (with fallback to anon key).
 * Bypasses RLS when service role key is present, and allows graceful execution if only anon key is set.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();

  if (!url || !key) {
    throw new Error(
      'Missing Supabase configuration: please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)',
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Public/Anon client for general queries.
 */
export function getSupabaseAnonClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY',
    );
  }

  return createClient(url, anonKey);
}

/**
 * Checks whether Supabase credentials are configured in environment variables.
 */
export function isBackendConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

/**
 * Formats database errors into user-friendly diagnostic messages.
 */
export function formatSupabaseError(error: any): string {
  if (!error) return 'Unknown database error';
  const msg = error.message || String(error);
  if (msg.includes('fetch failed') || msg.includes('ENOTFOUND')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    return `Cannot reach Supabase (${supabaseUrl}). The project may be paused in your Supabase Dashboard or the Project URL has a typo. Please check your project status at https://supabase.com/dashboard`;
  }
  if (msg.includes('permission denied') || msg.includes('42501')) {
    return `Permission denied on table. Please make sure the SQL in supabase/schema.sql has been run in your Supabase SQL Editor.`;
  }
  return msg;
}

