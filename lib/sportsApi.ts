import { MatchFixture, Team } from './types';

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

// Normalized sports nickname and alias mappings
const TEAM_NICKNAMES: Record<string, string[]> = {
  // NFL
  pats: ['patriots'],
  niners: ['49ers'],
  '49ers': ['niners'],
  bucs: ['buccaneers'],
  fins: ['dolphins'],
  jags: ['jaguars'],
  cards: ['cardinals'],
  pack: ['packers'],
  bolts: ['chargers'],
  commies: ['commanders'],
  // NBA
  sixers: ['76ers'],
  cavs: ['cavaliers'],
  mavs: ['mavericks'],
  wolves: ['timberwolves', 'wolverhampton'],
  't-wolves': ['timberwolves'],
  blazers: ['trail blazers'],
  dubs: ['warriors'],
  knicks: ['knicks'],
  clips: ['clippers'],
  // MLB
  sox: ['red sox', 'white sox'],
  yanks: ['yankees'],
  phils: ['phillies'],
  halos: ['angels'],
  stros: ['astros'],
  // Soccer
  'man u': ['manchester united'],
  manu: ['manchester united'],
  'man city': ['manchester city'],
  spurs: ['tottenham', 'spurs'],
  gunners: ['arsenal'],
  blues: ['chelsea', 'everton'],
  reds: ['liverpool'],
  barca: ['barcelona'],
  real: ['real madrid'],
};

// Common city / metro / abbreviation aliases
const CITY_ALIASES: Record<string, string[]> = {
  philly: ['philadelphia'],
  sf: ['san francisco', 'golden state'],
  'bay area': ['san francisco', 'golden state', 'oakland', 'san jose'],
  la: ['los angeles'],
  nyc: ['new york'],
  ny: ['new york'],
  dc: ['washington'],
  chi: ['chicago'],
  kc: ['kansas city'],
  dfw: ['dallas'],
  pitt: ['pittsburgh'],
  vegas: ['las vegas'],
  minny: ['minnesota', 'minneapolis'],
  tb: ['tampa', 'tampa bay'],
  ne: ['new england', 'boston'],
  gb: ['green bay'],
  az: ['arizona', 'phoenix'],
  indy: ['indiana', 'indianapolis'],
  cle: ['cleveland'],
  atl: ['atlanta'],
  nola: ['new orleans'],
  cincy: ['cincinnati'],
  den: ['denver'],
  mia: ['miami'],
  hou: ['houston'],
  dal: ['dallas'],
  det: ['detroit'],
  tor: ['toronto'],
  mil: ['milwaukee'],
  por: ['portland'],
  sea: ['seattle'],
  bal: ['baltimore'],
  buf: ['buffalo'],
  ten: ['tennessee', 'nashville'],
  car: ['carolina', 'charlotte'],
};

/**
 * Fast Damerau-Levenshtein distance supporting transpositions (e.g. "cheifs" vs "chiefs")
 */
function damerauLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const d: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

/**
 * Flexible league name matching
 */
function matchesLeague(teamLeague: string, filter: string): boolean {
  const tl = teamLeague.toLowerCase();
  const f = filter.toLowerCase().trim();
  if (f === 'all') return true;
  if (tl === f) return true;
  if (f === 'epl' && tl.includes('premier league')) return true;
  if (f === 'premier league' && tl.includes('premier league')) return true;
  if (f === 'ncaaf' && tl.includes('ncaa football')) return true;
  if (f === 'ncaa football' && tl.includes('ncaa football')) return true;
  if (f === 'ncaab' && tl.includes('ncaa basketball')) return true;
  if (f === 'ncaa basketball' && tl.includes('ncaa basketball')) return true;
  if (f === 'ucl' && tl.includes('champions league')) return true;
  if (f === 'uefa champions league' && tl.includes('champions league')) return true;
  if (tl.includes(f) || f.includes(tl)) return true;
  return false;
}

/**
 * Compute fuzzy relevance score for a team against a query
 */
