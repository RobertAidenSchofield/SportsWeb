import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';
import { getUpcomingTeamFixtures } from '@/lib/sportsApi';
import { MatchFixture, MarqueeGame, marqueeToMatchFixture } from '@/lib/types';

export const dynamic = 'force-dynamic';

function formatToIcsDate(date: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  if (!userId) {
    return new NextResponse('User ID required', { status: 400 });
  }

  try {
    const adminClient = getSupabaseAdminClient();

    // 1. Fetch user's followed team subscriptions
    const { data: subscriptions, error } = await adminClient
      .from('user_subscriptions')
      .select('team_id, teams(name, sport, league)')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching subscriptions for calendar:', error);
      return new NextResponse('Database error', { status: 500 });
    }

    const teamIds = (subscriptions || []).map((s) => s.team_id);

    // 2. Query fixtures for all subscribed teams (next 14 days for calendar view)
    const allFixtures: MatchFixture[] = [];
    const fixturePromises = teamIds.map(async (teamId) => {
      try {
        return await getUpcomingTeamFixtures(teamId, 14);
      } catch (e) {
        console.error(`Error loading fixtures for team ${teamId}:`, e);
        return [];
      }
    });

    const results = await Promise.all(fixturePromises);
    const flattened = results.flat();

    // Deduplicate fixtures where user follows both teams
    const seenIds = new Set<string>();
    for (const f of flattened) {
      if (!seenIds.has(f.id)) {
        seenIds.add(f.id);
        allFixtures.push(f);
      }
    }

    // 3. Fetch individually pinned games for the user
    try {
      const { data: pinnedRows } = await adminClient
        .from('user_pinned_games')
        .select('game_id, game_data')
        .eq('user_id', userId);

      const pinnedGames: MarqueeGame[] = (pinnedRows || [])
        .map((r: any) => r.game_data)
        .filter(Boolean);

      const nowMs = Date.now() - 3.5 * 3600 * 1000;
      const maxMs = Date.now() + 14 * 24 * 3600 * 1000;

      for (const pg of pinnedGames) {
        const fixture = marqueeToMatchFixture(pg);
        const gameTime = new Date(fixture.dateUtc).getTime();
        if (gameTime >= nowMs && gameTime <= maxMs && !seenIds.has(fixture.id)) {
          seenIds.add(fixture.id);
          allFixtures.push(fixture);
        }
      }
    } catch (pinnedErr) {
      console.error('Error fetching pinned games for calendar:', pinnedErr);
    }

    // Sort all fixtures by kickoff date
    allFixtures.sort(
      (a, b) => new Date(a.dateUtc).getTime() - new Date(b.dateUtc).getTime(),
    );

    // 4. Build RFC 5545 iCalendar payload
    const nowStr = formatToIcsDate(new Date());
    const icsLines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Sports Digest//Personalized Sports Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Sports Digest Schedule',
      'X-WR-CALDESC:Upcoming sports schedule, pinned games, and broadcast channels',
      'X-PUBLISHED-TTL:PT1H',
      'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    ];

    for (const f of allFixtures) {
      const startDate = new Date(f.dateUtc);
      // Default match duration to 3 hours
      const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);

      const vs = f.isHome ? 'vs' : '@';
      const prefix = f.isPinned ? '📌 [Pinned] ' : '';
      const summary = `${prefix}${f.teamName} ${vs} ${f.opponentName}`;
      
      const descriptionLines = [
        `🏆 ${f.league} Match`,
        f.isPinned ? '⭐ Individually Pinned Game' : `Followed Team: ${f.teamName}`,
        f.broadcast ? `📺 TV: ${f.broadcast}` : null,
        f.oddsDetails ? `🎲 Odds: ${f.oddsDetails}` : null,
        f.venue ? `📍 Venue: ${f.venue}` : null,
        f.highlightTags && f.highlightTags.length > 0 ? `Tags: ${f.highlightTags.join(' • ')}` : null,
        '',
        'Synced via Sports Digest (https://sportsdigest.app)',
      ].filter(Boolean);

      const location = [
        f.broadcast ? `📺 TV: ${f.broadcast}` : null,
        f.venue ? f.venue : null,
      ]
        .filter(Boolean)
        .join(' • ');

      icsLines.push('BEGIN:VEVENT');
      icsLines.push(`UID:${f.id}-${f.teamId}@sportsdigest.app`);
      icsLines.push(`DTSTAMP:${nowStr}`);
      icsLines.push(`DTSTART:${formatToIcsDate(startDate)}`);
      icsLines.push(`DTEND:${formatToIcsDate(endDate)}`);
      icsLines.push(`SUMMARY:${escapeIcsText(summary)}`);
      icsLines.push(`DESCRIPTION:${escapeIcsText(descriptionLines.join('\n'))}`);
      if (location) {
        icsLines.push(`LOCATION:${escapeIcsText(location)}`);
      }
      icsLines.push('STATUS:CONFIRMED');
      icsLines.push('END:VEVENT');
    }

    icsLines.push('END:VCALENDAR');
    const icsContent = icsLines.join('\r\n');

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="sports-digest.ics"',
        'Cache-Control': 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=3600',
      },
    });
  } catch (err: any) {
    console.error('Calendar generation error:', err);
    return new NextResponse('Internal calendar error', { status: 500 });
  }
}

