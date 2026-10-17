import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabaseServer';
import {
  ensureUserProfile,
  getUserSubscriptions,
  getUserPinnedGames,
} from '@/app/actions';
import { getTopLeagueGames } from '@/lib/sportsApi';
import { isBackendConfigured } from '@/lib/supabaseClient';
import { DashboardTabs } from '@/components/DashboardTabs';
import { TimezoneSelector } from '@/components/TimezoneSelector';
import {
  Trophy,
  AlertTriangle,
  ExternalLink,
  CalendarDays,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams?: Promise<{ tab?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const tabParam = resolvedParams?.tab;
  const initialTab =
    tabParam === 'weekly' ||
    tabParam === 'teams' ||
    tabParam === 'discover' ||
    tabParam === 'top_games' ||
    tabParam === 'calendar'
      ? tabParam
      : 'weekly';

  const backendConfigured = isBackendConfigured();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (backendConfigured && !user) {
    redirect('/sign-in');
  }

  const userEmail = user?.email || 'fan@example.com';
  const effectiveUserId = user?.id || 'demo_user';

  let profile = null;
  let subscriptions: any[] = [];
  let connectionError: string | null = null;

  try {
    profile = await ensureUserProfile();
  } catch (err: any) {
    console.error('ensureUserProfile failed:', err);
    connectionError = err?.message || 'Database error';
  }

  try {
    subscriptions = await getUserSubscriptions();
  } catch (err: any) {
    console.error('getUserSubscriptions failed:', err);
  }

  let initialPinnedGames: any[] = [];
  try {
    initialPinnedGames = await getUserPinnedGames();
  } catch (err: any) {
    console.error('getUserPinnedGames failed:', err);
  }

  let initialTopGames: any[] = [];
  try {
    initialTopGames = await getTopLeagueGames({
      leagueFilter: 'all',
      daysAhead: 7,
      limit: 50,
    });
  } catch (err: any) {
    console.error('getTopLeagueGames failed in dashboard:', err);
  }

  if (backendConfigured && !profile) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    connectionError = `Cannot connect to Supabase at ${supabaseUrl}. Your project may be paused in the Supabase Dashboard, or your Project URL might have a typo.`;
  }

  const userTimezone = profile?.timezone || 'America/New_York';

  const followedTeams = subscriptions
    .map((s) => s.team)
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  const followedTeamIds = followedTeams.map((t) => t.id);

  return (
    <div className='mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6'>
      {/* Top Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-3 sm:pb-4'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2 sm:gap-2.5'>
            <Trophy className='h-5 w-5 sm:h-6 sm:w-6 text-emerald-400 shrink-0' />
            Sports Digest Dashboard
          </h1>
          <p className='text-xs text-gray-400 mt-0.5 truncate max-w-xl'>
            Managing digest for{' '}
            <span className='text-white font-medium'>{userEmail}</span>
          </p>
        </div>

        {/* Header Right Actions: Weekly View Button + Timezone Selector */}
        <div className='flex items-center gap-2 flex-wrap w-full sm:w-auto'>
          <a
            href='#weekly'
            className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all shadow-sm'
            title='View weekly schedule with box scores'
          >
            <CalendarDays className='h-3.5 w-3.5 text-emerald-400' />
            <span>Weekly View</span>
          </a>

          <div className='bg-white/5 border border-white/10 rounded-xl p-1.5 flex-1 sm:flex-initial'>
            <TimezoneSelector initialTimezone={userTimezone} />
          </div>
        </div>
      </div>

      {/* Supabase Connection Banner */}
      {connectionError && (
        <div className='rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-200 backdrop-blur-sm shadow-lg'>
          <div className='flex items-start gap-3.5'>
            <AlertTriangle className='h-5 w-5 text-amber-400 shrink-0 mt-0.5' />
            <div className='space-y-1 text-xs sm:text-sm'>
              <h3 className='font-bold text-amber-300 text-sm sm:text-base'>
                Supabase Connection Unreachable
              </h3>
              <p className='text-amber-200/90 leading-relaxed'>
                {connectionError}
              </p>
              <div className='pt-2 flex flex-wrap gap-3'>
                <a
                  href='https://supabase.com/dashboard'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 font-semibold text-amber-200 transition-colors'
                >
                  <span>Open Supabase Dashboard</span>
                  <ExternalLink className='h-3.5 w-3.5' />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Tabs (Weekly View, Followed Teams, Discover, Marquee Matchups, Calendar Sync) */}
      <DashboardTabs
        followedTeams={followedTeams}
        followedTeamIds={followedTeamIds}
        effectiveUserId={effectiveUserId}
        userTimezone={userTimezone}
        initialTopGames={initialTopGames}
        initialPinnedGames={initialPinnedGames}
        initialTab={initialTab}
      />
    </div>
  );
}

