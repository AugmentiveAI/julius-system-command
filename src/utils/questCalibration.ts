import { PlayerStateCheck, GENETIC_MODIFIERS, DAY_TYPES } from '@/types/playerState';
import { PlayerStats } from '@/types/player';
import {
  QuestDifficulty,
  QuestTemplate,
  QUEST_TEMPLATES,
  CATEGORY_STAT_MAP,
} from '@/types/questDifficulty';

// ── Types ────────────────────────────────────────────────────────────

export type Intensity = 'high' | 'medium' | 'low';

export interface CalibratedQuest {
  id: string;
  title: string;
  stat: keyof PlayerStats;
  baseXP: number;
  adjustedXP: number;
  difficulty: QuestDifficulty;
  category: string;
  estimatedMinutes: number;
  sprintCount: number;
  isBonus?: boolean;
  isMandatory?: boolean;
  isBreak?: boolean;
  geneticTag?: string;
}

export interface QuestCompletionRecord {
  questId: string;
  completedAt: string;
  stat: keyof PlayerStats;
}

export interface CalibrationResult {
  recommendedQuests: CalibratedQuest[];
  systemMessage: string;
  intensity: Intensity;
  geneticAlert: string | null;
}

// ── System Messages ──────────────────────────────────────────────────

const PUSH_MESSAGES = [
  'Peak state detected. No mercy today.',
  'The System sees your potential. Rise to it.',
  'High capacity confirmed. Maximum output authorized.',
  'All limiters removed. Execute.',
];

const STEADY_MESSAGES = [
  'Stable condition. Maintain course.',
  'Consistency compounds. Continue.',
  'Adequate capacity. Execute the standard protocol.',
  'Hold the line. Momentum is building.',
];

const RECOVERY_MESSAGES = [
  'The System protects its player. Recover now, dominate tomorrow.',
  'Even Sung Jin-Woo rested between dungeons.',
  'Strategic withdrawal is not defeat. It is preparation.',
  'Low output today preserves high output tomorrow.',
];

const ESCALATION_MESSAGE = 'WARNING: Extended recovery detected. The System requires you to push past this threshold. One quest. Just one.';

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Helpers ──────────────────────────────────────────────────────────

function isInCOMTPeak(hour: number): boolean {
  const { start, end } = GENETIC_MODIFIERS.comtWarrior.peakWindow;
  return hour >= start && hour < end;
}

function isInCOMTCrash(hour: number): boolean {
  const { start, end } = GENETIC_MODIFIERS.comtWarrior.crashWindow;
  return hour >= start && hour < end;
}

function countConsecutiveRecoveryDays(history: PlayerStateCheck[]): number {
  let count = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].systemRecommendation === 'recover') count++;
    else break;
  }
  return count;
}

function countSprintsToday(completions: QuestCompletionRecord[], today: string): number {
  return completions.filter(c => c.completedAt.startsWith(today)).length;
}

/** Check if a template is eligible for a given mode */
function isEligible(tpl: QuestTemplate, mode: 'push' | 'steady' | 'recover'): boolean {
  if (tpl.requiresState === 'any') return true;
  if (tpl.requiresState === 'push') return mode === 'push';
  if (tpl.requiresState === 'steady') return mode === 'push' || mode === 'steady';
  return false;
}

/** Select random templates matching a filter */
function selectTemplates(
  filter: (t: QuestTemplate) => boolean,
  count: number,
  exclude: Set<string>,
): QuestTemplate[] {
  const candidates = QUEST_TEMPLATES.filter(t => filter(t) && !exclude.has(t.id));
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/** Convert a template to a CalibratedQuest */
function templateToCalibrated(tpl: QuestTemplate, xpMultiplier = 1): CalibratedQuest {
  const stat = CATEGORY_STAT_MAP[tpl.category];
  return {
    id: tpl.id,
    title: tpl.name,
    stat,
    baseXP: tpl.baseXP,
    adjustedXP: Math.round(tpl.baseXP * xpMultiplier),
    difficulty: tpl.difficulty,
    category: tpl.category,
    estimatedMinutes: tpl.estimatedMinutes,
    sprintCount: tpl.sprintCount,
    geneticTag: tpl.geneticTag,
  };
}

function applyXPMultiplier(quests: CalibratedQuest[], multiplier: number): CalibratedQuest[] {
  return quests.map(q => ({
    ...q,
    adjustedXP: Math.round(q.adjustedXP * multiplier),
  }));
}

const DIFFICULTY_ORDER: Record<QuestDifficulty, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };

