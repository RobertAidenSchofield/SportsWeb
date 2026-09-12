export interface Team {
  id: string; // e.g. "espn:football:nfl:12"
  name: string;
  sport: string;
  league: string;
  logo_url: string;
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

