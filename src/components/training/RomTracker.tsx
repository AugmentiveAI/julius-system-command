import { useState } from 'react';
import { Activity, TrendingUp, Lock, Unlock } from 'lucide-react';
import { usePhysicalState } from '@/hooks/usePhysicalState';
import { Button } from '@/components/ui/button';
import { getContraindications } from '@/utils/exerciseContraindications';

const PHASE_LABELS = {
  mobility: 'Mobility',
  strength: 'Strength',
  power: 'Power',
  performance: 'Performance',
};

const PHASE_COLORS = {
  mobility: 'text-red-400 bg-red-500/10 border-red-500/30',
  strength: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  power: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  performance: 'text-green-400 bg-green-500/10 border-green-500/30',
};

function romColor(val: number): string {
  if (val >= 95) return 'text-green-400';
  if (val >= 85) return 'text-amber-400';
  return 'text-red-400';
}

function romBg(val: number): string {
  if (val >= 95) return 'bg-green-500';
  if (val >= 85) return 'bg-amber-500';
  return 'bg-red-500';
}

export function RomTracker() {
  const { physicalState, logRomReading, getRehabProgress, getLimitingFactor } = usePhysicalState();
  const [showForm, setShowForm] = useState(false);
  const [leftVal, setLeftVal] = useState(physicalState.romLeftKnee);
  const [rightVal, setRightVal] = useState(physicalState.romRightKnee);
  const [notes, setNotes] = useState('');

  const progress = getRehabProgress();
  const limiting = getLimitingFactor();
  const contraindications = getContraindications(physicalState.romLeftKnee, physicalState.romRightKnee, physicalState.rehabPhase);

  // Next unlock text
  const weaker = Math.min(physicalState.romLeftKnee, physicalState.romRightKnee);
  let nextUnlock = '';
  if (weaker < 85) nextUnlock = `Reach 85% ROM to advance to Strength phase`;
  else if (weaker < 95) nextUnlock = `Reach 95% ROM to unlock running and plyometrics`;
  else if (weaker < 100) nextUnlock = `Reach 100% ROM for full performance clearance`;

  // Sparkline from last 8 entries
  const sparkData = physicalState.rehabLog.slice(-8);

  const handleSubmit = async () => {
    await logRomReading(leftVal, rightVal, notes || undefined);
    setShowForm(false);
    setNotes('');
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-bold text-foreground">Recovery Status</h3>
        </div>
        <span className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold ${PHASE_COLORS[physicalState.rehabPhase]}`}>
          {PHASE_LABELS[physicalState.rehabPhase]}
        </span>
      </div>

      {/* Knee ROM Display */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Left Knee', value: physicalState.romLeftKnee, post: '8yr post-op' },
          { label: 'Right Knee', value: physicalState.romRightKnee, post: '3yr post-op' },
        ].map(knee => (
          <div key={knee.label} className="rounded-md border border-border/50 bg-background/50 p-2.5 text-center space-y-1">
            <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{knee.label}</p>
            <p className={`font-display text-2xl font-bold ${romColor(knee.value)}`}>{knee.value}%</p>
            <div className="mx-auto h-1.5 w-full max-w-[80px] rounded-full bg-muted/30 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${romBg(knee.value)}`} style={{ width: `${knee.value}%` }} />
            </div>
            <p className="font-mono text-[8px] text-muted-foreground">{knee.post}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] text-muted-foreground">Overall Recovery</span>
          <span className="font-mono text-[9px] text-primary">{progress}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted/30 overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* ROM sparkline */}
      {sparkData.length > 1 && (
        <div className="flex items-end gap-[2px] h-6">
          {sparkData.map((entry, i) => {
            const minRom = Math.min(entry.leftKnee, entry.rightKnee);
            return (
              <div
                key={i}
                className={`flex-1 rounded-sm ${romBg(minRom)} opacity-70`}
                style={{ height: `${Math.max(10, (minRom / 100) * 100)}%` }}
              />
            );
          })}
        </div>
      )}

      {/* Next unlock */}
      {nextUnlock && (
        <div className="flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5">
          <Lock className="h-3 w-3 text-primary shrink-0" />
          <span className="font-mono text-[10px] text-primary">{nextUnlock}</span>
        </div>
      )}

      {/* Limiting factor */}
      <p className="font-mono text-[9px] text-muted-foreground">{limiting}</p>

      {/* Contraindications */}
      {contraindications.length > 0 && (
        <div className="space-y-1">
          <p className="font-mono text-[8px] uppercase tracking-wider text-destructive/70">Flagged exercises:</p>
          {contraindications.slice(0, 3).map((c, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="font-mono text-[9px] text-destructive/80">⚠ {c.exercise}</span>
              <span className="font-mono text-[8px] text-muted-foreground">— {c.reason}</span>
            </div>
          ))}
        </div>
      )}

      {/* Log ROM button / form */}
      {!showForm ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(true)}
          className="w-full text-xs"
        >
          <TrendingUp className="h-3 w-3 mr-1.5" />
          Log Today's ROM
        </Button>
      ) : (
        <div className="space-y-2 rounded-md border border-border/50 bg-background/50 p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Left Knee %</label>
              <input
                type="range" min={0} max={100} value={leftVal}
                onChange={e => setLeftVal(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <p className={`text-center font-mono text-xs ${romColor(leftVal)}`}>{leftVal}%</p>
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Right Knee %</label>
              <input
                type="range" min={0} max={100} value={rightVal}
                onChange={e => setRightVal(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <p className={`text-center font-mono text-xs ${romColor(rightVal)}`}>{rightVal}%</p>
            </div>
          </div>
          <input
            type="text"
            placeholder="Notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)} className="flex-1 text-xs">Cancel</Button>
            <Button size="sm" onClick={handleSubmit} className="flex-1 text-xs">Save ROM</Button>
          </div>
        </div>
      )}
    </div>
  );
}
