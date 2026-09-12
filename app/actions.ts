'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';
import { Team, UserProfile, UserSubscription } from '@/lib/types';

// In-memory demo store for when Clerk or Supabase are not yet configured
const demoTeamsStore = new Map<string, Team>([
  [
    'espn:football:nfl:12',
    {
      id: 'espn:football:nfl:12',
      name: 'Kansas City Chiefs',
      sport: 'football',
      league: 'NFL',
      logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png',
    },
  ],
  [
    'espn:soccer:eng.1:359',
    {
      id: 'espn:soccer:eng.1:359',
      name: 'Arsenal',
      sport: 'soccer',
      league: 'Premier League',
      logo_url: 'https://a.espncdn.com/i/teamlogos/soccer/500/359.png',
    },
  ],
]);
let demoTimezoneStore = 'America/New_York';

function isBackendConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

/**
 * Ensures the profile exists in public.profiles
 */
export async function ensureUserProfile(): Promise<UserProfile | null> {
  if (!isBackendConfigured()) {
    return {
      id: 'demo_user',
      email: 'fan@example.com (Preview Mode)',
      timezone: demoTimezoneStore,
    };
  }

  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  const email =
    user?.emailAddresses?.[0]?.emailAddress || `${userId}@placeholder.local`;
  const adminClient = getSupabaseAdminClient();

  const { data, error } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    const { data: newProfile, error: insertError } = await adminClient
      .from('profiles')
      .upsert(
        {
          id: userId,
          email,
          timezone: 'America/New_York',
        },
        { onConflict: 'id' },
      )
      .select('*')
      .single();

    if (insertError) {
      console.error('Failed to ensure user profile:', insertError);
      return null;
    }
    return newProfile;
  }

  return data;
}

/**
 * Follow a team
 */
export async function followTeam(team: Team) {
  if (!isBackendConfigured()) {
    demoTeamsStore.set(team.id, team);
    revalidatePath('/dashboard');
    return { success: true };
  }

  const { userId } = await auth();
  if (!userId) {
    throw new Error('Unauthorized');
  }

  await ensureUserProfile();
  const adminClient = getSupabaseAdminClient();

  // 1. Upsert team metadata into public.teams
  const { error: teamError } = await adminClient.from('teams').upsert(
    {
      id: team.id,
      name: team.name,
      sport: team.sport,
      league: team.league,
      logo_url: team.logo_url,
    },
    { onConflict: 'id' },
  );

  if (teamError) {
    console.error('Error upserting team into master table:', teamError);
  }

  // 2. Insert subscription into public.user_subscriptions
  const { error: subError } = await adminClient
    .from('user_subscriptions')
    .upsert(
      { user_id: userId, team_id: team.id },
      { onConflict: 'user_id,team_id' },
    );

  if (subError) {
    console.error('Error subscribing to team:', subError);
    throw new Error(`Failed to subscribe: ${subError.message}`);
  }

  revalidatePath('/dashboard');
  return { success: true };
}

/**
 * Unfollow a team
 */
export async function unfollowTeam(teamId: string) {
  if (!isBackendConfigured()) {
    demoTeamsStore.delete(teamId);
    revalidatePath('/dashboard');
    return { success: true };
  }

  const { userId } = await auth();
  if (!userId) {
    throw new Error('Unauthorized');
  }

  const adminClient = getSupabaseAdminClient();
  const { error } = await adminClient
    .from('user_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('team_id', teamId);

  if (error) {
    console.error('Error unfollowing team:', error);
    throw new Error(`Failed to unfollow: ${error.message}`);
  }

  revalidatePath('/dashboard');
  return { success: true };
}

/**
 * Update user's preferred timezone
 */
export async function updateUserTimezone(timezone: string) {
  if (!isBackendConfigured()) {
    demoTimezoneStore = timezone;
    revalidatePath('/dashboard');
    return { success: true };
  }

  const { userId } = await auth();
  if (!userId) {
    throw new Error('Unauthorized');
  }

  const adminClient = getSupabaseAdminClient();
  const { error } = await adminClient
    .from('profiles')
    .update({ timezone })
    .eq('id', userId);

  if (error) {
    console.error('Error updating timezone:', error);
    throw new Error(`Failed to update timezone: ${error.message}`);
  }

  revalidatePath('/dashboard');
  return { success: true };
}

/**
 * Fetch subscriptions for the current user
 */
export async function getUserSubscriptions(): Promise<UserSubscription[]> {
  if (!isBackendConfigured()) {
    return Array.from(demoTeamsStore.values()).map((t) => ({
      user_id: 'demo_user',
      team_id: t.id,
      team: t,
    }));
  }

  const { userId } = await auth();
  if (!userId) return [];

  const adminClient = getSupabaseAdminClient();
  const { data, error } = await adminClient
    .from('user_subscriptions')
    .select('user_id, team_id, teams(*)')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching subscriptions:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    user_id: row.user_id,
    team_id: row.team_id,
    team: row.teams,
  }));
}

