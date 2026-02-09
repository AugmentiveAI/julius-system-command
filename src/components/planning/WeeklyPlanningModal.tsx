import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  SprintPriority,
  SprintAllocation,
  WeekSummary,
} from '@/hooks/useWeeklyPlanning';
import { Check, Edit2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ── Color helpers ────────────────────────────────────────────────────

const PRIORITY_COLORS = [
  { bg: 'bg-primary/15', border: 'border-primary/40', text: 'text-primary' },
  { bg: 'bg-amber-500/15', border: 'border-amber-500/40', text: 'text-amber-400' },
  { bg: 'bg-violet-500/15', border: 'border-violet-500/40', text: 'text-violet-400' },
];

const TREND_ICON = {
  improved: <TrendingUp className="h-3.5 w-3.5 text-green-400" />,
  stable: <Minus className="h-3.5 w-3.5 text-muted-foreground" />,
  declined: <TrendingDown className="h-3.5 w-3.5 text-red-400" />,
};

const TREND_LABEL = {
  improved: 'Improved',
  stable: 'Stable',
  declined: 'Declined',
};

// ── Props ────────────────────────────────────────────────────────────

interface WeeklyPlanningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: WeekSummary;
  initialPriorities: SprintPriority[];
  initialAllocation: SprintAllocation;
  onLock: (priorities: SprintPriority[], allocation: SprintAllocation) => void;
  onDismiss: () => void;
  isAutoView?: boolean;
  onApprove?: () => void;
}

// ── Component ────────────────────────────────────────────────────────

