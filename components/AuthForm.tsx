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
        setSuccessMsg('Check your inbox! We sent you a secure magic login link.');
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

        if (data?.user && !data.session) {
          setSuccessMsg(
            'Account created! Please check your email inbox to verify your account.'
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
      setErrorMsg(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-3 gap-1 bg-black/40 p-1.5 rounded-xl border border-white/10 text-xs font-semibold">
        <button
          type="button"
          onClick={() => {
            setMode('signin');
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className={`py-2 px-1 rounded-lg transition-all text-center ${
            mode === 'signin'
              ? 'bg-emerald-500 text-gray-950 font-bold shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
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
          className={`py-2 px-1 rounded-lg transition-all text-center ${
            mode === 'signup'
              ? 'bg-emerald-500 text-gray-950 font-bold shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
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
          className={`py-2 px-1 rounded-lg transition-all text-center ${
            mode === 'magiclink'
              ? 'bg-emerald-500 text-gray-950 font-bold shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Magic Link
        </button>
      </div>

      {/* Title & Description */}
      <div className="text-center space-y-1.5">
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          {mode === 'signin' && 'Welcome Back'}
          {mode === 'signup' && 'Create Your Account'}
          {mode === 'magiclink' && 'Sign In Passwordless'}
        </h2>
        <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
          {mode === 'signin' && 'Enter your credentials to manage your followed teams and schedule.'}
          {mode === 'signup' && 'Follow your favorite teams and get weekly kickoff schedules.'}
          {mode === 'magiclink' && 'We will send a one-click login link straight to your inbox.'}
        </p>
      </div>

      {/* Status Alerts */}
      {errorMsg && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
          <span className="leading-relaxed">{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
          <span className="leading-relaxed">{successMsg}</span>
        </div>
      )}

      {/* Form Fields */}
      <form onSubmit={handleAuth} className="space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-300 block mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="h-11 w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-3.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
            />
          </div>
        </div>

        {mode !== 'magiclink' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-300">
                Password
              </label>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => setMode('magiclink')}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Forgot? Use Magic Link
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-3.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="h-11 w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-sm transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
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
                {mode === 'signup' && 'Create Account'}
                {mode === 'magiclink' && 'Send Magic Link'}
              </span>
            </>
          )}
        </button>
      </form>

      {/* Alternative Bottom Navigation */}
      <div className="pt-2 text-center text-xs text-gray-400 border-t border-white/5">
        {mode === 'signin' && (
          <p>
            Don&apos;t have an account yet?{' '}
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-emerald-400 hover:text-emerald-300 font-semibold underline-offset-2 hover:underline transition-colors ml-1"
            >
              Sign up
            </button>
          </p>
        )}
        {mode === 'signup' && (
          <p>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-emerald-400 hover:text-emerald-300 font-semibold underline-offset-2 hover:underline transition-colors ml-1"
            >
              Sign in
            </button>
          </p>
        )}
        {mode === 'magiclink' && (
          <p>
            Prefer using a password?{' '}
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-emerald-400 hover:text-emerald-300 font-semibold underline-offset-2 hover:underline transition-colors ml-1"
            >
              Sign in with password
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
