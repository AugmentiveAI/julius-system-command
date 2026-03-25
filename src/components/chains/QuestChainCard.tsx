import { QuestChain } from '@/types/questChain';
import { Check, ChevronRight, Clock, Zap } from 'lucide-react';

interface QuestChainCardProps {
  chain: QuestChain;
  onCompleteStep: (chainId: string) => void;
  onAbandon: (chainId: string) => void;
}

const CHAIN_TYPE_COLORS: Record<string, string> = {
  revenue: 'text-green-400 border-green-500/30 bg-green-500/10',
  creative: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  skill: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  network: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  narrative: 'text-primary border-primary/30 bg-primary/10',
};

export function QuestChainCard({ chain, onCompleteStep, onAbandon }: QuestChainCardProps) {
  const progress = chain.totalSteps > 0 ? (chain.currentStep / chain.totalSteps) * 100 : 0;
  const currentStep = chain.steps[chain.currentStep];
  const isComplete = chain.status === 'completed';
  const typeColor = CHAIN_TYPE_COLORS[chain.chainType] || CHAIN_TYPE_COLORS.narrative;

  const daysRemaining = chain.expiresAt
    ? Math.max(0, Math.ceil((new Date(chain.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className={`rounded-lg border bg-card/50 p-3 space-y-2.5 ${isComplete ? 'border-green-500/30 opacity-75' : 'border-border'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${typeColor}`}>
              {chain.chainType}
            </span>
            {daysRemaining !== null && !isComplete && (
              <span className={`flex items-center gap-0.5 font-mono text-[9px] ${daysRemaining <= 1 ? 'text-destructive' : 'text-muted-foreground'}`}>
                <Clock className="h-2.5 w-2.5" />
                {daysRemaining}d
              </span>
            )}
          </div>
          <h3 className="font-mono text-xs font-bold text-foreground truncate">{chain.title}</h3>
        </div>
        <div className="flex items-center gap-1 text-primary">
          <Zap className="h-3 w-3" />
          <span className="font-mono text-[10px] font-bold">
            {chain.xpPerStep * chain.totalSteps + chain.bonusXp} XP
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-primary'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between">
          <span className="font-mono text-[9px] text-muted-foreground">
            Step {Math.min(chain.currentStep + 1, chain.totalSteps)} / {chain.totalSteps}
          </span>
          <span className="font-mono text-[9px] text-muted-foreground">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Steps timeline */}
      <div className="space-y-1">
        {chain.steps.map((step, idx) => {
          const isCurrent = idx === chain.currentStep && !isComplete;
          const isDone = step.completed;
          const isFuture = idx > chain.currentStep;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-2 py-1 px-2 rounded text-[10px] font-mono transition-all ${
                isCurrent ? 'bg-primary/10 border border-primary/30' :
                isDone ? 'opacity-50' : 'opacity-30'
              }`}
            >
              <div className={`h-4 w-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                isDone ? 'bg-green-500/20 text-green-400' :
                isCurrent ? 'bg-primary/20 text-primary' : 'bg-muted/20 text-muted-foreground'
              }`}>
                {isDone ? <Check className="h-2.5 w-2.5" /> :
                 isCurrent ? <ChevronRight className="h-2.5 w-2.5" /> :
                 <span className="text-[8px]">{idx + 1}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`${isDone ? 'line-through' : ''} ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.title}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Current step action */}
      {currentStep && !isComplete && (
        <div className="space-y-2">
          <p className="font-mono text-[9px] text-muted-foreground px-2">{currentStep.description}</p>
          <div className="flex gap-2">
            <button
              onClick={() => onCompleteStep(chain.id)}
              className="flex-1 py-1.5 rounded border border-primary/30 bg-primary/10 font-mono text-[10px] text-primary tracking-wider uppercase hover:bg-primary/20 transition-colors"
            >
              Complete Step (+{chain.xpPerStep} XP)
            </button>
            <button
              onClick={() => onAbandon(chain.id)}
              className="px-3 py-1.5 rounded border border-destructive/20 bg-destructive/5 font-mono text-[9px] text-destructive/70 tracking-wider uppercase hover:bg-destructive/10 transition-colors"
            >
              Abandon
            </button>
          </div>
        </div>
      )}

      {/* Completed state */}
      {isComplete && (
        <div className="text-center py-1">
          <span className="font-mono text-[10px] text-green-400 tracking-wider uppercase">
            ✓ Chain Complete — +{chain.bonusXp} bonus XP earned
          </span>
        </div>
      )}
    </div>
  );
}