export function WeeklyPlanningModal({
  open,
  onOpenChange,
  summary,
  initialPriorities,
  initialAllocation,
  onLock,
  onDismiss,
  isAutoView = false,
  onApprove,
}: WeeklyPlanningModalProps) {
  const [priorities, setPriorities] = useState<SprintPriority[]>(initialPriorities);
  const [allocation, setAllocation] = useState<SprintAllocation>(initialAllocation);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  const totalBlocks = useMemo(() =>
    allocation.thursday.length + allocation.friday.length + allocation.saturday.length
  , [allocation]);

  const allocatedBlocks = useMemo(() =>
    [...allocation.thursday, ...allocation.friday, ...allocation.saturday].filter(Boolean).length
  , [allocation]);

  const handleEditStart = (idx: number) => {
    setEditingIdx(idx);
    setEditText(priorities[idx].objective);
  };

  const handleEditSave = () => {
    if (editingIdx === null) return;
    setPriorities(prev =>
      prev.map((p, i) => i === editingIdx ? { ...p, objective: editText } : p)
    );
    setEditingIdx(null);
  };

  const handleBlockTap = (day: 'thursday' | 'friday' | 'saturday', blockIdx: number) => {
    if (isAutoView) return;
    setAllocation(prev => {
      const blocks = [...prev[day]];
      const currentPriorityId = blocks[blockIdx];
      // Cycle through priorities: null → p1 → p2 → p3 → null
      const pIds = priorities.map(p => p.id);
      const currentIdx = currentPriorityId ? pIds.indexOf(currentPriorityId) : -1;
      const nextIdx = currentIdx + 1;
      blocks[blockIdx] = nextIdx < pIds.length ? pIds[nextIdx] : null;
      return { ...prev, [day]: blocks };
    });
  };

  const getPriorityColor = (pId: string | null) => {
    if (!pId) return null;
    const idx = priorities.findIndex(p => p.id === pId);
    return idx >= 0 ? PRIORITY_COLORS[idx] : null;
  };

  const getPriorityLabel = (pId: string | null) => {
    if (!pId) return null;
    const idx = priorities.findIndex(p => p.id === pId);
    return idx >= 0 ? `P${idx + 1}` : null;
  };

  const dayRows: { key: 'thursday' | 'friday' | 'saturday'; label: string }[] = [
    { key: 'thursday', label: 'Thu' },
    { key: 'friday', label: 'Fri' },
    { key: 'saturday', label: 'Sat' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border border-border shadow-lg max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center font-mono text-sm tracking-[0.15em] text-foreground">
            WEEKLY SPRINT PLAN
          </DialogTitle>
          <p className="text-center font-mono text-[10px] text-muted-foreground tracking-wider">
            Thursday — Saturday Operations
          </p>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* ── Week Summary ── */}
          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
            <h4 className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground">PAST WEEK</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Quests</span>
                <span className="text-xs font-mono text-foreground">
                  {summary.questsCompleted}/{summary.questsTotal} ({summary.completionPct}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">XP</span>
                <span className="text-xs font-mono text-primary">+{summary.xpEarned}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Revenue Quests</span>
                <span className="text-xs font-mono text-foreground">{summary.revenueQuestsCompleted}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Resistance</span>
                <div className="flex items-center gap-1">
                  {TREND_ICON[summary.resistanceTrend]}
                  <span className="text-xs font-mono text-foreground">{TREND_LABEL[summary.resistanceTrend]}</span>
                </div>
              </div>
            </div>
            <p className="font-mono text-[11px] italic text-muted-foreground pt-1 border-t border-border/50">
              {summary.systemAssessment}
            </p>
          </div>

          {/* ── Priorities ── */}
          <div className="space-y-2">
            <h4 className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground">SPRINT PRIORITIES</h4>
            {priorities.map((p, idx) => {
              const colors = PRIORITY_COLORS[idx];
              const isEditing = editingIdx === idx;
              return (
                <div
                  key={p.id}
                  className={`rounded-lg border p-3 ${colors.border} ${colors.bg}`}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        className="h-8 text-xs font-mono bg-background"
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleEditSave()}
                      />
                      <button onClick={handleEditSave}>
                        <Check className="h-4 w-4 text-green-400" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-[10px] font-bold ${colors.text}`}>P{idx + 1}</span>
                          <span className="text-sm font-medium text-foreground truncate">{p.objective}</span>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground mt-0.5 block">
                          ~{p.estimatedSprints} sprint{p.estimatedSprints !== 1 ? 's' : ''} · {p.category}
                        </span>
                      </div>
                      {!isAutoView && (
                        <button
                          onClick={() => handleEditStart(idx)}
                          className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Sprint Allocation ── */}
          <div className="space-y-2">
            <h4 className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground">
              SPRINT ALLOCATION
              {!isAutoView && (
                <span className="text-muted-foreground/50 ml-2">tap to assign</span>
              )}
            </h4>
            <div className="space-y-2">
              {dayRows.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground w-8">{label}</span>
                  <div className="flex items-center gap-1.5">
                    {allocation[key].map((pId, blockIdx) => {
                      const color = getPriorityColor(pId);
                      const pLabel = getPriorityLabel(pId);
                      return (
                        <button
                          key={blockIdx}
                          onClick={() => handleBlockTap(key, blockIdx)}
                          className={`flex items-center justify-center h-8 w-8 rounded border text-[10px] font-mono font-bold transition-all ${
                            color
                              ? `${color.bg} ${color.border} ${color.text}`
                              : 'border-border bg-muted/30 text-muted-foreground/40 hover:border-muted-foreground/40'
                          }`}
                        >
                          {pLabel || '□'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <p className="font-mono text-[10px] text-muted-foreground/50">
              {allocatedBlocks}/{totalBlocks} blocks assigned · unassigned = System decides
            </p>
          </div>

          {/* ── Action Buttons ── */}
          <div className="flex gap-3 pt-1">
            {isAutoView ? (
              <>
                <Button
                  onClick={onApprove}
                  className="flex-1 font-mono tracking-wider text-xs"
                >
                  APPROVE
                </Button>
                <Button
                  onClick={() => {
                    // Switch from auto-view to editable — handled by parent toggling isAutoView
                    onOpenChange(true);
                  }}
                  variant="outline"
                  className="flex-1 font-mono tracking-wider text-xs"
                >
                  MODIFY
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => onLock(priorities, allocation)}
                  className="flex-1 font-mono tracking-wider text-xs"
                >
                  LOCK IN SPRINT PLAN
                </Button>
                <Button
                  onClick={onDismiss}
                  variant="ghost"
                  className="font-mono tracking-wider text-xs text-muted-foreground"
                >
                  SKIP
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
