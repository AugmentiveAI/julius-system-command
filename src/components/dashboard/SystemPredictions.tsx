import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SystemPredictionsProps {
  predictions: string[];
}

function getIcon(prediction: string): string {
  if (prediction.includes('resistance') || prediction.includes('stall') || prediction.includes('sabotage'))
    return '⚠️';
  if (prediction.includes('Milestone') || prediction.includes('streak') || prediction.includes('target'))
    return '🎯';
  return '📈';
}

export function SystemPredictions({ predictions }: SystemPredictionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (predictions.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-sm">🔮</span>
              <span className="font-mono text-xs tracking-[0.15em] text-muted-foreground">
                SYSTEM PREDICTIONS
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted-foreground">
                {predictions.length} projection{predictions.length !== 1 ? 's' : ''}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-2">
            {predictions.map((prediction, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-md border border-border/50 bg-background/30 p-3"
              >
                <span className="text-sm shrink-0">{getIcon(prediction)}</span>
                <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
                  {prediction}
                </p>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
