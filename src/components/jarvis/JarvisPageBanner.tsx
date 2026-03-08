import { useMemo } from 'react';
import { Brain, Zap, Shield, AlertTriangle } from 'lucide-react';
import { useJarvisBrainOptional } from '@/contexts/JarvisBrainContext';
import { SystemInterventionBanner } from '@/components/dashboard/SystemInterventionBanner';

interface JarvisPageBannerProps {
  page: 'quests' | 'training';
  onCallback?: (callbackName: string) => void;
}

const PAGE_CONTEXT_MESSAGES: Record<string, { icon: typeof Brain; label: string }> = {
  peak: { icon: Zap, label: 'Peak cognitive window active — prioritize high-leverage quests' },
  dip: { icon: Shield, label: 'COMT crash window — reduce cognitive load, focus on execution' },
  recovery: { icon: Brain, label: 'Recovery phase — strategic or creative work optimal' },
};

export function JarvisPageBanner({ page, onCallback }: JarvisPageBannerProps) {
  const brain = useJarvisBrainOptional();
  if (!brain) return null;

  const pageInterventions = brain.getInterventionsForPage(page);
  const highest = pageInterventions[0] ?? null;

  // Show genetic phase context when no intervention active
  const phase = brain.geneticState?.comtPhase;
  const phaseContext = phase ? PAGE_CONTEXT_MESSAGES[phase] : null;

  if (!highest && !phaseContext) return null;

  // If there's an intervention, show that
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

  // Otherwise show genetic phase context as a subtle banner
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
