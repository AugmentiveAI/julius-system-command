import { ArrowUp, Minus, ArrowDown, AlertTriangle, Zap, Dna } from 'lucide-react';
import { Intensity } from '@/utils/questCalibration';

interface CalibrationBannerProps {
  mode: 'push' | 'steady' | 'recover';
  intensity: Intensity;
  systemMessage: string;
  xpMultiplier: number;
  geneticAlert: string | null;
  recoveryBonus?: boolean;
}

const MODE_CONFIG = {
  push: {
    label: 'PUSH MODE',
    Icon: ArrowUp,
    color: 'text-green-400',
    border: 'border-green-500/40',
    bg: 'bg-green-500/5',
    glow: '0 0 20px rgba(74,222,128,0.15)',
  },
  steady: {
    label: 'STEADY MODE',
    Icon: Minus,
    color: 'text-yellow-400',
    border: 'border-yellow-500/40',
    bg: 'bg-yellow-500/5',
    glow: '0 0 20px rgba(250,204,21,0.15)',
  },
  recover: {
    label: 'RECOVERY MODE',
    Icon: ArrowDown,
    color: 'text-red-400',
    border: 'border-red-500/40',
    bg: 'bg-red-500/5',
    glow: '0 0 20px rgba(248,113,113,0.15)',
  },
};

export const CalibrationBanner = ({
  mode,
  intensity,
  systemMessage,
  xpMultiplier,
  geneticAlert,
  recoveryBonus,
}: CalibrationBannerProps) => {
  const config = MODE_CONFIG[mode];
  const { Icon } = config;

  const showMultiplier = xpMultiplier !== 1;

  return (
    <div
      className={`rounded-lg border ${config.border} ${config.bg} p-4 space-y-3`}
      style={{ boxShadow: config.glow }}
    >
      {/* Mode Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${config.color}`} />
          <span className={`font-mono text-sm font-bold tracking-[0.15em] ${config.color}`}>
            {config.label}
          </span>
        </div>
        <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
          System Calibration
        </span>
      </div>

      {/* System Message */}
      <p className="font-mono text-xs text-muted-foreground leading-relaxed">
        "{systemMessage}"
      </p>

      {/* Badges row */}
      <div className="flex flex-wrap gap-2">
        {showMultiplier && (
          <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border ${
            xpMultiplier > 1
              ? 'text-green-400 border-green-500/40 bg-green-500/10'
              : 'text-amber-400 border-amber-500/40 bg-amber-500/10'
          }`}>
            <Zap className="h-3 w-3" />
            {xpMultiplier > 1
              ? `${xpMultiplier}x XP ACTIVE`
              : `${xpMultiplier}x XP`}
            {recoveryBonus && ' + Recovery Bonus'}
          </span>
        )}

        {geneticAlert && (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border text-purple-400 border-purple-500/40 bg-purple-500/10">
            <Dna className="h-3 w-3" />
            {geneticAlert.length > 60 ? geneticAlert.slice(0, 57) + '...' : geneticAlert}
          </span>
        )}
      </div>
    </div>
  );
};
