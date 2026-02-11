import { useState, useEffect, useCallback, useMemo } from 'react';
import { Pillar, PillarQuest, PillarQuestState } from '@/types/pillarQuests';
import { PILLAR_QUESTS } from '@/data/pillarQuests';
import { getDayProfile } from '@/utils/weeklyRhythm';
import { getSystemDate } from '@/utils/dayCycleEngine';

const STORAGE_KEY = 'the-system-pillar-quests';

function getTodayDateString(): string {
  return getSystemDate();
}

function getTodayPillarQuests(): PillarQuest[] {
  const dayProfile = getDayProfile();
  return PILLAR_QUESTS.filter(q => q.dayTypes.includes(dayProfile.dayType));
}

function loadState(): PillarQuestState {
  const today = getTodayDateString();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const state: PillarQuestState = JSON.parse(stored);
      if (state.lastResetDate === today) return state;
    }
  } catch (e) {
    console.error('Failed to load pillar quest state:', e);
  }
  return {
    quests: getTodayPillarQuests(),
    completed: [],
    lastResetDate: today,
  };
}

export function usePillarQuests() {
  const [state, setState] = useState<PillarQuestState>(loadState);

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Daily reset (including when app resumes from background)
  useEffect(() => {
    const checkReset = () => {
      const today = getTodayDateString();
      setState(prev => {
        if (prev.lastResetDate !== today) {
          return {
            quests: getTodayPillarQuests(),
            completed: [],
            lastResetDate: today,
          };
        }
        return prev;
      });
    };

    checkReset();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkReset();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const toggleQuest = useCallback((questId: string) => {
    setState(prev => {
      const isCompleted = prev.completed.includes(questId);
      return {
        ...prev,
        completed: isCompleted
          ? prev.completed.filter(id => id !== questId)
          : [...prev.completed, questId],
      };
    });
  }, []);

  const isCompleted = useCallback((questId: string) => {
    return state.completed.includes(questId);
  }, [state.completed]);

  const allCompleted = useMemo(() => {
    return state.quests.length > 0 && state.quests.every(q => state.completed.includes(q.id));
  }, [state.quests, state.completed]);

  const completedCount = useMemo(() => {
    return state.quests.filter(q => state.completed.includes(q.id)).length;
  }, [state.quests, state.completed]);

  const totalXpEarned = useMemo(() => {
    return state.quests
      .filter(q => state.completed.includes(q.id))
      .reduce((sum, q) => sum + q.xp, 0);
  }, [state.quests, state.completed]);

  const dayType = useMemo(() => getDayProfile().dayType, []);

  return {
    quests: state.quests,
    completed: state.completed,
    toggleQuest,
    isCompleted,
    allCompleted,
    completedCount,
    totalXpEarned,
    dayType,
  };
}
