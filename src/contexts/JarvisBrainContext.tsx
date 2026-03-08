import { createContext, useContext, useCallback, useMemo, ReactNode } from 'react';
import { useSystemInterventions } from '@/hooks/useSystemInterventions';
import { useGeneticState } from '@/hooks/useGeneticState';
import { useProtocolQuests } from '@/hooks/useProtocolQuests';
import { usePlayer } from '@/hooks/usePlayer';
import { useCaffeine } from '@/hooks/useCaffeine';
import { useWorkout } from '@/hooks/useWorkout';
import { useTrainingLog } from '@/hooks/useTrainingLog';
import { useShadowArmy } from '@/hooks/useShadowArmy';
import { useSystemIntelligenceAI } from '@/hooks/useSystemIntelligenceAI';
import { InterventionContext, SystemIntervention, InterventionType } from '@/utils/interventionEngine';
import { getSystemDate } from '@/utils/dayCycleEngine';
import { GeneticState } from '@/utils/geneticEngine';
import { Anticipation, SystemIntelligence } from '@/types/systemIntelligence';

// ── Page-specific intervention filters ──────────────────────────────

const QUEST_RELEVANT_TYPES: Set<InterventionType> = new Set([
  'genetic_optimization',
  'momentum_capture',
  'opportunity_window',
  'risk_alert',
  'accountability_check',
  'celebration',
  'strategic_pivot',
]);

const TRAINING_RELEVANT_TYPES: Set<InterventionType> = new Set([
  'recovery_mandate',
  'genetic_optimization',
  'risk_alert',
  'pattern_insight',
]);

const DASHBOARD_RELEVANT_TYPES: Set<InterventionType> = new Set([
  'opportunity_window',
  'risk_alert',
  'pattern_insight',
  'strategic_pivot',
  'momentum_capture',
  'recovery_mandate',
  'genetic_optimization',
  'accountability_check',
  'celebration',
]);

// ── Context type ────────────────────────────────────────────────────

interface JarvisBrainState {
  // All active interventions
  allInterventions: SystemIntervention[];
  highestPriority: SystemIntervention | null;
  hasIntervention: boolean;
  dismissIntervention: (id: string) => void;
  refresh: () => void;

  // Page-filtered interventions
  getInterventionsForPage: (page: 'dashboard' | 'quests' | 'training') => SystemIntervention[];
  getHighestForPage: (page: 'dashboard' | 'quests' | 'training') => SystemIntervention | null;

  // Genetic state (shared)
  geneticState: GeneticState;
  sprintsToday: number;
  logSprint: () => void;
  logColdExposure: () => void;
  logMagnesium: () => void;

  // Shared context data
  fatigueAccumulation: number;
  workoutCompleted: boolean;

  // System Intelligence + Anticipation
  intelligence: SystemIntelligence | null;
  anticipation: Anticipation | null;
  intelligenceLoading: boolean;
  generateIntelligence: () => void;
}

const JarvisBrainCtx = createContext<JarvisBrainState | null>(null);

export function useJarvisBrain(): JarvisBrainState {
  const ctx = useContext(JarvisBrainCtx);
  if (!ctx) throw new Error('useJarvisBrain must be used within JarvisBrainProvider');
  return ctx;
}

/** Safely access JARVIS brain — returns null outside provider */
export function useJarvisBrainOptional(): JarvisBrainState | null {
  return useContext(JarvisBrainCtx);
}

// ── Provider ────────────────────────────────────────────────────────

