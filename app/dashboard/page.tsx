import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabaseServer';
import {
  ensureUserProfile,
  getUserSubscriptions,
} from '@/app/actions';
import { isBackendConfigured } from '@/lib/supabaseClient';
import { TeamSearch } from '@/components/TeamSearch';
import { SubscribedTeams } from '@/components/SubscribedTeams';
import { SchedulePreview } from '@/components/SchedulePreview';
import { CalendarSyncCard } from '@/components/CalendarSyncCard';
import { TimezoneSelector } from '@/components/TimezoneSelector';
import {
  Trophy,
  CalendarDays,
  PlusCircle,
  Settings,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
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
    <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-10'>
      {/* Top Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6'>
        <div>
          <h1 className='text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5'>
            <Trophy className='h-7 w-7 text-emerald-400' />
            Sports Digest Dashboard
          </h1>
          <p className='text-sm text-gray-400 mt-1'>
            Managing digest for{' '}
            <span className='text-white font-medium'>{userEmail}</span>
          </p>
        </div>

        {/* Timezone Preference */}
        <div className='bg-white/5 border border-white/10 rounded-xl p-2.5'>
          <TimezoneSelector initialTimezone={userTimezone} />
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
              These teams are included in your weekly digest email.
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
                <span>Upcoming 7-Day Schedule</span>
              </h2>
              <p className='text-xs text-gray-400 mt-0.5'>
                Preview of fixtures that will be featured in your next digest.
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
            Search across NFL, NBA, MLB, NHL, Premier League, MLS, and college
            teams.
          </p>
        </div>

        <TeamSearch initialSubscribedTeamIds={followedTeamIds} />
      </section>
    </div>
  );
}

