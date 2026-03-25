import { PlayerStats } from './player';

export interface SkillMasteryLevel {
  level: number;
  name: string;
  requiredUses: number;
  xpMultiplier: number;
  description: string;
}

export interface MasterableSkill {
  id: string;
  name: string;
  icon: string;
  stat: keyof PlayerStats;
  category: 'combat' | 'trade' | 'intel' | 'endurance';
  description: string;
  trackingQuestIds: string[]; // quest IDs that increment usage
  trackingKeywords: string[]; // keywords in quest titles that count
  levels: SkillMasteryLevel[];
}

export interface SkillMasteryState {
  skillId: string;
  currentXp: number;
  level: number;
  maxLevel: number;
  timesUsed: number;
  lastUsedAt?: string;
  unlockedAt: string;
}

// XP thresholds per mastery level
export const MASTERY_TIERS: SkillMasteryLevel[] = [
  { level: 1, name: 'Novice', requiredUses: 0, xpMultiplier: 1.0, description: 'Beginning to learn.' },
  { level: 2, name: 'Apprentice', requiredUses: 25, xpMultiplier: 1.1, description: 'Gaining competence.' },
  { level: 3, name: 'Journeyman', requiredUses: 75, xpMultiplier: 1.2, description: 'Reliable execution.' },
  { level: 4, name: 'Expert', requiredUses: 150, xpMultiplier: 1.35, description: 'Mastery emerging.' },
  { level: 5, name: 'Master', requiredUses: 300, xpMultiplier: 1.5, description: 'Peak performance.' },
];

export const MASTERABLE_SKILLS: MasterableSkill[] = [
  {
    id: 'cold-outreach',
    name: 'Silver Tongue',
    icon: '🗣️',
    stat: 'sales',
    category: 'trade',
    description: 'The art of cold outreach. Each message sharpens the blade.',
    trackingQuestIds: ['cold-outreach'],
    trackingKeywords: ['outreach', 'prospect', 'cold message', 'cold email'],
    levels: MASTERY_TIERS,
  },
  {
    id: 'deep-work',
    name: 'Deep Focus',
    icon: '🧠',
    stat: 'systems',
    category: 'intel',
    description: 'Sustained concentration under pressure. The foundation of output.',
    trackingQuestIds: ['deep-work-1', 'deep-work-2', 'deep-work-3'],
    trackingKeywords: ['deep work', 'sprint', 'focused'],
    levels: MASTERY_TIERS,
  },
  {
    id: 'cold-exposure',
    name: 'Iron Fortitude',
    icon: '🧊',
    stat: 'discipline',
    category: 'endurance',
    description: 'Voluntary discomfort. Cold forges unbreakable will.',
    trackingQuestIds: ['cold-exposure'],
    trackingKeywords: ['cold exposure', 'cold shower', 'ice bath'],
    levels: MASTERY_TIERS,
  },
  {
    id: 'content-creation',
    name: 'Forge of Ideas',
    icon: '✍️',
    stat: 'creative',
    category: 'trade',
    description: 'Consistent creation builds an audience and a legacy.',
    trackingQuestIds: ['create-content'],
    trackingKeywords: ['content', 'create', 'write', 'publish'],
    levels: MASTERY_TIERS,
  },
  {
    id: 'client-work',
    name: 'Deal Closer',
    icon: '🤝',
    stat: 'sales',
    category: 'trade',
    description: 'High-stakes calls and negotiations. Warrior gene advantage.',
    trackingQuestIds: ['client-work'],
    trackingKeywords: ['client', 'discovery call', 'close', 'deal'],
    levels: MASTERY_TIERS,
  },
  {
    id: 'training',
    name: 'Physical Dominion',
    icon: '💪',
    stat: 'discipline',
    category: 'endurance',
    description: 'Consistent training builds the vessel that carries everything else.',
    trackingQuestIds: ['scheduled-training'],
    trackingKeywords: ['training', 'workout', 'exercise', 'lift'],
    levels: MASTERY_TIERS,
  },
  {
    id: 'meditation',
    name: 'Mind Fortress',
    icon: '🧘',
    stat: 'discipline',
    category: 'intel',
    description: 'Meditation protects against cognitive decline. APOE e4 shield.',
    trackingQuestIds: ['meditation'],
    trackingKeywords: ['meditation', 'meditate', 'mindfulness'],
    levels: MASTERY_TIERS,
  },
  {
    id: 'learning',
    name: 'Knowledge Absorption',
    icon: '📚',
    stat: 'systems',
    category: 'intel',
    description: 'Post-workout learning during peak BDNF. Maximum retention.',
    trackingQuestIds: ['learning-sprint'],
    trackingKeywords: ['learning', 'study', 'course', 'read'],
    levels: MASTERY_TIERS,
  },
  {
    id: 'networking',
    name: 'Web Weaver',
    icon: '🕸️',
    stat: 'network',
    category: 'trade',
    description: 'Building strategic relationships that compound over time.',
    trackingQuestIds: [],
    trackingKeywords: ['network', 'connect', 'relationship', 'community'],
    levels: MASTERY_TIERS,
  },
  {
    id: 'financial-ops',
    name: 'Wealth Engine',
    icon: '💰',
    stat: 'wealth',
    category: 'combat',
    description: 'Financial discipline and pipeline management. Money is a tool.',
    trackingQuestIds: ['review-financials'],
    trackingKeywords: ['financial', 'revenue', 'pipeline', 'invoice'],
    levels: MASTERY_TIERS,
  },
];

export function getMasteryLevel(timesUsed: number): SkillMasteryLevel {
  let current = MASTERY_TIERS[0];
  for (const tier of MASTERY_TIERS) {
    if (timesUsed >= tier.requiredUses) current = tier;
  }
  return current;
}

export function getNextMasteryLevel(timesUsed: number): SkillMasteryLevel | null {
  for (const tier of MASTERY_TIERS) {
    if (timesUsed < tier.requiredUses) return tier;
  }
  return null;
}

export function getMasteryProgress(timesUsed: number): number {
  const current = getMasteryLevel(timesUsed);
  const next = getNextMasteryLevel(timesUsed);
  if (!next) return 100;
  const range = next.requiredUses - current.requiredUses;
  const progress = timesUsed - current.requiredUses;
  return Math.round((progress / range) * 100);
}
