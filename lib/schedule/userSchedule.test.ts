import { describe, it, expect, vi } from 'vitest';
import { assembleScheduleFixtures, getUserSchedule } from './userSchedule';
import { InMemorySubscriptionAdapter } from '../storage/subscriptionRepository';
import { Team, MarqueeGame, MatchFixture } from '../types';
import * as sportsApi from '../sportsApi';

describe('UserSchedule Module', () => {
  const sampleTeam: Team = {
    id: 'espn:football:nfl:12',
    name: 'Kansas City Chiefs',
    sport: 'football',
    league: 'NFL',
    logo_url: 'kc.png',
  };

  const samplePinnedGame: MarqueeGame = {
    id: 'espn:football:nfl:401547417',
    sport: 'football',
    league: 'NFL',
    leagueSlug: 'nfl',
    name: 'Kansas City Chiefs at Buffalo Bills',
    dateUtc: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    homeTeam: {
      id: 'espn:football:nfl:2',
      rawId: '2',
      name: 'Buffalo Bills',
      logo: 'buf.png',
      isHome: true,
    },
    awayTeam: {
      id: 'espn:football:nfl:12',
      rawId: '12',
      name: 'Kansas City Chiefs',
      logo: 'kc.png',
      isHome: false,
    },
    broadcasts: ['CBS'],
    excitementScore: 92,
    tier: 'ultra',
    highlightTags: ['🔥 Showdown'],
  };

  it('assembles schedule fixtures and deduplicates matches by event ID', async () => {
    // Mock getUpcomingTeamFixtures to return a fixture for Chiefs
    const mockFixture: MatchFixture = {
      id: 'espn:football:nfl:401547417',
      eventId: '401547417',
      teamId: 'espn:football:nfl:12',
      teamName: 'Kansas City Chiefs',
      opponentName: 'Buffalo Bills',
      isHome: false,
      sport: 'football',
      league: 'nfl',
      dateUtc: samplePinnedGame.dateUtc,
      status: 'scheduled',
    };

    const spy = vi
      .spyOn(sportsApi, 'getUpcomingTeamFixtures')
      .mockResolvedValue([mockFixture]);

    const fixtures = await assembleScheduleFixtures(
      [sampleTeam],
      [samplePinnedGame],
      { daysAhead: 7 },
    );

    // Both followed team and pinned game refer to the same event ID: deduplicated to 1 fixture
    expect(fixtures).toHaveLength(1);
    expect(fixtures[0].eventId).toBe('401547417');
    expect(fixtures[0].isPinned).toBe(true);
    expect(fixtures[0].excitementScore).toBe(92);

    spy.mockRestore();
  });

  it('retrieves complete user schedule and groups by user local date', async () => {
    const adapter = new InMemorySubscriptionAdapter({
      profiles: [
        {
          id: 'user_fan',
          email: 'fan@example.com',
          timezone: 'America/Chicago',
        },
      ],
      teams: [{ userId: 'user_fan', team: sampleTeam }],
      pinnedGames: [{ userId: 'user_fan', game: samplePinnedGame }],
    });

    const spy = vi
      .spyOn(sportsApi, 'getUpcomingTeamFixtures')
      .mockResolvedValue([]);

    const schedule = await getUserSchedule('user_fan', { daysAhead: 7 }, adapter);

    expect(schedule.userId).toBe('user_fan');
    expect(schedule.userTimezone).toBe('America/Chicago');
    expect(schedule.followedTeams).toHaveLength(1);
    expect(schedule.pinnedMatches).toHaveLength(1);
    expect(schedule.fixtures).toHaveLength(1);
    expect(Object.keys(schedule.fixturesByDate).length).toBeGreaterThan(0);

    spy.mockRestore();
  });
});
