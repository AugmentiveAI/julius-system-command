import { PlayerStats } from './player';

export type Pillar = 'mind' | 'body' | 'skill';

export interface PillarQuest {
  id: string;
  pillar: Pillar;
  title: string;
  stat: keyof PlayerStats;
  xp: number;
  dayTypes: Array<'work' | 'transition' | 'sprint'>;
  description: string;
}

export interface PillarQuestState {
  quests: PillarQuest[];
  completed: string[]; // completed quest IDs
  lastResetDate: string;
}

export const PILLAR_CONFIG: Record<Pillar, { label: string; icon: string; color: string; glowClass: string }> = {
  mind: {
    label: 'MIND',
    icon: '🧠',
    color: 'text-primary',
    glowClass: 'border-primary/40',
  },
  body: {
    label: 'BODY',
    icon: '⚡',
    color: 'text-green-400',
    glowClass: 'border-green-500/40',
  },
  skill: {
    label: 'SKILL',
    icon: '🎯',
    color: 'text-amber-400',
    glowClass: 'border-amber-500/40',
  },
};