function downgradeDifficulty(d: QuestDifficulty): QuestDifficulty {
  const map: Record<QuestDifficulty, QuestDifficulty> = { S: 'A', A: 'B', B: 'C', C: 'D', D: 'D' };
  return map[d];
}

// ── Main Calibration Engine ──────────────────────────────────────────

export function calibrateQuests(
  currentState: PlayerStateCheck,
  stateHistory: PlayerStateCheck[],
  completionHistory: QuestCompletionRecord[],
  currentTime: Date,
): CalibrationResult {
  const hour = currentTime.getHours();
  const todayStr = currentTime.toISOString().split('T')[0];
  const dayOfWeek = currentTime.getDay();
  const dayType = DAY_TYPES[dayOfWeek];
  const timeBlock = currentState.timeBlock;
  const mode = currentState.systemRecommendation;

  const used = new Set<string>();
  let quests: CalibratedQuest[] = [];
  let systemMessage: string;
  let intensity: Intensity;
  let geneticAlert: string | null = null;

  // ── Mode-based quest selection from template library ──

  if (mode === 'push') {
    intensity = 'high';
    systemMessage = pickRandom(PUSH_MESSAGES);

    // 2 S-rank quests
    const sRank = selectTemplates(t => t.difficulty === 'S' && isEligible(t, mode), 2, used);
    sRank.forEach(t => used.add(t.id));

    // 2 A-rank (revenue-focused)
    const aRank = selectTemplates(
      t => t.difficulty === 'A' && isEligible(t, mode) && ['Sales', 'Systems', 'Wealth'].includes(t.category),
      2, used,
    );
    aRank.forEach(t => used.add(t.id));

    // 2 fill from B+ rank
    const fill = selectTemplates(
      t => ['S', 'A', 'B'].includes(t.difficulty) && isEligible(t, mode),
      2, used,
    );
    fill.forEach(t => used.add(t.id));

    const all = [...sRank, ...aRank, ...fill].slice(0, 6);
    quests = all.map(t => templateToCalibrated(t, 1.25));

    // Free day + morning = hardest first
    if (dayType === 'free' && timeBlock === 'morning') {
      quests.sort((a, b) => DIFFICULTY_ORDER[b.difficulty] - DIFFICULTY_ORDER[a.difficulty]);
    }

    // COMT peak bonus quest
    if (isInCOMTPeak(hour)) {
      const comtBonus = QUEST_TEMPLATES.find(t => t.geneticTag === 'comt_peak' && !used.has(t.id));
      if (comtBonus) {
        used.add(comtBonus.id);
        quests.push({ ...templateToCalibrated(comtBonus, 1.25), isBonus: true });
      }
    }

  } else if (mode === 'steady') {
    intensity = 'medium';
    systemMessage = pickRandom(STEADY_MESSAGES);

    let targetCount = 5;
    if (timeBlock === 'afternoon' && dayType === 'work') targetCount = 3;

    // Mix: 1 A-rank, rest B/C
    const aRank = selectTemplates(t => t.difficulty === 'A' && isEligible(t, mode), 1, used);
    aRank.forEach(t => used.add(t.id));

    const rest = selectTemplates(
      t => ['B', 'C'].includes(t.difficulty) && isEligible(t, mode),
      targetCount - aRank.length, used,
    );

    quests = [...aRank, ...rest].map(t => templateToCalibrated(t));

  } else {
    // Recovery mode
    intensity = 'low';
    const consecutiveRecovery = countConsecutiveRecoveryDays(stateHistory);

    systemMessage = consecutiveRecovery >= 3 ? ESCALATION_MESSAGE : pickRandom(RECOVERY_MESSAGES);

    // D-rank health quest
    const health = selectTemplates(t => t.difficulty === 'D' && t.category === 'Health', 1, used);
    health.forEach(t => used.add(t.id));

    // C-rank creative/learning
    const creative = selectTemplates(
      t => ['C', 'D'].includes(t.difficulty) && ['Creative', 'Learning'].includes(t.category),
      1, used,
    );
    creative.forEach(t => used.add(t.id));

    // One more D/C, no Sales/Network
    const extra = selectTemplates(
      t => ['C', 'D'].includes(t.difficulty) && !['Sales', 'Network'].includes(t.category),
      1, used,
    );

    const recoveryTemplates = [...health, ...creative, ...extra];
    quests = recoveryTemplates.map(t => templateToCalibrated(t, 0.75));

    // Mark last for recovery bonus eligibility
    if (quests.length > 0) {
      quests[quests.length - 1].isBonus = true;
    }

    // Stress = 5: mandatory walk/cold exposure
    if (currentState.stress === 5) {
      const mandatory = QUEST_TEMPLATES.find(t => t.id === 'tpl-walk-15' && !used.has(t.id))
        || QUEST_TEMPLATES.find(t => t.id === 'tpl-cold-exposure' && !used.has(t.id));
      if (mandatory) {
        quests.push({ ...templateToCalibrated(mandatory, 0.75), isMandatory: true });
      }
    }
  }

  // ── COMT time-of-day modifiers ──

  if (isInCOMTPeak(hour) && mode !== 'recover') {
    quests = applyXPMultiplier(quests, 1.2);
    geneticAlert = 'COMT dopamine peak window active. +20% XP bonus applied.';
  }

  if (isInCOMTCrash(hour)) {
    quests = quests.map(q => ({ ...q, difficulty: downgradeDifficulty(q.difficulty) }));
    geneticAlert = 'Dopamine dip window. The System has adjusted expectations.';
  }

  // ── ACTN3 Sprinter guard ──

  const sprintsToday = countSprintsToday(completionHistory, todayStr);
  const sprintQuests = quests.filter(q => q.sprintCount > 0);

  if (sprintsToday >= GENETIC_MODIFIERS.actn3Sprinter.maxSprintsBeforeDecay) {
    geneticAlert = GENETIC_MODIFIERS.actn3Sprinter.warningMessage;
    quests = quests.filter(q => q.sprintCount === 0);
  } else if (sprintQuests.length >= 3) {
    // Insert mandatory break after 3rd sprint quest
    const breakTpl = QUEST_TEMPLATES.find(t => t.id === 'tpl-sprint-break');
    if (breakTpl) {
      let sprintsSeen = 0;
      const withBreak: CalibratedQuest[] = [];
      for (const q of quests) {
        withBreak.push(q);
        if (q.sprintCount > 0) sprintsSeen++;
        if (sprintsSeen === 3) {
          withBreak.push({ ...templateToCalibrated(breakTpl), isBreak: true, isMandatory: true });
        }
      }
      quests = withBreak;
    }
  }

  // ── Day-of-week intelligence ──

  if (dayType === 'work' && timeBlock === 'morning') {
    quests.sort((a, b) => {
      const p = (q: CalibratedQuest) => (q.stat === 'sales' || q.stat === 'systems') ? 0 : 1;
      return p(a) - p(b);
    });
  }

  if (dayOfWeek === 4) {
    quests = quests.map(q => ({
      ...q,
      difficulty: q.difficulty === 'S' ? 'A' : q.difficulty,
    }));
    if (!systemMessage.includes('transition')) {
      systemMessage += ' [Transition Day — planning focus.]';
    }
  }

  if (dayOfWeek === 5 || dayOfWeek === 6) {
    quests = quests.map(q => ({
      ...q,
      difficulty: q.difficulty === 'D' ? 'C' : q.difficulty === 'C' ? 'B' : q.difficulty,
    }));
  }

  return {
    recommendedQuests: quests,
    systemMessage,
    intensity,
    geneticAlert,
  };
}

/** Utility: check if the "Second Wind" bonus should be offered */
export function shouldOfferSecondWind(
  timeBlock: string,
  coldExposureCompleted: boolean,
): CalibratedQuest | null {
  if (timeBlock !== 'evening' || !coldExposureCompleted) return null;
  const tpl = QUEST_TEMPLATES.find(t => t.id === 'tpl-second-wind');
  if (!tpl) return null;
  return { ...templateToCalibrated(tpl), isBonus: true };
}

/** Recovery bonus XP awarded when all recovery quests are completed */
export const RECOVERY_BONUS_XP = 50;
