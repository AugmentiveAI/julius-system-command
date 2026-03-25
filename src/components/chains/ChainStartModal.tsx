import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CHAIN_TEMPLATES } from '@/types/questChain';
import { Zap, Clock } from 'lucide-react';

const TYPE_ICONS: Record<string, string> = {
  revenue: '💰',
  creative: '✍️',
  skill: '⚡',
  network: '🕸️',
  narrative: '📜',
};

interface ChainStartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (templateIndex: number) => void;
  activeChainCount: number;
}

export function ChainStartModal({ open, onOpenChange, onStart, activeChainCount }: ChainStartModalProps) {
  const maxActive = 2;
  const canStart = activeChainCount < maxActive;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm tracking-wider uppercase text-center">
            INITIATE QUEST CHAIN
          </DialogTitle>
          {!canStart && (
            <p className="font-mono text-[9px] text-destructive text-center mt-1">
              Maximum {maxActive} active chains. Complete or abandon one first.
            </p>
          )}
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {CHAIN_TEMPLATES.map((template, idx) => (
            <button
              key={idx}
              disabled={!canStart}
              onClick={() => { onStart(idx); onOpenChange(false); }}
              className="w-full text-left rounded-lg border border-border bg-background/50 p-3 space-y-1.5 hover:border-primary/30 hover:bg-primary/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{TYPE_ICONS[template.chainType] || '📜'}</span>
                  <span className="font-mono text-[11px] font-bold text-foreground">{template.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-0.5 font-mono text-[9px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    {template.steps.length}d
                  </span>
                  <span className="flex items-center gap-0.5 font-mono text-[9px] text-primary">
                    <Zap className="h-2.5 w-2.5" />
                    {template.xpPerStep * template.steps.length + template.bonusXp}
                  </span>
                </div>
              </div>
              <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">{template.description}</p>
              <div className="flex gap-1.5 flex-wrap">
                {template.steps.map((step, si) => (
                  <span key={si} className="font-mono text-[8px] text-muted-foreground/60 bg-muted/10 px-1.5 py-0.5 rounded">
                    {si + 1}. {step.title.length > 20 ? step.title.slice(0, 20) + '…' : step.title}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
