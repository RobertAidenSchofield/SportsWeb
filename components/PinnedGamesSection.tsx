'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Pin,
  Calendar,
  Clock,
  Tv,
  Dices,
  Trash2,
  Loader2,
  Flame,
  ArrowRight,
  BarChart2,
  CheckCircle2,
} from 'lucide-react';
import { MarqueeGame } from '@/lib/types';
import { unpinGame } from '@/app/actions';
import { formatInTimeZone } from 'date-fns-tz';
import { getLeagueDisplayName } from '@/lib/sportsApi';
import { BoxScoreModal } from './BoxScoreModal';

interface PinnedGamesSectionProps {
  initialPinnedGames: MarqueeGame[];
  userTimezone: string;
  onExploreTopGames?: () => void;
  onGameUnpinned?: (gameId: string) => void;
}

export function PinnedGamesSection({
  initialPinnedGames,
  userTimezone,
  onExploreTopGames,
  onGameUnpinned,
}: PinnedGamesSectionProps) {
  const [pinnedGames, setPinnedGames] =
    useState<MarqueeGame[]>(initialPinnedGames);
  const [pendingUnpinId, setPendingUnpinId] = useState<string | null>(null);
  const [selectedBoxScore, setSelectedBoxScore] = useState<{
    eventId: string;
    sport: string;
    league: string;
  } | null>(null);

  // Fetch real-time live and final scores for any started pinned games
  useEffect(() => {
    let isCancelled = false;

    async function enrichScores() {
      const updated = await Promise.all(
        initialPinnedGames.map(async (game) => {
          const startTime = new Date(game.dateUtc).getTime();
          const hasStarted = startTime <= Date.now() + 15 * 60 * 1000;
          if (
            hasStarted ||
            game.isLive ||
            game.isCompleted ||
            (String(game.homeTeam.score) === '0' && String(game.awayTeam.score) === '0')
          ) {
            try {
              const cleanId = game.id.includes(':')
                ? game.id.split(':').pop()!
                : game.id;
              const res = await fetch(
                `/api/boxscore?sport=${encodeURIComponent(game.sport)}&league=${encodeURIComponent(game.leagueSlug || game.league)}&eventId=${encodeURIComponent(cleanId)}`,
              );
              if (res.ok) {
                const bData = await res.json();
                return {
                  ...game,
                  homeTeam: {
                    ...game.homeTeam,
                    score: bData.homeTeam?.score,
                    winner: bData.homeTeam?.winner,
                  },
                  awayTeam: {
                    ...game.awayTeam,
                    score: bData.awayTeam?.score,
                    winner: bData.awayTeam?.winner,
                  },
                  statusDetail: bData.statusDetail || game.statusDetail,
                  isCompleted: Boolean(bData.isCompleted),
                  isLive: Boolean(bData.isLive),
                };
              }
            } catch {
              // ignore
            }
          }

          // If the game has not started, ensure it doesn't display placeholder 0s
          if (!hasStarted && !game.isLive && !game.isCompleted) {
            return {
              ...game,
              homeTeam: { ...game.homeTeam, score: undefined },
              awayTeam: { ...game.awayTeam, score: undefined },
            };
          }

          return game;
        }),
      );

      if (!isCancelled) {
        setPinnedGames(updated);
      }
    }

    enrichScores();

    return () => {
      isCancelled = true;
    };
  }, [initialPinnedGames]);

  const handleUnpin = async (gameId: string) => {
    setPendingUnpinId(gameId);
    const savedScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    // Optimistic UI removal
    const remaining = pinnedGames.filter((g) => g.id !== gameId);
    setPinnedGames(remaining);
    onGameUnpinned?.(gameId);

    try {
      await unpinGame(gameId);
    } catch (err) {
      console.error('Failed to unpin game:', err);
      // Rollback
      setPinnedGames(initialPinnedGames);
    } finally {
      setPendingUnpinId(null);
      if (typeof window !== 'undefined') {
        requestAnimationFrame(() => {
          window.scrollTo({ top: savedScrollY, behavior: 'instant' });
        });
      }
    }
  };

  return (
    <section className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-lg font-bold text-white flex items-center gap-2'>
            <Pin className='h-5 w-5 text-amber-400 rotate-45' />
            <span>Your Pinned Games</span>
            <span className='rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20'>
              {pinnedGames.length}
            </span>
          </h2>
          <p className='text-xs text-gray-400 mt-0.5'>
            Specific games you&apos;ve added to track on your dashboard and
            calendar without following the entire team.
          </p>
        </div>

        {onExploreTopGames && (
          <button
            type='button'
            onClick={onExploreTopGames}
            className='text-xs font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1 transition-colors'
          >
            <span>+ Find More Games</span>
            <ArrowRight className='h-3.5 w-3.5' />
          </button>
        )}
      </div>

      {pinnedGames.length === 0 ? (
        <div className='rounded-2xl border border-dashed border-white/10 p-6 text-center bg-white/[0.02] space-y-3'>
          <div className='mx-auto h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400'>
            <Pin className='h-5 w-5 rotate-45' />
          </div>
          <div>
            <p className='text-sm font-semibold text-white'>
              No individual games pinned yet
            </p>
            <p className='text-xs text-gray-400 max-w-md mx-auto mt-1'>
              Want to track a marquee game like Ohio State vs Indiana or Chiefs
              vs Bills without following the whole team? Use the{' '}
              <strong>Marquee Matchups</strong> tab to add specific games
              directly to your schedule.
            </p>
          </div>
          {onExploreTopGames && (
            <button
              type='button'
              onClick={onExploreTopGames}
              className='inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold text-xs transition-colors'
            >
              <Flame className='h-3.5 w-3.5 text-amber-400' />
              <span>Browse Marquee Games</span>
            </button>
          )}
        </div>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3'>
          {pinnedGames.map((game) => {
            let formattedKickoff = 'Upcoming';
            try {
              formattedKickoff = formatInTimeZone(
                new Date(game.dateUtc),
                userTimezone,
                'EEE, MMM d • h:mm a zzz',
              );
            } catch {
              formattedKickoff = new Date(game.dateUtc).toLocaleString();
            }

            return (
              <div
                key={game.id}
                className='rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-950/20 via-white/[0.03] to-transparent p-3 sm:p-3.5 flex flex-col justify-between space-y-2.5 transition-all hover:border-amber-500/40'
              >
                {/* Header */}
                <div className='flex items-start justify-between gap-2 border-b border-white/5 pb-2'>
                  <div className='space-y-0.5 min-w-0'>
                    <div className='flex items-center gap-1.5 flex-wrap'>
                      <span className='px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/10 text-white uppercase tracking-wider'>
                        {getLeagueDisplayName(game.leagueSlug || game.league)}
                      </span>

                      {game.isLive ? (
                        <span className='inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30'>
                          <span className='h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse' />
                          <span>LIVE {game.statusDetail ? `• ${game.statusDetail}` : ''}</span>
                        </span>
                      ) : game.isCompleted ? (
                        <span className='inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400'>
                          <CheckCircle2 className='h-2.5 w-2.5' />
                          <span>{game.statusDetail || 'FINAL'}</span>
                        </span>
                      ) : (
                        <span className='inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30'>
                          <Flame className='h-2.5 w-2.5 text-amber-400' />
                          <span>{game.excitementScore}/100</span>
                        </span>
                      )}
                    </div>
                    <p className='text-[10px] text-gray-400 font-medium flex items-center gap-1 pt-0.5 truncate'>
                      <Calendar className='h-2.5 w-2.5 text-gray-500 shrink-0' />
                      <span className='truncate'>{formattedKickoff}</span>
                    </p>
                  </div>

                  {/* Remove Button */}
                  <button
                    type='button'
                    onClick={() => handleUnpin(game.id)}
                    disabled={pendingUnpinId === game.id}
                    className='inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-semibold text-gray-400 hover:text-rose-300 bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/20 transition-colors shrink-0'
                    title='Remove game from dashboard'
                  >
                    {pendingUnpinId === game.id ? (
                      <Loader2 className='h-3 w-3 animate-spin' />
                    ) : (
                      <>
                        <Trash2 className='h-3 w-3' />
                        <span>Remove</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Matchup */}
                <div className='space-y-1.5 py-0.5'>
                  {/* Away */}
                  <div className='flex items-center justify-between gap-2'>
                    <div className='flex items-center gap-2 min-w-0 flex-1'>
                      <div className='relative h-6 w-6 shrink-0 bg-white/5 rounded-full p-0.5 border border-white/10 flex items-center justify-center'>
                        <Image
                          src={game.awayTeam.logo}
                          alt={game.awayTeam.name}
                          fill
                          className='object-contain p-0.5'
                          unoptimized
                        />
                      </div>
                      <div className='min-w-0'>
                        <span
                          className={`text-xs sm:text-[13px] truncate block ${
                            game.awayTeam.winner
                              ? 'font-bold text-emerald-300'
                              : 'font-medium text-white'
                          }`}
                        >
                          {game.awayTeam.rank ? `#${game.awayTeam.rank} ` : ''}
                          {game.awayTeam.name}
                        </span>
                      </div>
                    </div>

                    {game.awayTeam.score !== undefined && (
                      <span
                        className={`text-xs sm:text-sm font-black font-mono shrink-0 px-1.5 py-0.2 rounded ${
                          game.awayTeam.winner
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'text-gray-300 bg-white/5'
                        }`}
                      >
                        {game.awayTeam.score}
                      </span>
                    )}
                  </div>

                  {/* Home */}
                  <div className='flex items-center justify-between gap-2'>
                    <div className='flex items-center gap-2 min-w-0 flex-1'>
                      <div className='relative h-6 w-6 shrink-0 bg-white/5 rounded-full p-0.5 border border-white/10 flex items-center justify-center'>
                        <Image
                          src={game.homeTeam.logo}
                          alt={game.homeTeam.name}
                          fill
                          className='object-contain p-0.5'
                          unoptimized
                        />
                      </div>
                      <div className='min-w-0'>
                        <span
                          className={`text-xs sm:text-[13px] truncate block ${
                            game.homeTeam.winner
                              ? 'font-bold text-emerald-300'
                              : 'font-medium text-white'
                          }`}
                        >
                          {game.homeTeam.rank ? `#${game.homeTeam.rank} ` : ''}
                          {game.homeTeam.name}
                        </span>
                      </div>
                    </div>

                    {game.homeTeam.score !== undefined && (
                      <span
                        className={`text-xs sm:text-sm font-black font-mono shrink-0 px-1.5 py-0.2 rounded ${
                          game.homeTeam.winner
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'text-gray-300 bg-white/5'
                        }`}
                      >
                        {game.homeTeam.score}
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Metadata & Box Score Trigger */}
                <div className='border-t border-white/5 pt-1.5 flex items-center justify-between gap-1.5 text-[10px] text-gray-400'>
                  <div className='flex items-center gap-1.5 truncate min-w-0 flex-1'>
                    {game.broadcastSummary ? (
                      <span className='inline-flex items-center gap-1 text-emerald-400 font-medium truncate'>
                        <Tv className='h-2.5 w-2.5 shrink-0' />
                        <span className='truncate'>{game.broadcastSummary}</span>
                      </span>
                    ) : (
                      <span className='text-gray-500'>TV TBA</span>
                    )}

                    {game.odds?.details && (
                      <span className='hidden sm:inline font-mono text-cyan-300/80 shrink-0'>
                        {game.odds.details}
                      </span>
                    )}
                  </div>

                  {/* Box Score Button */}
                  <button
                    type='button'
                    onClick={() =>
                      setSelectedBoxScore({
                        eventId: game.id.includes(':')
                          ? game.id.split(':').pop()!
                          : game.id,
                        sport: game.sport,
                        league: game.leagueSlug || game.league,
                      })
                    }
                    className='inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all shadow-sm shrink-0'
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
      )}

      {selectedBoxScore && (
        <BoxScoreModal
          isOpen={Boolean(selectedBoxScore)}
          onClose={() => setSelectedBoxScore(null)}
          eventId={selectedBoxScore.eventId}
          sport={selectedBoxScore.sport}
          league={selectedBoxScore.league}
        />
      )}
    </section>
  );
}

