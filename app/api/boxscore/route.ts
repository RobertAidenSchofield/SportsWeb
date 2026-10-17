import { NextRequest, NextResponse } from 'next/server';
import { BoxScoreData, BoxScoreStat } from '@/lib/types';
import { SUPPORTED_LEAGUES } from '@/lib/sportsApi';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let sport = searchParams.get('sport')?.toLowerCase() || '';
  let league = searchParams.get('league')?.toLowerCase() || '';
  const eventId = searchParams.get('eventId') || '';

  if (!eventId) {
    return NextResponse.json(
      { error: 'eventId parameter is required' },
      { status: 400 },
    );
  }

  // If sport is missing, attempt lookup by league
  if (!sport && league) {
    const matched = SUPPORTED_LEAGUES.find(
      (l) =>
        l.league.toLowerCase() === league ||
        l.displayName.toLowerCase() === league,
    );
    if (matched) {
      sport = matched.sport;
      league = matched.league;
    }
  }

  // Fallbacks if not recognized
  if (!sport) sport = 'football';
  if (!league) league = 'nfl';

  try {
    const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/summary?event=${eventId}`;
    const res = await fetch(summaryUrl, { next: { revalidate: 60 } });

    if (!res.ok) {
      return NextResponse.json(
        { error: `ESPN returned status ${res.status}` },
        { status: res.status },
      );
    }

    const data = await res.json();
    const competition = data.header?.competitions?.[0];
    const competitors = competition?.competitors || [];
    const homeComp = competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
    const awayComp = competitors.find((c: any) => c.homeAway === 'away') || competitors[1];

    const isCompleted = Boolean(competition?.status?.type?.completed);
    const isLive = competition?.status?.type?.state === 'in';
    const statusDetail =
      competition?.status?.type?.detail ||
      competition?.status?.type?.description ||
      (isCompleted ? 'Final' : undefined);

    const clock = competition?.status?.displayClock;
    const period = competition?.status?.period;

    // Linescores
    const homeLinescores = (homeComp?.linescores || []).map((l: any) =>
      String(l.displayValue ?? l.value ?? ''),
    );
    const awayLinescores = (awayComp?.linescores || []).map((l: any) =>
      String(l.displayValue ?? l.value ?? ''),
    );

    // Team Statistics comparison table
    const stats: BoxScoreStat[] = [];
    const homeBox = data.boxscore?.teams?.find(
      (t: any) => t.team?.id === homeComp?.team?.id,
    );
    const awayBox = data.boxscore?.teams?.find(
      (t: any) => t.team?.id === awayComp?.team?.id,
    );

    const homeStatistics = homeBox?.statistics || [];
    const awayStatistics = awayBox?.statistics || [];

    for (const hStat of homeStatistics) {
      const aStat = awayStatistics.find((a: any) => a.name === hStat.name);
      stats.push({
        label: hStat.label || hStat.name,
        home: hStat.displayValue ?? String(hStat.value ?? '-'),
        away: aStat ? aStat.displayValue ?? String(aStat.value ?? '-') : '-',
      });
    }

    // Leaders (top performers)
    const leaders: Array<{
      category: string;
      athleteName: string;
      displayValue: string;
      teamLogo?: string;
    }> = [];

    if (Array.isArray(data.leaders)) {
      for (const cat of data.leaders) {
        const top = cat.leaders?.[0];
        if (top?.athlete) {
          leaders.push({
            category: cat.displayName || cat.name || 'Leader',
            athleteName: top.athlete.displayName || top.athlete.fullName || 'Player',
            displayValue: top.displayValue || '',
            teamLogo: top.team?.logo || top.team?.logos?.[0]?.href,
          });
        }
      }
    }

    const broadcasts: string[] = [];
    if (Array.isArray(competition?.broadcasts)) {
      for (const b of competition.broadcasts) {
        const name = b.media?.shortName || b.names?.[0] || b.name;
        if (name && !broadcasts.includes(name)) broadcasts.push(name);
      }
    }

    const boxScoreResponse: BoxScoreData = {
      eventId,
      sport,
      league,
      statusDetail,
      isCompleted,
      isLive,
      clock,
      period,
      venue: data.gameInfo?.venue?.fullName || competition?.venue?.fullName,
      attendance: data.gameInfo?.attendance
        ? Number(data.gameInfo.attendance).toLocaleString()
        : undefined,
      broadcasts,
      homeTeam: {
        id: homeComp?.team?.id || '',
        name: homeComp?.team?.displayName || homeComp?.team?.name || 'Home Team',
        abbreviation: homeComp?.team?.abbreviation,
        logo:
          homeComp?.team?.logos?.[0]?.href ||
          homeComp?.team?.logo ||
          `https://a.espncdn.com/i/teamlogos/${sport}/500/${homeComp?.team?.id}.png`,
        score:
          homeComp?.score?.displayValue ??
          (homeComp?.score ? String(homeComp.score) : undefined),
        record: homeComp?.record?.[0]?.displayValue || homeComp?.records?.[0]?.summary,
        winner: homeComp?.winner === true,
        linescores: homeLinescores,
      },
      awayTeam: {
        id: awayComp?.team?.id || '',
        name: awayComp?.team?.displayName || awayComp?.team?.name || 'Away Team',
        abbreviation: awayComp?.team?.abbreviation,
        logo:
          awayComp?.team?.logos?.[0]?.href ||
          awayComp?.team?.logo ||
          `https://a.espncdn.com/i/teamlogos/${sport}/500/${awayComp?.team?.id}.png`,
        score:
          awayComp?.score?.displayValue ??
          (awayComp?.score ? String(awayComp.score) : undefined),
        record: awayComp?.record?.[0]?.displayValue || awayComp?.records?.[0]?.summary,
        winner: awayComp?.winner === true,
        linescores: awayLinescores,
      },
      stats,
      leaders,
    };

    return NextResponse.json(boxScoreResponse);
  } catch (error: any) {
    console.error('Error fetching box score from ESPN:', error);
    return NextResponse.json(
      { error: 'Failed to fetch box score', details: error?.message },
      { status: 500 },
    );
  }
}

