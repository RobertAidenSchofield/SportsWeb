'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseBrowser';
import { Mail, Lock, Sparkles, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AuthFormProps {
  initialMode?: 'signin' | 'signup';
  onSuccess?: () => void;
  redirectTo?: string;
}

export function AuthForm({
  initialMode = 'signin',
  onSuccess,
  redirectTo = '/dashboard',
}: AuthFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup' | 'magiclink'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (mode === 'magiclink') {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
              redirectTo
            )}`,
          },
        });

        if (error) throw error;
        setSuccessMsg('Check your inbox! We sent you a magic login link.');
      } else if (mode === 'signup') {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
              redirectTo
            )}`,
          },
        });

        if (error) throw error;

        // If email confirmation is required:
        if (data?.user && !data.session) {
          setSuccessMsg(
            'Account created! Please check your email to verify your account.'
          );
        } else {
          router.push(redirectTo);
          router.refresh();
          if (onSuccess) onSuccess();
        }
      } else {
        // Sign in with password
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.push(redirectTo);
        router.refresh();
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMsg(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs font-semibold">
        <button
          type="button"
          onClick={() => {
            setMode('signin');
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className={`py-2 rounded-lg transition-all ${
            mode === 'signin'
              ? 'bg-emerald-500 text-black shadow font-bold'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('signup');
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className={`py-2 rounded-lg transition-all ${
            mode === 'signup'
              ? 'bg-emerald-500 text-black shadow font-bold'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Sign Up
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('magiclink');
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className={`py-2 rounded-lg transition-all ${
            mode === 'magiclink'
              ? 'bg-emerald-500 text-black shadow font-bold'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Magic Link
        </button>
      </div>

      {/* Header Info */}
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-white tracking-tight">
          {mode === 'signin' && 'Welcome Back'}
          {mode === 'signup' && 'Create Your Free Account'}
          {mode === 'magiclink' && 'Sign In with Magic Link'}
        </h2>
        <p className="text-xs text-gray-400">
          {mode === 'signin' && 'Enter your email and password to access your dashboard.'}
          {mode === 'signup' && 'Follow your favorite teams and get personalized digests.'}
          {mode === 'magiclink' && 'No password needed. We will email you a secure login link.'}
        </p>
      </div>

      {/* Status Alerts */}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleAuth} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-300">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
        </div>

        {mode !== 'magiclink' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-300">Password</label>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => setMode('magiclink')}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Forgot password? Use Magic Link
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-sm transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Please wait...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>
                {mode === 'signin' && 'Sign In'}
                {mode === 'signup' && 'Create Free Account'}
                {mode === 'magiclink' && 'Send Magic Link'}
              </span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
