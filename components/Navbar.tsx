'use client';

import Link from 'next/link';
import {
  SignInButton,
  SignUpButton,
  UserButton,
  SignedIn,
  SignedOut,
} from '@clerk/nextjs';
import { Trophy, Calendar, Sparkles } from 'lucide-react';

interface NavbarProps {
  isClerkConfigured?: boolean;
}

export function Navbar({ isClerkConfigured = false }: NavbarProps) {
  return (
    <header className='sticky top-0 z-50 w-full border-b border-white/10 bg-[#090d16]/80 backdrop-blur-md'>
      <div className='mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8'>
        <Link href='/' className='flex items-center gap-2.5 group'>
          <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors'>
            <Trophy className='h-5 w-5' />
          </div>
          <span className='font-bold text-lg tracking-tight text-white flex items-center gap-1.5'>
            SportsDigest
            <span className='rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20'>
              Weekly
            </span>
          </span>
        </Link>

        <nav className='flex items-center gap-4'>
          {isClerkConfigured ? (
            <>
              <SignedIn>
                <Link
                  href='/dashboard'
                  className='flex items-center gap-1.5 text-sm font-medium text-gray-300 hover:text-white transition-colors px-3 py-1.5 rounded-md hover:bg-white/5'
                >
                  <Calendar className='h-4 w-4 text-emerald-400' />
                  <span>Dashboard</span>
                </Link>
                <div className='h-5 w-[1px] bg-white/10 mx-1' />
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: 'h-8 w-8 ring-2 ring-emerald-500/30',
                    },
                  }}
                />
              </SignedIn>

              <SignedOut>
                <SignInButton mode='modal'>
                  <button className='text-sm font-medium text-gray-300 hover:text-white transition-colors px-3 py-1.5'>
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode='modal'>
                  <button className='flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-emerald-400 transition-all shadow-sm shadow-emerald-500/20'>
                    <Sparkles className='h-4 w-4' />
                    Get Started
                  </button>
                </SignUpButton>
              </SignedOut>
            </>
          ) : (
            <Link
              href='/dashboard'
              className='flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-emerald-400 transition-all shadow-sm shadow-emerald-500/20'
            >
              <Calendar className='h-4 w-4' />
              <span>Go to Dashboard</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

