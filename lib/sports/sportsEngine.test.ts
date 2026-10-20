import { describe, it, expect } from 'vitest';
import {
  fromMarqueeGame,
  projectToFixture,
  projectToMarqueeGame,
  extractCleanEventId,
  MatchEvent,
} from './matchEvent';
import {
  calculateGameExcitement,
  checkRivalry,
  parseWinPct,
} from './excitementEngine';
import {
  searchTeamsInIndex,
  damerauLevenshtein,
  scoreTeamMatch,
} from './teamSearchIndex';
import { Team, MarqueeGame } from '../types';

describe('MatchEvent Domain Model', () => {
  const sampleGame: MarqueeGame = {
    id: 'espn:football:nfl:401547417',
    sport: 'football',
    league: 'NFL',
    leagueSlug: 'nfl',
    name: 'Kansas City Chiefs at Buffalo Bills',
    dateUtc: '2026-10-25T20:00:00Z',
    venue: 'Highmark Stadium',
    homeTeam: {
      id: 'espn:football:nfl:2',
      rawId: '2',
      name: 'Buffalo Bills',
      abbreviation: 'BUF',
      logo: 'https://example.com/buf.png',
      score: '24',
      winner: true,
      isHome: true,
    },
    awayTeam: {
      id: 'espn:football:nfl:12',
      rawId: '12',
      name: 'Kansas City Chiefs',
      abbreviation: 'KC',
      logo: 'https://example.com/kc.png',
      score: '20',
      winner: false,
      isHome: false,
    },
    broadcasts: ['CBS'],
    broadcastSummary: 'CBS',
    excitementScore: 92,
    tier: 'ultra',
    highlightTags: ['🔥 Modern AFC Showdown', '📺 CBS National TV'],
    isRivalry: true,
    status: 'STATUS_FINAL',
    statusDetail: 'Final',
    isCompleted: true,
  };

  it('extracts clean event ID from composite ESPN urn', () => {
    expect(extractCleanEventId('espn:football:nfl:401547417')).toBe('401547417');
    expect(extractCleanEventId('401547417')).toBe('401547417');
  });

  it('converts MarqueeGame to canonical MatchEvent', () => {
    const event = fromMarqueeGame(sampleGame);
    expect(event.id).toBe(sampleGame.id);
    expect(event.eventId).toBe('401547417');
    expect(event.homeTeam.name).toBe('Buffalo Bills');
    expect(event.awayTeam.name).toBe('Kansas City Chiefs');
    expect(event.isPinned).toBe(true);
  });

  it('projects canonical MatchEvent to MatchFixture with perspective team alignment', () => {
    const event = fromMarqueeGame(sampleGame);

    // Away team perspective (Chiefs)
    const awayFixture = projectToFixture(event, 'espn:football:nfl:12');
    expect(awayFixture.teamName).toBe('Kansas City Chiefs');
    expect(awayFixture.opponentName).toBe('Buffalo Bills');
    expect(awayFixture.isHome).toBe(false);
    expect(awayFixture.teamScore).toBe('20');
    expect(awayFixture.opponentScore).toBe('24');
    expect(awayFixture.teamWinner).toBe(false);

    // Home team perspective (Bills)
    const homeFixture = projectToFixture(event, 'espn:football:nfl:2');
    expect(homeFixture.teamName).toBe('Buffalo Bills');
    expect(homeFixture.opponentName).toBe('Kansas City Chiefs');
    expect(homeFixture.isHome).toBe(true);
    expect(homeFixture.teamScore).toBe('24');
    expect(homeFixture.opponentScore).toBe('20');
    expect(homeFixture.teamWinner).toBe(true);
  });
});

