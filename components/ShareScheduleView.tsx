'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Calendar,
  Tv,
  Clock,
  Pin,
  BarChart2,
  CheckCircle2,
  Bookmark,
  Share2,
  Copy,
  Check,
  ExternalLink,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import { MatchFixture, Team, MarqueeGame } from '@/lib/types';
import { formatInTimeZone } from 'date-fns-tz';
import { BoxScoreModal } from './BoxScoreModal';

interface ShareScheduleViewProps {
  fixtures: MatchFixture[];
  userTimezone: string;
  userId: string;
  teams: Team[];
  pinnedGames?: MarqueeGame[];
  isEmbed?: boolean;
}

export function ShareScheduleView({
  fixtures,
  userTimezone,
  userId,
  teams,
  pinnedGames = [],
  isEmbed = false,
}: ShareScheduleViewProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'upcoming' | 'final'>('all');
  const [selectedBoxScore, setSelectedBoxScore] = useState<{
    eventId: string;
    sport: string;
    league: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const copyShareLink = async () => {
    try {
      const url =
        typeof window !== 'undefined'
          ? window.location.href.split('?')[0]
          : `/share/${userId}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const finalCount = useMemo(
    () =>
      fixtures.filter(
        (f) =>
          f.isCompleted ||
          (f.teamScore !== undefined && f.opponentScore !== undefined),
      ).length,
    [fixtures],
  );

  const upcomingCount = fixtures.length - finalCount;

  const filteredFixtures = useMemo(() => {
    if (filterMode === 'all') return fixtures;
    if (filterMode === 'final') {
      return fixtures.filter(
        (f) =>
          f.isCompleted ||
          (f.teamScore !== undefined && f.opponentScore !== undefined),
      );
    }
    if (filterMode === 'upcoming') {
      return fixtures.filter(
        (f) =>
          !f.isCompleted &&
          (f.teamScore === undefined || f.isLive),
      );
    }
    return fixtures;
  }, [fixtures, filterMode]);

  // Group by date in timezone
  const grouped = useMemo(() => {
    const map: Record<string, MatchFixture[]> = {};
    for (const f of filteredFixtures) {
      try {
        const dateKey = formatInTimeZone(
          new Date(f.dateUtc),
          userTimezone,
          'EEEE, MMMM d',
        );
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(f);
      } catch {
        const fallbackKey = 'Upcoming';
        if (!map[fallbackKey]) map[fallbackKey] = [];
        map[fallbackKey].push(f);
      }
    }
    return map;
  }, [filteredFixtures, userTimezone]);

  return (
    <div className='space-y-6'>
      {/* Quick Action & Filter Bar */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.03] border border-white/10 p-3 rounded-2xl backdrop-blur-sm'>
        {/* Filter Pills */}
        <div className='flex items-center gap-1.5 flex-wrap'>
          <button
            type='button'
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterMode === 'all'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            All Games ({fixtures.length})
          </button>

          <button
            type='button'
            onClick={() => setFilterMode('upcoming')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterMode === 'upcoming'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            Upcoming ({upcomingCount})
          </button>

          <button
            type='button'
            onClick={() => setFilterMode('final')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterMode === 'final'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <BarChart2 className='h-3.5 w-3.5' />
            <span>Scores & Box Scores ({finalCount})</span>
          </button>
        </div>

        {/* Bookmark & Copy Actions */}
        {!isEmbed && (
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={copyShareLink}
              className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all'
              title='Copy link to bookmark or share'
            >
              {copied ? (
                <>
                  <Check className='h-3.5 w-3.5 text-emerald-400' />
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <Bookmark className='h-3.5 w-3.5 text-emerald-400' />
                  <span>Bookmark / Share Link</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Fixtures List */}
      {fixtures.length === 0 ? (
        <div className='rounded-3xl border border-white/10 p-10 text-center bg-white/[0.02] space-y-2'>
          <Calendar className='mx-auto h-8 w-8 text-gray-500/60 mb-2' />
          <p className='text-sm font-semibold text-white'>
            No upcoming games scheduled
          </p>
          <p className='text-xs text-gray-400 max-w-sm mx-auto'>
            These teams have no games scheduled in the current window or are
            in off-season.
          </p>
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className='rounded-2xl border border-white/10 p-8 text-center bg-white/[0.02]'>
          <p className='text-sm text-gray-400 font-medium'>
            No games found for the selected filter ({filterMode}).
          </p>
        </div>
      ) : (
        <div className='space-y-7'>
          {Object.entries(grouped).map(([dateLabel, dayFixtures]) => (
            <div key={dateLabel} className='space-y-3'>
              <div className='flex items-center gap-2 px-1'>
                <span className='h-2 w-2 rounded-full bg-emerald-400' />
                <h3 className='text-xs font-bold uppercase tracking-wider text-gray-300'>
                  {dateLabel}
                </h3>
              </div>

              <div
                className={`grid gap-3.5 ${
                  isEmbed
                    ? 'grid-cols-1'
                    : 'grid-cols-1 md:grid-cols-2'
                }`}
              >
                {dayFixtures.map((fixture) => {
                  let formattedTime = 'TBD';
                  try {
                    formattedTime = formatInTimeZone(
                      new Date(fixture.dateUtc),
                      userTimezone,
                      'h:mm a zzz',
                    );
                  } catch {
                    formattedTime = new Date(
                      fixture.dateUtc,
                    ).toLocaleTimeString();
                  }

                  const hasScore =
                    fixture.teamScore !== undefined &&
                    fixture.opponentScore !== undefined;

                  return (
                    <div
                      key={`${fixture.id}-${fixture.teamId}`}
                      className={`flex flex-col justify-between p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                        fixture.isPinned
                          ? 'border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-white/[0.03] to-transparent shadow-sm'
                          : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                      }`}
                    >
                      {/* Card Header */}
                      <div className='flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/5 text-xs'>
                        <div className='flex items-center gap-2 flex-wrap'>
                          <span className='rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider'>
                            {fixture.league}
                          </span>

                          {fixture.isLive ? (
                            <span className='inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30'>
                              <span className='h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse' />
                              <span>
                                LIVE{' '}
                                {fixture.statusDetail
                                  ? `• ${fixture.statusDetail}`
                                  : ''}
                              </span>
                            </span>
                          ) : fixture.isCompleted ? (
                            <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'>
                              <CheckCircle2 className='h-3 w-3 text-emerald-400' />
                              <span>{fixture.statusDetail || 'FINAL'}</span>
                            </span>
                          ) : (
                            <span className='inline-flex items-center gap-1 text-[11px] text-gray-400 font-medium'>
                              <Clock className='h-3 w-3 text-gray-500' />
                              <span>{formattedTime}</span>
                            </span>
                          )}

                          {fixture.isPinned && (
                            <span className='inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/25'>
                              <Pin className='h-2.5 w-2.5 rotate-45' />
                              <span>Pinned</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Matchup & Scores */}
                      <div className='space-y-2.5 py-1'>
                        {/* Team 1 */}
                        <div className='flex items-center justify-between gap-3'>
                          <div className='flex items-center gap-2.5 min-w-0 flex-1'>
                            {fixture.teamLogo && (
                              <div className='relative h-7 w-7 shrink-0 rounded-lg bg-white/5 p-1 border border-white/10 flex items-center justify-center'>
                                <Image
                                  src={fixture.teamLogo}
                                  alt={fixture.teamName}
                                  width={24}
                                  height={24}
                                  className='object-contain'
                                  unoptimized
                                />
                              </div>
                            )}
                            <span
                              className={`text-sm truncate ${
                                fixture.teamWinner
                                  ? 'font-black text-emerald-300'
                                  : 'font-semibold text-white'
                              }`}
                            >
                              {fixture.teamName}
                            </span>
                          </div>

                          {fixture.teamScore !== undefined ? (
                            <span
                              className={`text-base font-black font-mono shrink-0 px-2 py-0.5 rounded-lg ${
                                fixture.teamWinner
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'text-gray-300 bg-white/5'
                              }`}
                            >
                              {fixture.teamScore}
                            </span>
                          ) : (
                            <span className='text-xs font-semibold text-gray-500 uppercase'>
                              {fixture.isHome ? 'Home' : 'Away'}
                            </span>
                          )}
                        </div>

                        {/* Team 2 */}
                        <div className='flex items-center justify-between gap-3'>
                          <div className='flex items-center gap-2.5 min-w-0 flex-1'>
                            {fixture.opponentLogo && (
                              <div className='relative h-7 w-7 shrink-0 rounded-lg bg-white/5 p-1 border border-white/10 flex items-center justify-center'>
                                <Image
                                  src={fixture.opponentLogo}
                                  alt={fixture.opponentName}
                                  width={24}
                                  height={24}
                                  className='object-contain'
                                  unoptimized
                                />
                              </div>
                            )}
                            <span
                              className={`text-sm truncate ${
                                fixture.opponentWinner
                                  ? 'font-black text-emerald-300'
                                  : 'font-semibold text-gray-300'
                              }`}
                            >
                              {fixture.opponentName}
                            </span>
                          </div>

                          {fixture.opponentScore !== undefined ? (
                            <span
                              className={`text-base font-black font-mono shrink-0 px-2 py-0.5 rounded-lg ${
                                fixture.opponentWinner
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'text-gray-300 bg-white/5'
                              }`}
                            >
                              {fixture.opponentScore}
                            </span>
                          ) : (
                            <span className='text-xs font-semibold text-gray-500 uppercase'>
                              {fixture.isHome ? 'Away' : 'Home'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Footer: Broadcast, Odds, and Box Score Button */}
                      <div className='mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs'>
                        <div className='flex items-center gap-2 flex-wrap'>
                          {fixture.broadcast ? (
                            <span className='inline-flex items-center gap-1 text-cyan-300 font-semibold bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded-md text-[11px]'>
                              <Tv className='h-3 w-3 text-cyan-400' />
                              <span>{fixture.broadcast}</span>
                            </span>
                          ) : (
                            <span className='text-[11px] text-gray-500'>
                              {hasScore ? 'Finished' : 'TV TBA'}
                            </span>
                          )}

                          {fixture.oddsDetails && (
                            <span className='text-[10px] font-mono text-cyan-300/80 bg-cyan-950/30 px-1.5 py-0.5 rounded border border-cyan-500/20'>
                              {fixture.oddsDetails}
                            </span>
                          )}
                        </div>

                        {/* Interactive Box Score Trigger Button */}
                        <button
                          type='button'
                          onClick={() =>
                            setSelectedBoxScore({
                              eventId: fixture.eventId || fixture.id,
                              sport: fixture.sport,
                              league: fixture.league,
                            })
                          }
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                            hasScore || fixture.isLive
                              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-sm'
                              : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10'
                          }`}
                          title='Open game linescore and box score statistics'
                        >
                          <BarChart2 className='h-3.5 w-3.5 text-emerald-400' />
                          <span>Box Score</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Box Score Modal */}
      {selectedBoxScore && (
        <BoxScoreModal
          isOpen={Boolean(selectedBoxScore)}
          onClose={() => setSelectedBoxScore(null)}
          eventId={selectedBoxScore.eventId}
          sport={selectedBoxScore.sport}
          league={selectedBoxScore.league}
        />
      )}
    </div>
  );
}

