import { NextRequest, NextResponse } from 'next/server';
import { searchTeams, getUpcomingTeamFixtures } from '@/lib/sportsApi';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') || '';
  const league = searchParams.get('league') || 'all';
  const scheduleTeamId = searchParams.get('scheduleTeamId');

  try {
    if (scheduleTeamId) {
      const fixtures = await getUpcomingTeamFixtures(scheduleTeamId, 7);
      return NextResponse.json({ fixtures });
    }

    const teams = await searchTeams(query, league);
    return NextResponse.json({ teams });
  } catch (error: any) {
    console.error('Error in teams API route:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error.message },
      { status: 500 },
    );
  }
}

