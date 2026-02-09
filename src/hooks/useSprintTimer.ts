import { useState, useEffect, useCallback, useRef } from 'react';
import { getDayProfile } from '@/utils/weeklyRhythm';

// ── Types ────────────────────────────────────────────────────────────

export type SprintPhase =
  | 'idle'           // No sprint active
  | 'selecting'      // Picking quests for sprint
  | 'sprinting'      // Active 45-min countdown
  | 'sprint-done'    // Sprint finished, completion prompt
  | 'break'          // 15-min break countdown
  | 'extended-break' // 30-min mandatory break (sprint limit)
  | 'ready';         // Break over, ready for next sprint

export interface SprintQuest {
  id: string;
  title: string;
  sprintsNeeded: number;
  sprintsCompleted: number;
}

export interface SprintState {
  phase: SprintPhase;
  currentSprint: number;
  maxSprints: number;
  secondsRemaining: number;
  totalSeconds: number;
  selectedQuests: SprintQuest[];
  completedAway: boolean; // Sprint elapsed while user was away
}

// ── Constants ────────────────────────────────────────────────────────

const SPRINT_DURATION = 45 * 60; // 45 minutes
const BREAK_DURATION = 15 * 60;  // 15 minutes
const EXTENDED_BREAK_DURATION = 30 * 60; // 30 minutes
const SPRINT_STORAGE_KEY = 'systemSprintTimer';

// ── localStorage persistence ─────────────────────────────────────────

interface StoredSprint {
  phase: SprintPhase;
  currentSprint: number;
  startedAt: number; // epoch ms
  totalSeconds: number;
  selectedQuests: SprintQuest[];
  date: string;
}

function loadSprint(): StoredSprint | null {
  try {
    const stored = localStorage.getItem(SPRINT_STORAGE_KEY);
    if (!stored) return null;
    const data: StoredSprint = JSON.parse(stored);
    // Invalidate if different day
    if (data.date !== new Date().toISOString().split('T')[0]) {
      localStorage.removeItem(SPRINT_STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function saveSprint(data: StoredSprint) {
  localStorage.setItem(SPRINT_STORAGE_KEY, JSON.stringify(data));
}

function clearSprint() {
  localStorage.removeItem(SPRINT_STORAGE_KEY);
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useSprintTimer() {
  const dayProfile = getDayProfile();
  const maxSprints = dayProfile.maxSprints;

  const [phase, setPhase] = useState<SprintPhase>('idle');
  const [currentSprint, setCurrentSprint] = useState(1);
  const [secondsRemaining, setSecondsRemaining] = useState(SPRINT_DURATION);
  const [totalSeconds, setTotalSeconds] = useState(SPRINT_DURATION);
  const [selectedQuests, setSelectedQuests] = useState<SprintQuest[]>([]);
  const [completedAway, setCompletedAway] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore from localStorage on mount
  useEffect(() => {
    const stored = loadSprint();
    if (!stored) return;

    const elapsed = Math.floor((Date.now() - stored.startedAt) / 1000);
    const remaining = stored.totalSeconds - elapsed;

    setCurrentSprint(stored.currentSprint);
    setSelectedQuests(stored.selectedQuests);

    if (stored.phase === 'sprinting' || stored.phase === 'break' || stored.phase === 'extended-break') {
      if (remaining <= 0) {
        // Timer elapsed while away
        if (stored.phase === 'sprinting') {
          setPhase('sprint-done');
          setCompletedAway(true);
          setSecondsRemaining(0);
          setTotalSeconds(stored.totalSeconds);
        } else {
          // Break finished
          setPhase('ready');
          setSecondsRemaining(0);
          setTotalSeconds(stored.totalSeconds);
        }
      } else {
        setPhase(stored.phase);
        setSecondsRemaining(remaining);
        setTotalSeconds(stored.totalSeconds);
      }
    } else {
      setPhase(stored.phase);
      setSecondsRemaining(stored.totalSeconds);
      setTotalSeconds(stored.totalSeconds);
    }
  }, []);

  // Countdown interval
  useEffect(() => {
    if (phase === 'sprinting' || phase === 'break' || phase === 'extended-break') {
      intervalRef.current = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            // Phase transition
            if (phase === 'sprinting') {
              setPhase('sprint-done');
              setCompletedAway(false);
              // Vibrate if available
              if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            } else {
              // Break finished
              setPhase('ready');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [phase]);

  const persistState = useCallback((p: SprintPhase, total: number, quests: SprintQuest[], sprint: number) => {
    saveSprint({
      phase: p,
      currentSprint: sprint,
      startedAt: Date.now(),
      totalSeconds: total,
      selectedQuests: quests,
      date: new Date().toISOString().split('T')[0],
    });
  }, []);

  const openSelection = useCallback(() => {
    setPhase('selecting');
    setSelectedQuests([]);
  }, []);

  const startSprint = useCallback((quests: SprintQuest[]) => {
    setSelectedQuests(quests);
    setSecondsRemaining(SPRINT_DURATION);
    setTotalSeconds(SPRINT_DURATION);
    setPhase('sprinting');
    setCompletedAway(false);
    persistState('sprinting', SPRINT_DURATION, quests, currentSprint);
  }, [currentSprint, persistState]);

  const handleCompletion = useCallback((result: 'yes' | 'partial' | 'no') => {
    // Determine if extended break needed
    const nextSprint = currentSprint + 1;
    const needsExtendedBreak = currentSprint >= maxSprints;

    if (needsExtendedBreak) {
      setPhase('extended-break');
      setSecondsRemaining(EXTENDED_BREAK_DURATION);
      setTotalSeconds(EXTENDED_BREAK_DURATION);
      persistState('extended-break', EXTENDED_BREAK_DURATION, selectedQuests, currentSprint);
    } else {
      setPhase('break');
      setSecondsRemaining(BREAK_DURATION);
      setTotalSeconds(BREAK_DURATION);
      persistState('break', BREAK_DURATION, selectedQuests, currentSprint);
    }

    // Update quest sprint progress
    if (result === 'yes') {
      setSelectedQuests(prev =>
        prev.map(q => ({ ...q, sprintsCompleted: q.sprintsCompleted + 1 }))
      );
    }

    return { result, sprintNumber: currentSprint, nextSprint };
  }, [currentSprint, maxSprints, selectedQuests, persistState]);

  const startNextSprint = useCallback(() => {
    const next = currentSprint + 1;
    setCurrentSprint(next);
    setPhase('selecting');
    setSelectedQuests([]);
  }, [currentSprint]);

  const cancelSprint = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase('idle');
    setSecondsRemaining(SPRINT_DURATION);
    setTotalSeconds(SPRINT_DURATION);
    setSelectedQuests([]);
    clearSprint();
  }, []);

  const isLimitReached = currentSprint > maxSprints;

  return {
    state: {
      phase,
      currentSprint,
      maxSprints,
      secondsRemaining,
      totalSeconds,
      selectedQuests,
      completedAway,
    } as SprintState,
    openSelection,
    startSprint,
    handleCompletion,
    startNextSprint,
    cancelSprint,
    isLimitReached,
    SPRINT_DURATION,
    BREAK_DURATION,
  };
}
