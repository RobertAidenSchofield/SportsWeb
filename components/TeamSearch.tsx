'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Search, Loader2, Plus, Check, Trophy } from 'lucide-react';
import { Team } from '@/lib/types';
import { followTeam, unfollowTeam } from '@/app/actions';

interface TeamSearchProps {
  initialSubscribedTeamIds: string[];
  onSubscriptionChange?: (team: Team, isSubscribed: boolean) => void;
}

const LEAGUE_TABS = [
  { id: 'all', label: 'All Sports' },
  { id: 'nfl', label: 'NFL' },
  { id: 'nba', label: 'NBA' },
  { id: 'mlb', label: 'MLB' },
  { id: 'nhl', label: 'NHL' },
  { id: 'premier league', label: 'EPL' },
  { id: 'mls', label: 'MLS' },
  { id: 'ncaa football', label: 'NCAAF' },
  { id: 'ncaa basketball', label: 'NCAAB' },
  { id: 'la liga', label: 'La Liga' },
  { id: 'uefa champions league', label: 'UCL' },
];

export function TeamSearch({
  initialSubscribedTeamIds,
  onSubscriptionChange,
}: TeamSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedLeague, setSelectedLeague] = useState('all');
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(48);

  // Optimistic tracking of followed team IDs
  const [optimisticFollows, setOptimisticFollows] = useState<Set<string>>(
    new Set(initialSubscribedTeamIds),
  );
  const [pendingTeamId, setPendingTeamId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Reset pagination when search query or league tab changes
  useEffect(() => {
    setVisibleCount(48);
  }, [query, selectedLeague]);

  // Synchronize when initial list changes from parent
  useEffect(() => {
    setOptimisticFollows(new Set(initialSubscribedTeamIds));
  }, [initialSubscribedTeamIds]);

  // Debounced search
  useEffect(() => {
    setLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: query,
          league: selectedLeague,
        });
        const res = await fetch(`/api/teams/search?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setTeams(data.teams || []);
        }
      } catch (err) {
        console.error('Failed to search teams:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [query, selectedLeague]);

  // Auto-paginate more teams as user scrolls
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 300) {
      setVisibleCount((prev) => Math.min(prev + 48, teams.length));
    }
  };

  const handleToggleFollow = async (team: Team) => {
    const isCurrentlyFollowed = optimisticFollows.has(team.id);
    const nextState = !isCurrentlyFollowed;
    const savedScrollY = typeof window !== 'undefined' ? window.scrollY : 0;

    // 1. Optimistic update immediately
    setOptimisticFollows((prev) => {
      const next = new Set(prev);
      if (nextState) {
        next.add(team.id);
      } else {
        next.delete(team.id);
      }
      return next;
    });

    if (onSubscriptionChange) {
      onSubscriptionChange(team, nextState);
    }

    setPendingTeamId(team.id);

    // 2. Perform Server Action inside transition
    startTransition(async () => {
      try {
        const res = nextState
          ? await followTeam(team)
          : await unfollowTeam(team.id);

        if (!res.success) {
          alert(`Could not follow team: ${res.error}`);
          setOptimisticFollows((prev) => {
            const rollback = new Set(prev);
            if (isCurrentlyFollowed) {
              rollback.add(team.id);
            } else {
              rollback.delete(team.id);
            }
            return rollback;
          });
          if (onSubscriptionChange) {
            onSubscriptionChange(team, isCurrentlyFollowed);
          }
          return;
        }

        router.refresh();
        if (typeof window !== 'undefined') {
          requestAnimationFrame(() => {
            window.scrollTo({ top: savedScrollY, behavior: 'instant' });
          });
        }
      } catch (error: any) {
        console.error('Failed to update subscription:', error);
        alert(
          `Could not follow team: ${error?.message || error || 'Unknown error'}`,
        );
        setOptimisticFollows((prev) => {
          const rollback = new Set(prev);
          if (isCurrentlyFollowed) {
            rollback.add(team.id);
          } else {
            rollback.delete(team.id);
          }
          return rollback;
        });
        if (onSubscriptionChange) {
          onSubscriptionChange(team, isCurrentlyFollowed);
        }
      } finally {
        setPendingTeamId(null);
      }
    });
  };

  const visibleTeams = teams.slice(0, visibleCount);

  return (
    <div className='w-full space-y-3.5'>
      {/* Search Input */}
      <div className='relative'>
        <Search className='absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
        <input
          type='text'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search teams by name, city, mascot, or abbreviation (e.g. Chiefs, Pats, Warriors, SF, Man U)...'
          className='w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-10 py-3 text-base sm:text-sm text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors'
        />
        {loading && (
          <Loader2 className='absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-emerald-400' />
        )}
      </div>

      {/* League Filter Pills */}
      <div className='flex items-center gap-1.5 overflow-x-auto pb-1.5 text-xs -mx-1 px-1 sm:mx-0 sm:px-0'>
        {LEAGUE_TABS.map((tab) => {
          const active = selectedLeague.toLowerCase() === tab.id.toLowerCase();
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedLeague(tab.id)}
              className={`shrink-0 whitespace-nowrap px-3.5 py-2 min-h-[36px] rounded-lg font-medium active:scale-95 transition-all ${
                active
                  ? 'bg-emerald-500 text-gray-950 font-semibold shadow-sm'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Results Header Count */}
      <div className='flex items-center justify-between text-xs text-gray-400 px-0.5 pt-1'>
        <span>
          {loading
            ? 'Searching teams...'
            : query.trim()
            ? `Found ${teams.length} ${teams.length === 1 ? 'team' : 'teams'} matching "${query.trim()}"`
            : selectedLeague === 'all'
            ? `Showing all ${teams.length} teams across all leagues`
            : `Showing all ${teams.length} ${LEAGUE_TABS.find((t) => t.id === selectedLeague)?.label || selectedLeague} teams`}
        </span>
        {teams.length > visibleCount && (
          <span className='text-gray-500 text-[11px]'>
            Showing {visibleCount} of {teams.length}
          </span>
        )}
      </div>

      {/* Team Results Grid with Continuous Scrolling */}
      <div
        onScroll={handleScroll}
        className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[540px] sm:max-h-[620px] overflow-y-auto pr-1'
      >
        {visibleTeams.map((team) => {
          const isFollowed = optimisticFollows.has(team.id);
          const isThisPending = pendingTeamId === team.id && isPending;

          return (
            <div
              key={team.id}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                isFollowed
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              <div className='flex items-center gap-3 min-w-0'>
                <div className='relative h-10 w-10 shrink-0 rounded-lg bg-white/5 p-1.5 flex items-center justify-center border border-white/5'>
                  {team.logo_url ? (
                    <Image
                      src={team.logo_url}
                      alt={team.name}
                      width={36}
                      height={36}
                      className='object-contain'
                      unoptimized
                    />
                  ) : (
                    <Trophy className='h-5 w-5 text-gray-400' />
                  )}
                </div>
                <div className='min-w-0'>
                  <p className='font-semibold text-sm text-white truncate'>
                    {team.name}
                  </p>
                  <div className='flex items-center gap-1.5 text-[11px] text-emerald-400/90'>
                    <span className='font-medium'>{team.league}</span>
                    {team.abbreviation && (
                      <>
                        <span className='text-gray-600'>•</span>
                        <span className='text-gray-400 font-mono text-[10px] uppercase'>
                          {team.abbreviation}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleToggleFollow(team)}
                disabled={isThisPending}
                className={`shrink-0 ml-2 sm:ml-3 flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg text-xs font-semibold active:scale-95 transition-all ${
                  isFollowed
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30'
                    : 'bg-white/10 text-white hover:bg-emerald-500 hover:text-gray-950 border border-white/10'
                }`}
                title={isFollowed ? 'Click to unfollow' : 'Follow team'}
              >
                {isThisPending ? (
                  <Loader2 className='h-3.5 w-3.5 animate-spin' />
                ) : isFollowed ? (
                  <>
                    <Check className='h-3.5 w-3.5' />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <Plus className='h-3.5 w-3.5' />
                    <span>Follow</span>
                  </>
                )}
              </button>
            </div>
          );
        })}

        {/* Load more button at bottom if still more teams to display */}
        {teams.length > visibleCount && (
          <div className='col-span-full py-4 text-center'>
            <button
              onClick={() =>
                setVisibleCount((prev) => Math.min(prev + 48, teams.length))
              }
              className='inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-all shadow-sm active:scale-95'
            >
              <span>
                Load more teams ({teams.length - visibleCount} remaining)
              </span>
            </button>
          </div>
        )}

        {teams.length === 0 && !loading && (
          <div className='col-span-full py-10 text-center text-gray-400'>
            <p className='text-sm'>
              No teams found matching &ldquo;{query}&rdquo;
            </p>
            <p className='text-xs text-gray-500 mt-1'>
              Try searching by city (e.g. &ldquo;Kansas City&rdquo;), abbreviation (e.g. &ldquo;KC&rdquo;), or nickname.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

