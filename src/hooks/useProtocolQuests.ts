import { useState, useEffect, useCallback } from 'react';
import { ProtocolQuest, QuestTimeBlock } from '@/types/quests';
import { DAILY_PROTOCOL } from '@/data/dailyProtocol';

interface ProtocolQuestState {
  quests: ProtocolQuest[];
  lastResetDate: string;
}

const PROTOCOL_QUESTS_STORAGE_KEY = 'the-system-protocol-quests';

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function loadProtocolQuests(): ProtocolQuestState {
  const today = getTodayDateString();

  try {
    const stored = localStorage.getItem(PROTOCOL_QUESTS_STORAGE_KEY);
    if (stored) {
      const state: ProtocolQuestState = JSON.parse(stored);
      // Reset quests if it's a new day
      if (state.lastResetDate !== today) {
        return {
          quests: DAILY_PROTOCOL.map(q => ({ ...q, completed: false })),
          lastResetDate: today,
        };
      }
      return state;
    }
  } catch (e) {
    console.error('Failed to load protocol quest data:', e);
  }

  return {
    quests: DAILY_PROTOCOL.map(q => ({ ...q, completed: false })),
    lastResetDate: today,
  };
}

export function useProtocolQuests() {
  const [state, setState] = useState<ProtocolQuestState>(loadProtocolQuests);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(PROTOCOL_QUESTS_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Check for daily reset
  useEffect(() => {
    const today = getTodayDateString();
    if (state.lastResetDate !== today) {
      setState({
        quests: DAILY_PROTOCOL.map(q => ({ ...q, completed: false })),
        lastResetDate: today,
      });
    }
  }, [state.lastResetDate]);

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
