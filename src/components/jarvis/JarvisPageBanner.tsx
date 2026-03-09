import { useState, useEffect, useMemo } from 'react';
import { Brain, Zap, Shield, AlertTriangle, Radar, TrendingUp } from 'lucide-react';
import { useJarvisBrainOptional } from '@/contexts/JarvisBrainContext';
import { SystemInterventionBanner } from '@/components/dashboard/SystemInterventionBanner';
import { ProactiveMessage } from '@/types/learning';

interface JarvisPageBannerProps {
  page: 'quests' | 'training';
  onCallback?: (callbackName: string) => void;
}

const PAGE_CONTEXT_MESSAGES: Record<string, { icon: typeof Brain; label: string }> = {
  peak: { icon: Zap, label: 'Peak cognitive window active — prioritize high-leverage quests' },
  dip: { icon: Shield, label: 'COMT crash window — reduce cognitive load, focus on execution' },
  recovery: { icon: Brain, label: 'Recovery phase — strategic or creative work optimal' },
};

const PRIORITY_STYLES: Record<string, string> = {
  high: 'border-destructive/30 bg-destructive/5',
  medium: 'border-primary/20 bg-primary/5',
  low: 'border-border bg-muted/5',
};

const TYPE_ICONS: Record<string, typeof Brain> = {
  anticipation: TrendingUp,
  insight: Brain,
  shadow_intel: Radar,
  nudge: Zap,
};

export function JarvisPageBanner({ page, onCallback }: JarvisPageBannerProps) {
  const brain = useJarvisBrainOptional();
  if (!brain) return null;

  const pageInterventions = brain.getInterventionsForPage(page);
  const highest = pageInterventions[0] ?? null;

  // Proactive message from enhanced intelligence
  const proactiveMessage = brain.generateProactiveMessage();

  // Show genetic phase context when no intervention or proactive message
  const phase = brain.geneticState?.comtPhase;
  const phaseContext = phase ? PAGE_CONTEXT_MESSAGES[phase] : null;

  // Priority: intervention > proactive message > genetic phase
  if (highest) {
    return (
      <SystemInterventionBanner
        intervention={highest}
        totalCount={pageInterventions.length}
        onDismiss={brain.dismissIntervention}
        onCallback={onCallback}
      />
    );
  }

  if (proactiveMessage) {
    const Icon = TYPE_ICONS[proactiveMessage.type] || Brain;
    const style = PRIORITY_STYLES[proactiveMessage.priority] || PRIORITY_STYLES.medium;

    return (
      <div className={`rounded-lg border backdrop-blur-sm p-2.5 space-y-1.5 ${style}`}>
        <div className="flex items-center gap-2.5">
          <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
          <p className="font-mono text-[10px] tracking-wider text-primary/90 font-medium">
            {proactiveMessage.short}
          </p>
          {brain.unreadFindings.length > 0 && (
            <span className="ml-auto shrink-0 inline-flex items-center rounded-full border border-secondary/30 bg-secondary/10 px-1.5 py-0.5 font-mono text-[8px] text-secondary">
              {brain.unreadFindings.length} intel
            </span>
          )}
        </div>
        {proactiveMessage.full !== proactiveMessage.short && (
          <p className="font-mono text-[9px] text-muted-foreground pl-6">
            {proactiveMessage.full}
          </p>
        )}
        {proactiveMessage.actions && proactiveMessage.actions.length > 0 && (
          <div className="flex gap-1.5 pl-6">
            {proactiveMessage.actions.map((action, i) => (
              <button
                key={i}
                onClick={() => onCallback?.(action.action)}
                className="rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5 font-mono text-[8px] text-primary hover:bg-primary/10 transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (phaseContext) {
    const Icon = phaseContext.icon;
    return (
      <div className="rounded-lg border border-primary/20 bg-primary/5 backdrop-blur-sm p-2.5 flex items-center gap-2.5">
        <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
        <p className="font-mono text-[10px] tracking-wider text-primary/80">
          {phaseContext.label}
        </p>
      </div>
    );
  }

  return null;
}
