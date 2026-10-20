import { Team, MatchFixture, MarqueeGame } from '../types';
import {
  SubscriptionRepository,
  getSubscriptionRepository,
} from '../storage/subscriptionRepository';
import { getUpcomingTeamFixtures } from '../sportsApi';
import {
  fromMarqueeGame,
  projectToFixture,
  extractCleanEventId,
  MatchEvent,
} from '../sports/matchEvent';

function formatDateInTimezone(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export interface UserScheduleOptions {
  daysAhead?: number; // default 7
  includeRecentPastHours?: number; // default 48h for live / recent games
  enrichLiveScores?: boolean; // default false (only fetch extra summaries if needed)
}

export interface UserSchedule {
  userId: string;
  userTimezone: string;
  followedTeams: Team[];
  pinnedMatches: MarqueeGame[];
  fixtures: MatchFixture[];
  fixturesByDate: Record<string, MatchFixture[]>;
}

/**
 * Assembles, deduplicates, and chronologically sorts fixtures from followed teams and pinned matches.
 */
export async function assembleScheduleFixtures(
  teams: Team[],
  pinnedGames: MarqueeGame[] = [],
  options: UserScheduleOptions = {},
): Promise<MatchFixture[]> {
  const { daysAhead = 7, includeRecentPastHours = 48 } = options;
  const now = Date.now();
  const minTimeMs = now - includeRecentPastHours * 3600 * 1000;
  const maxTimeMs = now + daysAhead * 24 * 3600 * 1000;

  // 1. Fetch upcoming fixtures for all followed teams concurrently
  const teamFixturePromises = teams.map(async (team) => {
    try {
      return await getUpcomingTeamFixtures(team.id, daysAhead);
    } catch (err) {
      console.error(`UserSchedule: Failed fetching fixtures for ${team.name}:`, err);
      return [];
    }
  });

  const nestedTeamFixtures = await Promise.all(teamFixturePromises);
  const rawFollowedFixtures = nestedTeamFixtures.flat();

  // 2. Map pinned matches into canonical MatchEvents and then project to MatchFixture
  const pinnedFixtures: MatchFixture[] = pinnedGames.map((game) => {
    const event = fromMarqueeGame(game);
    const fixture = projectToFixture(event);
    fixture.isPinned = true;
    return fixture;
  });

  // 3. Deduplicate across followed team clashes and pinned matches by event ID
  const fixtureMap = new Map<string, MatchFixture>();

  for (const f of rawFollowedFixtures) {
    const key = f.eventId || extractCleanEventId(f.id);
    fixtureMap.set(key, { ...f });
  }

  for (const p of pinnedFixtures) {
    const key = p.eventId || extractCleanEventId(p.id);
    if (fixtureMap.has(key)) {
      const existing = fixtureMap.get(key)!;
      existing.isPinned = true;
      if (p.excitementScore) existing.excitementScore = p.excitementScore;
      if (p.highlightTags) existing.highlightTags = p.highlightTags;
      if (p.oddsDetails) existing.oddsDetails = p.oddsDetails;
    } else {
      fixtureMap.set(key, p);
    }
  }

  // 4. Filter within requested time window and sort chronologically
  const unifiedFixtures = Array.from(fixtureMap.values()).filter((f) => {
    const t = new Date(f.dateUtc).getTime();
    return t >= minTimeMs && t <= maxTimeMs;
  });

  unifiedFixtures.sort(
    (a, b) => new Date(a.dateUtc).getTime() - new Date(b.dateUtc).getTime(),
  );

  return unifiedFixtures;
}

/**
 * Deep module interface: Retrieves complete user schedule with followed teams,
 * pinned matches, deduplicated fixtures, and timezone groupings.
 */
export async function getUserSchedule(
  userId: string,
  options: UserScheduleOptions = {},
  repo?: SubscriptionRepository,
): Promise<UserSchedule> {
  const repository = repo || getSubscriptionRepository();

  // Fetch profile, subscriptions, and pinned matches concurrently
  const [profile, followedTeams, pinnedMatches] = await Promise.all([
    repository.getUserProfile(userId),
    repository.getSubscribedTeams(userId),
    repository.getPinnedMatches(userId),
  ]);

  const userTimezone = profile?.timezone || 'America/New_York';

  const fixtures = await assembleScheduleFixtures(
    followedTeams,
    pinnedMatches,
    options,
  );

  // Group fixtures by user's local date
  const fixturesByDate: Record<string, MatchFixture[]> = {};
  for (const f of fixtures) {
    let dateKey = 'Upcoming Matchups';
    try {
      dateKey = formatDateInTimezone(new Date(f.dateUtc), userTimezone);
    } catch {
      dateKey = f.dateUtc.slice(0, 10);
    }
    if (!fixturesByDate[dateKey]) {
      fixturesByDate[dateKey] = [];
    }
    fixturesByDate[dateKey].push(f);
  }

  return {
    userId,
    userTimezone,
    followedTeams,
    pinnedMatches,
    fixtures,
    fixturesByDate,
  };
}
