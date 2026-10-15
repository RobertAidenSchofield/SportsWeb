'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabaseServer';
import {
  getSupabaseAdminClient,
  isBackendConfigured,
  formatSupabaseError,
} from '@/lib/supabaseClient';
import { Team, UserProfile, UserSubscription, MarqueeGame } from '@/lib/types';
import { getTopLeagueGames } from '@/lib/sportsApi';

// In-memory demo store for when Supabase is not yet configured
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

/**
 * Ensures the profile exists in public.profiles for the logged in Supabase user
 */
export async function ensureUserProfile(): Promise<UserProfile | null> {
  if (!isBackendConfigured()) {
    return {
      id: 'demo_user',
      email: 'fan@example.com (Preview Mode)',
      timezone: demoTimezoneStore,
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    const userId = user.id;
    const email = user.email || `${userId}@user.local`;

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
  } catch (err) {
    console.error('ensureUserProfile caught error:', err);
    return null;
  }
}

/**
 * Follow a team - returns object with success status and detailed error message if failed
 */
export async function followTeam(
  team: Team,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isBackendConfigured()) {
      demoTeamsStore.set(team.id, team);
      try {
        revalidatePath('/dashboard');
      } catch {}
      return { success: true };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'Unauthorized: please sign in before following a team.',
      };
    }

    const userId = user.id;
    const email = user.email || `${userId}@user.local`;

    const adminClient = getSupabaseAdminClient();

    // 1. Ensure user profile exists in public.profiles first (so foreign key succeeds)
    const { error: profileError } = await adminClient.from('profiles').upsert(
      {
        id: userId,
        email,
        timezone: 'America/New_York',
      },
      { onConflict: 'id' },
    );

    if (profileError) {
      console.error('Error ensuring profile:', profileError);
      return {
        success: false,
        error: `Supabase profiles error: ${formatSupabaseError(profileError)}`,
      };
    }

    // 2. Upsert team metadata into public.teams
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
      return {
        success: false,
        error: `Supabase teams error: ${formatSupabaseError(teamError)}`,
      };
    }

    // 3. Insert subscription into public.user_subscriptions
    const { error: subError } = await adminClient
      .from('user_subscriptions')
      .upsert(
        { user_id: userId, team_id: team.id },
        { onConflict: 'user_id,team_id' },
      );

    if (subError) {
      console.error('Error subscribing to team:', subError);
      return {
        success: false,
        error: `Supabase user_subscriptions error: ${formatSupabaseError(subError)}`,
      };
    }

    try {
      revalidatePath('/dashboard');
    } catch (e) {
      console.warn('revalidatePath non-fatal warning:', e);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected followTeam error:', err);
    return {
      success: false,
      error:
        err?.message || 'An unexpected error occurred while following team.',
    };
  }
}

/**
 * Unfollow a team
 */
export async function unfollowTeam(
  teamId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isBackendConfigured()) {
      demoTeamsStore.delete(teamId);
      try {
        revalidatePath('/dashboard');
      } catch {}
      return { success: true };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized: please sign in first.' };
    }

    const userId = user.id;

    const adminClient = getSupabaseAdminClient();
    const { error } = await adminClient
      .from('user_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('team_id', teamId);

    if (error) {
      console.error('Error unfollowing team:', error);
      return {
        success: false,
        error: `Supabase unfollow error: ${formatSupabaseError(error)}`,
      };
    }

    try {
      revalidatePath('/dashboard');
    } catch (e) {
      console.warn('revalidatePath non-fatal warning:', e);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected unfollowTeam error:', err);
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred while unfollowing.',
    };
  }
}

/**
 * Update user's preferred timezone
 */
export async function updateUserTimezone(
  timezone: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isBackendConfigured()) {
      demoTimezoneStore = timezone;
      try {
        revalidatePath('/dashboard');
      } catch {}
      return { success: true };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized: please sign in first.' };
    }

    const userId = user.id;

    const adminClient = getSupabaseAdminClient();
    const { error } = await adminClient
      .from('profiles')
      .update({ timezone })
      .eq('id', userId);

    if (error) {
      console.error('Error updating timezone:', error);
      return { success: false, error: error.message };
    }

    try {
      revalidatePath('/dashboard');
    } catch (e) {
      console.warn('revalidatePath non-fatal warning:', e);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected updateUserTimezone error:', err);
    return { success: false, error: err?.message || 'Error updating timezone' };
  }
}

/**
 * Fetch subscriptions for the current user
 */
export async function getUserSubscriptions(): Promise<UserSubscription[]> {
  try {
    if (!isBackendConfigured()) {
      return Array.from(demoTeamsStore.values()).map((t) => ({
        user_id: 'demo_user',
        team_id: t.id,
        team: t,
      }));
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const userId = user.id;

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
  } catch (err) {
    console.error('getUserSubscriptions caught error:', err);
    return [];
  }
}

/**
 * Fetch top marquee matchups dynamically across leagues
 */
export async function getTopGamesAction(
  leagueFilter: string = 'all',
  limit: number = 30,
): Promise<MarqueeGame[]> {
  try {
    return await getTopLeagueGames({
      leagueFilter,
      daysAhead: 7,
      limit,
    });
  } catch (err) {
    console.error('getTopGamesAction caught error:', err);
    return [];
  }
}
