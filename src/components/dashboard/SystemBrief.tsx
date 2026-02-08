import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

interface SystemBriefProps {
  dayNumber: number;
  dailyBrief: string;
  strategicFocus: string;
  weeklyObjective: string;
}

export function SystemBrief({ dayNumber, dailyBrief, strategicFocus, weeklyObjective }: SystemBriefProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [hasAnimated, setHasAnimated] = useState(false);

  // Typing animation on first load only
  useEffect(() => {
    if (hasAnimated) {
      setDisplayedText(dailyBrief);
      return;
    }

    let i = 0;
    setDisplayedText('');
    const interval = setInterval(() => {
      i++;
      setDisplayedText(dailyBrief.slice(0, i));
      if (i >= dailyBrief.length) {
        clearInterval(interval);
        setHasAnimated(true);
      }
    }, 12);
    return () => clearInterval(interval);
  }, [dailyBrief, hasAnimated]);

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-base">📡</span>
        <h3 className="font-mono text-xs tracking-[0.15em] text-muted-foreground">
          DAILY SYSTEM BRIEF — DAY {dayNumber}
        </h3>
      </div>

      {/* Brief text with terminal style */}
      <div className="rounded-md border border-border/50 bg-background/50 p-4">
        <p className="font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap">
          {displayedText}
          {!hasAnimated && (
            <span className="inline-block w-1.5 h-3.5 bg-primary ml-0.5 animate-pulse" />
          )}
        </p>
      </div>

      {/* Strategic Focus */}
      <div className="flex items-start gap-2">
        <span className="font-mono text-[10px] tracking-wider text-muted-foreground shrink-0 pt-0.5">
          STRATEGIC FOCUS:
        </span>
        <Badge
          className="bg-primary/15 text-primary border-primary/30 font-mono text-[10px] px-2 py-1 h-auto whitespace-normal text-left"
        >
          {strategicFocus}
        </Badge>
      </div>

      {/* Weekly Objective */}
      <p className="font-mono text-[10px] text-muted-foreground leading-relaxed border-t border-border/50 pt-3">
        {weeklyObjective}
      </p>
    </div>
  );
}
