import { createContext, useContext, useCallback, useMemo, useRef, useEffect, ReactNode } from 'react';
import {
  createJarvisStore,
  useStoreSelector,
  shallowEqual,
  type JarvisStore,
  type EqualityFn,
} from './jarvisStore';
import { useSystemInterventions } from '@/hooks/useSystemInterventions';
import { useGeneticState } from '@/hooks/useGeneticState';
import { useProtocolQuests } from '@/hooks/useProtocolQuests';
import { usePlayer } from '@/hooks/usePlayer';
import { useCaffeine } from '@/hooks/useCaffeine';
import { useWorkout } from '@/hooks/useWorkout';
import { useTrainingLog } from '@/hooks/useTrainingLog';
import { useShadowArmy } from '@/hooks/useShadowArmy';
import { useSystemIntelligenceAI } from '@/hooks/useSystemIntelligenceAI';
import { useThreatAssessment } from '@/hooks/useThreatAssessment';
import { useUserLearning } from '@/hooks/useUserLearning';
import { useJarvisSynthesis } from '@/hooks/useJarvisSynthesis';
import { useJarvisAnticipation } from '@/hooks/useJarvisAnticipation';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useCalendarContext } from '@/hooks/useCalendarContext';
import { InterventionContext, SystemIntervention, InterventionType } from '@/utils/interventionEngine';
import { getSystemDate } from '@/utils/dayCycleEngine';
import { GeneticState } from '@/utils/geneticEngine';
import { Anticipation, SystemIntelligence } from '@/types/systemIntelligence';
import { DailyActivitySummary, Activity, CalendarEvent } from '@/types/activity';
import { Threat, ThreatLevel } from '@/types/threat';
import {
  UserLearning,
  SynthesizedInsight,
  JarvisAnticipation,
  ResearchFinding,
  ProactiveMessage,
} from '@/types/learning';
import { ShadowTemplate } from '@/data/shadowTemplates';

// ── Page-specific intervention filters ──────────────────────────────

const QUEST_RELEVANT_TYPES: Set<InterventionType> = new Set([
  'genetic_optimization', 'momentum_capture', 'opportunity_window',
  'risk_alert', 'accountability_check', 'celebration', 'strategic_pivot',
]);

const TRAINING_RELEVANT_TYPES: Set<InterventionType> = new Set([
  'recovery_mandate', 'genetic_optimization', 'risk_alert', 'pattern_insight',
]);

const DASHBOARD_RELEVANT_TYPES: Set<InterventionType> = new Set([
  'opportunity_window', 'risk_alert', 'pattern_insight', 'strategic_pivot',
  'momentum_capture', 'recovery_mandate', 'genetic_optimization',
  'accountability_check', 'celebration',
]);

// ── Split context types ─────────────────────────────────────────────

/** Heavy AI data — updates at most every 30 min */
export interface JarvisIntelligenceState {
  intelligence: SystemIntelligence | null;
  anticipation: Anticipation | null;
  intelligenceLoading: boolean;
  generateIntelligence: () => void;

  learning: UserLearning | null;
  learningInsights: { strengths: string[]; growthAreas: string[]; recommendations: string[] } | null;
  getPrediction: (type: 'energy' | 'productivity' | 'focus') => number;
  isGoodTimeFor: (category: string) => boolean;

  unreadFindings: ResearchFinding[];
  updateFindingStatus: (id: string, status: 'read' | 'acted_on' | 'dismissed') => void;
  suggestShadows: (goalText: string) => ShadowTemplate[];

  synthesizedInsights: SynthesizedInsight[];
  getTopInsight: () => SynthesizedInsight | null;
  synthesize: () => SynthesizedInsight[];

  jarvisAnticipations: JarvisAnticipation[];
  activeAnticipations: JarvisAnticipation[];

  generateProactiveMessage: () => ProactiveMessage | null;
}

/** Live player state — updates frequently */
export interface JarvisLiveState {
  allInterventions: SystemIntervention[];
  highestPriority: SystemIntervention | null;
  hasIntervention: boolean;
  dismissIntervention: (id: string) => void;
  refresh: () => void;

  getInterventionsForPage: (page: 'dashboard' | 'quests' | 'training') => SystemIntervention[];
  getHighestForPage: (page: 'dashboard' | 'quests' | 'training') => SystemIntervention | null;

  geneticState: GeneticState;
  sprintsToday: number;
  logSprint: () => void;
  logColdExposure: () => void;
  logMagnesium: () => void;

  fatigueAccumulation: number;
  workoutCompleted: boolean;

  threats: Threat[];
  overallThreatLevel: ThreatLevel;
  hasCriticalThreat: boolean;

