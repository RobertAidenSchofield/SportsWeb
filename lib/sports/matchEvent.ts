import {
  MatchFixture,
  MarqueeGame,
  MarqueeTeam,
  ExcitementTier,
} from '../types';

export interface CompetitorScore {
  display?: string;
  value?: number;
  winner?: boolean;
}

export interface MatchCompetitor {
  id: string; // e.g. "espn:football:nfl:12"
  rawId: string;
  name: string;
  abbreviation?: string;
  logo: string;
  isHome: boolean;
  score?: string;
  winner?: boolean;
  rank?: number;
  record?: string;
}

export interface MatchEvent {
  id: string; // canonical event ID e.g. "espn:football:nfl:401547417" or raw "401547417"
  eventId: string; // raw event ID e.g. "401547417"
  sport: string;
  league: string;
  leagueSlug: string;
  leagueDisplayName?: string;
  dateUtc: string; // ISO UTC string
  venue?: string;
  broadcast?: string;
  broadcastChannels: string[];
  homeTeam: MatchCompetitor;
  awayTeam: MatchCompetitor;
  status: string;
  statusDetail?: string;
  isCompleted: boolean;
  isLive: boolean;
  odds?: {
    details?: string;
    overUnder?: number;
    spreadValue?: number;
  };
  excitementScore?: number;
  tier?: ExcitementTier;
  highlightTags?: string[];
  isRivalry?: boolean;
  isPinned?: boolean;
}

/**
 * Normalizes an event ID into a clean numeric or alphanumeric identifier
 */
export function extractCleanEventId(rawId: string): string {
  if (!rawId) return '';
  return rawId.includes(':') ? rawId.split(':').pop()! : rawId;
}

/**
 * Converts a MarqueeGame into a canonical MatchEvent
 */
export function fromMarqueeGame(game: MarqueeGame): MatchEvent {
  const eventId = extractCleanEventId(game.id);
  return {
    id: game.id,
    eventId,
    sport: game.sport,
    league: game.league,
    leagueSlug: game.leagueSlug || game.league.toLowerCase(),
    leagueDisplayName: game.league,
    dateUtc: game.dateUtc,
    venue: game.venue,
    broadcast: game.broadcastSummary,
    broadcastChannels: game.broadcasts || [],
    homeTeam: {
      ...game.homeTeam,
      isHome: true,
    },
    awayTeam: {
      ...game.awayTeam,
      isHome: false,
    },
    status: game.status || 'scheduled',
    statusDetail: game.statusDetail,
    isCompleted: Boolean(game.isCompleted),
    isLive: Boolean(game.isLive),
    odds: game.odds,
    excitementScore: game.excitementScore,
    tier: game.tier,
    highlightTags: game.highlightTags,
    isRivalry: game.isRivalry,
    isPinned: true,
  };
}

/**
 * Projects a canonical MatchEvent into a legacy team-perspective MatchFixture.
 * If perspectiveTeamId is provided, aligns isHome, teamScore, and opponentScore to that team.
 */
export function projectToFixture(
  event: MatchEvent,
  perspectiveTeamId?: string,
): MatchFixture {
  const cleanId = event.eventId || extractCleanEventId(event.id);
  const homeIsPerspective = perspectiveTeamId
    ? event.homeTeam.id === perspectiveTeamId ||
      event.homeTeam.rawId === perspectiveTeamId
    : true;

  const primaryTeam = homeIsPerspective ? event.homeTeam : event.awayTeam;
  const opponentTeam = homeIsPerspective ? event.awayTeam : event.homeTeam;

  return {
    id: event.id,
    eventId: cleanId,
    teamId: primaryTeam.id,
    teamName: primaryTeam.name,
    teamLogo: primaryTeam.logo,
    opponentName: opponentTeam.name,
    opponentLogo: opponentTeam.logo,
    isHome: primaryTeam.isHome,
    sport: event.sport,
    league: event.leagueSlug || event.league,
    leagueDisplayName: event.leagueDisplayName || event.league,
    dateUtc: event.dateUtc,
    broadcast: event.broadcast,
    venue: event.venue,
    status: event.status,
    statusDetail: event.statusDetail,
    isCompleted: event.isCompleted,
    isLive: event.isLive,
    teamScore: primaryTeam.score,
    opponentScore: opponentTeam.score,
    teamWinner: primaryTeam.winner,
    opponentWinner: opponentTeam.winner,
    isPinned: Boolean(event.isPinned),
    excitementScore: event.excitementScore,
    highlightTags: event.highlightTags,
    oddsDetails: event.odds?.details,
  };
}

/**
 * Projects a canonical MatchEvent into a MarqueeGame
 */
export function projectToMarqueeGame(event: MatchEvent): MarqueeGame {
  return {
    id: event.id,
    sport: event.sport,
    league: event.leagueDisplayName || event.league,
    leagueSlug: event.leagueSlug,
    name: `${event.awayTeam.name} at ${event.homeTeam.name}`,
    shortName: event.awayTeam.abbreviation && event.homeTeam.abbreviation
      ? `${event.awayTeam.abbreviation} @ ${event.homeTeam.abbreviation}`
      : undefined,
    dateUtc: event.dateUtc,
    venue: event.venue,
    homeTeam: event.homeTeam as MarqueeTeam,
    awayTeam: event.awayTeam as MarqueeTeam,
    broadcasts: event.broadcastChannels,
    broadcastSummary: event.broadcast,
    odds: event.odds,
    excitementScore: event.excitementScore || 50,
    tier: event.tier || 'standard',
    highlightTags: event.highlightTags || [],
    isRivalry: event.isRivalry,
    status: event.status,
    statusDetail: event.statusDetail,
    isCompleted: event.isCompleted,
    isLive: event.isLive,
  };
}
