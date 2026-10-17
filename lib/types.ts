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
  leagueDisplayName?: string;
  dateUtc: string; // ISO UTC string
  broadcast?: string; // e.g. "ESPN", "FOX", "CBS"
  venue?: string;
  status?: string; // "scheduled", "in_progress", "final", "STATUS_FINAL", etc.
  statusDetail?: string; // e.g. "Final", "Final/OT", "Halftime", "3rd 4:12"
  isCompleted?: boolean;
  isLive?: boolean;
  teamScore?: string | number;
  opponentScore?: string | number;
  teamWinner?: boolean;
  opponentWinner?: boolean;
  isPinned?: boolean; // Pinned individually by user
  excitementScore?: number;
  highlightTags?: string[];
  oddsDetails?: string;
  eventId?: string;
}

export interface UserPinnedGame {
  user_id: string;
  game_id: string;
  game_data: MarqueeGame;
  created_at?: string;
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
  winner?: boolean;
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
  status?: string;
  statusDetail?: string;
  isCompleted?: boolean;
  isLive?: boolean;
}

export interface BoxScoreStat {
  label: string;
  home: string;
  away: string;
}

export interface BoxScoreData {
  eventId: string;
  sport: string;
  league: string;
  statusDetail?: string;
  isCompleted?: boolean;
  isLive?: boolean;
  clock?: string;
  period?: number;
  venue?: string;
  attendance?: string;
  broadcasts?: string[];
  homeTeam: {
    id: string;
    name: string;
    abbreviation?: string;
    logo: string;
    score?: string;
    record?: string;
    winner?: boolean;
    linescores?: string[];
  };
  awayTeam: {
    id: string;
    name: string;
    abbreviation?: string;
    logo: string;
    score?: string;
    record?: string;
    winner?: boolean;
    linescores?: string[];
  };
  stats: BoxScoreStat[];
  leaders?: Array<{
    category: string;
    athleteName: string;
    displayValue: string;
    teamLogo?: string;
  }>;
}

/**
 * Transforms a MarqueeGame into a MatchFixture for unified schedule preview & calendar export
 */
export function marqueeToMatchFixture(game: MarqueeGame): MatchFixture {
  const eventId = game.id.includes(':') ? game.id.split(':').pop() : game.id;
  return {
    id: game.id,
    teamId: game.homeTeam.id,
    teamName: game.homeTeam.name,
    teamLogo: game.homeTeam.logo,
    opponentName: game.awayTeam.name,
    opponentLogo: game.awayTeam.logo,
    isHome: true,
    sport: game.sport,
    league: game.leagueSlug || game.league,
    leagueDisplayName: game.league,
    dateUtc: game.dateUtc,
    broadcast: game.broadcastSummary,
    venue: game.venue,
    status: game.status || 'scheduled',
    statusDetail: game.statusDetail,
    isCompleted: game.isCompleted,
    isLive: game.isLive,
    teamScore: game.homeTeam.score,
    opponentScore: game.awayTeam.score,
    teamWinner: game.homeTeam.winner,
    opponentWinner: game.awayTeam.winner,
    isPinned: true,
    excitementScore: game.excitementScore,
    highlightTags: game.highlightTags,
    oddsDetails: game.odds?.details,
    eventId,
  };
}

