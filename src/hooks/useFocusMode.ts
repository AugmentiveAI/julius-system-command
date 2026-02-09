import { useState, useEffect, useCallback, useMemo } from 'react';
import { ProtocolQuest } from '@/types/quests';
import { CalibratedQuest } from '@/utils/questCalibration';

// ── Types ────────────────────────────────────────────────────────────

export interface FocusQuest {
  id: string;
  title: string;
  xp: number;
  difficulty: string;
  stat: string;
  isPreCommitted: boolean;
  revenueScore: number;
}

export type DegradationLevel = 0 | 1 | 2 | 3;

interface FocusModeState {
  active: boolean;
  currentIndex: number;
  skippedIds: string[];
  completedIds: string[];
  lastXPAwarded: number | null;
  showXPAnimation: boolean;
  sessionSkipCount: number;
}

const STORAGE_KEY = 'systemFocusMode';

function loadState(): FocusModeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw);
      // Reset daily
      const today = new Date().toISOString().split('T')[0];
      if (state.date !== today) {
        return defaultState();
      }
      return { ...state, showXPAnimation: false };
    }
  } catch { /* ignore */ }
  return defaultState();
}

function defaultState(): FocusModeState {
  return {
    active: false,
    currentIndex: 0,
    skippedIds: [],
    completedIds: [],
    lastXPAwarded: null,
    showXPAnimation: false,
    sessionSkipCount: 0,
  };
}

export function getDegradationLevel(skipCount: number): DegradationLevel {
  if (skipCount >= 5) return 3;
  if (skipCount >= 3) return 2;
  if (skipCount >= 1) return 1;
  return 0;
}

function saveState(state: FocusModeState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...state,
    date: new Date().toISOString().split('T')[0],
    showXPAnimation: false, // never persist animation state
  }));
}

// ── Quest ordering logic ─────────────────────────────────────────────

function buildFocusQueue(
  calibratedQuests: CalibratedQuest[],
  completedCalibratedIds: Set<string>,
  protocolQuests: ProtocolQuest[],
  preCommittedQuestId: string | null,
): FocusQuest[] {
  const quests: FocusQuest[] = [];

  // Add calibrated quests
  for (const q of calibratedQuests) {
    if (completedCalibratedIds.has(q.id)) continue;
    quests.push({
      id: q.id,
      title: q.title,
      xp: q.adjustedXP,
      difficulty: q.difficulty,
      stat: q.stat,
      isPreCommitted: q.id === preCommittedQuestId,
      revenueScore: q.category === 'revenue' || q.stat === 'sales' || q.stat === 'wealth' ? 80 : q.stat === 'systems' ? 50 : 20,
    });
  }

  // Add incomplete protocol quests
  for (const q of protocolQuests) {
    if (q.completed) continue;
    quests.push({
      id: q.id,
      title: q.title,
      xp: q.xp + (q.geneticBonus?.bonusXp || 0),
      difficulty: 'C',
      stat: q.stat,
      isPreCommitted: false,
      revenueScore: 0,
    });
  }

  // Sort: pre-committed first, then revenue score, then difficulty, then time-block
  const diffOrder: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };
  const isSprint = [5, 6].includes(new Date().getDay());

  quests.sort((a, b) => {
    // Pre-committed always first
    if (a.isPreCommitted && !b.isPreCommitted) return -1;
    if (!a.isPreCommitted && b.isPreCommitted) return 1;

    // Revenue score on sprint days
    if (isSprint) {
      const revDiff = b.revenueScore - a.revenueScore;
      if (Math.abs(revDiff) > 10) return revDiff;
    }

    // Difficulty tier
    const dDiff = (diffOrder[b.difficulty] ?? 0) - (diffOrder[a.difficulty] ?? 0);
    if (dDiff !== 0) return dDiff;

    return 0;
  });

  return quests;
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useFocusMode(
  calibratedQuests: CalibratedQuest[],
  completedCalibratedIds: Set<string>,
  protocolQuests: ProtocolQuest[],
  preCommittedQuestId: string | null,
) {
  const [state, setState] = useState<FocusModeState>(loadState);

  useEffect(() => { saveState(state); }, [state]);

  const queue = useMemo(
    () => buildFocusQueue(calibratedQuests, completedCalibratedIds, protocolQuests, preCommittedQuestId),
    [calibratedQuests, completedCalibratedIds, protocolQuests, preCommittedQuestId],
  );

  // Filter out already completed/skipped in this session
  const remaining = useMemo(
    () => queue.filter(q => !state.completedIds.includes(q.id) && !state.skippedIds.includes(q.id)),
    [queue, state.completedIds, state.skippedIds],
  );

  const currentQuest = remaining.length > 0 ? remaining[0] : null;
  const allDone = queue.length > 0 && remaining.length === 0;

  const toggle = useCallback(() => {
    setState(prev => ({ ...prev, active: !prev.active, showXPAnimation: false }));
  }, []);

  const activate = useCallback(() => {
    setState(prev => ({ ...prev, active: true, showXPAnimation: false }));
  }, []);

  const deactivate = useCallback(() => {
    setState(prev => ({ ...prev, active: false, showXPAnimation: false }));
  }, []);

  const completeCurrentQuest = useCallback(() => {
    if (!currentQuest) return;
    setState(prev => ({
      ...prev,
      completedIds: [...prev.completedIds, currentQuest.id],
      lastXPAwarded: currentQuest.xp,
      showXPAnimation: true,
    }));
    // Clear animation after delay
    setTimeout(() => {
      setState(prev => ({ ...prev, showXPAnimation: false }));
    }, 1200);
  }, [currentQuest]);

  const skipCurrentQuest = useCallback(() => {
    if (!currentQuest) return;
    setState(prev => ({
      ...prev,
      skippedIds: [...prev.skippedIds, currentQuest.id],
      showXPAnimation: false,
      sessionSkipCount: prev.sessionSkipCount + 1,
    }));
  }, [currentQuest]);

  const degradationLevel = getDegradationLevel(state.sessionSkipCount);
  const sessionSkipCount = state.sessionSkipCount;

  return {
    active: state.active,
    currentQuest,
    allDone,
    remainingCount: remaining.length,
    totalCount: queue.length,
    completedCount: state.completedIds.length,
    lastXPAwarded: state.lastXPAwarded,
    showXPAnimation: state.showXPAnimation,
    degradationLevel,
    sessionSkipCount,
    toggle,
    activate,
    deactivate,
    completeCurrentQuest,
    skipCurrentQuest,
  };
}
