'use client';

import { useTransition } from 'react';
import Image from 'next/image';
import { Trash2, Trophy, Loader2 } from 'lucide-react';
import { Team } from '@/lib/types';
import { unfollowTeam } from '@/app/actions';

interface SubscribedTeamsProps {
  teams: Team[];
  onUnfollow?: (teamId: string) => void;
}

export function SubscribedTeams({ teams, onUnfollow }: SubscribedTeamsProps) {
  const [isPending, startTransition] = useTransition();

  const handleUnfollow = (teamId: string) => {
    if (onUnfollow) {
      onUnfollow(teamId);
    }
    startTransition(async () => {
      try {
        await unfollowTeam(teamId);
      } catch (err) {
        console.error('Failed to unfollow team:', err);
      }
    });
  };

  if (teams.length === 0) {
    return (
      <div className='rounded-2xl border border-dashed border-white/10 p-8 text-center bg-white/[0.02]'>
        <Trophy className='mx-auto h-10 w-10 text-gray-500/60 mb-3' />
        <h3 className='text-base font-semibold text-white'>
          No teams followed yet
        </h3>
        <p className='text-xs text-gray-400 mt-1 max-w-sm mx-auto'>
          Search and follow your favorite sports teams below to receive their
          upcoming game schedules in your weekly digest.
        </p>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3'>
      {teams.map((team) => (
        <div
          key={team.id}
          className='group relative flex flex-col items-center justify-between p-3.5 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 transition-all text-center'
        >
          <div className='relative h-12 w-12 rounded-lg bg-white/5 p-1 flex items-center justify-center border border-white/5 mb-2'>
            {team.logo_url ? (
              <Image
                src={team.logo_url}
                alt={team.name}
                width={40}
                height={40}
                className='object-contain'
                unoptimized
              />
            ) : (
              <Trophy className='h-6 w-6 text-gray-400' />
            )}
          </div>

          <p className='text-xs font-semibold text-white line-clamp-1 group-hover:text-emerald-300 transition-colors'>
            {team.name}
          </p>
          <span className='text-[10px] text-gray-400 mt-0.5'>
            {team.league}
          </span>

          <button
            onClick={() => handleUnfollow(team.id)}
            disabled={isPending}
            className='mt-3 flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-400 transition-colors py-0.5 px-2 rounded hover:bg-red-500/10'
            title='Unfollow team'
          >
            {isPending ? (
              <Loader2 className='h-3 w-3 animate-spin' />
            ) : (
              <Trash2 className='h-3 w-3' />
            )}
            <span>Remove</span>
          </button>
        </div>
      ))}
    </div>
  );
}

