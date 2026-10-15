import { NextRequest, NextResponse } from 'next/server';
import { getTopLeagueGames } from '@/lib/sportsApi';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const league = searchParams.get('league') || 'all';
    const limitStr = searchParams.get('limit');
    const limit = limitStr ? parseInt(limitStr, 10) : 50;

    const games = await getTopLeagueGames({
      leagueFilter: league,
      daysAhead: 7,
      limit: isNaN(limit) ? 50 : Math.min(limit, 100),
    });

    return NextResponse.json(
      {
        games,
        total: games.length,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control':
            'public, max-age=180, s-maxage=180, stale-while-revalidate=300',
        },
      },
    );
  } catch (err: any) {
    console.error('API /api/top-games error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch top marquee games', games: [] },
      { status: 500 },
    );
  }
}

