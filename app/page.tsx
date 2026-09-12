import Link from 'next/link';
import { SignUpButton, SignedIn, SignedOut } from '@clerk/nextjs';
import {
  Trophy,
  Mail,
  Calendar,
  Tv,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className='relative isolate overflow-hidden'>
      {/* Background glow effects */}
      <div className='absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80'>
        <div className='relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-emerald-600 to-cyan-500 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]' />
      </div>

      {/* Hero Section */}
      <div className='mx-auto max-w-5xl px-6 py-20 sm:py-28 text-center'>
        <div className='inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400 mb-6'>
          <Sparkles className='h-3.5 w-3.5' />
          <span>Automated Weekly Sports Schedule</span>
        </div>

        <h1 className='text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight sm:leading-tight'>
          Never miss kickoff again. All your teams in{' '}
          <span className='text-emerald-400'>one weekly digest</span>.
        </h1>

        <p className='mt-6 text-base sm:text-lg text-gray-300 max-w-2xl mx-auto'>
          Follow your favorite NFL, NBA, MLB, Premier League, and college teams.
          Receive a clean, personalized schedule every week converted to your
          local timezone with TV broadcast channels.
        </p>

        <div className='mt-8 flex items-center justify-center gap-4'>
          {Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) ? (
            <>
              <SignedOut>
                <SignUpButton mode='modal'>
                  <button className='flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-base font-bold text-gray-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.02]'>
                    Start Your Free Digest
                    <ArrowRight className='h-4 w-4' />
                  </button>
                </SignUpButton>
              </SignedOut>

              <SignedIn>
                <Link
                  href='/dashboard'
                  className='flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-base font-bold text-gray-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20'
                >
                  Go to Your Dashboard
                  <ArrowRight className='h-4 w-4' />
                </Link>
              </SignedIn>
            </>
          ) : (
            <Link
              href='/dashboard'
              className='flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-base font-bold text-gray-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.02]'
            >
              Start Your Free Digest
              <ArrowRight className='h-4 w-4' />
            </Link>
          )}
        </div>

        {/* Feature Highlights Grid */}
        <div className='mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left'>
          <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm'>
            <div className='h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4'>
              <Trophy className='h-5 w-5' />
            </div>
            <h3 className='font-semibold text-lg text-white'>
              Follow Any Team
            </h3>
            <p className='mt-2 text-sm text-gray-400'>
              Instant search across NFL, NBA, MLB, NHL, Premier League, MLS, and
              college conferences.
            </p>
          </div>

          <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm'>
            <div className='h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4'>
              <Tv className='h-5 w-5' />
            </div>
            <h3 className='font-semibold text-lg text-white'>
              Know Where to Watch
            </h3>
            <p className='mt-2 text-sm text-gray-400'>
              Each fixture highlights the broadcast channel (ESPN, FOX, CBS,
              Peacock, NBC) and kickoff time.
            </p>
          </div>

          <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm'>
            <div className='h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4'>
              <Mail className='h-5 w-5' />
            </div>
            <h3 className='font-semibold text-lg text-white'>
              Zero Clutter Email
            </h3>
            <p className='mt-2 text-sm text-gray-400'>
              Get a distraction-free, beautiful weekly email grouped by day.
            </p>
          </div>
        </div>

        {/* Interactive / Visual Preview */}
        <div className='mt-16 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-6 sm:p-8 text-left max-w-3xl mx-auto shadow-2xl'>
          <div className='flex items-center justify-between border-b border-white/10 pb-4 mb-6'>
            <div className='flex items-center gap-2'>
              <span className='h-3 w-3 rounded-full bg-red-500/80' />
              <span className='h-3 w-3 rounded-full bg-yellow-500/80' />
              <span className='h-3 w-3 rounded-full bg-emerald-500/80' />
              <span className='ml-3 text-xs text-gray-400 font-mono'>
                Sample Email Preview
              </span>
            </div>
            <span className='text-xs text-emerald-400 font-semibold'>
              Weekly Delivery
            </span>
          </div>

          <div className='space-y-4'>
            <div className='text-xs font-semibold text-emerald-400 uppercase tracking-wider'>
              Saturday, Sep 19
            </div>

            <div className='p-3.5 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between'>
              <div>
                <p className='text-sm font-bold text-white'>
                  Arsenal vs Manchester City
                </p>
                <p className='text-xs text-gray-400'>
                  Premier League • Emirates Stadium
                </p>
              </div>
              <div className='text-right'>
                <p className='text-xs font-bold text-white'>11:30 AM EST</p>
                <span className='text-[11px] font-semibold text-emerald-400'>
                  📺 NBC Sports
                </span>
              </div>
            </div>

            <div className='p-3.5 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between'>
              <div>
                <p className='text-sm font-bold text-white'>
                  Kansas City Chiefs @ Buffalo Bills
                </p>
                <p className='text-xs text-gray-400'>NFL • Highmark Stadium</p>
              </div>
              <div className='text-right'>
                <p className='text-xs font-bold text-white'>4:25 PM EST</p>
                <span className='text-[11px] font-semibold text-emerald-400'>
                  📺 CBS
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

