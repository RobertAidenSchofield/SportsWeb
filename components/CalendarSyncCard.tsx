'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Code2,
  Sparkles,
  Smartphone,
  Globe,
} from 'lucide-react';

interface CalendarSyncCardProps {
  userId: string;
  followedTeamsCount: number;
}

export function CalendarSyncCard({
  userId,
  followedTeamsCount,
}: CalendarSyncCardProps) {
  const [origin, setOrigin] = useState('');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const calendarHttpUrl = origin
    ? `${origin}/api/calendar/${userId}`
    : `/api/calendar/${userId}`;

  // webcal protocol replaces https:// or http:// with webcal://
  const webcalUrl = origin
    ? calendarHttpUrl.replace(/^https?:\/\//i, 'webcal://')
    : `webcal:///api/calendar/${userId}`;

  const googleCalUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(
    calendarHttpUrl
  )}`;

  const shareWebUrl = origin
    ? `${origin}/share/${userId}`
    : `/share/${userId}`;

  const embedSnippet = `<iframe src="${shareWebUrl}?embed=true" width="100%" height="600" style="border:none; border-radius: 12px;" title="Sports Schedule"></iframe>`;

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-4 sm:p-6 shadow-xl backdrop-blur-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-bold text-white">
              Live Sync & Shareable Schedule
            </h2>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Subscribe directly in your favorite calendar app or share your custom team schedule with friends.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Auto-refreshing 2-week feed
          </span>
        </div>
      </div>

      {followedTeamsCount === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-gray-400">
          Follow at least one team below to generate your personalized calendar subscription and public schedule.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Calendar Subscriptions Column */}
          <div className="flex flex-col justify-between space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <Calendar className="h-4 w-4" />
                <span>1-Click Calendar Subscription</span>
              </div>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Syncs game times, opponent matchups, and TV broadcast channels directly into your calendar. Automatically updates when game times change.
              </p>
            </div>

            {/* Quick 1-click action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <a
                href={webcalUrl}
                className="min-h-[44px] flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Smartphone className="h-4 w-4 text-gray-300" />
                Apple / iOS / Mac
              </a>
              <a
                href={googleCalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Globe className="h-4 w-4 text-blue-400" />
                Google Calendar
                <ExternalLink className="h-3 w-3 text-gray-400" />
              </a>
            </div>

            {/* Copy ICS URL */}
            <div className="pt-2 border-t border-white/5">
              <label className="text-[11px] font-medium text-gray-400 block mb-1.5">
                Direct .ICS Feed URL (Outlook, Thunderbird, etc.)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={calendarHttpUrl}
                  className="w-full text-xs font-mono bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-gray-300 select-all focus:outline-none focus:border-emerald-500/50"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(calendarHttpUrl, 'calendar')}
                  className="shrink-0 min-h-[38px] flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-colors active:scale-95"
                >
                  {copiedType === 'calendar' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Public Share & Embed Column */}
          <div className="flex flex-col justify-between space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                <Share2 className="h-4 w-4" />
                <span>Public Schedule & Embed Widget</span>
              </div>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Share a live, public webpage of your followed teams&apos; upcoming schedule, or embed it as a clean widget into Notion, blogs, or home displays.
              </p>
            </div>

            {/* Share Page link & preview */}
            <div className="space-y-3 pt-2">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-medium text-gray-400">
                    Public Share URL
                  </label>
                  <a
                    href={shareWebUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                  >
                    View Page <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareWebUrl}
                    className="w-full text-xs font-mono bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-gray-300 select-all focus:outline-none focus:border-cyan-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(shareWebUrl, 'share')}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500/20 hover:cyan-500/30 text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition-colors"
                  >
                    {copiedType === 'share' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Embed Code */}
              <div className="pt-2 border-t border-white/5">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5">
                    <Code2 className="h-3 w-3 text-gray-400" />
                    Embed Widget (Notion, Obsidian, iframe)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={embedSnippet}
                    className="w-full text-xs font-mono bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-gray-300 select-all focus:outline-none focus:border-cyan-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(embedSnippet, 'embed')}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-gray-200 text-xs font-semibold border border-white/10 transition-colors"
                  >
                    {copiedType === 'embed' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

