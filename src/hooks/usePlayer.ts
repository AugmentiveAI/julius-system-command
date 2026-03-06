import { useState, useEffect, useCallback, useRef } from 'react';
import { Player, INITIAL_PLAYER, PlayerStats, getLowestStat, getPenaltyLevel, INITIAL_PENALTY, Rank, getStatIncrement, capStat } from '@/types/player';
import { Quest, DailyQuestState, DEFAULT_DAILY_QUESTS } from '@/types/quest';
import { MainQuest, MainQuestState, DEFAULT_MAIN_QUESTS, getHighestRank } from '@/types/mainQuest';
import { getLevelFromTotalXP } from '@/types/xp';
import { useToast } from '@/hooks/use-toast';
import { getSystemToast } from '@/utils/systemVoice';
import { usePlayerSync } from '@/hooks/usePlayerSync';
import { getSystemDate } from '@/utils/dayCycleEngine';

interface LevelUpState {
  show: boolean;
  newLevel: number;
}

const PLAYER_STORAGE_KEY = 'the-system-player';
const QUESTS_STORAGE_KEY = 'the-system-quests';
const MAIN_QUESTS_STORAGE_KEY = 'the-system-main-quests';

function getTodayDateString(): string {
  return getSystemDate();
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
  const questStateRef = useRef(questState);
  useEffect(() => { questStateRef.current = questState; }, [questState]);

  // ── Sync player state with Supabase ──────────────────────────
  usePlayerSync(player, setPlayer);

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

  // Check for daily reset and process penalties (including app resume from background)
  useEffect(() => {
    const processReset = () => {
      const today = getTodayDateString();
      const currentQuestState = questStateRef.current;
      if (currentQuestState.lastResetDate !== today && !penaltyProcessedRef.current) {
        penaltyProcessedRef.current = true;
        
        const previousCompletedCount = currentQuestState.quests.filter(q => q.completed).length;
        
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

          if (previousCompletedCount === 0) {
            newPenalty.consecutiveZeroDays += 1;
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
                ...getSystemToast('penaltyCritical', {
                  stat: lowestStat.charAt(0).toUpperCase() + lowestStat.slice(1),
                  reduction,
                }),
                variant: "destructive",
              });
            } else if (penaltyLevel === 1) {
              toast(getSystemToast('penaltyWarning'));
            }

            if (newStreak > 0) {
              newStreak = 0;
              toast({
                ...getSystemToast('streakLost'),
                variant: "destructive",
              });
            }
          } else {
            newPenalty.consecutiveZeroDays = 0;
            newPenalty.lastCompletionDate = currentQuestState.lastResetDate;
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
    };

    processReset();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') processReset();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [toast]);

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
        
        toast(getSystemToast('levelUp', { level: newLevel }));
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
    toast(getSystemToast('questCompleted', { xp: quest.xpReward, stat: quest.stat }));

    // Update stat, last completion date, and clear penalties
    const statIncrement = getStatIncrement(quest.stat);
    setPlayer(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        [quest.stat]: capStat(prev.stats[quest.stat] + statIncrement),
      },
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
      toast(getSystemToast('allQuestsComplete'));
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

    // Remove XP and reverse stat gain
    const statIncrement = getStatIncrement(quest.stat);
    setPlayer(prev => ({
      ...prev,
      currentXP: Math.max(0, prev.currentXP - quest.xpReward),
      totalXP: Math.max(0, (prev.totalXP ?? 0) - quest.xpReward),
      stats: {
        ...prev.stats,
        [quest.stat]: Math.max(1, prev.stats[quest.stat] - statIncrement),
      },
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

    toast(getSystemToast('milestoneComplete', { name: quest.title, xp: quest.xpReward, title: quest.unlocksTitle }));
  }, [mainQuestState.quests, addXP, toast]);

  const applyTrainingStats = useCallback(() => {
    setPlayer(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        discipline: capStat(prev.stats.discipline + 1),
        systems: capStat(prev.stats.systems + 0.5),
      },
    }));
  }, []);

  const COLD_MILESTONES = [7, 14, 30];

  const applyColdStreakMilestone = useCallback((streakDays: number) => {
    if (COLD_MILESTONES.includes(streakDays)) {
      setPlayer(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          discipline: capStat(prev.stats.discipline + 2),
        },
      }));
      toast(getSystemToast('coldStreakMilestone', { streak: streakDays }));
    }
  }, [toast]);

  const setGoal = useCallback((goal: string) => {
    setPlayer(prev => ({ ...prev, goal }));
  }, []);

  const reduceStat = useCallback((stat: string, amount: number) => {
    setPlayer(prev => {
      const newStats = { ...prev.stats };
      const key = stat as keyof PlayerStats;
      newStats[key] = Math.max(1, newStats[key] - amount);
      return { ...prev, stats: newStats };
    });
  }, []);

  const resetPenaltyDays = useCallback(() => {
    setPlayer(prev => ({
      ...prev,
      penalty: { ...prev.penalty, consecutiveZeroDays: 0, penaltyAppliedForCurrentLevel: false },
    }));
  }, []);

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
    addXP,
    applyTrainingStats,
    applyColdStreakMilestone,
    setGoal,
    reduceStat,
    resetPenaltyDays,
  };
}
