import { describe, it, expect, beforeEach } from 'vitest';
import { InMemorySubscriptionAdapter } from './subscriptionRepository';
import { Team, MarqueeGame } from '../types';

describe('InMemorySubscriptionAdapter', () => {
  let repo: InMemorySubscriptionAdapter;

  const sampleTeam: Team = {
    id: 'espn:football:nfl:12',
    name: 'Kansas City Chiefs',
    sport: 'football',
    league: 'NFL',
    logo_url: 'kc.png',
  };

  const sampleGame: MarqueeGame = {
    id: 'espn:football:nfl:401547417',
    sport: 'football',
    league: 'NFL',
    leagueSlug: 'nfl',
    name: 'Kansas City Chiefs at Buffalo Bills',
    dateUtc: '2026-10-25T20:00:00Z',
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
    excitementScore: 90,
    tier: 'ultra',
    highlightTags: ['🔥 Showdown'],
  };

  beforeEach(() => {
    repo = new InMemorySubscriptionAdapter();
  });

  it('ensures user profile on demand with default timezone', async () => {
    const profile = await repo.ensureUserProfile('user_123', 'test@example.com');
    expect(profile.id).toBe('user_123');
    expect(profile.email).toBe('test@example.com');
    expect(profile.timezone).toBe('America/New_York');

    const fetched = await repo.getUserProfile('user_123');
    expect(fetched).toEqual(profile);
  });

  it('updates user timezone', async () => {
    await repo.ensureUserProfile('user_123');
    await repo.updateUserTimezone('user_123', 'America/Chicago');
    const profile = await repo.getUserProfile('user_123');
    expect(profile?.timezone).toBe('America/Chicago');
  });

  it('manages team subscriptions', async () => {
    expect(await repo.getSubscribedTeams('user_123')).toHaveLength(0);

    await repo.followTeam('user_123', sampleTeam);
    const teams = await repo.getSubscribedTeams('user_123');
    expect(teams).toHaveLength(1);
    expect(teams[0].id).toBe(sampleTeam.id);

    await repo.unfollowTeam('user_123', sampleTeam.id);
    expect(await repo.getSubscribedTeams('user_123')).toHaveLength(0);
  });

  it('manages pinned matches and sorts chronologically', async () => {
    const earlierGame: MarqueeGame = {
      ...sampleGame,
      id: 'game_early',
      dateUtc: '2026-10-20T20:00:00Z',
    };
    const laterGame: MarqueeGame = {
      ...sampleGame,
      id: 'game_late',
      dateUtc: '2026-10-28T20:00:00Z',
    };

    await repo.pinMatch('user_123', laterGame);
    await repo.pinMatch('user_123', earlierGame);

    const pinned = await repo.getPinnedMatches('user_123');
    expect(pinned).toHaveLength(2);
    expect(pinned[0].id).toBe('game_early');
    expect(pinned[1].id).toBe('game_late');

    await repo.unpinMatch('user_123', 'game_early');
    const remaining = await repo.getPinnedMatches('user_123');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('game_late');
  });
});
