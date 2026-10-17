'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Bookmark,
  Smartphone,
  Globe,
  Sparkles,
  Calendar,
} from 'lucide-react';

interface ShareWeeklyModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  followedTeamsCount: number;
  pinnedGamesCount: number;
}

export function ShareWeeklyModal({
  isOpen,
  onClose,
  userId,
  followedTeamsCount,
  pinnedGamesCount,
}: ShareWeeklyModalProps) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        setCanNativeShare(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shareUrl = origin ? `${origin}/share/${userId}` : `/share/${userId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy share link:', err);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'My Sports Schedule & Box Scores',
          text: `Check out my personalized weekly sports schedule for ${followedTeamsCount} teams on Sports Digest!`,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200'>
      <div
        className='relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#0d121f] p-5 sm:p-6 shadow-2xl space-y-5 text-white'
        role='dialog'
        aria-modal='true'
      >
        {/* Header */}
        <div className='flex items-center justify-between border-b border-white/10 pb-4'>
          <div className='flex items-center gap-2.5'>
            <span className='rounded-xl bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-500/20'>
              <Share2 className='h-5 w-5' />
            </span>
            <div>
              <h3 className='font-bold text-white text-base sm:text-lg'>
                Share & Bookmark Weekly View
              </h3>
              <p className='text-xs text-gray-400'>
                Public link with live scores & game schedules
              </p>
            </div>
          </div>

          <button
            type='button'
            onClick={onClose}
            className='p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors'
            aria-label='Close modal'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        {/* Content */}
        <div className='space-y-4 text-xs sm:text-sm'>
          <p className='text-gray-300 leading-relaxed'>
            This unique public link displays your customized schedule featuring{' '}
            <strong className='text-white'>{followedTeamsCount} followed teams</strong>
            {pinnedGamesCount > 0 ? (
              <>
                {' '}and <strong className='text-white'>{pinnedGamesCount} pinned games</strong>
              </>
            ) : null}
            . Anyone with this link can view kickoff times, live score updates, and full box scores—<span className='text-emerald-300 font-medium'>no sign-in needed</span>.
          </p>

          {/* Shareable Link Input Box */}
          <div className='space-y-1.5'>
            <label className='text-xs font-semibold text-gray-300 flex items-center justify-between'>
              <span>Public Schedule URL</span>
              <span className='text-[11px] text-gray-500 font-normal'>
                Always synced with ESPN
              </span>
            </label>
            <div className='flex items-center gap-2'>
              <input
                readOnly
                value={shareUrl}
                className='w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300 font-mono truncate focus:outline-none select-all'
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                type='button'
                onClick={copyToClipboard}
                className='px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors shadow-sm'
              >
                {copied ? (
                  <>
                    <Check className='h-3.5 w-3.5' />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className='h-3.5 w-3.5' />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Bookmark Tip Card */}
          <div className='rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/20 via-white/[0.02] to-transparent p-3.5 sm:p-4 space-y-2'>
            <div className='flex items-center gap-2 text-amber-300 font-bold text-xs'>
              <Bookmark className='h-4 w-4 text-amber-400' />
              <span>Bookmark for 1-Click Quick Access</span>
            </div>
            <p className='text-xs text-gray-300 leading-relaxed'>
              Add this link to your browser bookmarks (press <kbd className='px-1.5 py-0.5 rounded bg-white/10 font-mono text-[11px] text-white'>Cmd+D</kbd> or <kbd className='px-1.5 py-0.5 rounded bg-white/10 font-mono text-[11px] text-white'>Ctrl+D</kbd>) or choose <strong className='text-white'>&ldquo;Add to Home Screen&rdquo;</strong> on your phone. You can check your teams&apos; games and live scores anytime with zero login friction!
            </p>
          </div>

          {/* Action Buttons */}
          <div className='pt-1 flex flex-col sm:flex-row gap-2'>
            <a
              href={shareUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold text-xs text-center transition-colors'
            >
              <ExternalLink className='h-4 w-4 text-emerald-400' />
              <span>Open Public Page</span>
            </a>

            {canNativeShare && (
              <button
                type='button'
                onClick={handleNativeShare}
                className='flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 font-bold text-xs transition-colors'
              >
                <Share2 className='h-4 w-4 text-emerald-400' />
                <span>Share via App / Text</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
