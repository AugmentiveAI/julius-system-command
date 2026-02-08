import { useState, useEffect, useCallback, useRef } from 'react';
import { Player, INITIAL_PLAYER, PlayerStats, getLowestStat, getPenaltyLevel, INITIAL_PENALTY, Rank } from '@/types/player';
import { Quest, DailyQuestState, DEFAULT_DAILY_QUESTS } from '@/types/quest';
import { MainQuest, MainQuestState, DEFAULT_MAIN_QUESTS, getHighestRank } from '@/types/mainQuest';
import { getLevelFromTotalXP } from '@/types/xp';
import { useToast } from '@/hooks/use-toast';

interface LevelUpState {
  show: boolean;
  newLevel: number;
}

const PLAYER_STORAGE_KEY = 'the-system-player';
const QUESTS_STORAGE_KEY = 'the-system-quests';
const MAIN_QUESTS_STORAGE_KEY = 'the-system-main-quests';

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function loadPlayer(): Player {
  try {
    const stored = localStorage.getItem(PLAYER_STORAGE_KEY);
    if (stored) {
      const player = JSON.parse(stored);
      // Ensure penalty state exists for older saves
      if (!player.penalty) {
        player.penalty = INITIAL_PENALTY;
      }
      // Migrate older saves missing totalXP/coldStreak
      if (player.totalXP === undefined) {
        player.totalXP = 0;
      }
      if (player.coldStreak === undefined) {
        player.coldStreak = 0;
      }
      return player;
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
          previousDayCompletedCount: state.quests.filter(q => q.completed).length,
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
    previousDayCompletedCount: 0,
  };
}

function loadMainQuests(): MainQuestState {
  try {
    const stored = localStorage.getItem(MAIN_QUESTS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load main quest data:', e);
  }
  
  return {
    quests: DEFAULT_MAIN_QUESTS.map(q => ({ ...q, completed: false })),
  };
}

export function usePlayer() {
  const [player, setPlayer] = useState<Player>(loadPlayer);
  const [questState, setQuestState] = useState<DailyQuestState>(loadQuests);
  const [mainQuestState, setMainQuestState] = useState<MainQuestState>(loadMainQuests);
  const [showFlashEffect, setShowFlashEffect] = useState(false);
  const [levelUpState, setLevelUpState] = useState<LevelUpState>({ show: false, newLevel: 0 });
  const { toast } = useToast();
  const penaltyProcessedRef = useRef(false);

  // Persist player to localStorage
  useEffect(() => {
    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(player));
  }, [player]);

  // Persist quests to localStorage
  useEffect(() => {
    localStorage.setItem(QUESTS_STORAGE_KEY, JSON.stringify(questState));
  }, [questState]);

  // Persist main quests to localStorage
  useEffect(() => {
    localStorage.setItem(MAIN_QUESTS_STORAGE_KEY, JSON.stringify(mainQuestState));
  }, [mainQuestState]);

  // Check for daily reset and process penalties
  useEffect(() => {
    const today = getTodayDateString();
    
    if (questState.lastResetDate !== today && !penaltyProcessedRef.current) {
      penaltyProcessedRef.current = true;
      
      const previousCompletedCount = questState.quests.filter(q => q.completed).length;
      const allCompleted = previousCompletedCount === questState.quests.length;
      
      // Reset quests for new day
      setQuestState({
        quests: DEFAULT_DAILY_QUESTS.map(q => ({ ...q, completed: false })),
        lastResetDate: today,
        previousDayCompletedCount: previousCompletedCount,
      });

      setPlayer(prev => {
        let newPenalty = { ...prev.penalty, bannerDismissedForSession: false };
        let newStats = { ...prev.stats };
        let newStreak = prev.streak;

        // Calculate consecutive zero days
        if (previousCompletedCount === 0) {
          // Zero quests completed yesterday
          newPenalty.consecutiveZeroDays += 1;
          
          // Apply penalties based on level
          const penaltyLevel = getPenaltyLevel(newPenalty.consecutiveZeroDays);
          
          if (penaltyLevel >= 2 && !newPenalty.penaltyAppliedForCurrentLevel) {
            const lowestStat = getLowestStat(newStats);
            const reduction = penaltyLevel === 3 ? 2 : 1;
            newStats[lowestStat] = Math.max(1, newStats[lowestStat] - reduction);
            newPenalty.penaltyAppliedForCurrentLevel = true;

            if (penaltyLevel === 3) {
              setShowFlashEffect(true);
              setTimeout(() => setShowFlashEffect(false), 500);
            }

            toast({
              title: penaltyLevel === 3 ? "⚠️ SYSTEM WARNING" : "Penalty Zone Active",
              description: penaltyLevel === 3 
                ? `Critical failure. ${lowestStat.charAt(0).toUpperCase() + lowestStat.slice(1)} reduced by ${reduction}.`
                : `Stat penalty applied. ${lowestStat.charAt(0).toUpperCase() + lowestStat.slice(1)} reduced by ${reduction}.`,
              variant: "destructive",
            });
          } else if (penaltyLevel === 1) {
            toast({
              title: "Warning",
              description: "Zero quests completed. Penalty approaching.",
            });
          }

          // Reset streak on zero completion day
          if (newStreak > 0) {
            newStreak = 0;
            toast({
              title: "Streak Lost",
              description: "The System does not forgive inaction.",
              variant: "destructive",
            });
          }
        } else {
          // At least one quest was completed
          newPenalty.consecutiveZeroDays = 0;
          newPenalty.lastCompletionDate = questState.lastResetDate;
          newPenalty.penaltyAppliedForCurrentLevel = false;
        }

        return {
          ...prev,
          stats: newStats,
          streak: newStreak,
          penalty: newPenalty,
        };
      });
    }
  }, [questState.lastResetDate, questState.quests, toast]);

  // Reset processed ref when date changes
  useEffect(() => {
    const today = getTodayDateString();
    if (questState.lastResetDate === today) {
      penaltyProcessedRef.current = false;
    }
  }, [questState.lastResetDate]);

  const addXP = useCallback((amount: number) => {
    setPlayer(prev => {
      const newTotalXP = (prev.totalXP ?? 0) + amount;
      const { level: newLevel, currentXP, xpToNextLevel } = getLevelFromTotalXP(newTotalXP);
      const startLevel = prev.level;

      // Trigger level up effect if leveled
      if (newLevel > startLevel) {
        setLevelUpState({ show: true, newLevel });
        setTimeout(() => setLevelUpState({ show: false, newLevel: 0 }), 1600);
        
        toast({
          title: "Level Up",
          description: `You are now Level ${newLevel}.`,
        });
      }

      return {
        ...prev,
        totalXP: newTotalXP,
        currentXP,
        level: newLevel,
        xpToNextLevel,
      };
    });
  }, [toast]);

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

    // Add XP with terse notification
    addXP(quest.xpReward);
    toast({
      title: "Quest complete",
      description: `+${quest.xpReward} XP.`,
    });

    // Update last completion date and clear penalties
    setPlayer(prev => ({
      ...prev,
      penalty: {
        ...prev.penalty,
        lastCompletionDate: getTodayDateString(),
        consecutiveZeroDays: 0,
        penaltyAppliedForCurrentLevel: false,
      },
    }));

    // Check if all quests are now complete
    const allComplete = updatedQuests.every(q => q.completed);
    if (allComplete) {
      incrementStreak();
      toast({
        title: "All Quests Complete",
        description: "Streak increased. The System acknowledges your dedication.",
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

  const dismissPenaltyBanner = useCallback(() => {
    setPlayer(prev => ({
      ...prev,
      penalty: {
        ...prev.penalty,
        bannerDismissedForSession: true,
      },
    }));
  }, []);

  const completeMainQuest = useCallback((questId: string) => {
    const quest = mainQuestState.quests.find(q => q.id === questId);
    if (!quest || quest.completed) return;

    // Mark main quest as completed
    const updatedQuests = mainQuestState.quests.map(q =>
      q.id === questId ? { ...q, completed: true, completedAt: new Date().toISOString() } : q
    );

    setMainQuestState({
      quests: updatedQuests,
    });

    // Add XP
    addXP(quest.xpReward);

    // Calculate highest rank from all completed main quests
    const completedRanks = updatedQuests
      .filter(q => q.completed)
      .map(q => q.unlocksTitle);
    const highestRank = getHighestRank(completedRanks);

    // Update player title
    setPlayer(prev => ({
      ...prev,
      title: highestRank,
    }));

    toast({
      title: "Main Quest Complete",
      description: `+${quest.xpReward} XP. Title unlocked: ${quest.unlocksTitle}.`,
    });
  }, [mainQuestState.quests, addXP, toast]);

  const completedCount = questState.quests.filter(q => q.completed).length;
  const totalCount = questState.quests.length;
  const penaltyLevel = getPenaltyLevel(player.penalty.consecutiveZeroDays);

  return {
    player,
    quests: questState.quests,
    completedCount,
    totalCount,
    completeQuest,
    uncompleteQuest,
    penaltyLevel,
    showFlashEffect,
    dismissPenaltyBanner,
    mainQuests: mainQuestState.quests,
    completeMainQuest,
    levelUpState,
  };
}
