import { PlayerStats, Rank } from './player';

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  level: number; // 1-3
  maxLevel: number;
  unlocked: boolean;
  unlockedAt?: string;
  effect: string;
  category: 'passive' | 'active';
  stat: keyof PlayerStats;
}

export interface SkillUnlockCondition {
  skillId: string;
  type: 'streak' | 'stat_threshold' | 'quest_count' | 'dungeon_clears' | 'shadow_count' | 'cold_streak' | 'pillar_streak';
  threshold: number;
  description: string;
}

export const SKILL_DEFINITIONS: Array<Omit<Skill, 'unlocked' | 'unlockedAt' | 'level'> & { unlockCondition: SkillUnlockCondition }> = [
  {
    id: 'morning-dominion',
    name: 'Morning Dominion',
    description: 'Mastery over the first hours. Born from relentless morning discipline.',
    icon: '🌅',
    maxLevel: 3,
    effect: '+10% XP on morning quests',
    category: 'passive',
    stat: 'discipline',
    unlockCondition: { skillId: 'morning-dominion', type: 'streak', threshold: 7, description: '7-day completion streak' },
  },
  {
    id: 'iron-will',
    name: 'Iron Will',
    description: 'Pain is fuel. Cold forges strength.',
    icon: '🧊',
    maxLevel: 3,
    effect: '+2 Discipline per cold streak milestone',
    category: 'passive',
    stat: 'discipline',
    unlockCondition: { skillId: 'iron-will', type: 'cold_streak', threshold: 7, description: '7-day cold exposure streak' },
  },
  {
    id: 'shadow-extraction',
    name: 'Shadow Extraction',
    description: 'The ability to extract shadows from conquered foes.',
    icon: '👤',
    maxLevel: 3,
    effect: 'Shadow Army power multiplier +10%',
    category: 'active',
    stat: 'network',
    unlockCondition: { skillId: 'shadow-extraction', type: 'shadow_count', threshold: 3, description: 'Extract 3 shadows' },
  },
  {
    id: 'dungeon-sense',
    name: 'Dungeon Sense',
    description: 'Heightened awareness in hostile environments.',
    icon: '🏰',
    maxLevel: 3,
    effect: '+15% XP from dungeon clears',
    category: 'passive',
    stat: 'systems',
    unlockCondition: { skillId: 'dungeon-sense', type: 'dungeon_clears', threshold: 3, description: 'Clear 3 dungeons' },
  },
  {
    id: 'rulers-authority',
    name: "Ruler's Authority",
    description: 'Command over systems and processes. The mark of a true Monarch.',
    icon: '👑',
    maxLevel: 1,
    effect: 'All stat gains +0.1',
    category: 'passive',
    stat: 'systems',
    unlockCondition: { skillId: 'rulers-authority', type: 'stat_threshold', threshold: 50, description: 'All stats above 50' },
  },
  {
    id: 'stealth',
    name: 'Stealth',
    description: 'Move in silence. Execute without announcement.',
    icon: '🥷',
    maxLevel: 3,
    effect: 'Shadow quests appear 20% more often',
    category: 'passive',
    stat: 'creative',
    unlockCondition: { skillId: 'stealth', type: 'quest_count', threshold: 50, description: 'Complete 50 quests' },
  },
  {
    id: 'pillar-mastery',
    name: 'Pillar Mastery',
    description: 'Perfect balance across Mind, Body, and Skill.',
    icon: '⚡',
    maxLevel: 3,
    effect: 'Pillar mastery bonus +25 XP',
    category: 'passive',
    stat: 'discipline',
    unlockCondition: { skillId: 'pillar-mastery', type: 'pillar_streak', threshold: 14, description: '14-day pillar streak' },
  },
  {
    id: 'dash',
    name: 'Dash',
    description: 'Explosive speed. Sprint capacity enhanced.',
    icon: '💨',
    maxLevel: 3,
    effect: '+1 max sprint slot',
    category: 'active',
    stat: 'discipline',
    unlockCondition: { skillId: 'dash', type: 'stat_threshold', threshold: 30, description: 'Discipline above 30' },
  },
];

export const RANK_THRESHOLDS = [
  { rank: 'E-Rank Hunter' as const, minLevel: 1 },
  { rank: 'D-Rank Hunter' as const, minLevel: 2 },
  { rank: 'C-Rank Hunter' as const, minLevel: 4 },
  { rank: 'B-Rank Hunter' as const, minLevel: 6 },
  { rank: 'A-Rank Hunter' as const, minLevel: 7 },
  { rank: 'S-Rank Hunter' as const, minLevel: 8 },
  { rank: 'Monarch Candidate' as const, minLevel: 9 },
  { rank: 'Shadow Monarch' as const, minLevel: 10 },
];

export function getRankForLevel(level: number): Rank {
  let rank: Rank = 'E-Rank Hunter';
  for (const t of RANK_THRESHOLDS) {
    if (level >= t.minLevel) rank = t.rank;
  }
  return rank;
}
