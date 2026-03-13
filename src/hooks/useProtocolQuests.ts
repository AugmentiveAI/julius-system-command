import { useState, useEffect, useCallback } from 'react';
import { ProtocolQuest, QuestTimeBlock } from '@/types/quests';
import { DAILY_PROTOCOL } from '@/data/dailyProtocol';
import { getSystemDate } from '@/utils/dayCycleEngine';

interface ProtocolQuestState {
  quests: ProtocolQuest[];
  lastResetDate: string;
}

const PROTOCOL_QUESTS_STORAGE_KEY = 'the-system-protocol-quests';

function getRehabPhase(): string {
  try {
    const raw = localStorage.getItem('systemPhysicalState');
    if (raw) return JSON.parse(raw).rehabPhase || 'strength';
  } catch { /* ignore */ }
  return 'strength';
}

const PHASE_ORDER = ['mobility', 'strength', 'power', 'performance'];

function shouldShowRehabQuest(quest: ProtocolQuest, currentPhase: string): boolean {
  if (!quest.isRehab || !quest.requiredUntilPhase) return true;
  const currentIdx = PHASE_ORDER.indexOf(currentPhase);
  const requiredIdx = PHASE_ORDER.indexOf(quest.requiredUntilPhase);
  return currentIdx < requiredIdx;
}

function isSundayEvening(): boolean {
  const now = new Date();
  return now.getDay() === 0 && now.getHours() >= 17;
}

function loadProtocolQuests(): ProtocolQuestState {
  const today = getSystemDate();
  const rehabPhase = getRehabPhase();

  // Filter protocol based on rehab phase and frequency
  const filteredProtocol = DAILY_PROTOCOL.filter(q => {
    if (!shouldShowRehabQuest(q, rehabPhase)) return false;
    if (q.frequency === 'weekly' && !isSundayEvening()) return false;
    return true;
  });

  try {
    const stored = localStorage.getItem(PROTOCOL_QUESTS_STORAGE_KEY);
    if (stored) {
      const state: ProtocolQuestState = JSON.parse(stored);
      if (state.lastResetDate !== today) {
        return {
          quests: filteredProtocol.map(q => ({ ...q, completed: false })),
          lastResetDate: today,
        };
      }
      // Merge: keep completion state for existing quests, add new ones
      return {
        ...state,
        quests: filteredProtocol.map(q => {
          const existing = state.quests.find(sq => sq.id === q.id);
          return existing ? { ...q, completed: existing.completed } : { ...q, completed: false };
        }),
      };
    }
  } catch (e) {
    console.error('Failed to load protocol quest data:', e);
  }

  return {
    quests: filteredProtocol.map(q => ({ ...q, completed: false })),
    lastResetDate: today,
  };
}

export function useProtocolQuests() {
  const [state, setState] = useState<ProtocolQuestState>(loadProtocolQuests);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(PROTOCOL_QUESTS_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Check for daily reset (including when app resumes from background)
  useEffect(() => {
    const checkReset = () => {
      const today = getSystemDate();
      const rehabPhase = getRehabPhase();
      const filteredProtocol = DAILY_PROTOCOL.filter(q => {
        if (!shouldShowRehabQuest(q, rehabPhase)) return false;
        if (q.frequency === 'weekly' && !isSundayEvening()) return false;
        return true;
      });
      setState(prev => {
        if (prev.lastResetDate !== today) {
          return {
            quests: filteredProtocol.map(q => ({ ...q, completed: false })),
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
    setState(prev => ({
      ...prev,
      quests: prev.quests.map(q =>
        q.id === questId ? { ...q, completed: !q.completed } : q
      ),
    }));
  }, []);

  const setQuestCompleted = useCallback((questId: string, completed: boolean) => {
    setState(prev => {
      const quest = prev.quests.find(q => q.id === questId);
      if (!quest || quest.completed === completed) return prev;
      return {
        ...prev,
        quests: prev.quests.map(q =>
          q.id === questId ? { ...q, completed } : q
        ),
      };
    });
  }, []);

  const getQuestsByTimeBlock = useCallback((timeBlock: QuestTimeBlock) => {
    return state.quests.filter(q => q.timeBlock === timeBlock);
  }, [state.quests]);

  const getTimeBlockStats = useCallback((timeBlock: QuestTimeBlock) => {
    const quests = state.quests.filter(q => q.timeBlock === timeBlock);
    const completed = quests.filter(q => q.completed).length;
    const total = quests.length;
    const earnedXp = quests
      .filter(q => q.completed)
      .reduce((sum, q) => sum + q.xp + (q.geneticBonus?.bonusXp || 0), 0);
    const totalXp = quests.reduce((sum, q) => sum + q.xp + (q.geneticBonus?.bonusXp || 0), 0);

    return { completed, total, earnedXp, totalXp };
  }, [state.quests]);

  const getTotalStats = useCallback(() => {
    const completed = state.quests.filter(q => q.completed).length;
    const total = state.quests.length;
    const earnedXp = state.quests
      .filter(q => q.completed)
      .reduce((sum, q) => sum + q.xp + (q.geneticBonus?.bonusXp || 0), 0);
    const totalXp = state.quests.reduce((sum, q) => sum + q.xp + (q.geneticBonus?.bonusXp || 0), 0);

    return { completed, total, earnedXp, totalXp };
  }, [state.quests]);

  return {
    quests: state.quests,
    toggleQuest,
    setQuestCompleted,
    getQuestsByTimeBlock,
    getTimeBlockStats,
    getTotalStats,
  };
}
