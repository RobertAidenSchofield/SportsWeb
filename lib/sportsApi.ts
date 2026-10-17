import {
  MatchFixture,
  Team,
  MarqueeGame,
  MarqueeTeam,
  ExcitementTier,
} from './types';

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

// Comprehensive college university, mascot, and regional aliases
const COLLEGE_PROGRAM_ALIASES: Record<string, string[]> = {
  // Texas / UT Austin
  ut: ['texas longhorns', 'texas'],
  'ut austin': ['texas longhorns', 'texas'],
  austin: ['texas longhorns'],
  texas: ['texas longhorns'],
  longhorns: ['texas longhorns'],
  horns: ['texas longhorns'],
  'hook em': ['texas longhorns'],

  // Alabama / Bama
  bama: ['alabama crimson tide', 'alabama'],
  alabama: ['alabama crimson tide'],
  'crimson tide': ['alabama crimson tide'],
  'roll tide': ['alabama crimson tide'],
  tuscaloosa: ['alabama crimson tide'],

  // Top National Programs
  georgia: ['georgia bulldogs'],
  uga: ['georgia bulldogs'],
  dawgs: ['georgia bulldogs'],

  'ohio state': ['ohio state buckeyes'],
  osu: [
    'ohio state buckeyes',
    'oklahoma state cowboys',
    'oregon state beavers',
  ],
  buckeyes: ['ohio state buckeyes'],

  michigan: ['michigan wolverines'],
  wolverines: ['michigan wolverines'],

  'notre dame': ['notre dame fighting irish'],
  nd: ['notre dame fighting irish'],
  irish: ['notre dame fighting irish'],

  lsu: ['lsu tigers'],
  tigers: ['lsu tigers', 'clemson tigers', 'auburn tigers'],

  clemson: ['clemson tigers'],

  florida: ['florida gators'],
  uf: ['florida gators'],
  gators: ['florida gators'],

  'florida state': ['florida state seminoles'],
  fsu: ['florida state seminoles'],
  seminoles: ['florida state seminoles'],
  noles: ['florida state seminoles'],

  tennessee: ['tennessee volunteers'],
  vols: ['tennessee volunteers'],
  volunteers: ['tennessee volunteers'],

  'penn state': ['penn state nittany lions'],
  psu: ['penn state nittany lions'],
  'nittany lions': ['penn state nittany lions'],

  usc: ['usc trojans'],
  trojans: ['usc trojans'],

  ucla: ['ucla bruins'],
  bruins: ['ucla bruins'],

  oregon: ['oregon ducks'],
  ducks: ['oregon ducks'],

  washington: ['washington huskies'],
  huskies: ['washington huskies', 'connecticut huskies'],
  uconn: ['connecticut huskies'],

  oklahoma: ['oklahoma sooners'],
  sooners: ['oklahoma sooners'],
  ou: ['oklahoma sooners'],

  'texas a&m': ['texas a&m aggies'],
  tamu: ['texas a&m aggies'],
  aggies: ['texas a&m aggies'],

  auburn: ['auburn tigers'],
  'war eagle': ['auburn tigers'],

  'ole miss': ['ole miss rebels'],
  rebels: ['ole miss rebels'],

  colorado: ['colorado buffaloes'],
  buffs: ['colorado buffaloes'],
  buffaloes: ['colorado buffaloes'],

  'north carolina': ['north carolina tar heels'],
  unc: ['north carolina tar heels'],
  'tar heels': ['north carolina tar heels'],

  duke: ['duke blue devils'],
  'blue devils': ['duke blue devils'],

  kentucky: ['kentucky wildcats'],
  wildcats: [
    'kentucky wildcats',
    'arizona wildcats',
    'villanova wildcats',
    'northwestern wildcats',
  ],

  kansas: ['kansas jayhawks'],
  jayhawks: ['kansas jayhawks'],
  ku: ['kansas jayhawks'],

  miami: ['miami hurricanes'],
  canes: ['miami hurricanes'],

  wisconsin: ['wisconsin badgers'],
  badgers: ['wisconsin badgers'],

  nebraska: ['nebraska cornhuskers'],
  cornhuskers: ['nebraska cornhuskers'],
  huskers: ['nebraska cornhuskers'],

  iowa: ['iowa hawkeyes'],
  hawkeyes: ['iowa hawkeyes'],

  arkansas: ['arkansas razorbacks'],
  razorbacks: ['arkansas razorbacks'],
  hogs: ['arkansas razorbacks'],

  'south carolina': ['south carolina gamecocks'],
  gamecocks: ['south carolina gamecocks'],

  purdue: ['purdue boilermakers'],
  boilermakers: ['purdue boilermakers'],

  indiana: ['indiana hoosiers'],
  hoosiers: ['indiana hoosiers'],

  illinois: ['illinois fighting illini'],
  illini: ['illinois fighting illini'],

  byu: ['byu cougars'],
  cougars: ['byu cougars', 'houston cougars'],

  utah: ['utah utes'],
  utes: ['utah utes'],

  arizona: ['arizona wildcats'],
  'arizona state': ['arizona state sun devils'],
  asu: ['arizona state sun devils'],

  pitt: ['pittsburgh panthers'],
  syracuse: ['syracuse orange'],
  virginia: ['virginia cavaliers'],
  uva: ['virginia cavaliers'],
  'virginia tech': ['virginia tech hokies'],
  vt: ['virginia tech hokies'],
  hokies: ['virginia tech hokies'],
  'nc state': ['nc state wolfpack'],
  wolfpack: ['nc state wolfpack'],
  gonzaga: ['gonzaga bulldogs'],
  zags: ['gonzaga bulldogs'],
  villanova: ['villanova wildcats'],
  nova: ['villanova wildcats'],
};

