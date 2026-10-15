'use client';

import { useState } from 'react';
import {
  Trophy,
  CalendarDays,
  PlusCircle,
  Flame,
  Star,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Team, MarqueeGame } from '@/lib/types';
import { SubscribedTeams } from '@/components/SubscribedTeams';
import { SchedulePreview } from '@/components/SchedulePreview';
import { CalendarSyncCard } from '@/components/CalendarSyncCard';
import { TeamSearch } from '@/components/TeamSearch';
import { TopGamesFeed } from '@/components/TopGamesFeed';

interface DashboardTabsProps {
  followedTeams: Team[];
  followedTeamIds: string[];
  effectiveUserId: string;
  userTimezone: string;
  initialTopGames: MarqueeGame[];
}

export function DashboardTabs({
  followedTeams,
  followedTeamIds,
  effectiveUserId,
  userTimezone,
  initialTopGames,
}: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<'my_teams' | 'top_games'>('my_teams');

  // Top 3 marquee games for quick highlight strip
  const topThreeGames = initialTopGames.slice(0, 3);

  return (
    <div className='space-y-8'>
      {/* Primary View Switcher Banner */}
      <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-1.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm'>
        <div className='grid grid-cols-2 gap-1.5 w-full sm:w-auto'>
          <button
            type='button'
            onClick={() => setActiveTab('my_teams')}
            className={`min-h-[44px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
              activeTab === 'my_teams'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-md shadow-emerald-950/40'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Star className='h-4 w-4 text-emerald-400' />
            <span>My Followed Teams</span>
            <span className='ml-1 px-2 py-0.5 rounded-full text-[11px] bg-white/10 text-white font-semibold'>
              {followedTeams.length}
            </span>
          </button>

          <button
            type='button'
            onClick={() => setActiveTab('top_games')}
            className={`min-h-[44px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
              activeTab === 'top_games'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-md shadow-emerald-950/40'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Flame className='h-4 w-4 text-amber-400' />
            <span>Marquee Matchups</span>
            <span className='ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase font-black tracking-wider animate-pulse'>
              HOT
            </span>
          </button>
        </div>

        {/* Quick context info */}
        <div className='hidden lg:flex items-center gap-2 pr-3 text-xs text-gray-400'>
          <Sparkles className='h-3.5 w-3.5 text-emerald-400' />
          <span>
            {activeTab === 'my_teams'
              ? 'Personalized weekly schedule and external calendar sync'
              : 'Dynamically scored marquee games across major pro & college leagues'}
          </span>
        </div>
      </div>

      {/* TAB CONTENT: MY TEAMS */}
      {activeTab === 'my_teams' && (
        <div className='space-y-8 animate-in fade-in duration-200'>
          {/* Quick Highlight Strip: Top Games of the Week Banner */}
          {topThreeGames.length > 0 && (
            <div className='rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-950/20 via-white/[0.02] to-transparent p-4 sm:p-5 backdrop-blur-sm space-y-3'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <span className='p-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30'>
                    <Flame className='h-4 w-4' />
                  </span>
                  <h3 className='text-xs sm:text-sm font-bold text-white uppercase tracking-wider'>
                    Featured Marquee Games This Week
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('top_games')}
                  className='text-xs font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1 transition-colors'
                >
                  <span>Explore All Top Games</span>
                  <ArrowRight className='h-3.5 w-3.5' />
                </button>
              </div>

              {/* 3 cards preview */}
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                {topThreeGames.map((g) => (
                  <div
                    key={g.id}
                    onClick={() => setActiveTab('top_games')}
                    className='cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] p-3 transition-colors space-y-1.5'
                  >
                    <div className='flex items-center justify-between text-[11px] text-gray-400'>
                      <span className='font-bold text-white'>{g.league}</span>
                      <span className='px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold'>
                        {g.excitementScore}/100
                      </span>
                    </div>
                    <p className='text-xs font-bold text-white truncate'>
                      {g.awayTeam.rank ? `#${g.awayTeam.rank} ` : ''}
                      {g.awayTeam.name} @{' '}
                      {g.homeTeam.rank ? `#${g.homeTeam.rank} ` : ''}
                      {g.homeTeam.name}
                    </p>
                    {g.broadcastSummary && (
                      <p className='text-[11px] text-emerald-400 font-medium'>
                        📺 {g.broadcastSummary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Followed Teams Section */}
          <section className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div>
                <h2 className='text-lg font-bold text-white flex items-center gap-2'>
                  <span>Your Followed Teams</span>
                  <span className='rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20'>
                    {followedTeams.length}
                  </span>
                </h2>
                <p className='text-xs text-gray-400 mt-0.5'>
                  These teams are featured in your weekly digest email and personal calendar feed.
                </p>
              </div>
            </div>

            <SubscribedTeams teams={followedTeams} />
          </section>

          {/* Calendar Subscription & Shareable Widget */}
          <CalendarSyncCard
            userId={effectiveUserId}
            followedTeamsCount={followedTeams.length}
          />

          {/* 7-Day Upcoming Schedule Preview */}
          {followedTeams.length > 0 && (
            <section className='space-y-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <h2 className='text-lg font-bold text-white flex items-center gap-2'>
                    <CalendarDays className='h-5 w-5 text-emerald-400' />
                    <span>Upcoming 7-Day Personal Schedule</span>
                  </h2>
                  <p className='text-xs text-gray-400 mt-0.5'>
                    Preview of fixtures for your followed teams.
                  </p>
                </div>
              </div>

              <SchedulePreview teams={followedTeams} userTimezone={userTimezone} />
            </section>
          )}

          {/* Search & Follow Teams */}
          <section className='space-y-4 pt-4 border-t border-white/10'>
            <div>
              <h2 className='text-lg font-bold text-white flex items-center gap-2'>
                <PlusCircle className='h-5 w-5 text-emerald-400' />
                <span>Discover & Follow More Teams</span>
              </h2>
              <p className='text-xs text-gray-400 mt-0.5'>
                Search across NFL, NBA, MLB, NHL, Premier League, MLS, and college teams.
              </p>
            </div>

            <TeamSearch initialSubscribedTeamIds={followedTeamIds} />
          </section>
        </div>
      )}

      {/* TAB CONTENT: MARQUEE MATCHUPS / TOP GAMES */}
      {activeTab === 'top_games' && (
        <div className='animate-in fade-in duration-200'>
          <TopGamesFeed
            initialGames={initialTopGames}
            initialFollowedTeamIds={followedTeamIds}
            userTimezone={userTimezone}
          />
        </div>
      )}
    </div>
  );
}
