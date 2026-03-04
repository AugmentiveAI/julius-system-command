import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Player, PlayerStats } from '@/types/player';
import { Shadow } from '@/types/shadowArmy';
import { useGeneticState } from '@/hooks/useGeneticState';

const STAT_LABELS: Record<keyof PlayerStats, { label: string; icon: string }> = {
  sales: { label: 'Sales', icon: '💰' },
  systems: { label: 'Systems', icon: '⚙️' },
  creative: { label: 'Creative', icon: '🎨' },
  discipline: { label: 'Discipline', icon: '🔥' },
  network: { label: 'Network', icon: '🌐' },
  wealth: { label: 'Wealth', icon: '📈' },
};

interface StatusWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: Player;
  shadows: Shadow[];
  dungeonClears: number;
}

export function StatusWindow({ open, onOpenChange, player, shadows, dungeonClears }: StatusWindowProps) {
  const { geneticState } = useGeneticState();
  const totalStatPoints = Object.values(player.stats).reduce((a, b) => a + b, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm border-primary/30 bg-background/95 backdrop-blur-xl p-0 overflow-hidden"
        style={{
          boxShadow: '0 0 60px hsl(187 100% 50% / 0.1), inset 0 1px 0 hsl(187 100% 50% / 0.1)',
        }}
      >
        <DialogTitle className="sr-only">Status Window</DialogTitle>
        
        {/* Header glow bar */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-primary to-transparent" />

        <div className="p-5 space-y-5">
          {/* Title block */}
          <div className="text-center space-y-1">
            <p className="font-display text-[9px] tracking-[0.4em] uppercase text-primary/60">Status Window</p>
            <h2
              className="font-display text-2xl font-bold text-foreground"
              style={{ textShadow: '0 0 20px hsl(187 100% 50% / 0.3)' }}
            >
              {player.name}
            </h2>
            <p className="font-display text-xs tracking-widest text-secondary"
              style={{ textShadow: '0 0 8px hsl(263 91% 50% / 0.4)' }}
            >
              {player.title}
            </p>
          </div>

          {/* Key info row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md border border-border/50 bg-card/50 py-2">
              <p className="font-display text-lg font-bold text-primary"
                style={{ textShadow: '0 0 8px hsl(187 100% 50% / 0.4)' }}
              >
                {player.level}
              </p>
              <p className="font-mono text-[8px] tracking-wider text-muted-foreground">LEVEL</p>
            </div>
            <div className="rounded-md border border-border/50 bg-card/50 py-2">
              <p className="font-display text-lg font-bold text-foreground">{player.streak}</p>
              <p className="font-mono text-[8px] tracking-wider text-muted-foreground">STREAK</p>
            </div>
            <div className="rounded-md border border-border/50 bg-card/50 py-2">
              <p className="font-display text-lg font-bold text-foreground">{player.totalXP.toLocaleString()}</p>
              <p className="font-mono text-[8px] tracking-wider text-muted-foreground">TOTAL XP</p>
            </div>
          </div>

          {/* Class */}
          <div className="flex items-center justify-between rounded-md border border-border/30 bg-card/30 px-3 py-2">
            <span className="font-mono text-[10px] tracking-wider text-muted-foreground">CLASS</span>
            <span className="font-display text-xs font-bold text-primary"
              style={{ textShadow: '0 0 8px hsl(187 100% 50% / 0.3)' }}
            >
              Warrior-Sprinter
            </span>
          </div>

          {/* Stats */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-muted-foreground">Attributes</p>
              <p className="font-mono text-[9px] text-muted-foreground/50">{totalStatPoints} pts</p>
            </div>
            {(Object.keys(STAT_LABELS) as Array<keyof PlayerStats>).map(stat => {
              const val = player.stats[stat];
              const { label, icon } = STAT_LABELS[stat];
              return (
                <div key={stat} className="flex items-center gap-2">
                  <span className="text-xs w-4">{icon}</span>
                  <span className="font-mono text-[10px] w-16 text-muted-foreground">{label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${val}%`,
                        background: 'linear-gradient(90deg, hsl(263 91% 50%), hsl(187 100% 50%))',
                        boxShadow: val > 50 ? '0 0 6px hsl(187 100% 50% / 0.4)' : undefined,
                      }}
                    />
                  </div>
                  <span className="font-mono text-[10px] w-6 text-right text-foreground font-bold">{val}</span>
                </div>
              );
            })}
          </div>

          {/* Buffs / Debuffs */}
          {(geneticState.activeBuffs.length > 0 || geneticState.activeDebuffs.length > 0) && (
            <div className="space-y-1.5">
              <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-muted-foreground">Active Effects</p>
              {geneticState.activeBuffs.map((b, i) => (
                <p key={i} className="font-mono text-[10px] text-green-400">{b.icon} {b.name}</p>
              ))}
              {geneticState.activeDebuffs.map((d, i) => (
                <p key={i} className="font-mono text-[10px] text-red-400">{d.icon} {d.name}</p>
              ))}
            </div>
          )}

          {/* Army + Dungeons */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-violet-500/30 bg-violet-500/5 py-2 text-center">
              <p className="font-display text-lg font-bold text-violet-400">{shadows.length}</p>
              <p className="font-mono text-[8px] tracking-wider text-muted-foreground">SHADOWS</p>
            </div>
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 py-2 text-center">
              <p className="font-display text-lg font-bold text-amber-400">{dungeonClears}</p>
              <p className="font-mono text-[8px] tracking-wider text-muted-foreground">DUNGEONS CLEARED</p>
            </div>
          </div>
        </div>

        {/* Bottom glow bar */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-primary to-transparent" />
      </DialogContent>
    </Dialog>
  );
}