function scoreTeamMatch(team: Team, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const qTokens = q.split(/\s+/).filter(Boolean);
  const fullName = team.name.toLowerCase();
  const shortName = (team.short_name || '').toLowerCase();
  const location = (team.location || '').toLowerCase();
  const abbrev = (team.abbreviation || '').toLowerCase();
  const league = team.league.toLowerCase();
  const teamTokens = [fullName, shortName, location, abbrev]
    .join(' ')
    .split(/\s+/)
    .filter(Boolean);

  let score = 0;

  // 1. Direct exact & prefix matches
  if (fullName === q) score += 1000;
  else if (shortName === q) score += 800;
  else if (abbrev === q) score += 750;
  else if (fullName.startsWith(q)) score += 500;
  else if (shortName.startsWith(q)) score += 450;
  else if (fullName.includes(q)) score += 300;
  else if (location.includes(q)) score += 250;

  // 2. Nicknames & slang aliases
  const nicknameMatches = TEAM_NICKNAMES[q];
  if (
    nicknameMatches &&
    nicknameMatches.some((n) => fullName.includes(n) || shortName.includes(n))
  ) {
    score += 650;
  }

  // 3. City / Metro aliases
  const cityMatches = CITY_ALIASES[q];
  if (
    cityMatches &&
    cityMatches.some((m) => location.includes(m) || fullName.includes(m))
  ) {
    score += 550;
  }

  // 4. Token-by-token fuzzy matching
  let matchedTokens = 0;
  for (const token of qTokens) {
    let tokenScore = 0;

    // Check abbreviation
    if (abbrev && abbrev === token) {
      tokenScore = Math.max(tokenScore, 200);
    }

    // Check token aliases
    if (TEAM_NICKNAMES[token]?.some((n) => fullName.includes(n) || shortName.includes(n))) {
      tokenScore = Math.max(tokenScore, 180);
    }
    if (CITY_ALIASES[token]?.some((m) => location.includes(m) || fullName.includes(m))) {
      tokenScore = Math.max(tokenScore, 170);
    }

    for (const word of teamTokens) {
      if (word === token) {
        tokenScore = Math.max(tokenScore, 140);
      } else if (word.startsWith(token)) {
        tokenScore = Math.max(tokenScore, 100);
      } else if (token.length >= 4 && damerauLevenshtein(token, word) === 1) {
        // 1-character typo or transposition (e.g. "cheifs" -> "chiefs")
        tokenScore = Math.max(tokenScore, 90);
      } else if (token.length >= 6 && damerauLevenshtein(token, word) === 2) {
        // 2-character typo on longer terms
        tokenScore = Math.max(tokenScore, 65);
      } else if (word.includes(token)) {
        tokenScore = Math.max(tokenScore, 55);
      }
    }

    if (tokenScore > 0) {
      matchedTokens++;
      score += tokenScore;
    }
  }

  // Bonus when all search tokens find a match
  if (matchedTokens === qTokens.length && qTokens.length > 1) {
    score += 250;
  }

  // League keyword bonus (e.g. "Chiefs NFL")
  if (qTokens.some((t) => league.includes(t))) {
    score += 80;
  }

  return score;
}

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
        const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/teams?limit=100`;
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
  const cleanQuery = query.trim().toLowerCase();

  // 1. Filter by league if specified
  let leagueFiltered = allTeams;
  if (leagueFilter && leagueFilter !== 'all') {
    leagueFiltered = allTeams.filter((t) =>
      matchesLeague(t.league, leagueFilter),
    );
  }

  // 2. If no query, return all teams in the selected league (or all leagues)
  if (!cleanQuery) {
    return leagueFiltered;
  }

  // 3. Compute fuzzy scores
  const scoredTeams: Array<{ team: Team; score: number }> = [];

  for (const team of leagueFiltered) {
    const score = scoreTeamMatch(team, cleanQuery);
    if (score >= 45) {
      scoredTeams.push({ team, score });
    }
  }

  // 4. Sort by highest relevance score, then alphabetically
  scoredTeams.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.team.name.localeCompare(b.team.name);
  });

  return scoredTeams.map((s) => s.team);
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
    const res = await fetch(scheduleUrl, { next: { revalidate: 300 } });
    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    const events = data.events || [];
    const teamName = data.team?.displayName || 'My Team';
    const teamLogo = data.team?.logo;

    const fixtures: MatchFixture[] = [];

    for (const event of events) {
      const eventDate = new Date(event.date);
      // Include fixtures occurring between now (or today) and maxDate
      if (
        eventDate < new Date(now.getTime() - 2 * 60 * 60 * 1000) ||
        eventDate > maxDate
      ) {
        continue;
      }

      const competition = event.competitions?.[0];
      if (!competition) continue;

      const competitors = competition.competitors || [];
      const currentTeamCompetitor = competitors.find(
        (c: any) => c.id === rawId,
      );
      const opponentCompetitor = competitors.find((c: any) => c.id !== rawId);

      const opponentName = opponentCompetitor?.team?.displayName || 'TBD';
      const opponentLogo =
        opponentCompetitor?.team?.logos?.[0]?.href ||
        opponentCompetitor?.team?.logo ||
        '';
      const currentTeamLogo =
        currentTeamCompetitor?.team?.logos?.[0]?.href || teamLogo || '';
      const isHome = currentTeamCompetitor?.homeAway === 'home';

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
        dateUtc: event.date,
        broadcast,
        venue,
        status,
      });
    }

    return fixtures;
  } catch (err) {
    console.error(`Error fetching fixtures for team ${teamId}:`, err);
    return [];
  }
}