describe('ExcitementEngine', () => {
  it('detects historic rivalries and assigns boost', () => {
    const rivalry = checkRivalry('Ohio State Buckeyes', 'Michigan Wolverines');
    expect(rivalry.isRivalry).toBe(true);
    expect(rivalry.label).toContain('The Game');
    expect(rivalry.boost).toBeGreaterThan(20);
  });

  it('parses team win percentage from summary string', () => {
    const stats = parseWinPct('10-2');
    expect(stats).not.toBeNull();
    expect(stats?.wins).toBe(10);
    expect(stats?.losses).toBe(2);
    expect(stats?.winPct).toBeCloseTo(0.833, 2);
  });

  it('calculates game excitement with AP rankings and spreads', () => {
    const mockCompetition = {
      competitors: [
        {
          homeAway: 'home',
          team: { displayName: 'Ohio State Buckeyes' },
          curatedRank: { current: 2 },
          records: [{ summary: '8-0' }],
        },
        {
          homeAway: 'away',
          team: { displayName: 'Michigan Wolverines' },
          curatedRank: { current: 3 },
          records: [{ summary: '8-0' }],
        },
      ],
      broadcasts: [{ name: 'FOX' }],
      odds: [{ details: 'OSU -3.5' }],
    };

    const result = calculateGameExcitement(mockCompetition, 'football', 'NCAA Football');
    expect(result.score).toBeGreaterThanOrEqual(88);
    expect(result.tier).toBe('ultra');
    expect(result.isRivalry).toBe(true);
    expect(result.highlightTags.length).toBeGreaterThan(0);
  });
});

describe('TeamSearchIndex', () => {
  const teams: Team[] = [
    {
      id: 'espn:football:nfl:12',
      name: 'Kansas City Chiefs',
      sport: 'football',
      league: 'NFL',
      logo_url: 'kc.png',
      location: 'Kansas City',
      abbreviation: 'KC',
    },
    {
      id: 'espn:football:nfl:17',
      name: 'New England Patriots',
      sport: 'football',
      league: 'NFL',
      logo_url: 'ne.png',
      location: 'New England',
      abbreviation: 'NE',
    },
    {
      id: 'espn:football:college-football:333',
      name: 'Alabama Crimson Tide',
      sport: 'football',
      league: 'NCAA Football',
      logo_url: 'bama.png',
      location: 'Tuscaloosa',
      abbreviation: 'ALA',
    },
    {
      id: 'espn:football:college-football:150',
      name: 'Duke Blue Devils',
      sport: 'football',
      league: 'NCAA Football',
      logo_url: 'duke.png',
      location: 'Duke',
      abbreviation: 'DUKE',
    },
    {
      id: 'espn:basketball:mens-college-basketball:150',
      name: 'Duke Blue Devils',
      sport: 'basketball',
      league: 'NCAA Basketball',
      logo_url: 'duke.png',
      location: 'Duke',
      abbreviation: 'DUKE',
    },
  ];

  it('calculates Damerau-Levenshtein distance with transposition', () => {
    expect(damerauLevenshtein('cheifs', 'chiefs')).toBe(1);
    expect(damerauLevenshtein('pats', 'pats')).toBe(0);
  });

  it('matches city aliases', () => {
    const results = searchTeamsInIndex(teams, 'kc');
    expect(results[0]?.name).toBe('Kansas City Chiefs');
  });

  it('matches sports nicknames', () => {
    const results = searchTeamsInIndex(teams, 'pats');
    expect(results[0]?.name).toBe('New England Patriots');
  });

  it('matches college program aliases', () => {
    const results = searchTeamsInIndex(teams, 'bama');
    expect(results[0]?.name).toBe('Alabama Crimson Tide');
  });

  it('tolerates typos with fuzzy matching', () => {
    const results = searchTeamsInIndex(teams, 'cheifs');
    expect(results[0]?.name).toBe('Kansas City Chiefs');
  });

  it('finds Duke when filtering by college-football or mens-college-basketball slugs', () => {
    const cfbResults = searchTeamsInIndex(teams, 'duke', 'college-football');
    expect(cfbResults.length).toBeGreaterThan(0);
    expect(cfbResults[0]?.name).toBe('Duke Blue Devils');
    expect(cfbResults[0]?.league).toBe('NCAA Football');

    const cbbResults = searchTeamsInIndex(teams, 'duke', 'mens-college-basketball');
    expect(cbbResults.length).toBeGreaterThan(0);
    expect(cbbResults[0]?.name).toBe('Duke Blue Devils');
    expect(cbbResults[0]?.league).toBe('NCAA Basketball');
  });
});
