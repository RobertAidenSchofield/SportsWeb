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
const demoPinnedGamesStore = new Map<string, MarqueeGame>();

/**
 * Returns currently pinned games from the in-memory demo store
 */
export async function getDemoPinnedGames(): Promise<MarqueeGame[]> {
  return Array.from(demoPinnedGamesStore.values());
}

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
      revalidatePath(`/share/${userId}`);
      revalidatePath(`/api/calendar/${userId}`);
      revalidatePath('/share/demo_user');
      revalidatePath('/api/calendar/demo_user');
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
      revalidatePath(`/share/${userId}`);
      revalidatePath(`/api/calendar/${userId}`);
      revalidatePath('/share/demo_user');
      revalidatePath('/api/calendar/demo_user');
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

    return (data || [])
      .filter((row: any) => !row.team_id?.startsWith('game:'))
      .map((row: any) => ({
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

/**
 * Pin an individual game to the user's dashboard & personal schedule without following the team
 */
export async function pinGame(
  game: MarqueeGame,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Keep in-memory store synchronized
    demoPinnedGamesStore.set(game.id, game);

    if (!isBackendConfigured()) {
      try {
        revalidatePath('/dashboard');
        revalidatePath('/share/demo_user');
        revalidatePath('/api/calendar/demo_user');
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
        error: 'Unauthorized: please sign in before pinning a game.',
      };
    }

    const userId = user.id;
    const email = user.email || `${userId}@user.local`;
    const adminClient = getSupabaseAdminClient();

    // Ensure profile exists
    await adminClient.from('profiles').upsert(
      {
        id: userId,
        email,
        timezone: 'America/New_York',
      },
      { onConflict: 'id' },
    );

    // 1. Attempt primary storage into public.user_pinned_games
    let pinSuccess = false;
    try {
      const { error: pinError } = await adminClient
        .from('user_pinned_games')
        .upsert(
          {
            user_id: userId,
            game_id: game.id,
            game_data: game,
          },
          { onConflict: 'user_id, game_id' },
        );

      if (!pinError) {
        pinSuccess = true;
      } else {
        console.warn(
          'user_pinned_games upsert returned error, evaluating fallback:',
          pinError,
        );
      }
    } catch (err) {
      console.warn(
        'user_pinned_games table unavailable, proceeding to fallback:',
        err,
      );
    }

    // 2. Resilient fallback: store in public.teams and public.user_subscriptions with 'game:' prefix
    if (!pinSuccess) {
      const { error: teamError } = await adminClient.from('teams').upsert(
        {
          id: `game:${game.id}`,
          name: JSON.stringify(game),
          sport: game.sport || 'other',
          league: game.league || 'PINNED',
          logo_url: game.homeTeam?.logo || game.awayTeam?.logo || null,
        },
        { onConflict: 'id' },
      );

      if (teamError) {
        console.error('Fallback pin to teams table failed:', teamError);
        return {
          success: false,
          error: `Database error: ${formatSupabaseError(teamError)}`,
        };
      }

      const { error: subError } = await adminClient
        .from('user_subscriptions')
        .upsert(
          { user_id: userId, team_id: `game:${game.id}` },
          { onConflict: 'user_id, team_id' },
        );

      if (subError) {
        console.error('Fallback pin to user_subscriptions failed:', subError);
        return {
          success: false,
          error: `Database error: ${formatSupabaseError(subError)}`,
        };
      }
    }

    try {
      revalidatePath('/dashboard');
      revalidatePath(`/share/${userId}`);
      revalidatePath(`/api/calendar/${userId}`);
      revalidatePath('/share/demo_user');
      revalidatePath('/api/calendar/demo_user');
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error('pinGame caught error:', err);
    return { success: false, error: err?.message || 'Error pinning game' };
  }
}

/**
 * Unpin an individual game from the user's dashboard
 */
export async function unpinGame(
  gameId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    demoPinnedGamesStore.delete(gameId);

    if (!isBackendConfigured()) {
      try {
        revalidatePath('/dashboard');
        revalidatePath('/share/demo_user');
        revalidatePath('/api/calendar/demo_user');
      } catch {}
      return { success: true };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const userId = user.id;
    const adminClient = getSupabaseAdminClient();

    // 1. Try deleting from user_pinned_games
    try {
      await adminClient
        .from('user_pinned_games')
        .delete()
        .eq('user_id', userId)
        .eq('game_id', gameId);
    } catch (err) {
      // table might not exist
    }

    // 2. Try deleting from user_subscriptions & teams fallback
    try {
      await adminClient
        .from('user_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('team_id', `game:${gameId}`);

      await adminClient
        .from('teams')
        .delete()
        .eq('id', `game:${gameId}`);
    } catch (err) {
      // ignore
    }

    try {
      revalidatePath('/dashboard');
      revalidatePath(`/share/${userId}`);
      revalidatePath(`/api/calendar/${userId}`);
      revalidatePath('/share/demo_user');
      revalidatePath('/api/calendar/demo_user');
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error('unpinGame caught error:', err);
    return { success: false, error: err?.message || 'Error unpinning game' };
  }
}

/**
 * Fetch all individually pinned games for the current user
 */
export async function getUserPinnedGames(): Promise<MarqueeGame[]> {
  try {
    if (!isBackendConfigured()) {
      const demoGames = Array.from(demoPinnedGamesStore.values());
      demoGames.sort(
        (a, b) => new Date(a.dateUtc).getTime() - new Date(b.dateUtc).getTime(),
      );
      return demoGames;
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const demoGames = Array.from(demoPinnedGamesStore.values());
      demoGames.sort(
        (a, b) => new Date(a.dateUtc).getTime() - new Date(b.dateUtc).getTime(),
      );
      return demoGames;
    }

    const userId = user.id;
    const adminClient = getSupabaseAdminClient();
    const games: MarqueeGame[] = [];
    let fetchedFromPinnedTable = false;

    // 1. Try public.user_pinned_games
    try {
      const { data, error } = await adminClient
        .from('user_pinned_games')
        .select('game_id, game_data, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        for (const row of data) {
          if (row.game_data) {
            games.push(row.game_data as MarqueeGame);
          }
        }
        fetchedFromPinnedTable = true;
      }
    } catch (err) {
      // table might not exist
    }

    // 2. Fallback to public.user_subscriptions with game: prefix
    if (!fetchedFromPinnedTable) {
      try {
        const { data: subData } = await adminClient
          .from('user_subscriptions')
          .select('team_id, teams(id, name, sport, league, logo_url)')
          .eq('user_id', userId)
          .like('team_id', 'game:%');

        if (subData && subData.length > 0) {
          for (const row of subData) {
            const teamObj: any = Array.isArray(row.teams)
              ? row.teams[0]
              : row.teams;
            if (teamObj?.name) {
              try {
                const parsed = JSON.parse(teamObj.name) as MarqueeGame;
                games.push(parsed);
              } catch {}
            }
          }
        }
      } catch (err) {
        console.error('Fallback getUserPinnedGames query error:', err);
      }
    }

    // If demo user or empty, include any demo pinned games as fallback
    if (userId === 'demo_user' && games.length === 0) {
      games.push(...Array.from(demoPinnedGamesStore.values()));
    }

    // Sort chronologically by date
    games.sort(
      (a, b) => new Date(a.dateUtc).getTime() - new Date(b.dateUtc).getTime(),
    );

    return games;
  } catch (err) {
    console.error('getUserPinnedGames caught error:', err);
    return Array.from(demoPinnedGamesStore.values());
  }
}

