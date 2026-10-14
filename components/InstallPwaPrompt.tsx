'use client';

import { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Trophy } from 'lucide-react';

export function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    // Check if dismissed before
    const dismissed = localStorage.getItem('pwa_prompt_dismissed');
    if (dismissed) return;

    // Check if already in standalone mode (installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) return;

    setIsDismissed(false);

    // Chrome/Android beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);

    if (isIosDevice && isSafari) {
      setIsIos(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isIos) setShowIosPrompt(true);
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (isDismissed || (!isInstallable && !isIos)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-2xl border border-emerald-500/30 bg-[#0d121f]/95 backdrop-blur-xl p-4 shadow-2xl text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                Install Sports Digest App
              </h4>
              <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">
                Add to your home screen for quick kickoff checks and instant access.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-lg p-1 text-gray-400 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action Button / iOS Instruction */}
        <div className="mt-3 pt-3 border-t border-white/10">
          {isInstallable ? (
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-[0.98]"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Install to Home Screen</span>
            </button>
          ) : isIos ? (
            <div className="text-[11px] text-gray-300 flex items-center gap-1.5 justify-center py-1 bg-white/5 rounded-lg border border-white/5">
              <span>Tap</span>
              <Share className="h-3.5 w-3.5 text-cyan-400 inline" />
              <span>then select</span>
              <span className="font-semibold text-white inline-flex items-center gap-1">
                <PlusSquare className="h-3.5 w-3.5 text-emerald-400 inline" />
                &quot;Add to Home Screen&quot;
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

