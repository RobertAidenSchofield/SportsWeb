import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getUserSchedule } from '@/lib/schedule/userSchedule';
import { ShareScheduleView } from '@/components/ShareScheduleView';
import {
  Calendar,
  Clock,
  Tv,
  Trophy,
  ExternalLink,
  Share2,
  CalendarDays,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ embed?: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { userId } = await params;
  return {
    title: 'Weekly Match Schedule | Sports Digest',
    description: `Upcoming sports matchups and live scores`,
  };
}

export default async function SharePage({ params, searchParams }: PageProps) {
  const { userId } = await params;
  const { embed } = await searchParams;
  const isEmbed = embed === 'true';

  if (!userId) {
    notFound();
  }

  const schedule = await getUserSchedule(userId, { daysAhead: 14 });
  const {
    userTimezone,
    followedTeams: teams,
    pinnedMatches: pinnedGames,
    fixtures: allFixtures,
    fixturesByDate: grouped,
  } = schedule;

  const calendarFeedUrl = `/api/calendar/${userId}`;

  // Embed Mode View
  if (isEmbed) {
    return (
      <div className="min-h-screen bg-[#0b0f17] text-white p-3 sm:p-4 font-sans antialiased selection:bg-emerald-500 selection:text-black">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Compact Embed Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-400 border border-emerald-500/20">
                <Trophy className="h-4 w-4" />
              </span>
              <span className="text-sm font-bold text-white tracking-tight">
                Weekly Match Schedule
              </span>
            </div>
            <a
              href={`/share/${userId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <span>Open Full View</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <ShareScheduleView
            fixtures={allFixtures}
            userTimezone={userTimezone}
            userId={userId}
            teams={teams}
            pinnedGames={pinnedGames}
            isEmbed={true}
          />
        </div>
      </div>
    );
  }

  // Full Public Page View
  return (
    <div className="min-h-screen bg-[#07090e] text-white">
      {/* Top Navbar */}
      <nav className="border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-white hover:text-emerald-400 transition-colors"
          >
            <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Trophy className="h-5 w-5" />
            </span>
            <span className="tracking-tight text-lg">Sports Digest</span>
          </Link>

          <div className="flex items-center gap-3">
            <a
              href={calendarFeedUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 text-xs font-semibold transition-all"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Subscribe Feed (.ics)</span>
            </a>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-all"
            >
              <span>Build Your Own</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        {/* Header */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-emerald-950/20 via-black/40 to-blue-950/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
            Weekly Match Schedule
          </h1>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>
              Times in <strong className="text-gray-200">{userTimezone}</strong>
            </span>
            <span className="hidden sm:inline text-gray-600">•</span>
            <span className="hidden sm:inline">⭐ Bookmark for quick access</span>
          </div>
        </div>

        {/* Fixtures Schedule with Box Scores */}
        <section className="space-y-4">
          <ShareScheduleView
            fixtures={allFixtures}
            userTimezone={userTimezone}
            userId={userId}
            teams={teams}
            pinnedGames={pinnedGames}
            isEmbed={false}
          />
        </section>

        {/* Footer CTA */}
        <div className="pt-10 border-t border-white/10 text-center space-y-3">
          <p className="text-sm text-gray-400">
            Want your own personalized sports schedule, email digest, and live calendar sync?
          </p>
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition-all"
            >
              Get Started with Sports Digest
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

