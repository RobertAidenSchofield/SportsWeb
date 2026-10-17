'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Calendar,
  Tv,
  Clock,
  Loader2,
  Pin,
  X,
  BarChart2,
  CheckCircle2,
  Flame,
  Filter,
  Share2,
  Bookmark,
} from 'lucide-react';
import {
  MatchFixture,
  Team,
  MarqueeGame,
  marqueeToMatchFixture,
} from '@/lib/types';
import { getLeagueDisplayName } from '@/lib/sportsApi';
import { formatInTimeZone } from 'date-fns-tz';
import { BoxScoreModal } from './BoxScoreModal';
import { ShareWeeklyModal } from './ShareWeeklyModal';

interface SchedulePreviewProps {
  teams: Team[];
  userTimezone: string;
  pinnedGames?: MarqueeGame[];
  onUnpinGame?: (gameId: string) => void;
  onExploreTopGames?: () => void;
  userId?: string;
}

export function SchedulePreview({
  teams,
  userTimezone,
  pinnedGames = [],
  onUnpinGame,
  onExploreTopGames,
  userId,
}: SchedulePreviewProps) {
  const [fixtures, setFixtures] = useState<MatchFixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'upcoming' | 'final'>('all');
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedBoxScore, setSelectedBoxScore] = useState<{
    eventId: string;
    sport: string;
    league: string;
  } | null>(null);

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
            // Fetch fixtures from ESPN endpoint (now includes current week games + upcoming 7 days)
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

          // Merge pinned individual games (past 7 days to 8 days ahead)
          const nowMs = Date.now() - 7 * 24 * 3600 * 1000;
          const maxMs = Date.now() + 8 * 24 * 3600 * 1000;
          const convertedPinned = pinnedGames
            .map(marqueeToMatchFixture)
            .filter((f) => {
              const t = new Date(f.dateUtc).getTime();
              return t >= nowMs && t <= maxMs;
            });

          const getCleanEventId = (f: MatchFixture) =>
            f.eventId || (f.id.includes(':') ? f.id.split(':').pop()! : f.id);

          // For any pinned game, ensure live/final games get real box scores, and scheduled games don't show 0-0
          const enrichedPinned = await Promise.all(
            convertedPinned.map(async (p) => {
              const startTime = new Date(p.dateUtc).getTime();
              const hasStarted = startTime <= Date.now() + 15 * 60 * 1000;
              if (
                hasStarted ||
                p.isLive ||
                p.isCompleted ||
                (String(p.teamScore) === '0' && String(p.opponentScore) === '0')
              ) {
                try {
                  const evId = getCleanEventId(p);
                  const bRes = await fetch(
                    `/api/boxscore?sport=${encodeURIComponent(p.sport)}&league=${encodeURIComponent(p.league)}&eventId=${encodeURIComponent(evId)}`,
                  );
                  if (bRes.ok) {
                    const bData = await bRes.json();
                    return {
                      ...p,
                      teamScore: bData.homeTeam?.score,
                      opponentScore: bData.awayTeam?.score,
                      teamWinner: bData.homeTeam?.winner,
                      opponentWinner: bData.awayTeam?.winner,
                      statusDetail: bData.statusDetail || p.statusDetail,
                      isCompleted: Boolean(bData.isCompleted),
                      isLive: Boolean(bData.isLive),
                    };
                  }
                } catch {
                  // ignore fallback error
                }
              }

              // If the game has not started and is not live/completed, clear any placeholder 0s
              if (!hasStarted && !p.isLive && !p.isCompleted) {
                return {
                  ...p,
                  teamScore: undefined,
                  opponentScore: undefined,
                };
              }

              return p;
            }),
          );

          if (isCancelled) return;

          // Deduplicate by clean event ID
          const fixtureMap = new Map<string, MatchFixture>();

          // Followed team fixtures take precedence for fresh schedule data
          for (const f of all) {
            const key = getCleanEventId(f);
            fixtureMap.set(key, f);
          }

          // Merge pinned games
          for (const p of enrichedPinned) {
            const key = getCleanEventId(p);
            if (fixtureMap.has(key)) {
              const existing = fixtureMap.get(key)!;
              existing.isPinned = true;
            } else {
              fixtureMap.set(key, p);
            }
          }

          const unified = Array.from(fixtureMap.values());
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

  // Filter fixtures based on mode (all vs upcoming vs final)
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

  // Group fixtures by formatted date in user's timezone
  const grouped = useMemo(() => {
    const map: Record<string, MatchFixture[]> = {};
    for (const f of filteredFixtures) {
      try {
        const dateKey = formatInTimeZone(
          new Date(f.dateUtc),
          userTimezone,
          'EEEE, MMMM d',
        );
        if (!map[dateKey]) {
          map[dateKey] = [];
        }
        map[dateKey].push(f);
      } catch {
        const fallbackKey = 'Upcoming';
        if (!map[fallbackKey]) map[fallbackKey] = [];
        map[fallbackKey].push(f);
      }
    }
    return map;
  }, [filteredFixtures, userTimezone]);

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

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center p-14 rounded-3xl border border-white/10 bg-white/[0.02] space-y-3'>
        <Loader2 className='h-7 w-7 animate-spin text-emerald-400' />
        <span className='text-sm text-gray-400 font-medium'>
          Syncing fixtures, live scores, and box scores for followed teams...
        </span>
      </div>
    );
  }

  if (teams.length === 0 && pinnedGames.length === 0) {
    return (
      <div className='rounded-3xl border border-dashed border-white/10 p-8 sm:p-10 text-center bg-white/[0.02] space-y-4'>
        <div className='mx-auto h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400'>
          <Calendar className='h-6 w-6' />
        </div>
        <div className='space-y-1.5 max-w-md mx-auto'>
          <h3 className='text-base font-bold text-white'>
            No Followed Teams or Pinned Games Yet
          </h3>
          <p className='text-xs text-gray-400 leading-relaxed'>
            Follow your favorite teams or pin individual marquee matchups to see
            their full weekly schedule with live scores and box scores right here.
          </p>
        </div>
        {onExploreTopGames && (
          <button
            type='button'
            onClick={onExploreTopGames}
            className='inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs transition-colors'
          >
            <Flame className='h-4 w-4 text-emerald-400' />
            <span>Browse Marquee Matchups</span>
          </button>
        )}
      </div>
    );
  }

  if (fixtures.length === 0) {
    return (
      <div className='rounded-3xl border border-white/10 p-8 text-center bg-white/[0.02] space-y-2'>
        <Calendar className='mx-auto h-8 w-8 text-gray-500/60 mb-2' />
        <p className='text-sm font-semibold text-white'>
          No Games Scheduled This Week
        </p>
        <p className='text-xs text-gray-400 max-w-md mx-auto'>
          Your followed teams do not have scheduled games this week, or they are
          currently in their off-season.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-4 sm:space-y-5'>
      {/* Schedule Controls Header & Filter Pills */}
      <div className='flex flex-wrap items-center justify-between gap-2 bg-white/[0.02] border border-white/10 p-2 sm:p-2.5 rounded-xl'>
        <div className='flex items-center gap-1.5 flex-wrap'>
          <button
            type='button'
            onClick={() => setFilterMode('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              filterMode === 'all'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            All Week ({fixtures.length})
          </button>

          <button
            type='button'
            onClick={() => setFilterMode('upcoming')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
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
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterMode === 'final'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <BarChart2 className='h-3 w-3 text-emerald-400' />
            <span>Scores & Box Scores ({finalCount})</span>
          </button>
        </div>

        <div className='flex items-center gap-2 flex-wrap'>
          {userId && (
            <button
              type='button'
              onClick={() => setShowShareModal(true)}
              className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all shadow-sm'
              title='Share this weekly view or bookmark it for quick access'
            >
              <Share2 className='h-3 w-3 text-emerald-400' />
              <span>Share View</span>
            </button>
          )}

          <div className='text-[10px] text-gray-400 px-1'>
            <span>Times in <strong className='text-gray-300'>{userTimezone}</strong></span>
          </div>
        </div>
      </div>

      {/* Fixtures Grouped by Day */}
      {Object.keys(grouped).length === 0 ? (
        <div className='rounded-2xl border border-white/10 p-8 text-center bg-white/[0.02]'>
          <p className='text-sm text-gray-400 font-medium'>
            No games found matching the selected filter ({filterMode}).
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([dateLabel, dayFixtures]) => {
          const isMultiGame = dayFixtures.length >= 2;

          return (
            <div key={dateLabel} className='space-y-2 sm:space-y-2.5'>
              {/* Day Header with game counter */}
              <div className='flex items-center justify-between gap-2 px-1 pt-1'>
                <div className='flex items-center gap-2'>
                  <span className='h-1.5 w-1.5 rounded-full bg-emerald-400' />
                  <h4 className='text-xs font-bold uppercase tracking-wider text-gray-300'>
                    {dateLabel}
                  </h4>
                  <span className='text-[10px] font-semibold text-gray-400 bg-white/5 border border-white/10 px-1.5 py-0.2 rounded-md'>
                    {dayFixtures.length} {dayFixtures.length === 1 ? 'game' : 'games'}
                  </span>
                </div>
              </div>

              {/* Grid: Multi-game days use 3-4 column high-density grid */}
              <div
                className={`grid gap-2 sm:gap-2.5 ${
                  isMultiGame
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
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
                    formattedTime = new Date(fixture.dateUtc).toLocaleTimeString();
                  }

                  const isPinned = Boolean(fixture.isPinned);
                  const hasScore =
                    fixture.teamScore !== undefined &&
                    fixture.opponentScore !== undefined;

                  return (
                    <div
                      key={`${fixture.id}-${fixture.teamId}`}
                      className={`flex flex-col justify-between transition-all duration-200 border ${
                        isMultiGame
                          ? 'p-2.5 sm:p-3 rounded-xl'
                          : 'p-3 sm:p-3.5 rounded-xl'
                      } ${
                        isPinned
                          ? 'border-amber-500/35 bg-gradient-to-br from-amber-950/20 via-white/[0.03] to-transparent shadow-sm'
                          : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                      }`}
                    >
                      {/* Top Status & League Header */}
                      <div className='flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/5 text-[11px] leading-tight'>
                        <div className='flex items-center gap-1.5 flex-wrap min-w-0'>
                          <span className='rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-gray-200 uppercase tracking-wider shrink-0'>
                            {fixture.leagueDisplayName || getLeagueDisplayName(fixture.league)}
                          </span>

                          {fixture.isLive ? (
                            <span className='inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0'>
                              <span className='h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse' />
                              <span>LIVE {fixture.statusDetail ? `• ${fixture.statusDetail}` : ''}</span>
                            </span>
                          ) : fixture.isCompleted ? (
                            <span className='inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 shrink-0'>
                              <CheckCircle2 className='h-2.5 w-2.5' />
                              <span>{fixture.statusDetail || 'FINAL'}</span>
                            </span>
                          ) : (
                            <span className='inline-flex items-center gap-1 text-[10px] text-gray-400 font-medium shrink-0'>
                              <Clock className='h-2.5 w-2.5 text-gray-500' />
                              <span>{formattedTime}</span>
                            </span>
                          )}

                          {isPinned && (
                            <span className='inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-300 bg-amber-500/15 px-1 py-0.2 rounded border border-amber-500/25 shrink-0'>
                              <Pin className='h-2 w-2 rotate-45' />
                              <span>Pinned</span>
                            </span>
                          )}
                        </div>

                        {/* Right action: Unpin button if pinned */}
                        {isPinned && onUnpinGame && (
                          <button
                            type='button'
                            onClick={() => onUnpinGame(fixture.id)}
                            className='text-gray-400 hover:text-rose-300 p-0.5 rounded hover:bg-rose-500/10 transition-colors flex items-center gap-0.5 text-[10px] shrink-0 ml-1'
                            title='Remove pinned game from dashboard'
                          >
                            <X className='h-2.5 w-2.5' />
                            <span className='sr-only sm:not-sr-only'>Unpin</span>
                          </button>
                        )}
                      </div>

                      {/* Matchup & Scores */}
                      <div className='space-y-1 sm:space-y-1.5 py-0.5'>
                        {/* Team 1 (Followed Team) */}
                        <div className='flex items-center justify-between gap-2'>
                          <div className='flex items-center gap-2 min-w-0 flex-1'>
                            {fixture.teamLogo ? (
                              <div className='relative h-5 w-5 shrink-0 rounded bg-white/5 p-0.5 border border-white/10 flex items-center justify-center'>
                                <Image
                                  src={fixture.teamLogo}
                                  alt={fixture.teamName}
                                  width={18}
                                  height={18}
                                  className='object-contain'
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className='h-5 w-5 shrink-0 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-bold text-gray-400'>
                                {fixture.teamName.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <span
                              className={`text-xs sm:text-[13px] truncate ${
                                fixture.teamWinner
                                  ? 'font-bold text-emerald-300'
                                  : 'font-medium text-white'
                              }`}
                            >
                              {fixture.teamName}
                            </span>
                          </div>

                          {/* Score if available */}
                          {fixture.teamScore !== undefined ? (
                            <span
                              className={`text-xs sm:text-sm font-black font-mono shrink-0 px-1.5 py-0.2 rounded ${
                                fixture.teamWinner
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'text-gray-300 bg-white/5'
                              }`}
                            >
                              {fixture.teamScore}
                            </span>
                          ) : (
                            <span className='text-[10px] font-semibold text-gray-500 uppercase tracking-wider shrink-0'>
                              {fixture.isHome ? 'Home' : 'Away'}
                            </span>
                          )}
                        </div>

                        {/* Team 2 (Opponent) */}
                        <div className='flex items-center justify-between gap-2'>
                          <div className='flex items-center gap-2 min-w-0 flex-1'>
                            {fixture.opponentLogo ? (
                              <div className='relative h-5 w-5 shrink-0 rounded bg-white/5 p-0.5 border border-white/10 flex items-center justify-center'>
                                <Image
                                  src={fixture.opponentLogo}
                                  alt={fixture.opponentName}
                                  width={18}
                                  height={18}
                                  className='object-contain'
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className='h-5 w-5 shrink-0 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-bold text-gray-400'>
                                {fixture.opponentName.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <span
                              className={`text-xs sm:text-[13px] truncate ${
                                fixture.opponentWinner
                                  ? 'font-bold text-emerald-300'
                                  : 'font-medium text-gray-300'
                              }`}
                            >
                              {fixture.opponentName}
                            </span>
                          </div>

                          {/* Score if available */}
                          {fixture.opponentScore !== undefined ? (
                            <span
                              className={`text-xs sm:text-sm font-black font-mono shrink-0 px-1.5 py-0.2 rounded ${
                                fixture.opponentWinner
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'text-gray-300 bg-white/5'
                              }`}
                            >
                              {fixture.opponentScore}
                            </span>
                          ) : (
                            <span className='text-[10px] font-semibold text-gray-500 uppercase tracking-wider shrink-0'>
                              {fixture.isHome ? 'Away' : 'Home'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Footer: Broadcast, Odds, and Box Score Button */}
                      <div className='mt-1.5 pt-1.5 border-t border-white/5 flex items-center justify-between gap-1.5 text-[10px]'>
                        <div className='flex items-center gap-1.5 min-w-0 flex-1'>
                          {fixture.broadcast ? (
                            <span className='inline-flex items-center gap-1 text-cyan-300 font-medium bg-cyan-950/40 border border-cyan-500/25 px-1.5 py-0.2 rounded text-[10px] truncate max-w-[120px]'>
                              <Tv className='h-2.5 w-2.5 text-cyan-400 shrink-0' />
                              <span className='truncate'>{fixture.broadcast}</span>
                            </span>
                          ) : (
                            <span className='text-[10px] text-gray-500 truncate'>
                              {hasScore ? 'Final' : 'TV TBA'}
                            </span>
                          )}

                          {fixture.oddsDetails && (
                            <span className='hidden sm:inline-block text-[9px] font-mono text-cyan-300/80 bg-cyan-950/30 px-1 py-0.2 rounded border border-cyan-500/20 shrink-0'>
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
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all shrink-0 ${
                            hasScore || fixture.isLive
                              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-sm'
                              : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10'
                          }`}
                          title='Open game linescore and box score statistics'
                        >
                          <BarChart2 className='h-2.5 w-2.5 text-emerald-400' />
                          <span>Box Score</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* Detailed Box Score Modal */}
      {selectedBoxScore && (
        <BoxScoreModal
          isOpen={Boolean(selectedBoxScore)}
          onClose={() => setSelectedBoxScore(null)}
          eventId={selectedBoxScore.eventId}
          sport={selectedBoxScore.sport}
          league={selectedBoxScore.league}
        />
      )}

      {/* Share & Bookmark Modal */}
      {userId && showShareModal && (
        <ShareWeeklyModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          userId={userId}
          followedTeamsCount={teams.length}
          pinnedGamesCount={pinnedGames.length}
        />
      )}
    </div>
  );
}
