import { useState, useEffect, useCallback } from 'react';
import { Player, INITIAL_PLAYER, PlayerStats } from '@/types/player';
import { Quest, DailyQuestState, DEFAULT_DAILY_QUESTS } from '@/types/quest';
import { useToast } from '@/hooks/use-toast';

const PLAYER_STORAGE_KEY = 'the-system-player';
const QUESTS_STORAGE_KEY = 'the-system-quests';

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function loadPlayer(): Player {
  try {
    const stored = localStorage.getItem(PLAYER_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load player data:', e);
  }
  return INITIAL_PLAYER;
}

function loadQuests(): DailyQuestState {
  const today = getTodayDateString();
  
  try {
    const stored = localStorage.getItem(QUESTS_STORAGE_KEY);
    if (stored) {
      const state: DailyQuestState = JSON.parse(stored);
      // Reset quests if it's a new day
      if (state.lastResetDate !== today) {
        return {
          quests: DEFAULT_DAILY_QUESTS.map(q => ({ ...q, completed: false })),
          lastResetDate: today,
        };
      }
      return state;
    }
  } catch (e) {
    console.error('Failed to load quest data:', e);
  }
  
  return {
    quests: DEFAULT_DAILY_QUESTS.map(q => ({ ...q, completed: false })),
    lastResetDate: today,
  };
}

export function usePlayer() {
  const [player, setPlayer] = useState<Player>(loadPlayer);
  const [questState, setQuestState] = useState<DailyQuestState>(loadQuests);
  const { toast } = useToast();

  // Persist player to localStorage
  useEffect(() => {
    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(player));
  }, [player]);

  // Persist quests to localStorage
  useEffect(() => {
    localStorage.setItem(QUESTS_STORAGE_KEY, JSON.stringify(questState));
  }, [questState]);

  // Check for daily reset
  useEffect(() => {
    const today = getTodayDateString();
    if (questState.lastResetDate !== today) {
      setQuestState({
        quests: DEFAULT_DAILY_QUESTS.map(q => ({ ...q, completed: false })),
        lastResetDate: today,
      });
    }
  }, [questState.lastResetDate]);

  const addXP = useCallback((amount: number) => {
    setPlayer(prev => {
      let newXP = prev.currentXP + amount;
      let newLevel = prev.level;
      let xpToNext = prev.xpToNextLevel;

      // Level up logic
      while (newXP >= xpToNext) {
        newXP -= xpToNext;
        newLevel++;
        xpToNext = Math.floor(xpToNext * 1.2); // 20% more XP needed each level
      }

      return {
        ...prev,
        currentXP: newXP,
        level: newLevel,
        xpToNextLevel: xpToNext,
      };
    });
  }, []);

  const incrementStreak = useCallback(() => {
    setPlayer(prev => ({
      ...prev,
      streak: prev.streak + 1,
    }));
  }, []);

  const completeQuest = useCallback((questId: string) => {
    const quest = questState.quests.find(q => q.id === questId);
    if (!quest || quest.completed) return;

    // Mark quest as completed
    const updatedQuests = questState.quests.map(q =>
      q.id === questId ? { ...q, completed: true } : q
    );

    setQuestState(prev => ({
      ...prev,
      quests: updatedQuests,
    }));

    // Add XP
    addXP(quest.xpReward);

    // Check if all quests are now complete
    const allComplete = updatedQuests.every(q => q.completed);
    if (allComplete) {
      incrementStreak();
      toast({
        title: "All Quests Complete",
        description: `Streak increased. The System acknowledges your dedication.`,
      });
    }
  }, [questState.quests, addXP, incrementStreak, toast]);

  const uncompleteQuest = useCallback((questId: string) => {
    const quest = questState.quests.find(q => q.id === questId);
    if (!quest || !quest.completed) return;

    setQuestState(prev => ({
      ...prev,
      quests: prev.quests.map(q =>
        q.id === questId ? { ...q, completed: false } : q
      ),
    }));

    // Remove XP (but don't go below 0)
    setPlayer(prev => ({
      ...prev,
      currentXP: Math.max(0, prev.currentXP - quest.xpReward),
    }));
  }, [questState.quests]);

  const completedCount = questState.quests.filter(q => q.completed).length;
  const totalCount = questState.quests.length;

  return {
    player,
    quests: questState.quests,
    completedCount,
    totalCount,
    completeQuest,
    uncompleteQuest,
  };
}