export function JarvisBrainProvider({ children }: { children: ReactNode }) {
  const { player } = usePlayer();
  const { quests } = useProtocolQuests();
  const { logs, warningDismissed } = useCaffeine();
  const { workoutCompleted, todayWorkoutType } = useWorkout();
  const { fatigueAccumulation } = useTrainingLog();
  const { shadows } = useShadowArmy();
  const { geneticState, sprintsToday, logSprint, logColdExposure, logMagnesium } = useGeneticState();
  const { intelligence, loading: intelligenceLoading, generate: generateIntelligence } = useSystemIntelligenceAI();
  const anticipation = intelligence?.anticipation ?? null;

  // Build intervention context from all shared state
  const buildInterventionContext = useCallback((): InterventionContext => {
    const now = new Date();
    const completedQ = quests.filter(q => q.completed).length;
    const totalXPToday = quests
      .filter(q => q.completed)
      .reduce((sum, q) => sum + q.xp + (q.geneticBonus?.bonusXp || 0), 0);

    let lastQuestMinAgo = 999;
    try {
      const raw = localStorage.getItem('systemCalibratedCompletions');
      if (raw) {
        const history = JSON.parse(raw);
        const today = getSystemDate();
        const todayCompletions = history.filter((c: any) => c.completedAt?.startsWith(today));
        if (todayCompletions.length > 0) {
          const lastTime = new Date(todayCompletions[todayCompletions.length - 1].completedAt);
          lastQuestMinAgo = Math.round((now.getTime() - lastTime.getTime()) / 60_000);
        }
      }
    } catch { /* ignore */ }

    let daysSinceLastShadow = 30;
    try {
      if (shadows.length > 0) {
        const latest = shadows.reduce((a, b) =>
          new Date(a.updated_at) > new Date(b.updated_at) ? a : b
        );
        daysSinceLastShadow = Math.round(
          (now.getTime() - new Date(latest.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        );
      }
    } catch { /* ignore */ }

    let weeklyPlanDone = false;
    try {
      const raw = localStorage.getItem('systemWeeklyPlan');
      if (raw) {
        const plan = JSON.parse(raw);
        weeklyPlanDone = plan?.locked === true;
      }
    } catch { /* ignore */ }

    const hour = now.getHours();
    let geneticPhase = 'stable';
    if (hour >= 8 && hour < 12) geneticPhase = 'peak';
    else if (hour >= 14 && hour < 17) geneticPhase = 'dip';
    else if (hour >= 17) geneticPhase = 'recovery';

    return {
      currentHour: hour,
      geneticPhase,
      questsCompletedToday: completedQ,
      questsTotalToday: quests.length,
      xpEarnedToday: totalXPToday,
      averageDailyXP: 150,
      streak: player.streak,
      lastCaffeineTime: logs.length > 0 ? logs[logs.length - 1] : null,
      caffeineWarningShownToday: warningDismissed,
      fatigueAccumulation,
      workoutScheduledToday: !!todayWorkoutType,
      dayOfWeek: now.getDay(),
      weeklyPlanCompleted: weeklyPlanDone,
      daysSinceLastShadowActivation: daysSinceLastShadow,
      lastQuestCompletedMinutesAgo: lastQuestMinAgo,
      trainingCompleted: workoutCompleted,
      sprintsToday,
    };
  }, [quests, player.streak, logs, warningDismissed, fatigueAccumulation, todayWorkoutType, shadows, workoutCompleted, sprintsToday]);

  const {
    interventions: allInterventions,
    highestPriority,
    hasIntervention,
    dismissIntervention,
    refresh,
  } = useSystemInterventions({ buildContext: buildInterventionContext, enabled: true });

  // Page-filtered intervention getters
  const getInterventionsForPage = useCallback((page: 'dashboard' | 'quests' | 'training') => {
    const filterSet = page === 'dashboard' ? DASHBOARD_RELEVANT_TYPES
      : page === 'quests' ? QUEST_RELEVANT_TYPES
      : TRAINING_RELEVANT_TYPES;
    return allInterventions.filter(i => filterSet.has(i.type));
  }, [allInterventions]);

  const getHighestForPage = useCallback((page: 'dashboard' | 'quests' | 'training') => {
    const filtered = getInterventionsForPage(page);
    return filtered[0] ?? null;
  }, [getInterventionsForPage]);

  const value = useMemo<JarvisBrainState>(() => ({
    allInterventions,
    highestPriority,
    hasIntervention,
    dismissIntervention,
    refresh,
    getInterventionsForPage,
    getHighestForPage,
    geneticState,
    sprintsToday,
    logSprint,
    logColdExposure,
    logMagnesium,
    fatigueAccumulation,
    workoutCompleted,
  }), [
    allInterventions, highestPriority, hasIntervention, dismissIntervention, refresh,
    getInterventionsForPage, getHighestForPage,
    geneticState, sprintsToday, logSprint, logColdExposure, logMagnesium,
    fatigueAccumulation, workoutCompleted,
  ]);

  return (
    <JarvisBrainCtx.Provider value={value}>
      {children}
    </JarvisBrainCtx.Provider>
  );
}
