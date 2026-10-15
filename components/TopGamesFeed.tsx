'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import {
  Flame,
  Tv,
  Calendar,
  Sparkles,
  TrendingUp,
  Swords,
  Plus,
  Check,
  Loader2,
  CalendarPlus,
  Copy,
  ExternalLink,
  ShieldCheck,
  Dices,
} from 'lucide-react';
import { MarqueeGame, Team } from '@/lib/types';
import { followTeam, unfollowTeam } from '@/app/actions';
import { formatInTimeZone } from 'date-fns-tz';

interface TopGamesFeedProps {
  initialGames: MarqueeGame[];
  initialFollowedTeamIds: string[];
  userTimezone?: string;
}

const LEAGUE_TABS = [
  { id: 'all', label: 'All Leagues', icon: '🌐' },
  { id: 'college-football', label: 'NCAA Football', icon: '🏈' },
  { id: 'nfl', label: 'NFL', icon: '🏈' },
  { id: 'nba', label: 'NBA', icon: '🏀' },
  { id: 'nhl', label: 'NHL', icon: '🏒' },
  { id: 'eng.1', label: 'Premier League', icon: '⚽' },
  { id: 'mens-college-basketball', label: 'NCAA Basketball', icon: '🏀' },
  { id: 'uefa.champions', label: 'Champions League', icon: '⚽' },
];

