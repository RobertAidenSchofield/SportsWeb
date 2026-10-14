import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';
import { Trophy } from 'lucide-react';

export const metadata = {
  title: 'Sign In | Sports Digest',
  description: 'Sign in to access your personal sports schedule and digest settings.',
};

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#090d16]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors">
            <Trophy className="h-6 w-6" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">
            SportsDigest
          </span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-white/10 bg-[#0d121e] p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <AuthForm initialMode="signin" redirectTo="/dashboard" />
        </div>
      </div>
    </div>
  );
}
