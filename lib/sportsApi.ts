import {
  MatchFixture,
  Team,
  MarqueeGame,
  MarqueeTeam,
  ExcitementTier,
} from './types';
import { searchTeamsInIndex } from './sports/teamSearchIndex';
import { calculateGameExcitement } from './sports/excitementEngine';
import { projectToMarqueeGame, MatchEvent } from './sports/matchEvent';
export { calculateGameExcitement } from './sports/excitementEngine';

// Supported sports and leagues via ESPN public endpoints
export interface LeagueConfig {
  sport: string;
  league: string;
  displayName: string;
  category: string;
}

export const SUPPORTED_LEAGUES: LeagueConfig[] = [
  {
    sport: 'football',
    league: 'nfl',
    displayName: 'NFL',
    category: 'Football',
  },
  {
    sport: 'basketball',
    league: 'nba',
    displayName: 'NBA',
    category: 'Basketball',
  },
  {
    sport: 'baseball',
    league: 'mlb',
    displayName: 'MLB',
    category: 'Baseball',
  },
  { sport: 'hockey', league: 'nhl', displayName: 'NHL', category: 'Hockey' },
  {
    sport: 'football',
    league: 'college-football',
    displayName: 'NCAA Football',
    category: 'College',
  },
  {
    sport: 'basketball',
    league: 'mens-college-basketball',
    displayName: 'NCAA Basketball',
    category: 'College',
  },
  {
    sport: 'soccer',
    league: 'eng.1',
    displayName: 'Premier League',
    category: 'Soccer',
  },
  { sport: 'soccer', league: 'usa.1', displayName: 'MLS', category: 'Soccer' },
  {
    sport: 'soccer',
    league: 'uefa.champions',
    displayName: 'UEFA Champions League',
    category: 'Soccer',
  },
  {
    sport: 'soccer',
    league: 'esp.1',
    displayName: 'La Liga',
    category: 'Soccer',
  },
];

/**
 * Normalizes any league slug, alias, or display name to canonical ESPN sport and league slugs.
 */
export function normalizeLeagueAndSport(
  rawLeague?: string | null,
  rawSport?: string | null,
): { sport: string; league: string } {
  const l = (rawLeague || '').toLowerCase().trim();
  const s = (rawSport || '').toLowerCase().trim();

  const LEAGUE_MAP: Record<string, { sport: string; league: string }> = {
    nfl: { sport: 'football', league: 'nfl' },
    nba: { sport: 'basketball', league: 'nba' },
    mlb: { sport: 'baseball', league: 'mlb' },
    nhl: { sport: 'hockey', league: 'nhl' },
    'college-football': { sport: 'football', league: 'college-football' },
    cfb: { sport: 'football', league: 'college-football' },
    ncaaf: { sport: 'football', league: 'college-football' },
    'ncaa football': { sport: 'football', league: 'college-football' },
    'mens-college-basketball': { sport: 'basketball', league: 'mens-college-basketball' },
    cbb: { sport: 'basketball', league: 'mens-college-basketball' },
    cbk: { sport: 'basketball', league: 'mens-college-basketball' },
    ncaab: { sport: 'basketball', league: 'mens-college-basketball' },
    'ncaa basketball': { sport: 'basketball', league: 'mens-college-basketball' },
    'eng.1': { sport: 'soccer', league: 'eng.1' },
    epl: { sport: 'soccer', league: 'eng.1' },
    'premier league': { sport: 'soccer', league: 'eng.1' },
    'english premier league': { sport: 'soccer', league: 'eng.1' },
    'usa.1': { sport: 'soccer', league: 'usa.1' },
    mls: { sport: 'soccer', league: 'usa.1' },
    'major league soccer': { sport: 'soccer', league: 'usa.1' },
    'uefa.champions': { sport: 'soccer', league: 'uefa.champions' },
    ucl: { sport: 'soccer', league: 'uefa.champions' },
    'champions league': { sport: 'soccer', league: 'uefa.champions' },
    'uefa champions league': { sport: 'soccer', league: 'uefa.champions' },
    'esp.1': { sport: 'soccer', league: 'esp.1' },
    'la liga': { sport: 'soccer', league: 'esp.1' },
    laliga: { sport: 'soccer', league: 'esp.1' },
    'spanish primera división': { sport: 'soccer', league: 'esp.1' },
    'ger.1': { sport: 'soccer', league: 'ger.1' },
    bundesliga: { sport: 'soccer', league: 'ger.1' },
    'ita.1': { sport: 'soccer', league: 'ita.1' },
    'serie a': { sport: 'soccer', league: 'ita.1' },
    wnba: { sport: 'basketball', league: 'wnba' },
  };

  if (LEAGUE_MAP[l]) {
    return LEAGUE_MAP[l];
  }

  const matched = SUPPORTED_LEAGUES.find(
    (item) =>
      item.league.toLowerCase() === l ||
      item.displayName.toLowerCase() === l,
  );
  if (matched) {
    return { sport: matched.sport, league: matched.league };
  }

  return {
    sport: s || 'football',
    league: l || 'nfl',
  };
}

