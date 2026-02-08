import { useMemo } from 'react';
import { ProtocolQuest } from '@/types/quests';
import { DailyXPBreakdown, DAILY_XP_MAX, getColdStreakBonus } from '@/types/xp';

interface UseDailyXPParams {
  quests: ProtocolQuest[];
  workoutCompleted: boolean;
  workoutXP: number;
  coldStreakDays: number;
}

export function useDailyXP({ quests, workoutCompleted, workoutXP, coldStreakDays }: UseDailyXPParams): DailyXPBreakdown {
  return useMemo(() => {
    const completedQuests = quests.filter(q => q.completed);

    const questBaseXP = completedQuests.reduce((sum, q) => sum + q.xp, 0);
    const geneticBonusXP = completedQuests.reduce((sum, q) => sum + (q.geneticBonus?.bonusXp || 0), 0);
    const trainingXP = workoutCompleted ? workoutXP : 0;
    const streakBonus = getColdStreakBonus(coldStreakDays);

    return {
      quests: questBaseXP,
      geneticBonuses: geneticBonusXP,
      training: trainingXP,
      streakBonus,
      total: questBaseXP + geneticBonusXP + trainingXP + streakBonus,
      max: DAILY_XP_MAX,
    };
  }, [quests, workoutCompleted, workoutXP, coldStreakDays]);
}
