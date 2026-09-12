'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Calendar, Tv, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { MatchFixture, Team } from '@/lib/types';
import { formatInTimeZone } from 'date-fns-tz';

interface SchedulePreviewProps {
  teams: Team[];
  userTimezone: string;
}

export function SchedulePreview({ teams, userTimezone }: SchedulePreviewProps) {
  const [fixtures, setFixtures] = useState<MatchFixture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function loadSchedule() {
      if (teams.length === 0) {
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
          // Flatten and sort by kickoff date
          const all = nested.flat();
          all.sort(
            (a, b) =>
              new Date(a.dateUtc).getTime() - new Date(b.dateUtc).getTime(),
          );
          setFixtures(all);
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
  }, [teams]);

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

  if (teams.length === 0) {
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
          Your followed teams do not have scheduled games this week, or they are
          in the off-season.
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

              return (
                <div
                  key={`${fixture.id}-${fixture.teamId}`}
                  className='flex flex-col justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 transition-all'
                >
                  <div className='flex items-center justify-between gap-4'>
                    {/* Team 1 (Followed) */}
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

                    {/* Team 2 (Opponent) */}
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
                  <div className='mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400'>
                    <div className='flex items-center gap-1.5 text-emerald-400 font-medium'>
                      <Clock className='h-3.5 w-3.5' />
                      <span>{formattedTime}</span>
                    </div>

                    <div className='flex items-center gap-3'>
                      {fixture.broadcast && (
                        <div className='flex items-center gap-1 text-gray-300'>
                          <Tv className='h-3.5 w-3.5 text-gray-400' />
                          <span className='font-semibold'>
                            {fixture.broadcast}
                          </span>
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