/**
 * Returns human-readable league name (e.g. "eng.1" -> "Premier League")
 */
export function getLeagueDisplayName(league: string): string {
  const normalized = normalizeLeagueAndSport(league);
  const matched = SUPPORTED_LEAGUES.find(
    (l) => l.league.toLowerCase() === normalized.league.toLowerCase(),
  );
  return matched ? matched.displayName : league.toUpperCase();
}

interface EspnTeamData {
  id: string;
  displayName: string;
  name: string;
  abbreviation?: string;
  location?: string;
  shortDisplayName?: string;
  nickname?: string;
  logos?: Array<{ href: string }>;
}

let cachedAllTeams: Team[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour



/**
 * Fetch all teams across supported leagues from ESPN.
 */
export async function getAllTeams(): Promise<Team[]> {
  const now = Date.now();
  if (cachedAllTeams && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedAllTeams;
  }

  const results: Team[] = [];

  const promises = SUPPORTED_LEAGUES.map(
    async ({ sport, league, displayName }) => {
      try {
        // College football has 760+ teams, college basketball has 360+ teams
        const limit =
          (sport === 'football' && league === 'college-football') ||
          league === 'mens-college-basketball'
            ? 1000
            : 100;
        const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/teams?limit=${limit}`;
        const res = await fetch(url, { next: { revalidate: 3600 } });
        if (!res.ok) return;

        const data = await res.json();
        const sportsArray = data.sports || [];
        for (const s of sportsArray) {
          for (const l of s.leagues || []) {
            for (const t of l.teams || []) {
              const teamInfo: EspnTeamData = t.team;
              if (!teamInfo) continue;

              const logoUrl =
                teamInfo.logos && teamInfo.logos.length > 0
                  ? teamInfo.logos[0].href
                  : `https://a.espncdn.com/i/teamlogos/${sport}/500/${teamInfo.abbreviation?.toLowerCase() || teamInfo.id}.png`;

              results.push({
                id: `espn:${sport}:${league}:${teamInfo.id}`,
                name: teamInfo.displayName || teamInfo.name,
                sport,
                league: displayName,
                logo_url: logoUrl,
                location: teamInfo.location,
                abbreviation: teamInfo.abbreviation,
                short_name: teamInfo.name || teamInfo.shortDisplayName,
              });
            }
          }
        }
      } catch (err) {
        console.error(`Failed to fetch teams for ${sport}/${league}:`, err);
      }
    },
  );

  await Promise.allSettled(promises);

  if (results.length > 0) {
    // Sort logically: major pro leagues first, alphabetically within each league
    const LEAGUE_ORDER = [
      'NFL',
      'NBA',
      'MLB',
      'Premier League',
      'NHL',
      'MLS',
      'UEFA Champions League',
      'La Liga',
      'NCAA Football',
      'NCAA Basketball',
    ];

    results.sort((a, b) => {
      const idxA = LEAGUE_ORDER.indexOf(a.league);
      const idxB = LEAGUE_ORDER.indexOf(b.league);
      const orderA = idxA === -1 ? 99 : idxA;
      const orderB = idxB === -1 ? 99 : idxB;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });

    cachedAllTeams = results;
    lastCacheTime = now;
  }

  return results;
}

