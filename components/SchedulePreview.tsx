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

          // For any pinned game that has started or is completed but lacks score, fetch fresh box score
          const enrichedPinned = await Promise.all(
            convertedPinned.map(async (p) => {
              const startTime = new Date(p.dateUtc).getTime();
              const hasStarted = startTime <= Date.now() + 15 * 60 * 1000;
              if (
                hasStarted &&
                (p.teamScore === undefined || p.opponentScore === undefined)
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
    <div className='space-y-6'>
      {/* Schedule Controls Header & Filter Pills */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.02] border border-white/10 p-2.5 rounded-2xl'>
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
            All Week ({fixtures.length})
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

        <div className='flex items-center gap-2 flex-wrap'>
          {userId && (
            <button
              type='button'
              onClick={() => setShowShareModal(true)}
              className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all shadow-sm'
              title='Share this weekly view or bookmark it for quick access'
            >
              <Share2 className='h-3.5 w-3.5 text-emerald-400' />
              <span>Share / Bookmark View</span>
            </button>
          )}

          <div className='text-[11px] text-gray-400 px-1'>
            <span>Times shown in <strong className='text-gray-200'>{userTimezone}</strong></span>
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
        Object.entries(grouped).map(([dateLabel, dayFixtures]) => (
          <div key={dateLabel} className='space-y-3'>
            <div className='flex items-center gap-2 px-1'>
              <span className='h-2 w-2 rounded-full bg-emerald-400' />
              <h4 className='text-xs font-bold uppercase tracking-wider text-gray-300'>
                {dateLabel}
              </h4>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-3.5'>
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
                    className={`flex flex-col justify-between p-4 sm:p-4.5 rounded-2xl border transition-all duration-200 ${
                      isPinned
                        ? 'border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-white/[0.03] to-transparent shadow-sm'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                    }`}
                  >
                    {/* Top Status & League Header */}
                    <div className='flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/5 text-xs'>
                      <div className='flex items-center gap-2 flex-wrap'>
                        <span className='rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider'>
                          {fixture.leagueDisplayName || getLeagueDisplayName(fixture.league)}
                        </span>

                        {fixture.isLive ? (
                          <span className='inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30'>
                            <span className='h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse' />
                            <span>LIVE {fixture.statusDetail ? `• ${fixture.statusDetail}` : ''}</span>
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

                        {isPinned && (
                          <span className='inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/25'>
                            <Pin className='h-2.5 w-2.5 rotate-45' />
                            <span>Pinned</span>
                          </span>
                        )}
                      </div>

                      {/* Right action: Unpin button if pinned */}
                      {isPinned && onUnpinGame && (
                        <button
                          type='button'
                          onClick={() => onUnpinGame(fixture.id)}
                          className='text-gray-400 hover:text-rose-300 p-1 rounded-lg hover:bg-rose-500/10 transition-colors flex items-center gap-1 text-[11px]'
                          title='Remove pinned game from dashboard'
                        >
                          <X className='h-3 w-3' />
                          <span>Unpin</span>
                        </button>
                      )}
                    </div>

                    {/* Matchup & Scores */}
                    <div className='space-y-2.5 py-1'>
                      {/* Team 1 (Followed Team) */}
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

                        {/* Score if available */}
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

                      {/* Team 2 (Opponent) */}
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

                        {/* Score if available */}
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
        ))
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
