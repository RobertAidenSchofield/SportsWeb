'use client';

import { useState, useEffect } from 'react';
import {
  CalendarDays,
  Flame,
  Star,
  PlusCircle,
  Calendar,
  Sparkles,
  ArrowRight,
  Pin,
  Search,
  Trophy,
  Share2,
} from 'lucide-react';
import { Team, MarqueeGame } from '@/lib/types';
import { SubscribedTeams } from '@/components/SubscribedTeams';
import { SchedulePreview } from '@/components/SchedulePreview';
import { CalendarSyncCard } from '@/components/CalendarSyncCard';
import { TeamSearch } from '@/components/TeamSearch';
import { TopGamesFeed } from '@/components/TopGamesFeed';
import { PinnedGamesSection } from '@/components/PinnedGamesSection';
import { ShareWeeklyModal } from '@/components/ShareWeeklyModal';
import { unpinGame } from '@/app/actions';

export type DashboardTabKey =
  | 'weekly'
  | 'teams'
  | 'discover'
  | 'top_games'
  | 'calendar';

interface DashboardTabsProps {
  followedTeams: Team[];
  followedTeamIds: string[];
  effectiveUserId: string;
  userTimezone: string;
  initialTopGames: MarqueeGame[];
  initialPinnedGames?: MarqueeGame[];
  initialTab?: DashboardTabKey;
}

