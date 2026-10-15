'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Calendar, Tv, Clock, AlertCircle, Loader2, Pin, X } from 'lucide-react';
import { MatchFixture, Team, MarqueeGame, marqueeToMatchFixture } from '@/lib/types';
import { formatInTimeZone } from 'date-fns-tz';

interface SchedulePreviewProps {
  teams: Team[];
  userTimezone: string;
  pinnedGames?: MarqueeGame[];
  onUnpinGame?: (gameId: string) => void;
}

export function SchedulePreview({
  teams,
  userTimezone,
  pinnedGames = [],
  onUnpinGame,
}: SchedulePreviewProps) {
  const [fixtures, setFixtures] = useState<MatchFixture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function loadSchedule() {
      if (teams.length === 0 && pinnedGames.length === 0) {
        setFixtures([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const fixturePromises = teams.map(async (team) => {
          try {
            // Fetch upcoming fixtures from ESPN endpoint
            const res = await fetch(
              `/api/teams/search?scheduleTeamId=${encodeURIComponent(team.id)}`,
            );
            if (res.ok) {
              const data = await res.json();
              return (data.fixtures || []) as MatchFixture[];
            }
          } catch (e) {
            console.error(`Error loading schedule for ${team.name}:`, e);
          }
          return [] as MatchFixture[];
        });

        const nested = await Promise.all(fixturePromises);
        if (!isCancelled) {
          // Flatten followed teams fixtures
          const all = nested.flat();

          // Merge pinned individual games (next 7 days)
          const nowMs = Date.now() - 3.5 * 3600 * 1000;
          const maxMs = Date.now() + 7 * 24 * 3600 * 1000;
          const convertedPinned = pinnedGames
            .map(marqueeToMatchFixture)
            .filter((f) => {
              const t = new Date(f.dateUtc).getTime();
              return t >= nowMs && t <= maxMs;
            });

          // Deduplicate by game ID
          const seenIds = new Set<string>();
          const unified: MatchFixture[] = [];

          for (const f of [...convertedPinned, ...all]) {
            if (!seenIds.has(f.id)) {
              seenIds.add(f.id);
              unified.push(f);
            }
          }

          unified.sort(
            (a, b) =>
              new Date(a.dateUtc).getTime() - new Date(b.dateUtc).getTime(),
          );
          setFixtures(unified);
        }
      } catch (err) {
        console.error('Failed to load upcoming fixtures:', err);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadSchedule();

    return () => {
      isCancelled = true;
    };
  }, [teams, pinnedGames]);

  if (loading) {
    return (
      <div className='flex items-center justify-center p-12 rounded-2xl border border-white/10 bg-white/[0.02]'>
        <Loader2 className='h-6 w-6 animate-spin text-emerald-400 mr-2' />
        <span className='text-sm text-gray-400'>
          Loading upcoming fixtures...
        </span>
      </div>
    );
  }

  if (teams.length === 0 && pinnedGames.length === 0) {
    return null;
  }

  if (fixtures.length === 0) {
    return (
      <div className='rounded-2xl border border-white/10 p-6 text-center bg-white/[0.02]'>
        <Calendar className='mx-auto h-8 w-8 text-gray-500/60 mb-2' />
        <p className='text-sm font-medium text-white'>
          No upcoming games in the next 7 days
        </p>
        <p className='text-xs text-gray-400 mt-1'>
          Your followed teams and pinned matches do not have scheduled games this
          week, or they are in the off-season.
        </p>
      </div>
    );
  }

  // Group fixtures by formatted date in user's timezone
  const grouped: Record<string, MatchFixture[]> = {};
  for (const f of fixtures) {
    try {
      const dateKey = formatInTimeZone(
        new Date(f.dateUtc),
        userTimezone,
        'EEEE, MMMM d',
      );
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(f);
    } catch {
      const fallbackKey = 'Upcoming';
      if (!grouped[fallbackKey]) grouped[fallbackKey] = [];
      grouped[fallbackKey].push(f);
    }
  }

  return (
    <div className='space-y-6'>
      {Object.entries(grouped).map(([dateLabel, dayFixtures]) => (
        <div key={dateLabel} className='space-y-2.5'>
          <div className='flex items-center gap-2'>
            <span className='h-2 w-2 rounded-full bg-emerald-400' />
            <h4 className='text-xs font-semibold uppercase tracking-wider text-gray-400'>
              {dateLabel}
            </h4>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
            {dayFixtures.map((fixture) => {
              let formattedTime = 'TBD';
              try {
                formattedTime = formatInTimeZone(
                  new Date(fixture.dateUtc),
                  userTimezone,
                  'h:mm a zzz',
                );
              } catch (e) {
                formattedTime = new Date(fixture.dateUtc).toLocaleTimeString();
              }

              const isPinned = Boolean(fixture.isPinned);

              return (
                <div
                  key={`${fixture.id}-${fixture.teamId}`}
                  className={`flex flex-col justify-between p-4 rounded-xl border transition-all ${
                    isPinned
                      ? 'border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-white/[0.03] to-transparent shadow-sm'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  {/* Pinned Indicator Header */}
                  {isPinned && (
                    <div className='flex items-center justify-between pb-2 mb-2 border-b border-amber-500/15 text-[11px] font-semibold text-amber-300'>
                      <span className='inline-flex items-center gap-1'>
                        <Pin className='h-3 w-3 text-amber-400 rotate-45' />
                        <span>Pinned Game (Custom Added)</span>
                      </span>

                      {onUnpinGame && (
                        <button
                          type='button'
                          onClick={() => onUnpinGame(fixture.id)}
                          className='text-gray-400 hover:text-rose-300 p-0.5 rounded hover:bg-rose-500/10 transition-colors flex items-center gap-1 text-[10px]'
                          title='Remove from schedule'
                        >
                          <X className='h-3 w-3' />
                          <span>Unpin</span>
                        </button>
                      )}
                    </div>
                  )}

                  <div className='flex items-center justify-between gap-4'>
                    {/* Team 1 (Followed or Home) */}
                    <div className='flex items-center gap-2.5 min-w-0 flex-1'>
                      {fixture.teamLogo && (
                        <div className='relative h-7 w-7 shrink-0 rounded bg-white/5 p-0.5'>
                          <Image
                            src={fixture.teamLogo}
                            alt={fixture.teamName}
                            width={28}
                            height={28}
                            className='object-contain'
                            unoptimized
                          />
                        </div>
                      )}
                      <span className='text-sm font-semibold text-white truncate'>
                        {fixture.teamName}
                      </span>
                    </div>

                    <span className='text-xs font-semibold text-gray-500 shrink-0'>
                      {fixture.isHome ? 'vs' : '@'}
                    </span>

                    {/* Team 2 (Opponent or Away) */}
                    <div className='flex items-center justify-end gap-2.5 min-w-0 flex-1 text-right'>
                      <span className='text-sm font-semibold text-gray-300 truncate'>
                        {fixture.opponentName}
                      </span>
                      {fixture.opponentLogo && (
                        <div className='relative h-7 w-7 shrink-0 rounded bg-white/5 p-0.5'>
                          <Image
                            src={fixture.opponentLogo}
                            alt={fixture.opponentName}
                            width={28}
                            height={28}
                            className='object-contain'
                            unoptimized
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metadata Footer */}
                  <div className='mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400'>
                    <div className='flex items-center gap-1.5 text-emerald-400 font-medium shrink-0'>
                      <Clock className='h-3.5 w-3.5' />
                      <span>{formattedTime}</span>
                    </div>

                    <div className='flex items-center gap-2 flex-wrap'>
                      {fixture.oddsDetails && (
                        <span className='text-[10px] font-mono text-cyan-300/80 bg-cyan-950/30 px-1.5 py-0.5 rounded border border-cyan-500/20'>
                          {fixture.oddsDetails}
                        </span>
                      )}

                      {fixture.broadcast ? (
                        <div className='flex items-center gap-1.5 text-cyan-300 font-semibold bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded-md'>
                          <Tv className='h-3.5 w-3.5 text-cyan-400' />
                          <span>{fixture.broadcast}</span>
                        </div>
                      ) : (
                        <div className='flex items-center gap-1.5 text-gray-500 text-[11px]'>
                          <Tv className='h-3.5 w-3.5 text-gray-600' />
                          <span>TV TBA</span>
                        </div>
                      )}

                      <span className='rounded bg-white/5 px-2 py-0.5 text-[10px] text-gray-400 border border-white/5 uppercase'>
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
  );
}

