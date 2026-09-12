'use client';

import { useState, useTransition } from 'react';
import { Globe, Check, Loader2 } from 'lucide-react';
import { updateUserTimezone } from '@/app/actions';

interface TimezoneSelectorProps {
  initialTimezone?: string;
}

const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
  { value: 'Europe/London', label: 'London, Dublin (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European Time (Paris, Berlin)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
];

export function TimezoneSelector({
  initialTimezone = 'America/New_York',
}: TimezoneSelectorProps) {
  const [timezone, setTimezone] = useState(initialTimezone);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTz = e.target.value;
    setTimezone(newTz);
    setSaved(false);

    startTransition(async () => {
      try {
        await updateUserTimezone(newTz);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } catch (err) {
        console.error('Failed to update timezone:', err);
      }
    });
  };

  return (
    <div className='flex items-center gap-2 text-xs'>
      <Globe className='h-4 w-4 text-emerald-400 shrink-0' />
      <div className='flex items-center gap-2'>
        <label htmlFor='tz-select' className='text-gray-400 font-medium'>
          Digest Timezone:
        </label>
        <select
          id='tz-select'
          value={timezone}
          onChange={handleChange}
          disabled={isPending}
          className='rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors cursor-pointer'
        >
          {COMMON_TIMEZONES.map((tz) => (
            <option
              key={tz.value}
              value={tz.value}
              className='bg-[#0f172a] text-white'
            >
              {tz.label}
            </option>
          ))}
        </select>
      </div>
      {isPending && (
        <Loader2 className='h-3.5 w-3.5 animate-spin text-emerald-400' />
      )}
      {saved && (
        <span className='flex items-center gap-1 text-[11px] text-emerald-400'>
          <Check className='h-3 w-3' /> Saved
        </span>
      )}
    </div>
  );
}

