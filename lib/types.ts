export interface Team {
  id: string; // e.g. "espn:football:nfl:12"
  name: string;
  sport: string;
  league: string;
  logo_url: string;
  location?: string;
  abbreviation?: string;
  short_name?: string;
}

export interface UserProfile {
  id: string; // Clerk user ID
  email: string;
  timezone: string;
  created_at?: string;
}

export interface UserSubscription {
  user_id: string;
  team_id: string;
  team?: Team;
  created_at?: string;
}

export interface MatchFixture {
  id: string;
  teamId: string;
  teamName: string;
  teamLogo?: string;
  opponentName: string;
  opponentLogo?: string;
  isHome: boolean;
  sport: string;
  league: string;
  dateUtc: string; // ISO UTC string
  broadcast?: string; // e.g. "ESPN", "FOX", "CBS"
  venue?: string;
  status?: string; // "scheduled", "in_progress", "final"
}

export interface UserDigestData {
  profile: UserProfile;
  fixturesByDate: Record<string, MatchFixture[]>; // "Saturday, Sep 19" -> fixtures
}

export type ExcitementTier = 'ultra' | 'high' | 'featured' | 'standard';

export interface MarqueeTeam {
  id: string; // e.g. "espn:football:college-football:84"
  rawId: string;
  name: string;
  abbreviation?: string;
  logo: string;
  record?: string;
  rank?: number; // e.g. 4 for #4 Ohio State
  isHome: boolean;
  score?: string;
}

export interface MarqueeGame {
  id: string; // e.g. "espn:football:college-football:401858488"
  sport: string; // "football", "basketball", etc.
  league: string; // "NCAA Football", "NFL", "NBA", etc.
  leagueSlug: string; // "college-football", "nfl", "nba", etc.
  name: string; // "Ohio State Buckeyes at Indiana Hoosiers"
  shortName?: string; // "OSU @ IU"
  dateUtc: string; // ISO UTC string
  venue?: string;
  homeTeam: MarqueeTeam;
  awayTeam: MarqueeTeam;
  broadcasts: string[];
  broadcastSummary?: string; // e.g. "FOX"
  odds?: {
    details?: string; // e.g. "OSU -3.5"
    overUnder?: number; // e.g. 50.5
    spreadValue?: number;
  };
  excitementScore: number; // 0 - 100
  tier: ExcitementTier; // 'ultra' (90+), 'high' (78+), 'featured' (65+), 'standard'
  highlightTags: string[]; // ["🔥 #4 vs #5 Top 10", "📺 National TV: Fox", "⚡ Spread: 3.5"]
  isRivalry?: boolean;
}

