export const CURRENCY_REWARDS = {
  quest_completion: {
    'E': 5,
    'D': 10,
    'C': 15,
    'B': 25,
    'A': 40,
    'S': 60,
  } as Record<string, number>,

  dungeon_clear: {
    instant_dungeon: 50,
    boss_fight: 150,
    s_rank_gate: 300,
  } as Record<string, number>,

  emergency_quest: {
    completed: 75,
    failed: 0,
  },

  shadow_activation: 10,

  streak_milestone: {
    3: 25,
    7: 75,
    14: 150,
    30: 400,
  } as Record<number, number>,

  daily_login: 15,

  pillar_completion: 20,

  aar_grade: {
    S: 100,
    A: 50,
    B: 25,
    C: 10,
    D: 0,
    F: 0,
  } as Record<string, number>,

  monarch_sources: {
    s_rank_gate_clear: 5,
    s_rank_day: 3,
    shadow_max_power: 2,
    level_up: 1,
    weekly_s_rank: 10,
  },
};

export function getQuestEssenceReward(difficulty: string): number {
  // Map quest difficulty labels to reward tiers
  const rank = difficulty?.charAt(0)?.toUpperCase() || 'E';
  return CURRENCY_REWARDS.quest_completion[rank] || 5;
}

export function getDungeonEssenceReward(dungeonType: string): number {
  return CURRENCY_REWARDS.dungeon_clear[dungeonType] || 50;
}

export function getStreakMilestoneReward(streak: number): number | null {
  return CURRENCY_REWARDS.streak_milestone[streak] || null;
}

export function getAARGradeReward(grade: string): number {
  return CURRENCY_REWARDS.aar_grade[grade] || 0;
}