/**
 * Search teams with typo-tolerant fuzzy matching, nickname aliases, and complete league browsing.
 */
export async function searchTeams(
  query: string,
  leagueFilter?: string,
): Promise<Team[]> {
  const allTeams = await getAllTeams();
  return searchTeamsInIndex(allTeams, query, leagueFilter);
}

/**
 * Parses composite team ID: "espn:{sport}:{league}:{espnId}"
 */
export function parseTeamId(
  id: string,
): { sport: string; league: string; rawId: string } | null {
  const parts = id.split(':');
  if (parts.length === 4 && parts[0] === 'espn') {
    return {
      sport: parts[1],
      league: parts[2],
      rawId: parts[3],
    };
  }
  return null;
}

/**
 * Fetches upcoming fixtures for a specific team within the next `daysAhead` days (default 7 days).
 */
export async function getUpcomingTeamFixtures(
  teamId: string,
  daysAhead: number = 7,
): Promise<MatchFixture[]> {
  const parsed = parseTeamId(teamId);
  if (!parsed) {
    return [];
  }

  const { sport, league, rawId } = parsed;
  const now = new Date();
  const maxDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  try {
    const scheduleUrl = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/teams/${rawId}/schedule`;
    const res = await fetch(scheduleUrl, { next: { revalidate: 60 } });
    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    const events = data.events || [];
    const teamName = data.team?.displayName || 'My Team';
    const teamLogo = data.team?.logo;

    const fixtures: MatchFixture[] = [];
    const leagueDisplayName = getLeagueDisplayName(league);

    function parseScoreValue(comp: any): string | undefined {
      if (!comp) return undefined;
      if (comp.score?.displayValue !== undefined && comp.score?.displayValue !== null) {
        return String(comp.score.displayValue);
      }
      if (comp.score?.value !== undefined && comp.score?.value !== null) {
        return String(comp.score.value);
      }
      if (typeof comp.score === 'string' || typeof comp.score === 'number') {
        return String(comp.score);
      }
      return undefined;
    }

    for (const event of events) {
      const eventDate = new Date(event.date);
      // Include fixtures occurring between earlier this week (past 7 days) and maxDate (7 days ahead)
      const minDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (eventDate < minDate || eventDate > maxDate) {
        continue;
      }

      const competition = event.competitions?.[0];
      if (!competition) continue;

      const competitors = competition.competitors || [];
      const currentTeamCompetitor = competitors.find(
        (c: any) =>
          String(c.id) === String(rawId) ||
          String(c.team?.id) === String(rawId),
      );
      const opponentCompetitor = competitors.find(
        (c: any) =>
          String(c.id) !== String(rawId) &&
          String(c.team?.id) !== String(rawId),
      );

      const opponentName = opponentCompetitor?.team?.displayName || 'TBD';
      const opponentLogo =
        opponentCompetitor?.team?.logos?.[0]?.href ||
        opponentCompetitor?.team?.logo ||
        '';
      const currentTeamLogo =
        currentTeamCompetitor?.team?.logos?.[0]?.href || teamLogo || '';
      const isHome = currentTeamCompetitor?.homeAway === 'home';

      // Extract scores and game status
      let currentScore = parseScoreValue(currentTeamCompetitor);
      let opponentScore = parseScoreValue(opponentCompetitor);

      let teamWinner = currentTeamCompetitor?.winner === true;
      let opponentWinner = opponentCompetitor?.winner === true;
      let isCompleted = Boolean(competition.status?.type?.completed);
      let isLive = competition.status?.type?.state === 'in';
      let statusDetail =
        competition.status?.type?.detail ||
        competition.status?.type?.description ||
        (isCompleted ? 'Final' : undefined);

      // If game has started, is live, recently completed, or lacks live score, fetch fresh summary
      const startTimeMs = eventDate.getTime();
      const hasStartedOrLive =
        isLive ||
        isCompleted ||
        startTimeMs <= now.getTime() + 15 * 60 * 1000;
      const isRecentGame =
        hasStartedOrLive && now.getTime() - startTimeMs < 48 * 60 * 60 * 1000;

      if (
        isRecentGame ||
        isLive ||
        currentScore === undefined ||
        opponentScore === undefined ||
        (currentScore === '0' && opponentScore === '0')
      ) {
        try {
          const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/summary?event=${event.id}`;
          const sumRes = await fetch(summaryUrl, { next: { revalidate: 15 } });
          if (sumRes.ok) {
            const sumData = await sumRes.json();
            const sumComp = sumData.header?.competitions?.[0];
            if (sumComp) {
              const sumCompetitors = sumComp.competitors || [];
              const sCurrent = sumCompetitors.find(
                (c: any) =>
                  String(c.id) === String(rawId) ||
                  String(c.team?.id) === String(rawId),
              );
              const sOpponent = sumCompetitors.find(
                (c: any) =>
                  String(c.id) !== String(rawId) &&
                  String(c.team?.id) !== String(rawId),
              );

              if (sCurrent) {
                const sCurr = parseScoreValue(sCurrent);
                if (sCurr !== undefined) currentScore = sCurr;
                if (sCurrent.winner !== undefined) {
                  teamWinner = Boolean(sCurrent.winner);
                }
              }
              if (sOpponent) {
                const sOpp = parseScoreValue(sOpponent);
                if (sOpp !== undefined) opponentScore = sOpp;
                if (sOpponent.winner !== undefined) {
                  opponentWinner = Boolean(sOpponent.winner);
                }
              }

              if (sumComp.status?.type) {
                isCompleted = Boolean(sumComp.status.type.completed);
                isLive = sumComp.status.type.state === 'in';
                statusDetail =
                  sumComp.status.type.detail ||
                  sumComp.status.type.description ||
                  (isCompleted ? 'Final' : isLive ? 'LIVE' : statusDetail);
              }
            }
          }
        } catch {
          // non-fatal summary lookup fallback
        }
      }

      // If scheduled game has not started and is not live, clear placeholder zeros
      if (!hasStartedOrLive && !isLive && !isCompleted) {
        currentScore = undefined;
        opponentScore = undefined;
      }

      const oddsDetails = competition.odds?.[0]?.details;

      // Extract broadcast network (TV / Streaming)
      const broadcastChannels: string[] = [];
      const rawBroadcasts = [
        ...(competition.broadcasts || []),
        ...(competition.geoBroadcasts || []),
        ...(event.broadcasts || []),
      ];

      for (const b of rawBroadcasts) {
        // Skip radio or audio feeds
        const typeName = (b.type?.shortName || b.type?.name || '').toLowerCase();
        if (typeName === 'radio' || typeName === 'audio') continue;

        const channelName =
          b.media?.shortName ||
          b.media?.name ||
          (Array.isArray(b.names) && b.names.length > 0 ? b.names.join('/') : null) ||
          (typeof b.name === 'string' ? b.name : null) ||
          (typeof b.station === 'string' ? b.station : null);

        if (channelName && !broadcastChannels.includes(channelName)) {
          broadcastChannels.push(channelName);
        }
      }

      const broadcast =
        broadcastChannels.length > 0 ? broadcastChannels.join(', ') : undefined;

      const venue = competition.venue?.fullName;
      const status = competition.status?.type?.name || 'scheduled';

      fixtures.push({
        id: event.id,
        teamId,
        teamName,
        teamLogo: currentTeamLogo,
        opponentName,
        opponentLogo,
        isHome,
        sport,
        league,
        leagueDisplayName,
        dateUtc: event.date,
        broadcast,
        venue,
        status,
        statusDetail,
        isCompleted,
        isLive,
        teamScore: currentScore,
        opponentScore,
        teamWinner,
        opponentWinner,
        oddsDetails,
        eventId: event.id,
      });
    }

    return fixtures;
  } catch (err) {
    console.error(`Error fetching fixtures for team ${teamId}:`, err);
    return [];
  }
}



