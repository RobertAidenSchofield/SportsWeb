import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';
import { getUpcomingTeamFixtures } from '@/lib/sportsApi';
import { MatchFixture, Team } from '@/lib/types';
import { formatInTimeZone } from 'date-fns-tz';
import {
  Calendar,
  Clock,
  Tv,
  Trophy,
  ExternalLink,
  Share2,
  CalendarDays,
  Sparkles,
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
    title: 'Live Sports Schedule | Sports Digest',
    description: `Upcoming sports matchups and broadcast schedule for user ${userId.slice(
      0,
      8
    )}`,
  };
}

export default async function SharePage({ params, searchParams }: PageProps) {
  const { userId } = await params;
  const { embed } = await searchParams;
  const isEmbed = embed === 'true';

  if (!userId) {
    notFound();
  }

  const adminClient = getSupabaseAdminClient();

  // 1. Fetch user profile
  const { data: profile } = await adminClient
    .from('profiles')
    .select('email, timezone')
    .eq('id', userId)
    .single();

  const userTimezone = profile?.timezone || 'America/New_York';

  // 2. Fetch followed teams
  const { data: subscriptions, error } = await adminClient
    .from('user_subscriptions')
    .select('team_id, teams(id, name, sport, league, logo_url)')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching subscriptions for share page:', error);
  }

  const teams: Team[] = (subscriptions || [])
    .map((s: any) => s.teams)
    .filter((t: any): t is Team => Boolean(t));

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

  // Deduplicate matches
  const seenIds = new Set<string>();
  for (const f of flattened) {
    if (!seenIds.has(f.id)) {
      seenIds.add(f.id);
      allFixtures.push(f);
    }
  }

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
      <div className="min-h-screen bg-[#0b0f17] text-white p-4 font-sans antialiased selection:bg-emerald-500 selection:text-black">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Compact Embed Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="rounded bg-emerald-500/10 p-1 text-emerald-400 border border-emerald-500/20">
                <Trophy className="h-4 w-4" />
              </span>
              <span className="text-sm font-bold text-white tracking-tight">
                Live Sports Schedule
              </span>
            </div>
            <a
              href={`/share/${userId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              Open Full View <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {allFixtures.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs border border-white/10 rounded-xl bg-white/[0.02]">
              No upcoming games in the next 14 days.
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(grouped).map(([dateLabel, dayFixtures]) => (
                <div key={dateLabel} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      {dateLabel}
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {dayFixtures.map((fixture) => {
                      let formattedTime = 'TBD';
                      try {
                        formattedTime = formatInTimeZone(
                          new Date(fixture.dateUtc),
                          userTimezone,
                          'h:mm a zzz'
                        );
                      } catch {
                        formattedTime = new Date(
                          fixture.dateUtc
                        ).toLocaleTimeString();
                      }

                      return (
                        <div
                          key={`${fixture.id}-${fixture.teamId}`}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5 gap-2"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {fixture.teamLogo && (
                              <Image
                                src={fixture.teamLogo}
                                alt={fixture.teamName}
                                width={24}
                                height={24}
                                className="object-contain shrink-0"
                                unoptimized
                              />
                            )}
                            <span className="text-xs font-semibold text-white truncate">
                              {fixture.teamName}
                            </span>
                            <span className="text-[11px] text-gray-500 font-medium">
                              {fixture.isHome ? 'vs' : '@'}
                            </span>
                            <span className="text-xs text-gray-300 truncate">
                              {fixture.opponentName}
                            </span>
                            {fixture.opponentLogo && (
                              <Image
                                src={fixture.opponentLogo}
                                alt={fixture.opponentName}
                                width={24}
                                height={24}
                                className="object-contain shrink-0"
                                unoptimized
                              />
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0 text-[11px] text-gray-400">
                            <span className="text-emerald-400 font-medium flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formattedTime}
                            </span>
                            {fixture.broadcast && (
                              <span className="flex items-center gap-1 text-gray-300 font-semibold">
                                <Tv className="h-3 w-3 text-gray-400" />
                                {fixture.broadcast}
                              </span>
                            )}
                            <span className="text-[10px] uppercase bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                              {fixture.league}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 text-xs font-semibold transition-all"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Subscribe Feed (.ics)</span>
            </a>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-all"
            >
              <span>Build Your Own</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* Hero Header */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-emerald-950/20 via-black/40 to-blue-950/20 p-6 sm:p-8 relative overflow-hidden">
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="h-3.5 w-3.5" />
              Public Team Schedule Feed
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Upcoming Match Schedule
            </h1>
            <p className="text-sm sm:text-base text-gray-300 max-w-2xl">
              Live broadcast times and match details for {teams.length}{' '}
              {teams.length === 1 ? 'team' : 'teams'} over the next 14 days,
              synchronized with ESPN. Times shown in{' '}
              <span className="font-semibold text-emerald-400">
                {userTimezone}
              </span>
              .
            </p>

            {/* Followed Teams Pill List */}
            {teams.length > 0 && (
              <div className="pt-3 flex flex-wrap gap-2">
                {teams.map((t) => (
                  <div
                    key={t.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-gray-200"
                  >
                    {t.logo_url && (
                      <Image
                        src={t.logo_url}
                        alt={t.name}
                        width={18}
                        height={18}
                        className="object-contain"
                        unoptimized
                      />
                    )}
                    <span>{t.name}</span>
                    <span className="text-[10px] text-gray-400 uppercase">
                      ({t.league})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Fixtures Schedule */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-emerald-400" />
              <span>Upcoming Matches (Next 14 Days)</span>
            </h2>
            <span className="text-xs text-gray-400">
              {allFixtures.length}{' '}
              {allFixtures.length === 1 ? 'game scheduled' : 'games scheduled'}
            </span>
          </div>

          {allFixtures.length === 0 ? (
            <div className="rounded-2xl border border-white/10 p-12 text-center bg-white/[0.02]">
              <Calendar className="mx-auto h-10 w-10 text-gray-500/60 mb-3" />
              <p className="text-base font-semibold text-white">
                No upcoming games scheduled
              </p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                These teams currently have no matchups scheduled over the next two
                weeks or are in off-season.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(grouped).map(([dateLabel, dayFixtures]) => (
                <div key={dateLabel} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      {dateLabel}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dayFixtures.map((fixture) => {
                      let formattedTime = 'TBD';
                      try {
                        formattedTime = formatInTimeZone(
                          new Date(fixture.dateUtc),
                          userTimezone,
                          'h:mm a zzz'
                        );
                      } catch {
                        formattedTime = new Date(
                          fixture.dateUtc
                        ).toLocaleTimeString();
                      }

                      return (
                        <div
                          key={`${fixture.id}-${fixture.teamId}`}
                          className="flex flex-col justify-between p-5 rounded-2xl border border-white/10 bg-white/[0.03] hover:border-white/20 transition-all shadow-md"
                        >
                          <div className="flex items-center justify-between gap-4">
                            {/* Team 1 */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {fixture.teamLogo && (
                                <div className="relative h-9 w-9 shrink-0 rounded-lg bg-white/5 p-1 flex items-center justify-center">
                                  <Image
                                    src={fixture.teamLogo}
                                    alt={fixture.teamName}
                                    width={32}
                                    height={32}
                                    className="object-contain"
                                    unoptimized
                                  />
                                </div>
                              )}
                              <span className="text-sm font-semibold text-white truncate">
                                {fixture.teamName}
                              </span>
                            </div>

                            <span className="text-xs font-bold text-gray-500 uppercase px-2 py-0.5 rounded bg-white/5">
                              {fixture.isHome ? 'vs' : '@'}
                            </span>

                            {/* Team 2 */}
                            <div className="flex items-center justify-end gap-3 min-w-0 flex-1 text-right">
                              <span className="text-sm font-semibold text-gray-300 truncate">
                                {fixture.opponentName}
                              </span>
                              {fixture.opponentLogo && (
                                <div className="relative h-9 w-9 shrink-0 rounded-lg bg-white/5 p-1 flex items-center justify-center">
                                  <Image
                                    src={fixture.opponentLogo}
                                    alt={fixture.opponentName}
                                    width={32}
                                    height={32}
                                    className="object-contain"
                                    unoptimized
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
                            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{formattedTime}</span>
                            </div>

                            <div className="flex items-center gap-3">
                              {fixture.broadcast && (
                                <div className="flex items-center gap-1.5 text-gray-200">
                                  <Tv className="h-3.5 w-3.5 text-gray-400" />
                                  <span className="font-semibold">
                                    {fixture.broadcast}
                                  </span>
                                </div>
                              )}
                              <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-gray-400 border border-white/5 uppercase">
                                {fixture.league}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Footer CTA */}
        <div className="pt-10 border-t border-white/10 text-center space-y-3">
          <p className="text-sm text-gray-400">
            Want your own personalized sports email digest, live calendar sync, and widgets?
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

