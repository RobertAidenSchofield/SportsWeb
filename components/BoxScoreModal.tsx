'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  X,
  Loader2,
  Trophy,
  MapPin,
  Users,
  Tv,
  CheckCircle2,
  Flame,
  AlertCircle,
} from 'lucide-react';
import { BoxScoreData } from '@/lib/types';

interface BoxScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  sport: string;
  league: string;
  eventId: string;
  fallbackTitle?: string;
}

export function BoxScoreModal({
  isOpen,
  onClose,
  sport,
  league,
  eventId,
  fallbackTitle = 'Box Score',
}: BoxScoreModalProps) {
  const [data, setData] = useState<BoxScoreData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !eventId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    // Clean composite ID (e.g. "espn:football:nfl:12345")
    let reqSport = sport;
    let reqLeague = league;
    let cleanEventId = eventId;
    if (eventId.includes(':')) {
      const parts = eventId.split(':');
      if (parts.length >= 4 && parts[0] === 'espn') {
        if (!reqSport) reqSport = parts[1];
        if (!reqLeague) reqLeague = parts[2];
        cleanEventId = parts[3];
      } else {
        cleanEventId = parts[parts.length - 1];
      }
    }

    async function fetchBoxScore() {
      try {
        const params = new URLSearchParams({
          sport: reqSport,
          league: reqLeague,
          eventId: cleanEventId,
        });
        const res = await fetch(`/api/boxscore?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`Box score returned ${res.status}`);
        }
        const json: BoxScoreData = await res.json();
        if (isMounted) {
          setData(json);
        }
      } catch (err: any) {
        console.error('Error fetching box score:', err);
        if (isMounted) {
          setError(
            err?.message || 'Could not load box score details at this time.',
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchBoxScore();

    // Close on Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, eventId, sport, league, onClose]);

  if (!isOpen) return null;

  const hasLinescores =
    (data?.homeTeam.linescores && data.homeTeam.linescores.length > 0) ||
    (data?.awayTeam.linescores && data.awayTeam.linescores.length > 0);

  const maxPeriods = Math.max(
    data?.homeTeam.linescores?.length || 0,
    data?.awayTeam.linescores?.length || 0,
  );

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200'>
      <div
        className='relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0d121f] p-4 sm:p-6 shadow-2xl space-y-5 text-white'
        role='dialog'
        aria-modal='true'
      >
        {/* Top Header */}
        <div className='flex items-center justify-between border-b border-white/10 pb-3.5'>
          <div className='flex items-center gap-2.5'>
            <span className='px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-white/10 text-white'>
              {data?.league || league.toUpperCase()}
            </span>

            {data?.isLive ? (
              <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30'>
                <span className='h-2 w-2 rounded-full bg-rose-500 animate-pulse' />
                <span>LIVE {data.statusDetail ? `• ${data.statusDetail}` : ''}</span>
              </span>
            ) : data?.isCompleted ? (
              <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'>
                <CheckCircle2 className='h-3.5 w-3.5 text-emerald-400' />
                <span>{data.statusDetail || 'FINAL'}</span>
              </span>
            ) : (
              <span className='px-2.5 py-0.5 rounded-full text-xs font-medium text-gray-400 bg-white/5'>
                {data?.statusDetail || 'Upcoming Matchup'}
              </span>
            )}
          </div>

          <button
            type='button'
            onClick={onClose}
            className='p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors'
            aria-label='Close box score'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className='py-16 text-center space-y-3'>
            <Loader2 className='mx-auto h-8 w-8 animate-spin text-emerald-400' />
            <p className='text-sm text-gray-400'>
              Loading live linescores and box score statistics...
            </p>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className='rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 text-center space-y-2'>
            <AlertCircle className='mx-auto h-7 w-7 text-rose-400' />
            <p className='text-sm font-semibold text-rose-200'>
              Failed to load detailed box score
            </p>
            <p className='text-xs text-gray-400'>{error}</p>
          </div>
        )}

        {/* Loaded Content */}
        {!loading && data && (
          <div className='space-y-6'>
            {/* Scoreboard Banner */}
            <div className='rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-3 sm:p-4'>
              <div className='grid grid-cols-5 items-center gap-2'>
                {/* Away Team */}
                <div className='col-span-2 flex flex-col items-center text-center space-y-1'>
                  <div className='relative h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-white/5 border border-white/10 p-1.5 shadow-inner flex items-center justify-center'>
                    {data.awayTeam.logo ? (
                      <Image
                        src={data.awayTeam.logo}
                        alt={data.awayTeam.name}
                        fill
                        className='object-contain p-0.5'
                        unoptimized
                      />
                    ) : (
                      <Trophy className='h-5 w-5 text-gray-400' />
                    )}
                  </div>
                  <div>
                    <h4 className='text-xs sm:text-sm font-bold text-white line-clamp-1'>
                      {data.awayTeam.name}
                    </h4>
                    {data.awayTeam.record && (
                      <p className='text-[10px] text-gray-400'>
                        {data.awayTeam.record} • Away
                      </p>
                    )}
                  </div>
                  {data.awayTeam.winner && (
                    <span className='px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'>
                      WINNER
                    </span>
                  )}
                </div>

                {/* Score Center Column */}
                <div className='col-span-1 flex flex-col items-center justify-center space-y-0.5'>
                  {data.awayTeam.score !== undefined &&
                  data.homeTeam.score !== undefined ? (
                    <div className='flex items-center gap-1.5 sm:gap-2.5 text-xl sm:text-3xl font-black font-mono tracking-tight'>
                      <span
                        className={
                          data.awayTeam.winner
                            ? 'text-emerald-400'
                            : 'text-white'
                        }
                      >
                        {data.awayTeam.score}
                      </span>
                      <span className='text-gray-600 text-base font-light'>-</span>
                      <span
                        className={
                          data.homeTeam.winner
                            ? 'text-emerald-400'
                            : 'text-white'
                        }
                      >
                        {data.homeTeam.score}
                      </span>
                    </div>
                  ) : (
                    <span className='text-gray-400 text-xs font-semibold uppercase tracking-wider'>
                      VS
                    </span>
                  )}

                  <span className='text-[10px] text-gray-400 text-center font-medium'>
                    {data.statusDetail || 'Scheduled'}
                  </span>
                </div>

                {/* Home Team */}
                <div className='col-span-2 flex flex-col items-center text-center space-y-1'>
                  <div className='relative h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-white/5 border border-white/10 p-1.5 shadow-inner flex items-center justify-center'>
                    {data.homeTeam.logo ? (
                      <Image
                        src={data.homeTeam.logo}
                        alt={data.homeTeam.name}
                        fill
                        className='object-contain p-0.5'
                        unoptimized
                      />
                    ) : (
                      <Trophy className='h-5 w-5 text-gray-400' />
                    )}
                  </div>
                  <div>
                    <h4 className='text-xs sm:text-sm font-bold text-white line-clamp-1'>
                      {data.homeTeam.name}
                    </h4>
                    {data.homeTeam.record && (
                      <p className='text-[10px] text-gray-400'>
                        {data.homeTeam.record} • Home
                      </p>
                    )}
                  </div>
                  {data.homeTeam.winner && (
                    <span className='px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'>
                      WINNER
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Linescore Table (Period by Period) */}
            {hasLinescores && maxPeriods > 0 && (
              <div className='space-y-2'>
                <h5 className='text-xs font-bold uppercase tracking-wider text-gray-400'>
                  Linescore by Period
                </h5>
                <div className='overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02]'>
                  <table className='w-full text-xs text-left'>
                    <thead>
                      <tr className='border-b border-white/10 text-gray-400'>
                        <th className='p-2.5 font-semibold text-white'>Team</th>
                        {Array.from({ length: maxPeriods }).map((_, idx) => (
                          <th
                            key={idx}
                            className='p-2.5 text-center font-semibold text-gray-300'
                          >
                            {idx < 4 ? `${idx + 1}` : `OT${idx > 4 ? idx - 3 : ''}`}
                          </th>
                        ))}
                        <th className='p-2.5 text-center font-bold text-white bg-white/5'>
                          T
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-white/5 font-mono'>
                      <tr>
                        <td className='p-2.5 font-sans font-semibold text-white truncate max-w-[140px]'>
                          {data.awayTeam.abbreviation || data.awayTeam.name}
                        </td>
                        {Array.from({ length: maxPeriods }).map((_, idx) => (
                          <td
                            key={idx}
                            className='p-2.5 text-center text-gray-300'
                          >
                            {data.awayTeam.linescores?.[idx] ?? '-'}
                          </td>
                        ))}
                        <td className='p-2.5 text-center font-bold text-white bg-white/5'>
                          {data.awayTeam.score ?? '-'}
                        </td>
                      </tr>
                      <tr>
                        <td className='p-2.5 font-sans font-semibold text-white truncate max-w-[140px]'>
                          {data.homeTeam.abbreviation || data.homeTeam.name}
                        </td>
                        {Array.from({ length: maxPeriods }).map((_, idx) => (
                          <td
                            key={idx}
                            className='p-2.5 text-center text-gray-300'
                          >
                            {data.homeTeam.linescores?.[idx] ?? '-'}
                          </td>
                        ))}
                        <td className='p-2.5 text-center font-bold text-white bg-white/5'>
                          {data.homeTeam.score ?? '-'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Team Statistics Comparison Table */}
            {data.stats.length > 0 && (
              <div className='space-y-2.5'>
                <h5 className='text-xs font-bold uppercase tracking-wider text-gray-400'>
                  Team Matchup Statistics
                </h5>
                <div className='divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/[0.02] p-2'>
                  {data.stats.map((stat, i) => (
                    <div
                      key={i}
                      className='flex items-center justify-between py-2 px-3 text-xs'
                    >
                      <span className='font-mono font-semibold text-gray-200 w-16 text-left'>
                        {stat.away}
                      </span>
                      <span className='font-medium text-gray-400 text-center flex-1 truncate px-2'>
                        {stat.label}
                      </span>
                      <span className='font-mono font-semibold text-gray-200 w-16 text-right'>
                        {stat.home}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Game Leaders */}
            {data.leaders && data.leaders.length > 0 && (
              <div className='space-y-2.5'>
                <h5 className='text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5'>
                  <Flame className='h-3.5 w-3.5 text-amber-400' />
                  <span>Top Performers</span>
                </h5>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5'>
                  {data.leaders.map((leader, idx) => (
                    <div
                      key={idx}
                      className='p-3 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-between'
                    >
                      <div>
                        <span className='text-[10px] uppercase font-bold text-amber-300'>
                          {leader.category}
                        </span>
                        <p className='text-xs font-semibold text-white'>
                          {leader.athleteName}
                        </p>
                      </div>
                      <span className='font-mono font-bold text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded'>
                        {leader.displayValue}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Match Details Footer */}
            <div className='border-t border-white/10 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400'>
              {data.venue && (
                <span className='inline-flex items-center gap-1.5'>
                  <MapPin className='h-3.5 w-3.5 text-gray-500' />
                  <span>{data.venue}</span>
                </span>
              )}

              {data.attendance && (
                <span className='inline-flex items-center gap-1.5'>
                  <Users className='h-3.5 w-3.5 text-gray-500' />
                  <span>Attendance: {data.attendance}</span>
                </span>
              )}

              {data.broadcasts && data.broadcasts.length > 0 && (
                <span className='inline-flex items-center gap-1.5 text-emerald-400 font-semibold'>
                  <Tv className='h-3.5 w-3.5' />
                  <span>{data.broadcasts.join(', ')}</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