export interface TopLeagueGamesOptions {
  leagueFilter?: string; // 'all', 'nfl', 'nba', 'college-football', 'nhl', etc.
  daysAhead?: number;
  limit?: number;
  searchQuery?: string;
}

// In-memory cache for scoreboard results
interface CachedTopGames {
  key: string;
  timestamp: number;
  games: MarqueeGame[];
}
let topGamesMemoryCache: CachedTopGames[] = [];
const TOP_GAMES_TTL = 1000 * 60 * 5; // 5 minutes cache

/**
 * Fetches and ranks top marquee games dynamically across sports leagues.
 */
export async function getTopLeagueGames(
  options: TopLeagueGamesOptions = {},
): Promise<MarqueeGame[]> {
  const { leagueFilter = 'all', daysAhead = 7, limit = 30, searchQuery } = options;
  const now = Date.now();
  const cacheKey = `${leagueFilter}:${daysAhead}:${limit}:${searchQuery || ''}`;

  // Check cache
  const cached = topGamesMemoryCache.find(
    (c) => c.key === cacheKey && now - c.timestamp < TOP_GAMES_TTL,
  );
  if (cached) {
    return cached.games;
  }

  // Determine target leagues to query
  let targets: LeagueConfig[] = [];
  if (!leagueFilter || leagueFilter === 'all') {
    // Focus on marquee active leagues
    targets = SUPPORTED_LEAGUES.filter((l) =>
      [
        'nfl',
        'college-football',
        'nba',
        'nhl',
        'eng.1',
        'mens-college-basketball',
        'uefa.champions',
        'esp.1',
      ].includes(l.league),
    );
  } else {
    const match = SUPPORTED_LEAGUES.find(
      (l) =>
        l.league.toLowerCase() === leagueFilter.toLowerCase() ||
        l.displayName.toLowerCase() === leagueFilter.toLowerCase(),
    );
    targets = match ? [match] : [];
  }

  if (targets.length === 0) {
    return [];
  }

  const allMarqueeGames: MarqueeGame[] = [];
  const nowDate = new Date();
  const minValidTime = nowDate.getTime() - 3.5 * 60 * 60 * 1000; // include games started recently
  const maxValidTime = nowDate.getTime() + daysAhead * 24 * 60 * 60 * 1000;

  // Generate date strings for daily sports (NBA, NHL, MLB, NCAAB)
  const dateStrings: string[] = [];
  for (let i = 0; i < Math.min(daysAhead, 3); i++) {
    const d = new Date(nowDate.getTime() + i * 24 * 60 * 60 * 1000);
    dateStrings.push(d.toISOString().slice(0, 10).replace(/-/g, ''));
  }

  const leaguePromises = targets.map(async ({ sport, league, displayName }) => {
    try {
      const isDailySport = ['basketball', 'hockey', 'baseball'].includes(sport);
      const urls: string[] = [];

      if (isDailySport) {
        for (const ds of dateStrings) {
          const groupParam =
            league === 'mens-college-basketball' ? '&groups=50&limit=300' : '';
          urls.push(
            `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard?dates=${ds}${groupParam}`,
          );
        }
      } else {
        const groupParam =
          league === 'college-football' ? '?groups=80&limit=300' : '';
        urls.push(
          `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard${groupParam}`,
        );
      }

      const fetchPromises = urls.map(async (u) => {
        try {
          const res = await fetch(u, { next: { revalidate: 300 } });
          if (!res.ok) return null;
          return await res.json();
        } catch {
          return null;
        }
      });

      const scoreboardResults = await Promise.all(fetchPromises);

      for (const data of scoreboardResults) {
        if (!data || !data.events) continue;

        for (const event of data.events) {
          const eventTime = new Date(event.date).getTime();
          if (eventTime < minValidTime || eventTime > maxValidTime) {
            continue;
          }

          const competition = event.competitions?.[0];
          if (!competition) continue;

          const competitors = competition.competitors || [];
          if (competitors.length < 2) continue;

          const homeComp =
            competitors.find((c: any) => c.homeAway === 'home') ||
            competitors[0];
          const awayComp =
            competitors.find((c: any) => c.homeAway === 'away') ||
            competitors[1];

          if (!homeComp?.team || !awayComp?.team) continue;

          const excitement = calculateGameExcitement(
            competition,
            sport,
            displayName,
          );

          const defaultLogo = (id: string, abbrev?: string) =>
            `https://a.espncdn.com/i/teamlogos/${sport}/500/${abbrev?.toLowerCase() || id}.png`;

          const isCompleted = Boolean(competition.status?.type?.completed);
          const isLive = competition.status?.type?.state === 'in';
          const statusDetail =
            competition.status?.type?.detail ||
            competition.status?.type?.description ||
            (isCompleted ? 'Final' : undefined);

          const homeScoreStr = (isLive || isCompleted)
            ? (homeComp.score?.displayValue ??
               (homeComp.score?.value !== undefined ? String(homeComp.score.value) : undefined) ??
               (typeof homeComp.score === 'string' || typeof homeComp.score === 'number'
                 ? String(homeComp.score)
                 : undefined))
            : undefined;

          const awayScoreStr = (isLive || isCompleted)
            ? (awayComp.score?.displayValue ??
               (awayComp.score?.value !== undefined ? String(awayComp.score.value) : undefined) ??
               (typeof awayComp.score === 'string' || typeof awayComp.score === 'number'
                 ? String(awayComp.score)
                 : undefined))
            : undefined;

          const homeTeam: MarqueeTeam = {
            id: `espn:${sport}:${league}:${homeComp.team.id}`,
            rawId: homeComp.team.id,
            name: homeComp.team.displayName || homeComp.team.name,
            abbreviation: homeComp.team.abbreviation,
            logo:
              homeComp.team.logos?.[0]?.href ||
              homeComp.team.logo ||
              defaultLogo(homeComp.team.id, homeComp.team.abbreviation),
            record: homeComp.records?.[0]?.summary,
            rank:
              typeof homeComp.curatedRank?.current === 'number' &&
              homeComp.curatedRank.current <= 25
                ? homeComp.curatedRank.current
                : undefined,
            isHome: true,
            score: homeScoreStr,
            winner: homeComp.winner === true,
          };

          const awayTeam: MarqueeTeam = {
            id: `espn:${sport}:${league}:${awayComp.team.id}`,
            rawId: awayComp.team.id,
            name: awayComp.team.displayName || awayComp.team.name,
            abbreviation: awayComp.team.abbreviation,
            logo:
              awayComp.team.logos?.[0]?.href ||
              awayComp.team.logo ||
              defaultLogo(awayComp.team.id, awayComp.team.abbreviation),
            record: awayComp.records?.[0]?.summary,
            rank:
              typeof awayComp.curatedRank?.current === 'number' &&
              awayComp.curatedRank.current <= 25
                ? awayComp.curatedRank.current
                : undefined,
            isHome: false,
            score: awayScoreStr,
            winner: awayComp.winner === true,
          };

          const oddsObj = competition.odds?.[0];

          allMarqueeGames.push({
            id: `espn:${sport}:${league}:${event.id}`,
            sport,
            league: displayName,
            leagueSlug: league,
            name: event.name || `${awayTeam.name} at ${homeTeam.name}`,
            shortName: event.shortName,
            dateUtc: event.date,
            venue: competition.venue?.fullName,
            homeTeam,
            awayTeam,
            broadcasts: excitement.broadcastSummary
              ? [excitement.broadcastSummary]
              : [],
            broadcastSummary: excitement.broadcastSummary,
            odds: oddsObj
              ? {
                  details: oddsObj.details,
                  overUnder: oddsObj.overUnder,
                  spreadValue: excitement.spreadValue,
                }
              : undefined,
            excitementScore: excitement.score,
            tier: excitement.tier,
            highlightTags: excitement.highlightTags,
            isRivalry: excitement.isRivalry,
            status: competition.status?.type?.name || 'scheduled',
            statusDetail,
            isCompleted,
            isLive,
          });
        }
      }
    } catch (err) {
      console.error(`Error loading top games for ${displayName}:`, err);
    }
  });

  await Promise.allSettled(leaguePromises);

  // Deduplicate by game ID
  const seenIds = new Set<string>();
  const uniqueGames: MarqueeGame[] = [];
  for (const g of allMarqueeGames) {
    if (!seenIds.has(g.id)) {
      seenIds.add(g.id);
      uniqueGames.push(g);
    }
  }

  // Sort descending by excitementScore, then ascending by date
  // If search query is provided, find matching games from scoreboard or look up team fixtures
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    const matching = uniqueGames.filter((g) => {
      return (
        g.name.toLowerCase().includes(q) ||
        g.homeTeam.name.toLowerCase().includes(q) ||
        g.awayTeam.name.toLowerCase().includes(q) ||
        (g.venue || '').toLowerCase().includes(q) ||
        g.league.toLowerCase().includes(q) ||
        (g.highlightTags || []).some((t) => t.toLowerCase().includes(q))
      );
    });

    if (matching.length > 0) {
      const results = matching.slice(0, limit);
      topGamesMemoryCache = topGamesMemoryCache.filter(
        (c) => now - c.timestamp < TOP_GAMES_TTL,
      );
      topGamesMemoryCache.push({
        key: cacheKey,
        timestamp: now,
        games: results,
      });
      return results;
    }

    // Direct team fixture fallback: if query refers to a team, fetch their upcoming matches
    try {
      const candidateTeams = await searchTeams(searchQuery, leagueFilter);
      if (candidateTeams.length > 0) {
        const fixtureLists = await Promise.all(
          candidateTeams.slice(0, 3).map((t) => getUpcomingTeamFixtures(t.id, daysAhead)),
        );
        const allFixtures = fixtureLists.flat();
        const fallbackMarquee: MarqueeGame[] = allFixtures.map((f) => {
          const homeScore = f.teamScore !== undefined ? String(f.teamScore) : undefined;
          const oppScore = f.opponentScore !== undefined ? String(f.opponentScore) : undefined;

          const homeTeam: MarqueeTeam = f.isHome
            ? {
                id: f.teamId,
                rawId: f.teamId,
                name: f.teamName,
                logo: f.teamLogo || '',
                isHome: true,
                score: homeScore,
                winner: f.teamWinner,
              }
            : {
                id: `opp:${f.id}`,
                rawId: `opp:${f.id}`,
                name: f.opponentName,
                logo: f.opponentLogo || '',
                isHome: true,
                score: oppScore,
                winner: f.opponentWinner,
              };

          const awayTeam: MarqueeTeam = f.isHome
            ? {
                id: `opp:${f.id}`,
                rawId: `opp:${f.id}`,
                name: f.opponentName,
                logo: f.opponentLogo || '',
                isHome: false,
                score: oppScore,
                winner: f.opponentWinner,
              }
            : {
                id: f.teamId,
                rawId: f.teamId,
                name: f.teamName,
                logo: f.teamLogo || '',
                isHome: false,
                score: homeScore,
                winner: f.teamWinner,
              };

          return {
            id: f.id,
            sport: f.sport,
            league: f.leagueDisplayName || f.league,
            leagueSlug: f.league,
            name: `${awayTeam.name} at ${homeTeam.name}`,
            dateUtc: f.dateUtc,
            venue: f.venue,
            homeTeam,
            awayTeam,
            broadcasts: f.broadcast ? [f.broadcast] : [],
            broadcastSummary: f.broadcast,
            odds: f.oddsDetails ? { details: f.oddsDetails } : undefined,
            excitementScore: f.excitementScore || 65,
            tier: 'featured' as ExcitementTier,
            highlightTags: f.highlightTags || ['⭐ Matchup'],
            status: f.status || 'STATUS_SCHEDULED',
            statusDetail: f.statusDetail,
            isCompleted: f.isCompleted,
            isLive: f.isLive,
          };
        });

        if (fallbackMarquee.length > 0) {
          const results = fallbackMarquee.slice(0, limit);
          topGamesMemoryCache = topGamesMemoryCache.filter(
            (c) => now - c.timestamp < TOP_GAMES_TTL,
          );
          topGamesMemoryCache.push({
            key: cacheKey,
            timestamp: now,
            games: results,
          });
          return results;
        }
      }
    } catch (e) {
      console.warn('Fallback team fixture search warning:', e);
    }
  }

  const finalResults = uniqueGames.slice(0, limit);

  // Update memory cache
  topGamesMemoryCache = topGamesMemoryCache.filter(
    (c) => now - c.timestamp < TOP_GAMES_TTL,
  );
  topGamesMemoryCache.push({
    key: cacheKey,
    timestamp: now,
    games: finalResults,
  });

  return finalResults;
}