export function DashboardTabs({
  followedTeams,
  followedTeamIds,
  effectiveUserId,
  userTimezone,
  initialTopGames,
  initialPinnedGames = [],
  initialTab = 'weekly',
}: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<DashboardTabKey>(initialTab);
  const [pinnedGames, setPinnedGames] = useState<MarqueeGame[]>(initialPinnedGames);
  const [showShareModal, setShowShareModal] = useState(false);

  // Sync with URL hash or search params on client mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace('#', '');
    if (
      hash === 'weekly' ||
      hash === 'teams' ||
      hash === 'discover' ||
      hash === 'top_games' ||
      hash === 'calendar'
    ) {
      setActiveTab(hash as DashboardTabKey);
    }
  }, []);

  const handleSelectTab = (tab: DashboardTabKey) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${tab}`);
    }
  };

  const handleUnpin = async (gameId: string) => {
    setPinnedGames((prev) => prev.filter((g) => g.id !== gameId));
    try {
      await unpinGame(gameId);
    } catch (e) {
      console.error('Failed to unpin game:', e);
    }
  };

  const handlePinToggle = (game: MarqueeGame, isPinned: boolean) => {
    setPinnedGames((prev) => {
      if (isPinned) {
        if (prev.some((g) => g.id === game.id)) return prev;
        return [...prev, game];
      } else {
        return prev.filter((g) => g.id !== game.id);
      }
    });
  };

  const totalSourcesCount = followedTeams.length + pinnedGames.length;

  return (
    <div className='space-y-6 sm:space-y-8'>
      {/* Primary Navigation & View Switcher Bar */}
      <div className='flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-1.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md shadow-sm'>
        {/* Navigation Tabs */}
        <div className='flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none'>
          {/* 1. Weekly View Button (Primary View) */}
          <button
            type='button'
            onClick={() => handleSelectTab('weekly')}
            className={`min-h-[42px] flex items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 shrink-0 ${
              activeTab === 'weekly'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 shadow-md shadow-emerald-950/40'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <CalendarDays className='h-4 w-4 text-emerald-400' />
            <span>Weekly View</span>
            {totalSourcesCount > 0 && (
              <span className='px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'>
                {totalSourcesCount}
              </span>
            )}
          </button>

          {/* 2. Followed Teams & Pinned Matches */}
          <button
            type='button'
            onClick={() => handleSelectTab('teams')}
            className={`min-h-[42px] flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 shrink-0 ${
              activeTab === 'teams'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 shadow-md shadow-emerald-950/40'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Star className='h-4 w-4 text-amber-400' />
            <span>My Teams & Matches</span>
            <div className='flex items-center gap-1'>
              <span className='px-1.5 py-0.5 rounded-full text-[10px] bg-white/10 text-white font-semibold'>
                {followedTeams.length}
              </span>
              {pinnedGames.length > 0 && (
                <span className='px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-semibold flex items-center gap-0.5'>
                  <Pin className='h-2.5 w-2.5 rotate-45' />
                  {pinnedGames.length}
                </span>
              )}
            </div>
          </button>

          {/* 3. Discover Teams */}
          <button
            type='button'
            onClick={() => handleSelectTab('discover')}
            className={`min-h-[42px] flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 shrink-0 ${
              activeTab === 'discover'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 shadow-md shadow-emerald-950/40'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <PlusCircle className='h-4 w-4 text-emerald-400' />
            <span>Discover Teams</span>
          </button>

          {/* 4. Marquee Matchups */}
          <button
            type='button'
            onClick={() => handleSelectTab('top_games')}
            className={`min-h-[42px] flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 shrink-0 ${
              activeTab === 'top_games'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 shadow-md shadow-emerald-950/40'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Flame className='h-4 w-4 text-amber-400' />
            <span>Marquee Matchups</span>
            <span className='px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase font-black'>
              HOT
            </span>
          </button>

          {/* 5. Calendar Sync & Share */}
          <button
            type='button'
            onClick={() => handleSelectTab('calendar')}
            className={`min-h-[42px] flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 shrink-0 ${
              activeTab === 'calendar'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 shadow-md shadow-emerald-950/40'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Calendar className='h-4 w-4 text-cyan-400' />
            <span>Calendar Sync</span>
          </button>
        </div>

        {/* Quick Shortcut to Weekly View when user is in any other tab */}
        {activeTab !== 'weekly' ? (
          <button
            type='button'
            onClick={() => handleSelectTab('weekly')}
            className='flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all shrink-0 shadow-sm'
            title='Return to the unified weekly schedule'
          >
            <CalendarDays className='h-3.5 w-3.5 text-emerald-400' />
            <span>Go to Weekly View</span>
            <ArrowRight className='h-3 w-3' />
          </button>
        ) : (
          <div className='hidden xl:flex items-center gap-2 pr-3 text-xs text-gray-400'>
            <Sparkles className='h-3.5 w-3.5 text-emerald-400' />
            <span>Weekly fixtures, live scores & interactive box scores</span>
          </div>
        )}
      </div>

      {/* ----------------- TAB 1: WEEKLY VIEW ----------------- */}
      {activeTab === 'weekly' && (
        <div className='space-y-6 animate-in fade-in duration-200'>
          {/* Header Bar */}
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4'>
            <div>
              <h2 className='text-lg sm:text-xl font-bold text-white flex items-center gap-2.5'>
                <CalendarDays className='h-5 w-5 text-emerald-400' />
                <span>Weekly Schedule & Box Scores</span>
              </h2>
              <p className='text-xs text-gray-400 mt-1'>
                Full game schedule for your {followedTeams.length} followed{' '}
                {followedTeams.length === 1 ? 'team' : 'teams'} and{' '}
                {pinnedGames.length} pinned{' '}
                {pinnedGames.length === 1 ? 'matchup' : 'matchups'}. Click{' '}
                <strong className='text-emerald-300'>Box Score</strong> on any
                game for quarter linescores and team statistics.
              </p>
            </div>

            {/* Quick Actions Strip */}
            <div className='flex items-center gap-2 flex-wrap'>
              <button
                type='button'
                onClick={() => setShowShareModal(true)}
                className='inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors shadow-sm'
                title='Share this weekly view or bookmark it for quick access'
              >
                <Share2 className='h-3.5 w-3.5 text-emerald-400' />
                <span>Share / Bookmark View</span>
              </button>

              <button
                type='button'
                onClick={() => handleSelectTab('discover')}
                className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors'
              >
                <PlusCircle className='h-3.5 w-3.5 text-emerald-400' />
                <span>Follow Teams</span>
              </button>

              <button
                type='button'
                onClick={() => handleSelectTab('top_games')}
                className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors'
              >
                <Flame className='h-3.5 w-3.5 text-amber-400' />
                <span>Top Matchups</span>
              </button>

              <button
                type='button'
                onClick={() => handleSelectTab('calendar')}
                className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-cyan-300 border border-white/10 transition-colors'
              >
                <Calendar className='h-3.5 w-3.5 text-cyan-400' />
                <span>Calendar Sync</span>
              </button>
            </div>
          </div>

          {/* Unified Weekly Schedule Preview with Box Scores */}
          <SchedulePreview
            teams={followedTeams}
            userTimezone={userTimezone}
            pinnedGames={pinnedGames}
            onUnpinGame={handleUnpin}
            onExploreTopGames={() => handleSelectTab('top_games')}
            userId={effectiveUserId}
          />
        </div>
      )}

      {/* ----------------- TAB 2: MY TEAMS & PINNED MATCHES ----------------- */}
      {activeTab === 'teams' && (
        <div className='space-y-8 animate-in fade-in duration-200'>
          {/* Quick jump to weekly schedule banner */}
          <div className='flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/20 via-white/[0.02] to-transparent border border-emerald-500/20'>
            <div className='flex items-center gap-2.5 text-xs text-gray-300'>
              <CalendarDays className='h-4 w-4 text-emerald-400' />
              <span>
                Want to see kickoff times and box scores for these teams?
              </span>
            </div>
            <button
              type='button'
              onClick={() => handleSelectTab('weekly')}
              className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs transition-colors'
            >
              <span>Go to Weekly View</span>
              <ArrowRight className='h-3.5 w-3.5' />
            </button>
          </div>

          {/* Individually Pinned Games Section */}
          <PinnedGamesSection
            initialPinnedGames={pinnedGames}
            userTimezone={userTimezone}
            onExploreTopGames={() => handleSelectTab('top_games')}
            onGameUnpinned={handleUnpin}
          />

          {/* Followed Teams Section */}
          <section className='space-y-4 pt-4 border-t border-white/10'>
            <div className='flex items-center justify-between'>
              <div>
                <h2 className='text-lg font-bold text-white flex items-center gap-2'>
                  <Star className='h-5 w-5 text-amber-400' />
                  <span>Your Followed Teams</span>
                  <span className='rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20'>
                    {followedTeams.length}
                  </span>
                </h2>
                <p className='text-xs text-gray-400 mt-0.5'>
                  These teams are featured in your weekly digest email and
                  personal schedule.
                </p>
              </div>

              <button
                type='button'
                onClick={() => handleSelectTab('discover')}
                className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold transition-colors'
              >
                <PlusCircle className='h-3.5 w-3.5 text-emerald-400' />
                <span>+ Follow More Teams</span>
              </button>
            </div>

            <SubscribedTeams teams={followedTeams} />
          </section>
        </div>
      )}

      {/* ----------------- TAB 3: DISCOVER & FOLLOW TEAMS ----------------- */}
      {activeTab === 'discover' && (
        <div className='space-y-6 animate-in fade-in duration-200'>
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4'>
            <div>
              <h2 className='text-lg sm:text-xl font-bold text-white flex items-center gap-2'>
                <PlusCircle className='h-5 w-5 text-emerald-400' />
                <span>Discover & Follow Teams</span>
              </h2>
              <p className='text-xs text-gray-400 mt-1'>
                Search across NFL, NBA, MLB, NHL, Premier League, MLS, and college
                sports to build your weekly digest.
              </p>
            </div>

            <button
              type='button'
              onClick={() => handleSelectTab('weekly')}
              className='inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-colors shrink-0'
            >
              <CalendarDays className='h-3.5 w-3.5 text-emerald-400' />
              <span>Go to Weekly View</span>
              <ArrowRight className='h-3 w-3' />
            </button>
          </div>

          <TeamSearch initialSubscribedTeamIds={followedTeamIds} />
        </div>
      )}

      {/* ----------------- TAB 4: MARQUEE MATCHUPS ----------------- */}
      {activeTab === 'top_games' && (
        <div className='space-y-6 animate-in fade-in duration-200'>
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4'>
            <div>
              <h2 className='text-lg sm:text-xl font-bold text-white flex items-center gap-2'>
                <Flame className='h-5 w-5 text-amber-400' />
                <span>Marquee Matchups</span>
              </h2>
              <p className='text-xs text-gray-400 mt-1'>
                Dynamically scored matchups across sports. Pin specific games to
                track them on your Weekly View without following the whole team.
              </p>
            </div>

            <button
              type='button'
              onClick={() => handleSelectTab('weekly')}
              className='inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-colors shrink-0'
            >
              <CalendarDays className='h-3.5 w-3.5 text-emerald-400' />
              <span>Go to Weekly View</span>
              <ArrowRight className='h-3 w-3' />
            </button>
          </div>

          <TopGamesFeed
            initialGames={initialTopGames}
            initialFollowedTeamIds={followedTeamIds}
            initialPinnedGameIds={pinnedGames.map((g) => g.id)}
            userTimezone={userTimezone}
            onPinToggle={handlePinToggle}
          />
        </div>
      )}

      {/* ----------------- TAB 5: CALENDAR SYNC & SHARING ----------------- */}
      {activeTab === 'calendar' && (
        <div className='space-y-6 animate-in fade-in duration-200'>
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4'>
            <div>
              <h2 className='text-lg sm:text-xl font-bold text-white flex items-center gap-2'>
                <Calendar className='h-5 w-5 text-cyan-400' />
                <span>Calendar Subscription & Public Share</span>
              </h2>
              <p className='text-xs text-gray-400 mt-1'>
                Automatically sync your schedule with Apple Calendar, Google
                Calendar, or Outlook.
              </p>
            </div>

            <button
              type='button'
              onClick={() => handleSelectTab('weekly')}
              className='inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-colors shrink-0'
            >
              <CalendarDays className='h-3.5 w-3.5 text-emerald-400' />
              <span>Go to Weekly View</span>
              <ArrowRight className='h-3 w-3' />
            </button>
          </div>

          <CalendarSyncCard
            userId={effectiveUserId}
            followedTeamsCount={totalSourcesCount}
          />
        </div>
      )}

      {/* Share & Bookmark Modal */}
      {showShareModal && (
        <ShareWeeklyModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          userId={effectiveUserId}
          followedTeamsCount={followedTeams.length}
          pinnedGamesCount={pinnedGames.length}
        />
      )}
    </div>
  );
}
