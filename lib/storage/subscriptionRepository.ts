import { Team, UserProfile, MarqueeGame } from '../types';
import {
  getSupabaseAdminClient,
  isBackendConfigured,
  formatSupabaseError,
} from '../supabaseClient';

export interface SubscriptionRepository {
  getUserProfile(userId: string): Promise<UserProfile | null>;
  ensureUserProfile(userId: string, email?: string): Promise<UserProfile>;
  updateUserTimezone(userId: string, timezone: string): Promise<void>;

  getSubscribedTeams(userId: string): Promise<Team[]>;
  followTeam(userId: string, team: Team): Promise<void>;
  unfollowTeam(userId: string, teamId: string): Promise<void>;

  getPinnedMatches(userId: string): Promise<MarqueeGame[]>;
  pinMatch(userId: string, game: MarqueeGame): Promise<void>;
  unpinMatch(userId: string, gameId: string): Promise<void>;
}

/**
 * In-Memory Adapter for unit testing, preview mode, and zero-config environments.
 */
export class InMemorySubscriptionAdapter implements SubscriptionRepository {
  private profiles = new Map<string, UserProfile>();
  private teamSubscriptions = new Map<string, Map<string, Team>>(); // userId -> (teamId -> Team)
  private pinnedGames = new Map<string, Map<string, MarqueeGame>>(); // userId -> (gameId -> MarqueeGame)

  constructor(initialData?: {
    profiles?: UserProfile[];
    teams?: Array<{ userId: string; team: Team }>;
    pinnedGames?: Array<{ userId: string; game: MarqueeGame }>;
  }) {
    if (initialData?.profiles) {
      for (const p of initialData.profiles) {
        this.profiles.set(p.id, p);
      }
    }
    if (initialData?.teams) {
      for (const { userId, team } of initialData.teams) {
        if (!this.teamSubscriptions.has(userId)) {
          this.teamSubscriptions.set(userId, new Map());
        }
        this.teamSubscriptions.get(userId)!.set(team.id, team);
      }
    }
    if (initialData?.pinnedGames) {
      for (const { userId, game } of initialData.pinnedGames) {
        if (!this.pinnedGames.has(userId)) {
          this.pinnedGames.set(userId, new Map());
        }
        this.pinnedGames.get(userId)!.set(game.id, game);
      }
    }
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    return this.profiles.get(userId) || null;
  }

  async ensureUserProfile(userId: string, email?: string): Promise<UserProfile> {
    const existing = this.profiles.get(userId);
    if (existing) return existing;

    const profile: UserProfile = {
      id: userId,
      email: email || `${userId}@user.local`,
      timezone: 'America/New_York',
    };
    this.profiles.set(userId, profile);
    return profile;
  }

  async updateUserTimezone(userId: string, timezone: string): Promise<void> {
    const profile = await this.ensureUserProfile(userId);
    profile.timezone = timezone;
    this.profiles.set(userId, profile);
  }

  async getSubscribedTeams(userId: string): Promise<Team[]> {
    const userTeams = this.teamSubscriptions.get(userId);
    return userTeams ? Array.from(userTeams.values()) : [];
  }

  async followTeam(userId: string, team: Team): Promise<void> {
    await this.ensureUserProfile(userId);
    if (!this.teamSubscriptions.has(userId)) {
      this.teamSubscriptions.set(userId, new Map());
    }
    this.teamSubscriptions.get(userId)!.set(team.id, team);
  }

  async unfollowTeam(userId: string, teamId: string): Promise<void> {
    const userTeams = this.teamSubscriptions.get(userId);
    if (userTeams) {
      userTeams.delete(teamId);
    }
  }

  async getPinnedMatches(userId: string): Promise<MarqueeGame[]> {
    const userPinned = this.pinnedGames.get(userId);
    if (!userPinned) return [];
    const list = Array.from(userPinned.values());
    list.sort(
      (a, b) => new Date(a.dateUtc).getTime() - new Date(b.dateUtc).getTime(),
    );
    return list;
  }

  async pinMatch(userId: string, game: MarqueeGame): Promise<void> {
    await this.ensureUserProfile(userId);
    if (!this.pinnedGames.has(userId)) {
      this.pinnedGames.set(userId, new Map());
    }
    this.pinnedGames.get(userId)!.set(game.id, game);
  }

  async unpinMatch(userId: string, gameId: string): Promise<void> {
    const userPinned = this.pinnedGames.get(userId);
    if (userPinned) {
      userPinned.delete(gameId);
    }
  }
}

/**
 * Concrete Supabase Adapter for production PostgreSQL database persistence.
 */