  activitySummary: DailyActivitySummary | null;
  recentActivities: Activity[];
  calendarContext: string;
  nextCalendarEvent: CalendarEvent | null;
}

/** Combined type for backward compatibility */
type JarvisBrainState = JarvisIntelligenceState & JarvisLiveState;

// ── Contexts ────────────────────────────────────────────────────────

const JarvisIntelligenceCtx = createContext<JarvisIntelligenceState | null>(null);
const JarvisLiveCtx = createContext<JarvisLiveState | null>(null);
// Legacy combined context for backward compat
const JarvisBrainCtx = createContext<JarvisBrainState | null>(null);
// External store for selector-based slice subscription
const JarvisStoreCtx = createContext<JarvisStore<JarvisBrainState | null> | null>(null);

/** Use only intelligence data (heavy, infrequent updates) */
export function useJarvisIntelligence(): JarvisIntelligenceState {
  const ctx = useContext(JarvisIntelligenceCtx);
  if (!ctx) throw new Error('useJarvisIntelligence must be used within JarvisBrainProvider');
  return ctx;
}

/** Use only live state data (lightweight, frequent updates) */
export function useJarvisLiveState(): JarvisLiveState {
  const ctx = useContext(JarvisLiveCtx);
  if (!ctx) throw new Error('useJarvisLiveState must be used within JarvisBrainProvider');
  return ctx;
}

/** Full combined context — backward compatible */
export function useJarvisBrain(): JarvisBrainState {
  const ctx = useContext(JarvisBrainCtx);
  if (!ctx) throw new Error('useJarvisBrain must be used within JarvisBrainProvider');
  return ctx;
}

/** Safely access JARVIS brain — returns null outside provider */
export function useJarvisBrainOptional(): JarvisBrainState | null {
  return useContext(JarvisBrainCtx);
}

/**
 * Subscribe to a slice of the JARVIS brain via `useSyncExternalStore`.
 * The component only re-renders when `selector(state)` changes (per `equalityFn`).
 *
 * Returns `null` when called outside the provider OR when the store has no
 * snapshot yet — selectors must handle the null case.
 *
 * Pass `shallowEqual` for object slices like `{ count, hasItem }`.
 */
export function useJarvisSelector<T>(
  selector: (state: JarvisBrainState | null) => T,
  equalityFn: EqualityFn<T> = Object.is,
): T {
  const store = useContext(JarvisStoreCtx);
  // Fallback when used outside provider — give selector a null snapshot once.
  const fallbackStoreRef = useRef<JarvisStore<JarvisBrainState | null> | null>(null);
  if (!store && !fallbackStoreRef.current) {
    fallbackStoreRef.current = createJarvisStore<JarvisBrainState | null>(null);
  }
  return useStoreSelector(store ?? fallbackStoreRef.current!, selector, equalityFn);
}

export { shallowEqual };


// ── Provider ────────────────────────────────────────────────────────

