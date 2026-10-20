import { Team } from '../types';

export const TEAM_NICKNAMES: Record<string, string[]> = {
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

export const CITY_ALIASES: Record<string, string[]> = {
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

export const COLLEGE_PROGRAM_ALIASES: Record<string, string[]> = {
  ut: ['texas longhorns', 'texas'],
  'ut austin': ['texas longhorns', 'texas'],
  austin: ['texas longhorns'],
  texas: ['texas longhorns'],
  longhorns: ['texas longhorns'],
  horns: ['texas longhorns'],
  'hook em': ['texas longhorns'],

  bama: ['alabama crimson tide', 'alabama'],
  alabama: ['alabama crimson tide'],
  'crimson tide': ['alabama crimson tide'],
  'roll tide': ['alabama crimson tide'],
  tuscaloosa: ['alabama crimson tide'],

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
 * Fast Damerau-Levenshtein distance supporting character transpositions.
 */
export function damerauLevenshtein(a: string, b: string): number {
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

const LEAGUE_ALIAS_MAP: Record<string, string> = {
  nfl: 'nfl',
  'college-football': 'ncaa football',
  cfb: 'ncaa football',
  ncaaf: 'ncaa football',
  'ncaa football': 'ncaa football',
  nba: 'nba',
  'mens-college-basketball': 'ncaa basketball',
  'college-basketball': 'ncaa basketball',
  cbb: 'ncaa basketball',
  cbk: 'ncaa basketball',
  ncaab: 'ncaa basketball',
  'ncaa basketball': 'ncaa basketball',
  mlb: 'mlb',
  nhl: 'nhl',
  'eng.1': 'premier league',
  epl: 'premier league',
  'premier league': 'premier league',
  'english premier league': 'premier league',
  'usa.1': 'mls',
  mls: 'mls',
  'major league soccer': 'mls',
  'uefa.champions': 'uefa champions league',
  ucl: 'uefa champions league',
  'champions league': 'uefa champions league',
  'uefa champions league': 'uefa champions league',
  'esp.1': 'la liga',
  'la liga': 'la liga',
  laliga: 'la liga',
  'ger.1': 'bundesliga',
  bundesliga: 'bundesliga',
  'ita.1': 'serie a',
  'serie a': 'serie a',
};

export function matchesLeague(teamLeague: string, filter: string): boolean {
  const tl = (teamLeague || '').toLowerCase().trim();
  const f = (filter || '').toLowerCase().trim();
  if (!f || f === 'all') return true;

  const canonFilter = LEAGUE_ALIAS_MAP[f] || f;
  const canonTeamLeague = LEAGUE_ALIAS_MAP[tl] || tl;

  if (canonFilter === canonTeamLeague) return true;
  if (canonTeamLeague.includes(canonFilter) || canonFilter.includes(canonTeamLeague)) return true;
  if (tl.includes(f) || f.includes(tl)) return true;

  return false;
}

export function normalizeCollegeSearch(q: string): {
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

export function scoreTeamMatch(team: Team, query: string): number {
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

  // 1. College program and nickname aliases
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

    if (abbrev && abbrev === token) {
      tokenScore = Math.max(tokenScore, 200);
    }

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

  if (matchedTokens === qTokens.length && qTokens.length > 1) {
    score += 250;
  }

  if (isCollege && league.includes('ncaa') && score > 0) {
    score += 180;
  }

  if (qTokens.some((t) => league.includes(t))) {
    score += 80;
  }

  return score;
}

/**
 * Pure search function over a collection of teams.
 */
export function searchTeamsInIndex(
  allTeams: Team[],
  query: string,
  leagueFilter?: string,
): Team[] {
  const cleanQuery = query.trim().toLowerCase();

  let leagueFiltered = allTeams;
  if (leagueFilter && leagueFilter !== 'all') {
    leagueFiltered = allTeams.filter((t) =>
      matchesLeague(t.league, leagueFilter),
    );
  }

  if (!cleanQuery) {
    return leagueFiltered;
  }

  const scoredTeams: Array<{ team: Team; score: number }> = [];

  for (const team of leagueFiltered) {
    const score = scoreTeamMatch(team, cleanQuery);
    if (score >= 45) {
      scoredTeams.push({ team, score });
    }
  }

  scoredTeams.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.team.name.localeCompare(b.team.name);
  });

  return scoredTeams.map((s) => s.team);
}
