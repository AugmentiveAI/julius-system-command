import { Brain, Zap, Shield, AlertTriangle, Radar, TrendingUp } from 'lucide-react';
import {
  useJarvisSelector,
  shallowEqual,
} from '@/contexts/JarvisBrainContext';
import { useRerenderCounter } from '@/hooks/useRerenderCounter';
import { SystemInterventionBanner } from '@/components/dashboard/SystemInterventionBanner';
import { ProactiveMessage } from '@/types/learning';
import { SystemIntervention } from '@/utils/interventionEngine';

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

interface BannerSlice {
  pageInterventions: SystemIntervention[];
  proactiveMessage: ProactiveMessage | null;
  phase: string | null;
  unreadCount: number;
  dismissIntervention: (id: string) => void;
}

export function JarvisPageBanner({ page, onCallback }: JarvisPageBannerProps) {
  useRerenderCounter(`JarvisPageBanner[${page}]`);

  const slice = useJarvisSelector<BannerSlice | null>((brain) => {
    if (!brain) return null;
    return {
      pageInterventions: brain.getInterventionsForPage(page),
      proactiveMessage: brain.generateProactiveMessage(),
      phase: brain.geneticState?.comtPhase ?? null,
      unreadCount: brain.unreadFindings.length,
      dismissIntervention: brain.dismissIntervention,
    };
  }, (a, b) => {
    if (a === b) return true;
    if (!a || !b) return false;
    return shallowEqual({
      len: a.pageInterventions.length,
      firstId: a.pageInterventions[0]?.id ?? null,
      msg: a.proactiveMessage?.short ?? null,
      phase: a.phase,
      unread: a.unreadCount,
    }, {
      len: b.pageInterventions.length,
      firstId: b.pageInterventions[0]?.id ?? null,
      msg: b.proactiveMessage?.short ?? null,
      phase: b.phase,
      unread: b.unreadCount,
    });
  });

  if (!slice) return null;

  const { pageInterventions, proactiveMessage, phase, unreadCount, dismissIntervention } = slice;
  const highest = pageInterventions[0] ?? null;
  const phaseContext = phase ? PAGE_CONTEXT_MESSAGES[phase] : null;

  if (highest) {
    return (
      <SystemInterventionBanner
        intervention={highest}
        totalCount={pageInterventions.length}
        onDismiss={dismissIntervention}
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
          {unreadCount > 0 && (
            <span className="ml-auto shrink-0 inline-flex items-center rounded-full border border-secondary/30 bg-secondary/10 px-1.5 py-0.5 font-mono text-[8px] text-secondary">
              {unreadCount} intel
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