/**
 * Normalizes university queries (e.g. "university of alabama" -> "alabama")
 */
function normalizeCollegeSearch(q: string): {
  original: string;
  normalized: string;
  isCollege: boolean;
} {
  const original = q.toLowerCase().trim();
  const isCollege = /\b(university|univ|u of|college)\b/i.test(original);
  const stripped = original
    .replace(/\bthe\s+university\s+of\s+/gi, '')
    .replace(/\buniversity\s+of\s+/gi, '')
    .replace(/\bthe\s+univ\s+of\s+/gi, '')
    .replace(/\buniv\s+of\s+/gi, '')
    .replace(/\bthe\s+u\s+of\s+/gi, '')
    .replace(/\bu\s+of\s+/gi, '')
    .replace(/\s+university\b/gi, '')
    .replace(/\s+univ\b/gi, '')
    .trim();

  return { original, normalized: stripped || original, isCollege };
}

/**
 * Compute fuzzy relevance score for a team against a query
 */
function scoreTeamMatch(team: Team, query: string): number {
  const { original: q, normalized: normQ, isCollege } =
    normalizeCollegeSearch(query);
  if (!q && !normQ) return 0;

  const qTokens = (normQ || q).split(/\s+/).filter(Boolean);
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

  // 1. Check college program aliases first (e.g. "ut austin" -> "Texas Longhorns", "bama" -> "Alabama Crimson Tide")
  const aliasHits = [
    ...(COLLEGE_PROGRAM_ALIASES[q] || []),
    ...(COLLEGE_PROGRAM_ALIASES[normQ] || []),
    ...(TEAM_NICKNAMES[q] || []),
    ...(TEAM_NICKNAMES[normQ] || []),
  ];

  if (aliasHits.length > 0) {
    for (const target of aliasHits) {
      if (fullName === target) score += 1200;
      else if (fullName.startsWith(target)) score += 700;
      else if (fullName.includes(target) || location.includes(target))
        score += 400;
    }
  }

  // 2. Direct exact & prefix matches on normalized query
  if (fullName === normQ || fullName === q) score += 1000;
  else if (shortName === normQ || shortName === q) score += 800;
  else if (abbrev === normQ || abbrev === q) score += 750;
  else if (fullName.startsWith(normQ) || fullName.startsWith(q)) score += 550;
  else if (shortName.startsWith(normQ) || shortName.startsWith(q)) score += 480;
  else if (fullName.includes(normQ) || fullName.includes(q)) score += 320;
  else if (location.includes(normQ) || location.includes(q)) score += 260;

  // 3. City / Metro aliases
  const cityMatches = [
    ...(CITY_ALIASES[q] || []),
    ...(CITY_ALIASES[normQ] || []),
  ];
  if (
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
    if (
      COLLEGE_PROGRAM_ALIASES[token]?.some(
        (n) => fullName.includes(n) || shortName.includes(n),
      )
    ) {
      tokenScore = Math.max(tokenScore, 190);
    }
    if (
      TEAM_NICKNAMES[token]?.some(
        (n) => fullName.includes(n) || shortName.includes(n),
      )
    ) {
      tokenScore = Math.max(tokenScore, 180);
    }
    if (
      CITY_ALIASES[token]?.some(
        (m) => location.includes(m) || fullName.includes(m),
      )
    ) {
      tokenScore = Math.max(tokenScore, 170);
    }

    for (const word of teamTokens) {
      if (word === token) {
        tokenScore = Math.max(tokenScore, 140);
      } else if (word.startsWith(token)) {
        tokenScore = Math.max(tokenScore, 100);
      } else if (token.length >= 4 && damerauLevenshtein(token, word) === 1) {
        // 1-character typo or transposition
        tokenScore = Math.max(tokenScore, 90);
      } else if (token.length >= 6 && damerauLevenshtein(token, word) === 2) {
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

  // Bonus if query indicates a university/college team
  if (isCollege && league.includes('ncaa') && score > 0) {
    score += 180;
  }

  // League keyword bonus (e.g. "Chiefs NFL", "Bama NCAAF")
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
      // Include fixtures occurring between earlier this week (past 5 days) and maxDate (7 days ahead)
      const minDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      if (eventDate < minDate || eventDate > maxDate) {
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

      // Extract scores and game status
      const currentScore =
        currentTeamCompetitor?.score?.displayValue ??
        (typeof currentTeamCompetitor?.score === 'string' ||
        typeof currentTeamCompetitor?.score === 'number'
          ? String(currentTeamCompetitor.score)
          : undefined);

      const opponentScore =
        opponentCompetitor?.score?.displayValue ??
        (typeof opponentCompetitor?.score === 'string' ||
        typeof opponentCompetitor?.score === 'number'
          ? String(opponentCompetitor.score)
          : undefined);

      const teamWinner = currentTeamCompetitor?.winner === true;
      const opponentWinner = opponentCompetitor?.winner === true;
      const isCompleted = Boolean(competition.status?.type?.completed);
      const isLive = competition.status?.type?.state === 'in';
      const statusDetail =
        competition.status?.type?.detail ||
        competition.status?.type?.description ||
        (isCompleted ? 'Final' : undefined);

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

// Known marquee rivalries across leagues (normalized lowercase team identifiers)
const NOTABLE_RIVALRIES: Array<{
  teams: [string, string];
  label: string;
  boost: number;
}> = [
  // College Football & Basketball
  { teams: ['ohio state', 'michigan'], label: '⚔️ The Game', boost: 25 },
  { teams: ['alabama', 'auburn'], label: '⚔️ Iron Bowl', boost: 25 },
  { teams: ['texas', 'oklahoma'], label: '⚔️ Red River Rivalry', boost: 25 },
  { teams: ['army', 'navy'], label: '⚔️ Army-Navy Game', boost: 25 },
  { teams: ['usc', 'ucla'], label: '⚔️ Battle for LA', boost: 20 },
  {
    teams: ['florida', 'georgia'],
    label: "⚔️ World's Largest Outdoor Cocktail Party",
    boost: 20,
  },
  {
    teams: ['duke', 'north carolina'],
    label: '⚔️ Tobacco Road Rivalry',
    boost: 25,
  },
  {
    teams: ['alabama', 'tennessee'],
    label: '⚔️ Third Saturday in October',
    boost: 20,
  },
  { teams: ['notre dame', 'usc'], label: '⚔️ Jeweled Shillelagh', boost: 20 },
  { teams: ['oregon', 'washington'], label: '⚔️ PNW Rivalry', boost: 18 },
  { teams: ['indiana', 'purdue'], label: '⚔️ Old Oaken Bucket', boost: 18 },
  // NFL
  {
    teams: ['packers', 'bears'],
    label: '⚔️ Historic NFC North Rivalry',
    boost: 18,
  },
  { teams: ['cowboys', 'eagles'], label: '⚔️ NFC East Clash', boost: 18 },
  { teams: ['ravens', 'steelers'], label: '⚔️ AFC North Battle', boost: 18 },
  { teams: ['chiefs', 'bills'], label: '🔥 Modern AFC Showdown', boost: 20 },
  { teams: ['49ers', 'seahawks'], label: '⚔️ NFC West Rivalry', boost: 16 },
  { teams: ['patriots', 'jets'], label: '⚔️ AFC East Rivalry', boost: 16 },
  // NBA
  {
    teams: ['celtics', 'lakers'],
    label: '⚔️ Historic NBA Finals Rivalry',
    boost: 22,
  },
  { teams: ['warriors', 'lakers'], label: '🌟 California Star Clash', boost: 18 },
  {
    teams: ['knicks', 'celtics'],
    label: '⚔️ Atlantic Division Rivalry',
    boost: 16,
  },
  {
    teams: ['bucks', '76ers'],
    label: '⚔️ Eastern Conference Clash',
    boost: 15,
  },
  { teams: ['heat', 'knicks'], label: '⚔️ 90s Eastern Rivalry', boost: 15 },
  // Soccer
  { teams: ['real madrid', 'barcelona'], label: '🔥 El Clásico', boost: 28 },
  { teams: ['arsenal', 'tottenham'], label: '⚔️ North London Derby', boost: 25 },
  {
    teams: ['manchester united', 'manchester city'],
    label: '⚔️ Manchester Derby',
    boost: 25,
  },
  {
    teams: ['liverpool', 'manchester united'],
    label: '⚔️ Northwest Derby',
    boost: 25,
  },
  {
    teams: ['liverpool', 'manchester city'],
    label: '🏆 Title Showdown',
    boost: 22,
  },
  { teams: ['chelsea', 'arsenal'], label: '⚔️ London Derby', boost: 20 },
  // NHL
  {
    teams: ['maple leafs', 'canadiens'],
    label: '⚔️ Historic Canadian Rivalry',
    boost: 20,
  },
  { teams: ['rangers', 'islanders'], label: '⚔️ Battle of New York', boost: 18 },
  { teams: ['bruins', 'canadiens'], label: '⚔️ Original Six Classic', boost: 20 },
  {
    teams: ['penguins', 'capitals'],
    label: '⚔️ Crosby vs Ovechkin Classic',
    boost: 18,
  },
  { teams: ['oilers', 'flames'], label: '⚔️ Battle of Alberta', boost: 20 },
];

function checkRivalry(
  teamA: string,
  teamB: string,
): { isRivalry: boolean; label?: string; boost: number } {
  const normA = teamA.toLowerCase();
  const normB = teamB.toLowerCase();
  for (const r of NOTABLE_RIVALRIES) {
    const [t1, t2] = r.teams;
    if (
      (normA.includes(t1) && normB.includes(t2)) ||
      (normA.includes(t2) && normB.includes(t1))
    ) {
      return { isRivalry: true, label: r.label, boost: r.boost };
    }
  }
  return { isRivalry: false, boost: 0 };
}

function parseWinPct(
  recordSummary?: string,
): { wins: number; losses: number; winPct: number } | null {
  if (!recordSummary) return null;
  const parts = recordSummary.split('-').map(Number);
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    const wins = parts[0];
    const losses = parts[1];
    const total = wins + losses;
    if (total > 0) {
      return { wins, losses, winPct: wins / total };
    }
  }
  return null;
}

/**
 * Calculates a dynamic 0-100 Excitement Index and assigns highlight tags based on
 * rankings, national broadcasts, tight betting lines, win percentages, and historic rivalries.
 */
export function calculateGameExcitement(
  competition: any,
  sport: string,
  league: string,
): {
  score: number;
  tier: ExcitementTier;
  highlightTags: string[];
  broadcastSummary: string;
  isRivalry: boolean;
  spreadValue?: number;
} {
  const isCollege =
    league.toLowerCase().includes('ncaa') ||
    sport === 'college-football' ||
    league === 'mens-college-basketball';
  let score = isCollege ? 30 : 35; // base score
  const highlightTags: string[] = [];

  const competitors = competition?.competitors || [];
  const homeComp =
    competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
  const awayComp =
    competitors.find((c: any) => c.homeAway === 'away') || competitors[1];

  const homeName = homeComp?.team?.displayName || '';
  const awayName = awayComp?.team?.displayName || '';

  // 1. College Rankings (AP Top 25 / CFP)
  const homeRank = homeComp?.curatedRank?.current;
  const awayRank = awayComp?.curatedRank?.current;
  const isHomeRanked =
    typeof homeRank === 'number' && homeRank >= 1 && homeRank <= 25;
  const isAwayRanked =
    typeof awayRank === 'number' && awayRank >= 1 && awayRank <= 25;

  if (isHomeRanked && isAwayRanked) {
    const minRank = Math.min(homeRank, awayRank);
    const maxRank = Math.max(homeRank, awayRank);
    if (maxRank <= 5) {
      score += 54;
      highlightTags.push(`🔥 #${minRank} vs #${maxRank} Top 5 Showdown`);
    } else if (maxRank <= 10) {
      score += 44;
      highlightTags.push(`🔥 #${minRank} vs #${maxRank} Top 10 Clash`);
    } else {
      score += 34;
      highlightTags.push(`⚔️ #${minRank} vs #${maxRank} Ranked Matchup`);
    }
  } else if (isHomeRanked || isAwayRanked) {
    const rank = (isHomeRanked ? homeRank : awayRank)!;
    if (rank <= 10) {
      score += 16;
      highlightTags.push(`🌟 Top 10: #${rank}`);
    } else {
      score += 10;
      highlightTags.push(`Ranked #${rank}`);
    }
  }

  // 2. Broadcast extraction & National TV boost
  const rawBroadcasts = [
    ...(competition?.broadcasts || []),
    ...(competition?.geoBroadcasts || []),
  ];
  const channelNames: string[] = [];
  for (const b of rawBroadcasts) {
    const names = Array.isArray(b.names)
      ? b.names
      : b.name
        ? [b.name]
        : b.media?.shortName
          ? [b.media.shortName]
          : [];
    for (const n of names) {
      if (typeof n === 'string' && !channelNames.includes(n)) {
        channelNames.push(n);
      }
    }
  }

  const broadcastSummary = channelNames.slice(0, 2).join(', ');
  const upperChannels = channelNames.map((c) => c.toUpperCase());
  const isMajorNational = upperChannels.some((c) =>
    ['ABC', 'ESPN', 'FOX', 'CBS', 'NBC', 'TNT'].includes(c),
  );
  const isStreamingNational = upperChannels.some((c) =>
    [
      'PRIME VIDEO',
      'PEACOCK',
      'USA NET',
      'NFL NET',
      'FS1',
      'TBS',
      'DISNEY+',
      'MAX',
    ].includes(c),
  );

  if (isMajorNational) {
    score += 18;
    highlightTags.push(`📺 ${channelNames[0]} National TV`);
  } else if (isStreamingNational) {
    score += 12;
    highlightTags.push(`📺 ${channelNames[0]}`);
  } else if (channelNames.length > 0) {
    score += 6;
  }

  // 3. Point Spread & Competitiveness
  let spreadValue: number | undefined;
  const oddsObj = competition?.odds?.[0];
  const spreadDetails = oddsObj?.details; // e.g. "OSU -3.5" or "EVEN"
  if (typeof spreadDetails === 'string') {
    if (
      spreadDetails.toUpperCase() === 'EVEN' ||
      spreadDetails.toUpperCase() === 'PK'
    ) {
      spreadValue = 0;
      score += 18;
      highlightTags.push("⚡ Pick'em Tossup");
    } else {
      const match = spreadDetails.match(/[-+]?([0-9]*\.[0-9]+|[0-9]+)/);
      if (match) {
        spreadValue = Math.abs(parseFloat(match[0]));
        if (spreadValue <= 2.5) {
          score += 18;
          highlightTags.push(`⚡ Nailbiter (Spread: ${spreadValue} pts)`);
        } else if (spreadValue <= 4.5) {
          score += 14;
          highlightTags.push(`⚡ Tight Spread (${spreadValue} pts)`);
        } else if (spreadValue <= 7.0) {
          score += 8;
          highlightTags.push('🎯 1-Score Spread');
        }
      }
    }
  }

  // 4. Team Records & Win % (Pro leagues & general performance)
  const homeStats = parseWinPct(homeComp?.records?.[0]?.summary);
  const awayStats = parseWinPct(awayComp?.records?.[0]?.summary);
  if (
    homeStats &&
    awayStats &&
    homeStats.wins + homeStats.losses >= 3 &&
    awayStats.wins + awayStats.losses >= 3
  ) {
    if (homeStats.winPct >= 0.7 && awayStats.winPct >= 0.7) {
      score += 20;
      highlightTags.push(
        `🏆 Heavyweight Clash (${homeComp.records[0].summary} vs ${awayComp.records[0].summary})`,
      );
    } else if (homeStats.winPct >= 0.6 && awayStats.winPct >= 0.6) {
      score += 14;
      highlightTags.push('📈 Top Record Clash');
    }
  }

  // 5. Rivalry & Derby Detection
  const rivalry = checkRivalry(homeName, awayName);
  let isRivalry = rivalry.isRivalry;
  if (rivalry.isRivalry && rivalry.label) {
    score += rivalry.boost;
    highlightTags.unshift(rivalry.label); // Place rivalry tag first!
  } else {
    // Check competition notes for tournament or rivalry keywords
    const notesText = (
      competition?.notes?.map((n: any) => n.headline) || []
    )
      .join(' ')
      .toLowerCase();
    if (
      notesText.includes('rivalry') ||
      notesText.includes('derby') ||
      notesText.includes('championship')
    ) {
      score += 15;
      isRivalry = true;
      highlightTags.unshift('⚔️ Rivalry Match');
    }
  }

  const finalScore = Math.max(25, Math.min(100, Math.round(score)));
  let tier: ExcitementTier = 'standard';
  if (finalScore >= 88) tier = 'ultra';
  else if (finalScore >= 76) tier = 'high';
  else if (finalScore >= 65) tier = 'featured';

  return {
    score: finalScore,
    tier,
    highlightTags: highlightTags.slice(0, 3), // Keep top 3 most relevant tags
    broadcastSummary,
    isRivalry,
    spreadValue,
  };
}

export interface TopLeagueGamesOptions {
  leagueFilter?: string; // 'all', 'nfl', 'nba', 'college-football', 'nhl', etc.
  daysAhead?: number;
  limit?: number;
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
  const { leagueFilter = 'all', daysAhead = 7, limit = 30 } = options;
  const now = Date.now();
  const cacheKey = `${leagueFilter}:${daysAhead}:${limit}`;

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
          urls.push(
            `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard?dates=${ds}`,
          );
        }
      } else {
        urls.push(
          `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard`,
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

          const homeScoreStr =
            homeComp.score?.displayValue ??
            (typeof homeComp.score === 'string' ||
            typeof homeComp.score === 'number'
              ? String(homeComp.score)
              : undefined);

          const awayScoreStr =
            awayComp.score?.displayValue ??
            (typeof awayComp.score === 'string' ||
            typeof awayComp.score === 'number'
              ? String(awayComp.score)
              : undefined);

          const isCompleted = Boolean(competition.status?.type?.completed);
          const isLive = competition.status?.type?.state === 'in';
          const statusDetail =
            competition.status?.type?.detail ||
            competition.status?.type?.description ||
            (isCompleted ? 'Final' : undefined);

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
  uniqueGames.sort((a, b) => {
    if (b.excitementScore !== a.excitementScore) {
      return b.excitementScore - a.excitementScore;
    }
    return new Date(a.dateUtc).getTime() - new Date(b.dateUtc).getTime();
  });

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

