'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseBrowser';
import { AuthModal } from './AuthModal';
import { Trophy, Calendar, Sparkles, LogOut, User as UserIcon } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

export function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [isSigningOut, setIsSigningOut] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    // Listen to real-time auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setIsSigningOut(false);
    }
  };

  const openSignIn = () => {
    setAuthModalMode('signin');
    setAuthModalOpen(true);
  };

  const openSignUp = () => {
    setAuthModalMode('signup');
    setAuthModalOpen(true);
  };

  const userInitial = user?.email ? user.email[0].toUpperCase() : 'U';

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#090d16]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors">
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="font-bold text-base sm:text-lg tracking-tight text-white flex items-center gap-1.5">
              SportsDigest
              <span className="hidden sm:inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                Weekly
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-4 shrink-0">
            {user ? (
              <div className="flex items-center gap-1.5 sm:gap-3">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-300 hover:text-white transition-colors px-2.5 sm:px-3 py-1.5 rounded-lg hover:bg-white/5 active:bg-white/10"
                >
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
                  <span>Dashboard</span>
                </Link>

                <div className="h-4 w-[1px] bg-white/10 mx-0.5 hidden sm:block" />

                {/* User avatar & sign-out button */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 px-2 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold text-emerald-300 shrink-0">
                      {userInitial}
                    </div>
                    <span className="max-w-[100px] md:max-w-[140px] truncate hidden md:inline">
                      {user.email}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/5 active:bg-white/10 transition-colors"
                    title="Sign Out"
                    aria-label="Sign Out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={openSignIn}
                  className="text-xs sm:text-sm font-medium text-gray-300 hover:text-white transition-colors px-2.5 sm:px-3 py-1.5"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={openSignUp}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-gray-950 hover:bg-emerald-400 transition-all shadow-sm shadow-emerald-500/20 active:scale-95"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Get Started</span>
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Auth Modal for 1-click popup signin/signup */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </>
  );
}
