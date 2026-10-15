import { NextRequest, NextResponse } from 'next/server';
import { getTopLeagueGames } from '@/lib/sportsApi';

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const league = searchParams.get('league') || 'all';
    const limit = 35;

    const games = await getTopLeagueGames({
      leagueFilter: league,
      daysAhead: 10,
      limit,
    });

    const nowStr = formatToIcsDate(new Date());
    const calName =
      league === 'all'
        ? 'Sports Digest - Top Games of the Week'
        : `Sports Digest - Top ${league.toUpperCase()} Games`;

    const icsLines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Sports Digest//Top Marquee Sports Games//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${escapeIcsText(calName)}`,
      'X-WR-CALDESC:Curated high-stakes marquee matchups across sports leagues with broadcast TV networks and excitement ratings',
      'X-PUBLISHED-TTL:PT1H',
      'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    ];

    for (const g of games) {
      const startDate = new Date(g.dateUtc);
      // Default duration: 3.5 hours for football, 2.5 hours for basketball/hockey/soccer
      const durationHours = g.sport === 'football' ? 3.5 : 2.5;
      const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);

      const rankAway = g.awayTeam.rank ? `#${g.awayTeam.rank} ` : '';
      const rankHome = g.homeTeam.rank ? `#${g.homeTeam.rank} ` : '';
      const summary = `🔥 [${g.excitementScore}/100] ${rankAway}${g.awayTeam.name} @ ${rankHome}${g.homeTeam.name}`;

      const descriptionLines = [
        `🏆 ${g.league} • Marquee Score: ${g.excitementScore}/100 (${g.tier.toUpperCase()})`,
        g.highlightTags.length > 0 ? `Highlights: ${g.highlightTags.join(' • ')}` : null,
        g.broadcastSummary ? `📺 TV Broadcast: ${g.broadcastSummary}` : null,
        g.odds?.details ? `🎲 Odds / Spread: ${g.odds.details}` : null,
        g.venue ? `📍 Venue: ${g.venue}` : null,
        '',
        `Away: ${rankAway}${g.awayTeam.name}${g.awayTeam.record ? ` (${g.awayTeam.record})` : ''}`,
        `Home: ${rankHome}${g.homeTeam.name}${g.homeTeam.record ? ` (${g.homeTeam.record})` : ''}`,
        '',
        'Curated via Sports Digest (https://sportsdigest.app)',
      ].filter(Boolean);

      const location = [
        g.broadcastSummary ? `📺 TV: ${g.broadcastSummary}` : null,
        g.venue ? g.venue : null,
      ]
        .filter(Boolean)
        .join(' • ');

      icsLines.push('BEGIN:VEVENT');
      icsLines.push(`UID:marquee-${g.id}@sportsdigest.app`);
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
        'Content-Disposition': 'inline; filename="top-sports-games.ics"',
        'Cache-Control':
          'public, max-age=1800, s-maxage=1800, stale-while-revalidate=3600',
      },
    });
  } catch (err: any) {
    console.error('Top games calendar generation error:', err);
    return new NextResponse('Internal calendar error', { status: 500 });
  }
}