export class SupabaseSubscriptionAdapter implements SubscriptionRepository {
  private get client() {
    return getSupabaseAdminClient();
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) return null;
      return data as UserProfile;
    } catch (err) {
      console.error('SupabaseSubscriptionAdapter.getUserProfile caught:', err);
      return null;
    }
  }

  async ensureUserProfile(userId: string, email?: string): Promise<UserProfile> {
    const resolvedEmail = email || `${userId}@user.local`;
    const { data, error } = await this.client
      .from('profiles')
      .upsert(
        {
          id: userId,
          email: resolvedEmail,
          timezone: 'America/New_York',
        },
        { onConflict: 'id' },
      )
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to ensure user profile: ${formatSupabaseError(error)}`);
    }

    return data as UserProfile;
  }

  async updateUserTimezone(userId: string, timezone: string): Promise<void> {
    const { error } = await this.client
      .from('profiles')
      .update({ timezone })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to update timezone: ${formatSupabaseError(error)}`);
    }
  }

  async getSubscribedTeams(userId: string): Promise<Team[]> {
    try {
      const { data, error } = await this.client
        .from('user_subscriptions')
        .select('team_id, teams(*)')
        .eq('user_id', userId);

      if (error || !data) return [];

      return data
        .filter((row: any) => !row.team_id?.startsWith('game:') && row.teams)
        .map((row: any) => {
          const t = Array.isArray(row.teams) ? row.teams[0] : row.teams;
          return t as Team;
        })
        .filter(Boolean);
    } catch (err) {
      console.error('SupabaseSubscriptionAdapter.getSubscribedTeams caught:', err);
      return [];
    }
  }

  async followTeam(userId: string, team: Team): Promise<void> {
    await this.ensureUserProfile(userId);

    // 1. Upsert team into public.teams table
    const { error: teamErr } = await this.client.from('teams').upsert(
      {
        id: team.id,
        name: team.name,
        sport: team.sport,
        league: team.league,
        logo_url: team.logo_url,
      },
      { onConflict: 'id' },
    );
    if (teamErr) {
      throw new Error(`Failed to upsert team: ${formatSupabaseError(teamErr)}`);
    }

    // 2. Insert subscription record
    const { error: subErr } = await this.client
      .from('user_subscriptions')
      .upsert(
        { user_id: userId, team_id: team.id },
        { onConflict: 'user_id,team_id' },
      );
    if (subErr) {
      throw new Error(`Failed to follow team: ${formatSupabaseError(subErr)}`);
    }
  }

  async unfollowTeam(userId: string, teamId: string): Promise<void> {
    const { error } = await this.client
      .from('user_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('team_id', teamId);

    if (error) {
      throw new Error(`Failed to unfollow team: ${formatSupabaseError(error)}`);
    }
  }

  async getPinnedMatches(userId: string): Promise<MarqueeGame[]> {
    const games: MarqueeGame[] = [];
    let foundInPrimary = false;

    // 1. Query primary public.user_pinned_games table
    try {
      const { data, error } = await this.client
        .from('user_pinned_games')
        .select('game_id, game_data, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        for (const row of data) {
          if (row.game_data) games.push(row.game_data as MarqueeGame);
        }
        foundInPrimary = true;
      }
    } catch (err) {
      // primary table query failed or not created
    }

    // 2. Read compatibility fallback: scan legacy 'game:' entries in user_subscriptions
    if (!foundInPrimary) {
      try {
        const { data: subData } = await this.client
          .from('user_subscriptions')
          .select('team_id, teams(name)')
          .eq('user_id', userId)
          .like('team_id', 'game:%');

        if (subData && subData.length > 0) {
          for (const row of subData) {
            const teamObj: any = Array.isArray(row.teams) ? row.teams[0] : row.teams;
            if (teamObj?.name) {
              try {
                games.push(JSON.parse(teamObj.name) as MarqueeGame);
              } catch {}
            }
          }
        }
      } catch (err) {
        console.error('SupabaseSubscriptionAdapter: legacy fallback read error:', err);
      }
    }

    games.sort(
      (a, b) => new Date(a.dateUtc).getTime() - new Date(b.dateUtc).getTime(),
    );
    return games;
  }

  async pinMatch(userId: string, game: MarqueeGame): Promise<void> {
    await this.ensureUserProfile(userId);

    const { error } = await this.client.from('user_pinned_games').upsert(
      {
        user_id: userId,
        game_id: game.id,
        game_data: game,
      },
      { onConflict: 'user_id, game_id' },
    );

    if (error) {
      throw new Error(`Failed to pin match: ${formatSupabaseError(error)}`);
    }
  }

  async unpinMatch(userId: string, gameId: string): Promise<void> {
    const { error } = await this.client
      .from('user_pinned_games')
      .delete()
      .eq('user_id', userId)
      .eq('game_id', gameId);

    // Also clean up any legacy rows with 'game:' prefix if present
    try {
      await this.client
        .from('user_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('team_id', `game:${gameId}`);
    } catch {}

    if (error) {
      throw new Error(`Failed to unpin match: ${formatSupabaseError(error)}`);
    }
  }
}

// Global demo singleton for preview mode
const defaultDemoAdapter = new InMemorySubscriptionAdapter({
  profiles: [
    {
      id: 'demo_user',
      email: 'fan@example.com (Preview Mode)',
      timezone: 'America/New_York',
    },
  ],
  teams: [
    {
      userId: 'demo_user',
      team: {
        id: 'espn:football:nfl:12',
        name: 'Kansas City Chiefs',
        sport: 'football',
        league: 'NFL',
        logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png',
      },
    },
    {
      userId: 'demo_user',
      team: {
        id: 'espn:soccer:eng.1:359',
        name: 'Arsenal',
        sport: 'soccer',
        league: 'Premier League',
        logo_url: 'https://a.espncdn.com/i/teamlogos/soccer/500/359.png',
      },
    },
  ],
});

/**
 * Returns the active subscription repository based on backend configuration.
 */
export function getSubscriptionRepository(): SubscriptionRepository {
  if (isBackendConfigured()) {
    return new SupabaseSubscriptionAdapter();
  }
  return defaultDemoAdapter;
}
