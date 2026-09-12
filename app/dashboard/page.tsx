import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ensureUserProfile, getUserSubscriptions } from '@/app/actions';
import { TeamSearch } from '@/components/TeamSearch';
import { SubscribedTeams } from '@/components/SubscribedTeams';
import { SchedulePreview } from '@/components/SchedulePreview';
import { TimezoneSelector } from '@/components/TimezoneSelector';
import { Trophy, CalendarDays, PlusCircle, Settings } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY,
  );

  let userEmail = 'fan@example.com (Preview Mode)';

  const profile = await ensureUserProfile();
  const subscriptions = await getUserSubscriptions();
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

