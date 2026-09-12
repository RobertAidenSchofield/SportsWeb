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
    cachedAllTeams = results;
    lastCacheTime = now;
  }

  return results;
}

/**
 * Search teams by name or abbreviation.
 */
export async function searchTeams(
  query: string,
  leagueFilter?: string,
): Promise<Team[]> {
  const allTeams = await getAllTeams();
  const cleanQuery = query.trim().toLowerCase();

  let filtered = allTeams;
  if (leagueFilter && leagueFilter !== 'all') {
    filtered = filtered.filter(
      (t) => t.league.toLowerCase() === leagueFilter.toLowerCase(),
    );
  }

  if (!cleanQuery) {
    // Return sample popular teams if query is empty
    return filtered.slice(0, 24);
  }

  return filtered
    .filter((t) => t.name.toLowerCase().includes(cleanQuery))
    .slice(0, 30);
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

      // Extract broadcast network if available
      let broadcast: string | undefined = undefined;
      if (competition.broadcasts && competition.broadcasts.length > 0) {
        const names = competition.broadcasts[0]?.names;
        if (names && names.length > 0) {
          broadcast = names.join(', ');
        }
      }

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

