/**
 * PR2b: Settings section for daily brief delivery schedule.
 * Lets the user pick their timezone and the local hour they want
 * the brief generated. Persists to profiles via useBriefSchedule.
 */

import { useMemo } from 'react';
import { Clock, Globe, Loader2, Check } from 'lucide-react';
import { useBriefSchedule } from '@/hooks/useBriefSchedule';
import { getUserTimezone } from '@/utils/dateUtils';

// Common IANA zones — keep short and curated. Detect button covers the rest.
const COMMON_TIMEZONES = [
  'UTC',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number): string {
  const period = h < 12 ? 'AM' : 'PM';
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:00 ${period}`;
}

export function BriefScheduleSection() {
  const { schedule, loading, saving, error, update, detectTimezone } = useBriefSchedule();

  const browserTz = useMemo(() => getUserTimezone(), []);
  const tzOptions = useMemo(() => {
    const set = new Set([...COMMON_TIMEZONES, schedule.timezone, browserTz]);
    return Array.from(set).filter(Boolean).sort();
  }, [schedule.timezone, browserTz]);

  const tzMatches = schedule.timezone === browserTz;

  return (
    <div
      className="rounded-lg border border-primary/20 bg-card/80 p-5 space-y-5"
      style={{ boxShadow: '0 0 20px hsl(187 100% 50% / 0.06)' }}
    >
      <div className="flex items-center gap-2.5">
        <Clock className="h-4 w-4 text-primary" />
        <h2 className="font-display text-xs uppercase tracking-[0.2em] text-foreground">
          Daily Brief Schedule
        </h2>
        {saving && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
      </div>

      <p className="font-mono text-[10px] text-muted-foreground/60">
        Briefs generate at your local hour. The system polls hourly and fires when your time matches.
      </p>

      {/* Timezone */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <Globe className="h-3.5 w-3.5" />
            Timezone
          </label>
          {!tzMatches && (
            <button
              onClick={() => detectTimezone()}
              disabled={saving || loading}
              className="font-mono text-[10px] uppercase tracking-wider text-primary/80 hover:text-primary disabled:opacity-50"
            >
              Use browser ({browserTz})
            </button>
          )}
          {tzMatches && (
            <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-primary/60">
              <Check className="h-3 w-3" /> Matches browser
            </span>
          )}
        </div>
        <select
          value={schedule.timezone}
          onChange={(e) => update({ timezone: e.target.value })}
          disabled={loading || saving}
          className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary/50 disabled:opacity-50"
        >
          {tzOptions.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>

      {/* Hour */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Delivery hour (local)
        </label>
        <select
          value={schedule.dailyBriefHour}
          onChange={(e) => update({ dailyBriefHour: parseInt(e.target.value, 10) })}
          disabled={loading || saving}
          className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary/50 disabled:opacity-50"
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>{formatHour(h)}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="font-mono text-[10px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
