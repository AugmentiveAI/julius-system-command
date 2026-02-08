import { useState, useEffect, useMemo } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { PlayerStateCheck, STATE_THRESHOLDS } from '@/types/playerState';
import { Progress } from '@/components/ui/progress';

const STATE_HISTORY_KEY = 'systemStateHistory';

function getLatestCheck(): PlayerStateCheck | null {
  try {
    const stored = localStorage.getItem(STATE_HISTORY_KEY);
    if (stored) {
      const checks: PlayerStateCheck[] = JSON.parse(stored);
      if (checks.length > 0) return checks[checks.length - 1];
    }
  } catch { /* ignore */ }
  return null;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return date1.toISOString().split('T')[0] === date2.toISOString().split('T')[0];
}

function timeSince(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getRecommendation(composite: number): 'push' | 'steady' | 'recover' {
  if (composite >= STATE_THRESHOLDS.push.minComposite) return 'push';
  if (composite >= STATE_THRESHOLDS.steady.minComposite) return 'steady';
  return 'recover';
}

const BARS = [
  { key: 'energy' as const, label: 'Energy', emoji: '⚡' },
  { key: 'focus' as const, label: 'Focus', emoji: '🎯' },
  { key: 'mood' as const, label: 'Mood', emoji: '🌡️' },
  { key: 'stress' as const, label: 'Stress', emoji: '💀' },
];

interface CurrentStateCardProps {
  onRescan: () => void;
  refreshKey?: number;
}

export function CurrentStateCard({ onRescan, refreshKey }: CurrentStateCardProps) {
  const [latest, setLatest] = useState<PlayerStateCheck | null>(null);

  useEffect(() => {
    setLatest(getLatestCheck());
  }, [refreshKey]);

  const isToday = latest ? isSameDay(new Date(latest.timestamp), new Date()) : false;
  const recommendation = latest ? getRecommendation(latest.compositeScore) : null;

  const modeConfig = useMemo(() => ({
    push: { label: 'PUSH', className: 'bg-green-500/20 text-green-400 border-green-500/40' },
    steady: { label: 'STEADY', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
    recover: { label: 'RECOVERY', className: 'bg-red-500/20 text-red-400 border-red-500/40' },
  }), []);

  if (!isToday || !latest) {
    return (
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-mono text-xs tracking-[0.15em] text-muted-foreground">CURRENT STATE</h3>
          <button onClick={onRescan} className="text-xs font-mono text-primary hover:underline tracking-wider">
            SCAN NOW
          </button>
        </div>
        <div className="flex items-center justify-center py-6">
          <p className="font-mono text-sm text-yellow-400 animate-pulse tracking-wider">
            ⚠️ No scan detected. The System is operating blind.
          </p>
        </div>
      </div>
    );
  }

  const compositeColor =
    latest.compositeScore >= 3.5 ? 'text-green-400' :
    latest.compositeScore >= 2.5 ? 'text-yellow-400' :
    'text-red-400';

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-xs tracking-[0.15em] text-muted-foreground">CURRENT STATE</h3>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-muted-foreground">{timeSince(new Date(latest.timestamp))}</span>
          <button onClick={onRescan} className="flex items-center gap-1 text-xs font-mono text-primary hover:underline tracking-wider">
            <RefreshCw className="w-3 h-3" />
            RESCAN
          </button>
        </div>
      </div>

      {/* Stat Bars */}
      <div className="grid grid-cols-2 gap-3">
        {BARS.map(({ key, label, emoji }) => {
          const value = latest[key] as number;
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground">{emoji} {label}</span>
                <span className="text-[10px] font-mono text-foreground">{value}/5</span>
              </div>
              <Progress value={value * 20} className="h-1.5 bg-muted [&>div]:bg-primary" />
            </div>
          );
        })}
      </div>

      {/* Composite + Mode */}
      <div className="flex items-center justify-between pt-1 border-t border-border/50">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-mono text-muted-foreground">Composite:</span>
          <span className={`text-sm font-mono font-bold ${compositeColor}`}>{latest.compositeScore.toFixed(1)}</span>
        </div>
        {recommendation && (
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${modeConfig[recommendation].className}`}>
            {modeConfig[recommendation].label}
          </span>
        )}
      </div>
    </div>
  );
}

/** Returns the current mode for the nav indicator. */
export function useCurrentMode(): 'push' | 'steady' | 'recover' | null {
  const latest = getLatestCheck();
  if (!latest || !isSameDay(new Date(latest.timestamp), new Date())) return null;
  return getRecommendation(latest.compositeScore);
}
