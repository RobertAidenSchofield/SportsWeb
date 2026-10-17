import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseAdminClient, isBackendConfigured } from '@/lib/supabaseClient';
import { getUpcomingTeamFixtures } from '@/lib/sportsApi';
import { MatchFixture, Team, MarqueeGame, marqueeToMatchFixture } from '@/lib/types';
import { getDemoPinnedGames } from '@/app/actions';
import { ShareScheduleView } from '@/components/ShareScheduleView';
import { formatInTimeZone } from 'date-fns-tz';
import {
  Calendar,
  Clock,
  Tv,
  Trophy,
  ExternalLink,
  Share2,
  CalendarDays,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ embed?: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { userId } = await params;
  return {
    title: 'Weekly Match Schedule | Sports Digest',
    description: `Upcoming sports matchups and live scores`,
  };
}

export default async function SharePage({ params, searchParams }: PageProps) {
  const { userId } = await params;
  const { embed } = await searchParams;
  const isEmbed = embed === 'true';

  if (!userId) {
    notFound();
  }

  const isDemo = userId === 'demo_user' || !isBackendConfigured();
  let userTimezone = 'America/New_York';
  let teams: Team[] = [];
  const pinnedGames: MarqueeGame[] = [];

  if (isDemo) {
    teams = [
      {
        id: 'espn:football:nfl:12',
        name: 'Kansas City Chiefs',
        sport: 'football',
        league: 'NFL',
        logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png',
      },
      {
        id: 'espn:soccer:eng.1:359',
        name: 'Arsenal',
        sport: 'soccer',
        league: 'Premier League',
        logo_url: 'https://a.espncdn.com/i/teamlogos/soccer/500/359.png',
      },
    ];
    pinnedGames.push(...(await getDemoPinnedGames()));
  } else {
    try {
      const adminClient = getSupabaseAdminClient();

      // 1. Fetch user profile
      const { data: profile } = await adminClient
        .from('profiles')
        .select('email, timezone')
        .eq('id', userId)
        .single();

      if (profile?.timezone) {
        userTimezone = profile.timezone;
      }

      // 2. Fetch user subscriptions (both followed teams and fallback pinned games)
      const { data: subscriptions, error } = await adminClient
        .from('user_subscriptions')
        .select('team_id, teams(id, name, sport, league, logo_url)')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching subscriptions for share page:', error);
      }

      // Filter out 'game:' entries so they don't pollute followed teams
      teams = (subscriptions || [])
        .filter((s: any) => !s.team_id?.startsWith('game:') && Boolean(s.teams))
        .map(
          (s: any) =>
            (Array.isArray(s.teams) ? s.teams[0] : s.teams) as Team,
        );

      // 3. Try primary pinned games table
      let fetchedPinned = false;
      try {
        const { data: pinnedRows, error: pinErr } = await adminClient
          .from('user_pinned_games')
          .select('game_id, game_data')
          .eq('user_id', userId);

        if (!pinErr && pinnedRows && pinnedRows.length > 0) {
          for (const r of pinnedRows) {
            if (r.game_data) pinnedGames.push(r.game_data as MarqueeGame);
          }
          fetchedPinned = true;
        }
      } catch (err) {
        // Table not present or query failed
      }

      // 4. Resilient Fallback: check user_subscriptions with 'game:' prefix
      if (!fetchedPinned) {
        const fallbackGameSubs = (subscriptions || []).filter((s: any) =>
          s.team_id?.startsWith('game:')
        );
        for (const sub of fallbackGameSubs) {
          const teamObj: any = Array.isArray(sub.teams)
            ? sub.teams[0]
            : sub.teams;
          if (teamObj?.name) {
            try {
              const parsed = JSON.parse(teamObj.name) as MarqueeGame;
              pinnedGames.push(parsed);
            } catch {}
          }
        }
      }

      // Merge demo pinned games if demo user
      if (userId === 'demo_user' && pinnedGames.length === 0) {
        pinnedGames.push(...(await getDemoPinnedGames()));
      }
    } catch (err) {
      console.error('Error loading data for share page:', err);
    }
  }

  // 3. Fetch fixtures for all teams
  const allFixtures: MatchFixture[] = [];
  const fixturePromises = teams.map(async (team) => {
    try {
      return await getUpcomingTeamFixtures(team.id, 14);
    } catch (e) {
      console.error(`Error loading fixtures for team ${team.id}:`, e);
      return [];
    }
  });

  const fixtureResults = await Promise.all(fixturePromises);
  const flattened = fixtureResults.flat();

  const getCleanEventId = (f: MatchFixture) =>
    f.eventId || (f.id.includes(':') ? f.id.split(':').pop()! : f.id);

  const fixtureMap = new Map<string, MatchFixture>();
  for (const f of flattened) {
    const key = getCleanEventId(f);
    fixtureMap.set(key, f);
  }

  // 3b. Merge individually pinned games within 14-day schedule window (look back 7 days for current week scores)
  const nowMs = Date.now() - 7 * 24 * 3600 * 1000;
  const maxMs = Date.now() + 14 * 24 * 3600 * 1000;

  for (const pg of pinnedGames) {
    const converted = marqueeToMatchFixture(pg);
    converted.isPinned = true;
    const gameTime = new Date(converted.dateUtc).getTime();
    if (gameTime >= nowMs && gameTime <= maxMs) {
      const key = getCleanEventId(converted);
      if (fixtureMap.has(key)) {
        const existing = fixtureMap.get(key)!;
        existing.isPinned = true;
      } else {
        if (!converted.isLive && !converted.isCompleted && gameTime > Date.now()) {
          converted.teamScore = undefined;
          converted.opponentScore = undefined;
        } else if (
          gameTime <= Date.now() + 15 * 60 * 1000 ||
          converted.isLive ||
          converted.isCompleted ||
          (String(converted.teamScore) === '0' && String(converted.opponentScore) === '0')
        ) {
          try {
            const sumUrl = `https://site.api.espn.com/apis/site/v2/sports/${converted.sport}/${converted.league}/summary?event=${key}`;
            const sumRes = await fetch(sumUrl, { next: { revalidate: 15 } });
            if (sumRes.ok) {
              const sumData = await sumRes.json();
              const sumComp = sumData.header?.competitions?.[0];
              if (sumComp) {
                const homeC =
                  sumComp.competitors?.find((c: any) => c.homeAway === 'home') ||
                  sumComp.competitors?.[0];
                const awayC =
                  sumComp.competitors?.find((c: any) => c.homeAway === 'away') ||
                  sumComp.competitors?.[1];
                if (
                  homeC &&
                  awayC &&
                  (sumComp.status?.type?.state === 'in' ||
                    sumComp.status?.type?.completed)
                ) {
                  converted.teamScore =
                    homeC.score !== undefined ? String(homeC.score) : undefined;
                  converted.opponentScore =
                    awayC.score !== undefined ? String(awayC.score) : undefined;
                  converted.teamWinner = Boolean(homeC.winner);
                  converted.opponentWinner = Boolean(awayC.winner);
                  converted.isLive = sumComp.status?.type?.state === 'in';
                  converted.isCompleted = Boolean(sumComp.status?.type?.completed);
                  converted.statusDetail =
                    sumComp.status?.type?.detail ||
                    sumComp.status?.type?.description;
                }
              }
            }
          } catch {}
        }
        fixtureMap.set(key, converted);
      }
    }
  }

  allFixtures.push(...Array.from(fixtureMap.values()));

  // Sort by kickoff date
  allFixtures.sort(
    (a, b) => new Date(a.dateUtc).getTime() - new Date(b.dateUtc).getTime()
  );

  // Group by date in timezone
  const grouped: Record<string, MatchFixture[]> = {};
  for (const f of allFixtures) {
    try {
      const dateKey = formatInTimeZone(
        new Date(f.dateUtc),
        userTimezone,
        'EEEE, MMMM d'
      );
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(f);
    } catch {
      const fallbackKey = 'Upcoming';
      if (!grouped[fallbackKey]) grouped[fallbackKey] = [];
      grouped[fallbackKey].push(f);
    }
  }

  const calendarFeedUrl = `/api/calendar/${userId}`;

  // Embed Mode View
  if (isEmbed) {
    return (
      <div className="min-h-screen bg-[#0b0f17] text-white p-3 sm:p-4 font-sans antialiased selection:bg-emerald-500 selection:text-black">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Compact Embed Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-400 border border-emerald-500/20">
                <Trophy className="h-4 w-4" />
              </span>
              <span className="text-sm font-bold text-white tracking-tight">
                Weekly Match Schedule
              </span>
            </div>
            <a
              href={`/share/${userId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <span>Open Full View</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <ShareScheduleView
            fixtures={allFixtures}
            userTimezone={userTimezone}
            userId={userId}
            teams={teams}
            pinnedGames={pinnedGames}
            isEmbed={true}
          />
        </div>
      </div>
    );
  }

  // Full Public Page View
  return (
    <div className="min-h-screen bg-[#07090e] text-white">
      {/* Top Navbar */}
      <nav className="border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-white hover:text-emerald-400 transition-colors"
          >
            <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Trophy className="h-5 w-5" />
            </span>
            <span className="tracking-tight text-lg">Sports Digest</span>
          </Link>

          <div className="flex items-center gap-3">
            <a
              href={calendarFeedUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 text-xs font-semibold transition-all"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Subscribe Feed (.ics)</span>
            </a>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-all"
            >
              <span>Build Your Own</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        {/* Header */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-emerald-950/20 via-black/40 to-blue-950/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
            Weekly Match Schedule
          </h1>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>
              Times in <strong className="text-gray-200">{userTimezone}</strong>
            </span>
            <span className="hidden sm:inline text-gray-600">•</span>
            <span className="hidden sm:inline">⭐ Bookmark for quick access</span>
          </div>
        </div>

        {/* Fixtures Schedule with Box Scores */}
        <section className="space-y-4">
          <ShareScheduleView
            fixtures={allFixtures}
            userTimezone={userTimezone}
            userId={userId}
            teams={teams}
            pinnedGames={pinnedGames}
            isEmbed={false}
          />
        </section>

        {/* Footer CTA */}
        <div className="pt-10 border-t border-white/10 text-center space-y-3">
          <p className="text-sm text-gray-400">
            Want your own personalized sports schedule, email digest, and live calendar sync?
          </p>
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition-all"
            >
              Get Started with Sports Digest
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

