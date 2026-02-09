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

// ── Pillar Shield & Streak ──────────────────────────────────────────
export interface PillarStreakState {
  currentStreak: number;
  shieldAvailable: boolean; // one free miss per week
  shieldUsedDate: string | null; // ISO date when shield was consumed
  shieldResetWeek: string; // ISO week identifier for weekly reset
  lastCompletedDate: string | null; // last date all 3 pillars completed
  bonusHistory: Array<{ date: string; bonus: number }>; // variable bonus log
}

export const INITIAL_PILLAR_STREAK: PillarStreakState = {
  currentStreak: 0,
  shieldAvailable: true,
  shieldUsedDate: null,
  shieldResetWeek: '',
  lastCompletedDate: null,
  bonusHistory: [],
};

/** Roll a variable bonus (25-100 XP) when all 3 pillars complete */
export function rollPillarMasteryBonus(): number {
  const roll = Math.random();
  if (roll < 0.05) return 100; // 5% jackpot
  if (roll < 0.20) return 75;  // 15% high
  if (roll < 0.50) return 50;  // 30% medium
  return 25;                   // 50% base
}

/** Get ISO week string for shield reset tracking */
export function getISOWeek(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// ── Pillar Confirmation (two-touch) ─────────────────────────────────
export interface PillarConfirmationState {
  previewDate: string | null; // date when pillars were previewed (evening)
  confirmedDate: string | null; // date when pillars were confirmed (morning)
  pillarsPreview: Array<{ id: string; pillar: Pillar; title: string }>; // cached preview
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
