import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PillarStreakState,
  INITIAL_PILLAR_STREAK,
  rollPillarMasteryBonus,
  getISOWeek,
} from '@/types/pillarQuests';
import { getSystemDate } from '@/utils/dayCycleEngine';

const STREAK_KEY = 'the-system-pillar-streak';

function getTodayStr(): string {
  return getSystemDate();
}

function getYesterdayStr(): string {
  const today = getSystemDate();
  const d = new Date(today + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function loadStreak(): PillarStreakState {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { ...INITIAL_PILLAR_STREAK, shieldResetWeek: getISOWeek() };
}

export function usePillarStreak() {
  const [state, setState] = useState<PillarStreakState>(loadStreak);

  // Persist
  useEffect(() => {
    localStorage.setItem(STREAK_KEY, JSON.stringify(state));
  }, [state]);

  // Weekly shield reset
  useEffect(() => {
    const currentWeek = getISOWeek();
    if (state.shieldResetWeek !== currentWeek) {
      setState(prev => ({
        ...prev,
        shieldAvailable: true,
        shieldUsedDate: null,
        shieldResetWeek: currentWeek,
      }));
    }
  }, [state.shieldResetWeek]);

  // Check for missed day on load (if yesterday wasn't completed and not today)
  useEffect(() => {
    const today = getTodayStr();
    const yesterday = getYesterdayStr();

    if (
      state.lastCompletedDate &&
      state.lastCompletedDate !== today &&
      state.lastCompletedDate !== yesterday &&
      state.currentStreak > 0
    ) {
      // Missed a day — use shield or reset
      setState(prev => {
        if (prev.shieldAvailable) {
          return {
            ...prev,
            shieldAvailable: false,
            shieldUsedDate: yesterday,
            // streak preserved
          };
        }
        return {
          ...prev,
          currentStreak: 0,
        };
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Whether shield was just consumed (for external toast triggering) */
  const shieldJustUsed = state.shieldUsedDate === getYesterdayStr() && !state.shieldAvailable;

  /** Call when all 3 pillars are completed today */
  const recordAllPillarsComplete = useCallback((): number => {
    const today = getTodayStr();
    // Don't double-count
    if (state.lastCompletedDate === today) return 0;

    const bonus = rollPillarMasteryBonus();

    setState(prev => ({
      ...prev,
      currentStreak: prev.currentStreak + 1,
      lastCompletedDate: today,
      bonusHistory: [
        ...prev.bonusHistory.slice(-30),
        { date: today, bonus },
      ],
    }));

    return bonus;
  }, [state.lastCompletedDate]);

  const hasCompletedToday = state.lastCompletedDate === getTodayStr();

  return {
    streak: state.currentStreak,
    shieldAvailable: state.shieldAvailable,
    shieldUsedDate: state.shieldUsedDate,
    shieldJustUsed,
    hasCompletedToday,
    recordAllPillarsComplete,
    lastBonus: state.bonusHistory.length > 0 ? state.bonusHistory[state.bonusHistory.length - 1] : null,
  };
}
