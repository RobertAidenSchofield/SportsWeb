'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabaseServer';
import { isBackendConfigured } from '@/lib/supabaseClient';
import { Team, UserProfile, UserSubscription, MarqueeGame } from '@/lib/types';
import { getTopLeagueGames } from '@/lib/sportsApi';
import { getSubscriptionRepository } from '@/lib/storage/subscriptionRepository';
import {
  assembleScheduleFixtures,
  getUserSchedule,
  UserSchedule,
} from '@/lib/schedule/userSchedule';

function revalidateAllUserPaths(userId: string) {
  try {
    revalidatePath('/dashboard');
    revalidatePath(`/share/${userId}`);
    revalidatePath(`/api/calendar/${userId}`);
    revalidatePath('/share/demo_user');
    revalidatePath('/api/calendar/demo_user');
  } catch (e) {
    console.warn('revalidatePath non-fatal warning:', e);
  }
}

async function getAuthenticatedUserId(): Promise<{
  userId: string;
  email: string;
} | null> {
  if (!isBackendConfigured()) {
    return {
      userId: 'demo_user',
      email: 'fan@example.com (Preview Mode)',
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      userId: user.id,
      email: user.email || `${user.id}@user.local`,
    };
  } catch (err) {
    console.error('getAuthenticatedUserId error:', err);
    return null;
  }
}

/**
 * Returns currently pinned games from the in-memory demo store
 */
export async function getDemoPinnedGames(): Promise<MarqueeGame[]> {
  const repo = getSubscriptionRepository();
  return await repo.getPinnedMatches('demo_user');
}

/**
 * Ensures the profile exists in public.profiles for the logged in Supabase user
 */
export async function ensureUserProfile(): Promise<UserProfile | null> {
  const auth = await getAuthenticatedUserId();
  if (!auth) return null;

  const repo = getSubscriptionRepository();
  return await repo.ensureUserProfile(auth.userId, auth.email);
}

/**
 * Follow a team - returns object with success status and detailed error message if failed
 */
export async function followTeam(
  team: Team,
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getAuthenticatedUserId();
    if (!auth) {
      return {
        success: false,
        error: 'Unauthorized: please sign in before following a team.',
      };
    }

    const repo = getSubscriptionRepository();
    await repo.followTeam(auth.userId, team);
    revalidateAllUserPaths(auth.userId);

    return { success: true };
  } catch (err: any) {
    console.error('followTeam error:', err);
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred while following team.',
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
    const auth = await getAuthenticatedUserId();
    if (!auth) {
      return { success: false, error: 'Unauthorized: please sign in first.' };
    }

    const repo = getSubscriptionRepository();
    await repo.unfollowTeam(auth.userId, teamId);
    revalidateAllUserPaths(auth.userId);

    return { success: true };
  } catch (err: any) {
    console.error('unfollowTeam error:', err);
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
    const auth = await getAuthenticatedUserId();
    if (!auth) {
      return { success: false, error: 'Unauthorized: please sign in first.' };
    }

    const repo = getSubscriptionRepository();
    await repo.updateUserTimezone(auth.userId, timezone);

    try {
      revalidatePath('/dashboard');
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error('updateUserTimezone error:', err);
    return { success: false, error: err?.message || 'Error updating timezone' };
  }
}

/**
 * Fetch subscriptions for the current user
 */
export async function getUserSubscriptions(): Promise<UserSubscription[]> {
  try {
    const auth = await getAuthenticatedUserId();
    if (!auth) return [];

    const repo = getSubscriptionRepository();
    const teams = await repo.getSubscribedTeams(auth.userId);

    return teams.map((team) => ({
      user_id: auth.userId,
      team_id: team.id,
      team,
    }));
  } catch (err) {
    console.error('getUserSubscriptions error:', err);
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
    console.error('getTopGamesAction error:', err);
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
    const auth = await getAuthenticatedUserId();
    if (!auth) {
      return {
        success: false,
        error: 'Unauthorized: please sign in before pinning a game.',
      };
    }

    const repo = getSubscriptionRepository();
    await repo.pinMatch(auth.userId, game);
    revalidateAllUserPaths(auth.userId);

    return { success: true };
  } catch (err: any) {
    console.error('pinGame error:', err);
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
    const auth = await getAuthenticatedUserId();
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    const repo = getSubscriptionRepository();
    await repo.unpinMatch(auth.userId, gameId);
    revalidateAllUserPaths(auth.userId);

    return { success: true };
  } catch (err: any) {
    console.error('unpinGame error:', err);
    return { success: false, error: err?.message || 'Error unpinning game' };
  }
}

/**
 * Fetch all individually pinned games for the current user
 */
export async function getUserPinnedGames(): Promise<MarqueeGame[]> {
  try {
    const auth = await getAuthenticatedUserId();
    const userId = auth?.userId || 'demo_user';

    const repo = getSubscriptionRepository();
    return await repo.getPinnedMatches(userId);
  } catch (err) {
    console.error('getUserPinnedGames error:', err);
    return [];
  }
}

/**
 * Assembles and deduplicates schedule fixtures for followed teams and pinned games.
 */
export async function assembleScheduleAction(
  teams: Team[],
  pinnedGames: MarqueeGame[] = [],
  options?: { daysAhead?: number; includeRecentPastHours?: number },
) {
  try {
    return await assembleScheduleFixtures(teams, pinnedGames, options);
  } catch (err) {
    console.error('assembleScheduleAction error:', err);
    return [];
  }
}

/**
 * Retrieves full unified schedule for a user.
 */
export async function getUserScheduleAction(
  userId?: string,
  options?: { daysAhead?: number },
): Promise<UserSchedule | null> {
  try {
    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const auth = await getAuthenticatedUserId();
      resolvedUserId = auth?.userId || 'demo_user';
    }
    return await getUserSchedule(resolvedUserId, options);
  } catch (err) {
    console.error('getUserScheduleAction error:', err);
    return null;
  }
}