export function TopGamesFeed({
  initialGames,
  initialFollowedTeamIds,
  userTimezone = 'America/New_York',
}: TopGamesFeedProps) {
  const [selectedLeague, setSelectedLeague] = useState('all');
  const [games, setGames] = useState<MarqueeGame[]>(initialGames);
  const [loading, setLoading] = useState(false);
  const [followedIds, setFollowedIds] = useState<Set<string>>(
    new Set(initialFollowedTeamIds),
  );
  const [pendingTeamId, setPendingTeamId] = useState<string | null>(null);
  const [showCalModal, setShowCalModal] = useState(false);
  const [copiedCal, setCopiedCal] = useState(false);
  const [, startTransition] = useTransition();

  // Switch league tab and fetch games
  const handleSelectLeague = async (leagueId: string) => {
    setSelectedLeague(leagueId);
    setLoading(true);
    try {
      const res = await fetch(`/api/top-games?league=${encodeURIComponent(leagueId)}&limit=35`);
      if (res.ok) {
        const data = await res.json();
        setGames(data.games || []);
      }
    } catch (err) {
      console.error('Error fetching league games:', err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle follow team directly from top games feed
  const handleToggleFollow = async (
    teamData: {
      id: string;
      name: string;
      logo: string;
    },
    sport: string,
    league: string,
  ) => {
    const isFollowed = followedIds.has(teamData.id);
    setPendingTeamId(teamData.id);

    // Optimistic UI
    const updated = new Set(followedIds);
    if (isFollowed) {
      updated.delete(teamData.id);
    } else {
      updated.add(teamData.id);
    }
    setFollowedIds(updated);

    startTransition(async () => {
      try {
        if (isFollowed) {
          await unfollowTeam(teamData.id);
        } else {
          const teamToSave: Team = {
            id: teamData.id,
            name: teamData.name,
            sport,
            league,
            logo_url: teamData.logo,
          };
          await followTeam(teamToSave);
        }
      } catch (err) {
        console.error('Failed to toggle follow team:', err);
        // Rollback
        setFollowedIds(new Set(followedIds));
      } finally {
        setPendingTeamId(null);
      }
    });
  };

  const calendarFeedUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/calendar/top-games?league=${selectedLeague}`
      : `/api/calendar/top-games?league=${selectedLeague}`;

  const webcalUrl = calendarFeedUrl.replace(/^https?:\/\//i, 'webcal://');

  const copyCalendarUrl = async () => {
    try {
      await navigator.clipboard.writeText(calendarFeedUrl);
      setCopiedCal(true);
      setTimeout(() => setCopiedCal(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className='space-y-6'>
      {/* Feed Controls Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div>
          <div className='flex items-center gap-2'>
            <span className='rounded-lg bg-emerald-500/10 p-1.5 text-emerald-400 border border-emerald-500/20'>
              <Flame className='h-5 w-5' />
            </span>
            <h2 className='text-lg sm:text-xl font-bold text-white'>
              Marquee Matchups & Top Games
            </h2>
          </div>
          <p className='text-xs sm:text-sm text-gray-400 mt-1 max-w-2xl'>
            Dynamically curated based on AP Top 25 rankings, national TV broadcasts, close betting spreads, and classic rivalries.
          </p>
        </div>

        {/* 1-Click Subscribe to Top Games Calendar */}
        <button
          onClick={() => setShowCalModal(true)}
          className='inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs sm:text-sm font-semibold text-white transition-colors self-start sm:self-auto shrink-0 shadow-sm'
        >
          <CalendarPlus className='h-4 w-4 text-emerald-400' />
          <span>Sync Top Games to Calendar</span>
        </button>
      </div>

      {/* League Filter Navigation Pills */}
      <div className='flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10'>
        {LEAGUE_TABS.map((tab) => {
          const isActive = selectedLeague === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSelectLeague(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 border ${
                isActive
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-sm shadow-emerald-950/40'
                  : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Calendar Subscription Modal */}
      {showCalModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200'>
          <div className='w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d121f] p-5 sm:p-6 shadow-2xl space-y-5'>
            <div className='flex items-center justify-between border-b border-white/10 pb-4'>
              <div className='flex items-center gap-2.5'>
                <span className='rounded-lg bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-500/20'>
                  <Calendar className='h-5 w-5' />
                </span>
                <div>
                  <h3 className='font-bold text-white text-base sm:text-lg'>
                    Subscribe to Top Games Feed
                  </h3>
                  <p className='text-xs text-gray-400'>
                    Automatically keeps your calendar updated with marquee matchups.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCalModal(false)}
                className='text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5'
              >
                ✕
              </button>
            </div>

            <div className='space-y-4 text-xs sm:text-sm'>
              <p className='text-gray-300 leading-relaxed'>
                Add this dynamic feed to <strong className='text-white'>Apple Calendar</strong>, <strong className='text-white'>Google Calendar</strong>, or <strong className='text-white'>Outlook</strong>. New top games and kickoff times sync automatically.
              </p>

              <div className='space-y-2'>
                <label className='text-xs font-medium text-gray-400'>
                  Calendar Feed URL (.ics)
                </label>
                <div className='flex items-center gap-2'>
                  <input
                    readOnly
                    value={calendarFeedUrl}
                    className='w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300 font-mono truncate focus:outline-none'
                  />
                  <button
                    onClick={copyCalendarUrl}
                    className='px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors'
                  >
                    {copiedCal ? (
                      <>
                        <Check className='h-3.5 w-3.5' /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className='h-3.5 w-3.5' /> Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className='pt-2 flex flex-col sm:flex-row gap-2'>
                <a
                  href={webcalUrl}
                  className='flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold text-xs text-center transition-colors'
                >
                  <CalendarPlus className='h-4 w-4 text-emerald-400' />
                  <span>1-Click Apple / Outlook Sync</span>
                </a>
                <a
                  href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(calendarFeedUrl)}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold text-xs text-center transition-colors'
                >
                  <ExternalLink className='h-4 w-4 text-cyan-400' />
                  <span>Add to Google Calendar</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className='flex items-center justify-center p-14 rounded-2xl border border-white/10 bg-white/[0.02]'>
          <Loader2 className='h-6 w-6 animate-spin text-emerald-400 mr-2.5' />
          <span className='text-sm text-gray-400 font-medium'>
            Scanning scoreboards and calculating excitement indices...
          </span>
        </div>
      ) : games.length === 0 ? (
        <div className='rounded-2xl border border-white/10 p-8 text-center bg-white/[0.02] space-y-2'>
          <Flame className='mx-auto h-8 w-8 text-gray-500/60' />
          <p className='text-base font-semibold text-white'>
            No active marquee games found for this league
          </p>
          <p className='text-xs text-gray-400 max-w-md mx-auto'>
            This league may be currently in its off-season, or upcoming games have not yet been posted to the schedule.
          </p>
        </div>
      ) : (
        /* Games Grid */
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5'>
          {games.map((game) => {
            // Determine tier badges and styling
            let tierBadgeColor = 'bg-blue-500/10 text-blue-300 border-blue-500/20';
            let tierLabel = 'Featured';
            let cardGlow = 'border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01]';

            if (game.tier === 'ultra') {
              tierBadgeColor =
                'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
              tierLabel = 'Must-Watch';
              cardGlow =
                'border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-white/[0.03] to-transparent shadow-lg shadow-emerald-950/30';
            } else if (game.tier === 'high') {
              tierBadgeColor =
                'bg-amber-500/15 text-amber-300 border-amber-500/30';
              tierLabel = 'Top Matchup';
              cardGlow =
                'border-amber-500/20 bg-gradient-to-br from-amber-950/15 via-white/[0.03] to-transparent';
            }

            // Timezone formatting
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

            const isHomeFollowed = followedIds.has(game.homeTeam.id);
            const isAwayFollowed = followedIds.has(game.awayTeam.id);

            return (
              <div
                key={game.id}
                className={`rounded-2xl border p-4 sm:p-5 transition-all duration-200 hover:border-white/20 flex flex-col justify-between space-y-4 ${cardGlow}`}
              >
                {/* Card Header: League + Excitement Score + Kickoff */}
                <div className='flex items-start justify-between gap-3 border-b border-white/5 pb-3'>
                  <div className='space-y-1'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <span className='px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-white uppercase tracking-wider'>
                        {game.league}
                      </span>

                      {/* Excitement Rating Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${tierBadgeColor}`}
                      >
                        <Flame className='h-3.5 w-3.5' />
                        <span>
                          {game.excitementScore}/100 • {tierLabel}
                        </span>
                      </span>
                    </div>

                    <p className='text-xs text-gray-400 font-medium flex items-center gap-1.5 pt-0.5'>
                      <Calendar className='h-3.5 w-3.5 text-gray-500' />
                      <span>{formattedKickoff}</span>
                    </p>
                  </div>

                  {/* Broadcast Badge */}
                  {game.broadcastSummary && (
                    <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-semibold shrink-0'>
                      <Tv className='h-3.5 w-3.5 text-emerald-400' />
                      <span>{game.broadcastSummary}</span>
                    </span>
                  )}
                </div>

                {/* Matchup Teams Row */}
                <div className='space-y-3 py-1'>
                  {/* Away Team */}
                  <div className='flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5'>
                    <div className='flex items-center gap-3 min-w-0'>
                      <div className='relative h-9 w-9 sm:h-10 sm:w-10 shrink-0 bg-white/5 rounded-full p-1.5 border border-white/10'>
                        <Image
                          src={game.awayTeam.logo}
                          alt={game.awayTeam.name}
                          fill
                          className='object-contain p-1'
                          unoptimized
                        />
                      </div>
                      <div className='min-w-0'>
                        <div className='flex items-center gap-1.5 flex-wrap'>
                          {game.awayTeam.rank && (
                            <span className='px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-black text-xs border border-amber-400/30'>
                              #{game.awayTeam.rank}
                            </span>
                          )}
                          <span className='font-bold text-white text-sm sm:text-base truncate'>
                            {game.awayTeam.name}
                          </span>
                        </div>
                        {game.awayTeam.record && (
                          <p className='text-[11px] text-gray-400 font-medium'>
                            {game.awayTeam.record} • Away
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Quick Follow Away */}
                    <button
                      onClick={() =>
                        handleToggleFollow(
                          game.awayTeam,
                          game.sport,
                          game.league,
                        )
                      }
                      disabled={pendingTeamId === game.awayTeam.id}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 border ${
                        isAwayFollowed
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white'
                      }`}
                    >
                      {pendingTeamId === game.awayTeam.id ? (
                        <Loader2 className='h-3.5 w-3.5 animate-spin' />
                      ) : isAwayFollowed ? (
                        <>
                          <Check className='h-3.5 w-3.5 text-emerald-400' />
                          <span>Followed</span>
                        </>
                      ) : (
                        <>
                          <Plus className='h-3.5 w-3.5' />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Home Team */}
                  <div className='flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5'>
                    <div className='flex items-center gap-3 min-w-0'>
                      <div className='relative h-9 w-9 sm:h-10 sm:w-10 shrink-0 bg-white/5 rounded-full p-1.5 border border-white/10'>
                        <Image
                          src={game.homeTeam.logo}
                          alt={game.homeTeam.name}
                          fill
                          className='object-contain p-1'
                          unoptimized
                        />
                      </div>
                      <div className='min-w-0'>
                        <div className='flex items-center gap-1.5 flex-wrap'>
                          {game.homeTeam.rank && (
                            <span className='px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-black text-xs border border-amber-400/30'>
                              #{game.homeTeam.rank}
                            </span>
                          )}
                          <span className='font-bold text-white text-sm sm:text-base truncate'>
                            {game.homeTeam.name}
                          </span>
                        </div>
                        {game.homeTeam.record && (
                          <p className='text-[11px] text-gray-400 font-medium'>
                            {game.homeTeam.record} • Home
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Quick Follow Home */}
                    <button
                      onClick={() =>
                        handleToggleFollow(
                          game.homeTeam,
                          game.sport,
                          game.league,
                        )
                      }
                      disabled={pendingTeamId === game.homeTeam.id}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 border ${
                        isHomeFollowed
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white'
                      }`}
                    >
                      {pendingTeamId === game.homeTeam.id ? (
                        <Loader2 className='h-3.5 w-3.5 animate-spin' />
                      ) : isHomeFollowed ? (
                        <>
                          <Check className='h-3.5 w-3.5 text-emerald-400' />
                          <span>Followed</span>
                        </>
                      ) : (
                        <>
                          <Plus className='h-3.5 w-3.5' />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Highlight Tags & Betting Footer */}
                <div className='border-t border-white/5 pt-3 space-y-2'>
                  {/* Highlight Tags */}
                  {game.highlightTags.length > 0 && (
                    <div className='flex items-center gap-1.5 flex-wrap'>
                      {game.highlightTags.map((tag, idx) => (
                        <span
                          key={idx}
                          className='px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-white/5 text-gray-300 border border-white/10'
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Odds & Venue Line */}
                  <div className='flex items-center justify-between text-[11px] text-gray-400 pt-0.5'>
                    {game.odds?.details ? (
                      <span className='flex items-center gap-1 font-mono text-cyan-300/90'>
                        <Dices className='h-3 w-3 text-cyan-400' />
                        <span>Spread: {game.odds.details}</span>
                        {game.odds.overUnder && (
                          <span className='text-gray-500'>
                            • O/U {game.odds.overUnder}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className='text-gray-500 italic'>
                        Odds opening soon
                      </span>
                    )}

                    {game.venue && (
                      <span className='truncate max-w-[180px] text-right text-gray-400'>
                        📍 {game.venue}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