export function JarvisBrainProvider({ children }: { children: ReactNode }) {
  const { player } = usePlayer();
  const { quests } = useProtocolQuests();
  const { logs, warningDismissed } = useCaffeine();
  const { workoutCompleted, todayWorkoutType } = useWorkout();
  const { fatigueAccumulation } = useTrainingLog();
  const { shadows, getUnreadFindings, updateFindingStatus, suggestShadows } = useShadowArmy();
  const { geneticState, sprintsToday, logSprint, logColdExposure, logMagnesium } = useGeneticState();
  const { intelligence, loading: intelligenceLoading, generate: generateIntelligence } = useSystemIntelligenceAI();
  const { threats, overallLevel: overallThreatLevel, hasCriticalThreat } = useThreatAssessment();
  const anticipation = intelligence?.anticipation ?? null;

  // ── Capture layer hooks ───────────────────────────────────────
  const { todaySummary: activitySummary, getRecentActivities } = useActivityLog();
  const { getJarvisContext: getCalendarContext, nextEvent: nextCalendarEvent } = useCalendarContext();
  const recentActivities = useMemo(() => getRecentActivities(5), [getRecentActivities]);
  const calendarContext = useMemo(() => getCalendarContext(), [getCalendarContext]);

  // ── Intelligence hooks ─────────────────────────────────────────
  const { learning, getPrediction, isGoodTimeFor, getInsights } = useUserLearning();

  const unreadFindings = useMemo(() => getUnreadFindings(), [getUnreadFindings]);

  const {
    insights: synthesizedInsights,
    getTopInsight,
    synthesize,
  } = useJarvisSynthesis(learning, unreadFindings);

  const {
    anticipations: jarvisAnticipations,
    getActiveAnticipations,
  } = useJarvisAnticipation(learning);

  const activeAnticipations = useMemo(() => getActiveAnticipations(), [getActiveAnticipations]);

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

  // ── Proactive message generator ──────────────────────────────
  const generateProactiveMessage = useCallback((): ProactiveMessage | null => {
    if (activeAnticipations.length > 0) {
      const top = activeAnticipations[0];
      return {
        type: 'anticipation',
        short: top.prediction,
        full: `${top.prediction}. ${top.preparation?.description || ''}`,
        priority: 'high',
        actions: top.preparation ? [{ label: 'View', action: 'view_anticipation' }] : undefined,
      };
    }

    const topInsight = getTopInsight();
    if (topInsight && topInsight.priority >= 7) {
      return {
        type: 'insight',
        short: topInsight.headline,
        full: topInsight.detail,
        priority: topInsight.priority >= 9 ? 'high' : 'medium',
        actions: topInsight.suggestedAction
          ? [{ label: topInsight.suggestedAction.description.slice(0, 30), action: 'act_on_insight' }]
          : undefined,
      };
    }

    if (unreadFindings.length > 0) {
      const finding = unreadFindings[0];
      return {
        type: 'shadow_intel',
        short: `Shadow intel: ${finding.content.title}`,
        full: finding.content.summary,
        priority: finding.content.relevanceScore >= 8 ? 'high' : 'medium',
        actions: [
          { label: 'View', action: 'view_finding' },
          { label: 'Dismiss', action: 'dismiss_finding' },
        ],
      };
    }

    if (learning && getPrediction('productivity') > 0.8) {
      return {
        type: 'nudge',
        short: 'Peak window active. Execute.',
        full: 'Your data shows this is your most productive time. Start your top priority now.',
        priority: 'medium',
      };
    }

    return null;
  }, [activeAnticipations, getTopInsight, unreadFindings, learning, getPrediction]);

  // ── Split context values with useMemo ─────────────────────────

  const intelligenceValue = useMemo<JarvisIntelligenceState>(() => ({
    intelligence,
    anticipation,
    intelligenceLoading,
    generateIntelligence,
    learning,
    learningInsights: getInsights(),
    getPrediction,
    isGoodTimeFor,
    unreadFindings,
    updateFindingStatus,
    suggestShadows,
    synthesizedInsights,
    getTopInsight,
    synthesize,
    jarvisAnticipations,
    activeAnticipations,
    generateProactiveMessage,
  }), [
    intelligence, anticipation, intelligenceLoading, generateIntelligence,
    learning, getInsights, getPrediction, isGoodTimeFor,
    unreadFindings, updateFindingStatus, suggestShadows,
    synthesizedInsights, getTopInsight, synthesize,
    jarvisAnticipations, activeAnticipations, generateProactiveMessage,
  ]);

  const liveValue = useMemo<JarvisLiveState>(() => ({
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
    threats,
    overallThreatLevel,
    hasCriticalThreat,
    activitySummary,
    recentActivities,
    calendarContext,
    nextCalendarEvent,
  }), [
    allInterventions, highestPriority, hasIntervention, dismissIntervention, refresh,
    getInterventionsForPage, getHighestForPage,
    geneticState, sprintsToday, logSprint, logColdExposure, logMagnesium,
    fatigueAccumulation, workoutCompleted,
    threats, overallThreatLevel, hasCriticalThreat,
    activitySummary, recentActivities, calendarContext, nextCalendarEvent,
  ]);

  // Combined for backward compatibility
  const combinedValue = useMemo<JarvisBrainState>(() => ({
    ...intelligenceValue,
    ...liveValue,
  }), [intelligenceValue, liveValue]);

  // ── External store: push new snapshots so selector subscribers
  //    (useJarvisSelector) can re-derive without rerendering on every
  //    parent context update.
  const storeRef = useRef<JarvisStore<JarvisBrainState | null> | null>(null);
  if (!storeRef.current) {
    storeRef.current = createJarvisStore<JarvisBrainState | null>(combinedValue);
  }
  useEffect(() => {
    storeRef.current?.set(combinedValue);
  }, [combinedValue]);

  return (
    <JarvisStoreCtx.Provider value={storeRef.current}>
      <JarvisIntelligenceCtx.Provider value={intelligenceValue}>
        <JarvisLiveCtx.Provider value={liveValue}>
          <JarvisBrainCtx.Provider value={combinedValue}>
            {children}
          </JarvisBrainCtx.Provider>
        </JarvisLiveCtx.Provider>
      </JarvisIntelligenceCtx.Provider>
    </JarvisStoreCtx.Provider>
  );
}
