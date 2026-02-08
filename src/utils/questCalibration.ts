import { PlayerStateCheck, GENETIC_MODIFIERS, DAY_TYPES } from '@/types/playerState';
import { PlayerStats } from '@/types/player';

// ── Types ────────────────────────────────────────────────────────────

export type Difficulty = 'low' | 'medium' | 'high';
export type Intensity = 'high' | 'medium' | 'low';

export interface CalibratedQuest {
  id: string;
  title: string;
  stat: keyof PlayerStats;
  baseXP: number;
  adjustedXP: number;
  difficulty: Difficulty;
  isBonus?: boolean;
  isMandatory?: boolean;
  isBreak?: boolean;
}

export interface QuestCompletionRecord {
  questId: string;
  completedAt: string; // ISO timestamp
  stat: keyof PlayerStats;
}

export interface CalibrationResult {
  recommendedQuests: CalibratedQuest[];
  systemMessage: string;
  intensity: Intensity;
  geneticAlert: string | null;
}

// ── Quest Pool ───────────────────────────────────────────────────────

interface PoolQuest {
  id: string;
  title: string;
  stat: keyof PlayerStats;
  baseXP: number;
  difficulty: Difficulty;
  tags: string[];
}

const QUEST_POOL: PoolQuest[] = [
  // Sales / outreach
  { id: 'cal-cold-outreach', title: 'Send 10 cold outreach messages', stat: 'sales', baseXP: 5, difficulty: 'high', tags: ['sales', 'revenue'] },
  { id: 'cal-follow-up', title: 'Follow up with 5 warm leads', stat: 'sales', baseXP: 4, difficulty: 'medium', tags: ['sales', 'revenue'] },
  { id: 'cal-pitch-practice', title: 'Record & review one pitch attempt', stat: 'sales', baseXP: 3, difficulty: 'medium', tags: ['sales', 'creative'] },

  // Systems / deep work
  { id: 'cal-deep-work', title: 'Complete one 45-min deep work sprint', stat: 'systems', baseXP: 5, difficulty: 'high', tags: ['systems', 'sprint'] },
  { id: 'cal-build-ship', title: 'Deep Work Sprint: Build or Ship Something', stat: 'systems', baseXP: 50, difficulty: 'high', tags: ['systems', 'sprint', 'comt-bonus'] },
  { id: 'cal-automate', title: 'Automate or streamline one workflow', stat: 'systems', baseXP: 4, difficulty: 'medium', tags: ['systems'] },
  { id: 'cal-plan', title: 'Plan tomorrow\'s priority sprint list', stat: 'systems', baseXP: 2, difficulty: 'low', tags: ['systems', 'planning'] },

  // Creative
  { id: 'cal-content', title: 'Create one piece of content', stat: 'creative', baseXP: 3, difficulty: 'medium', tags: ['creative'] },
  { id: 'cal-journal', title: 'Journaling / reflection session', stat: 'creative', baseXP: 2, difficulty: 'low', tags: ['creative', 'recovery'] },
  { id: 'cal-learn', title: 'Learn something new (30 min)', stat: 'creative', baseXP: 3, difficulty: 'low', tags: ['creative', 'learning'] },

  // Discipline / health
  { id: 'cal-exercise', title: 'Exercise for 30 minutes', stat: 'discipline', baseXP: 3, difficulty: 'medium', tags: ['health'] },
  { id: 'cal-cold-exposure', title: 'Cold exposure session', stat: 'discipline', baseXP: 3, difficulty: 'medium', tags: ['health', 'recovery'] },
  { id: 'cal-walk', title: '30-minute walk or cold exposure', stat: 'discipline', baseXP: 2, difficulty: 'low', tags: ['health', 'recovery', 'mandatory-stress'] },
  { id: 'cal-supplements', title: 'Complete all supplement stacks', stat: 'discipline', baseXP: 2, difficulty: 'low', tags: ['health'] },

  // Wealth
  { id: 'cal-financials', title: 'Review financials or pipeline', stat: 'wealth', baseXP: 2, difficulty: 'medium', tags: ['revenue'] },
  { id: 'cal-invoice', title: 'Send pending invoices or proposals', stat: 'wealth', baseXP: 3, difficulty: 'medium', tags: ['revenue'] },

  // Network
  { id: 'cal-network', title: 'Engage 3 people in your niche online', stat: 'network', baseXP: 2, difficulty: 'low', tags: ['network'] },
  { id: 'cal-collab', title: 'Reach out to 1 potential collaborator', stat: 'network', baseXP: 3, difficulty: 'medium', tags: ['network'] },

  // Break / recovery
  { id: 'cal-break', title: '15-minute break (walk, stretch, breathe)', stat: 'discipline', baseXP: 1, difficulty: 'low', tags: ['break'], },
  { id: 'cal-second-wind', title: 'Second Wind: Post-cold-exposure sprint', stat: 'systems', baseXP: 30, difficulty: 'medium', tags: ['systems', 'comt-evening'] },
];

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

function getHour(date: Date): number {
  return date.getHours();
}

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
  return completions.filter(c => {
    const pool = QUEST_POOL.find(q => q.id === c.questId);
    return c.completedAt.startsWith(today) && pool?.tags.includes('sprint');
  }).length;
}

function reduceDifficulty(d: Difficulty): Difficulty {
  if (d === 'high') return 'medium';
  if (d === 'medium') return 'low';
  return 'low';
}

function applyXPMultiplier(quests: CalibratedQuest[], multiplier: number): CalibratedQuest[] {
  return quests.map(q => ({
    ...q,
    adjustedXP: Math.round(q.adjustedXP * multiplier),
  }));
}

function selectFromPool(
  filter: (q: PoolQuest) => boolean,
  count: number,
  exclude: Set<string> = new Set(),
): PoolQuest[] {
  const candidates = QUEST_POOL.filter(q => filter(q) && !exclude.has(q.id));
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function toCalibrated(pool: PoolQuest[], xpMultiplier = 1): CalibratedQuest[] {
  return pool.map(q => ({
    id: q.id,
    title: q.title,
    stat: q.stat,
    baseXP: q.baseXP,
    adjustedXP: Math.round(q.baseXP * xpMultiplier),
    difficulty: q.difficulty,
  }));
}

// ── Main Calibration Engine ──────────────────────────────────────────

export function calibrateQuests(
  currentState: PlayerStateCheck,
  stateHistory: PlayerStateCheck[],
  completionHistory: QuestCompletionRecord[],
  currentTime: Date,
): CalibrationResult {
  const hour = getHour(currentTime);
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

  // ── Mode-based quest selection ──

  if (mode === 'push') {
    intensity = 'high';
    systemMessage = pickRandom(PUSH_MESSAGES);

    // At least 2 high-difficulty quests
    const hardQuests = selectFromPool(q => q.difficulty === 'high' && !q.tags.includes('comt-bonus'), 2, used);
    hardQuests.forEach(q => used.add(q.id));

    // Prioritize sales + systems
    const revenueQuests = selectFromPool(q => q.tags.includes('revenue') || q.tags.includes('sales'), 2, used);
    revenueQuests.forEach(q => used.add(q.id));

    // Fill remaining
    const fill = selectFromPool(q => !q.tags.includes('break') && !q.tags.includes('comt-bonus') && !q.tags.includes('comt-evening'), 2, used);
    fill.forEach(q => used.add(q.id));

    const all = [...hardQuests, ...revenueQuests, ...fill];
    quests = toCalibrated(all.slice(0, 6), 1.25);

    // Free day + morning = hardest quests first (already sorted by selection)
    if (dayType === 'free' && timeBlock === 'morning') {
      quests.sort((a, b) => {
        const diff: Record<Difficulty, number> = { high: 3, medium: 2, low: 1 };
        return diff[b.difficulty] - diff[a.difficulty];
      });
    }

    // COMT peak bonus quest
    if (isInCOMTPeak(hour)) {
      const bonus = QUEST_POOL.find(q => q.id === 'cal-build-ship')!;
      quests.push({
        id: bonus.id,
        title: bonus.title,
        stat: bonus.stat,
        baseXP: bonus.baseXP,
        adjustedXP: Math.round(bonus.baseXP * 1.25),
        difficulty: bonus.difficulty,
        isBonus: true,
      });
    }

  } else if (mode === 'steady') {
    intensity = 'medium';
    systemMessage = pickRandom(STEADY_MESSAGES);

    let targetCount = 5;

    // Afternoon on work day: reduce
    if (timeBlock === 'afternoon' && dayType === 'work') {
      targetCount = 3;
    }

    const balanced = selectFromPool(
      q => !q.tags.includes('comt-bonus') && !q.tags.includes('comt-evening') && !q.tags.includes('break'),
      targetCount,
      used,
    );
    quests = toCalibrated(balanced);

  } else {
    // Recovery mode
    intensity = 'low';
    const consecutiveRecovery = countConsecutiveRecoveryDays(stateHistory);

    if (consecutiveRecovery >= 3) {
      systemMessage = ESCALATION_MESSAGE;
    } else {
      systemMessage = pickRandom(RECOVERY_MESSAGES);
    }

    // Health quest
    const health = selectFromPool(q => q.tags.includes('health') && q.difficulty === 'low', 1, used);
    health.forEach(q => used.add(q.id));

    // Creative / learning quest
    const creative = selectFromPool(q => q.tags.includes('creative') || q.tags.includes('learning'), 1, used);
    creative.forEach(q => used.add(q.id));

    // One more low-difficulty, no sales/outreach
    const extra = selectFromPool(q => q.difficulty === 'low' && q.stat !== 'sales' && q.stat !== 'network', 1, used);

    const recoveryQuests = [...health, ...creative, ...extra];
    quests = applyXPMultiplier(toCalibrated(recoveryQuests), 0.75);

    // Add recovery bonus metadata (handled by consumer)
    if (quests.length > 0) {
      quests[quests.length - 1] = {
        ...quests[quests.length - 1],
        isBonus: true, // signals recovery bonus eligibility
      };
    }

    // Stress = 5: mandatory walk
    if (currentState.stress === 5) {
      const walkQuest = QUEST_POOL.find(q => q.id === 'cal-walk')!;
      if (!used.has(walkQuest.id)) {
        quests.push({
          id: walkQuest.id,
          title: walkQuest.title,
          stat: walkQuest.stat,
          baseXP: walkQuest.baseXP,
          adjustedXP: Math.round(walkQuest.baseXP * 0.75),
          difficulty: walkQuest.difficulty,
          isMandatory: true,
        });
      }
    }
  }

  // ── COMT time-of-day modifiers ──

  if (isInCOMTPeak(hour) && mode !== 'recover') {
    quests = applyXPMultiplier(quests, 1.2);
    geneticAlert = 'COMT dopamine peak window active. +20% XP bonus applied.';
  }

  if (isInCOMTCrash(hour)) {
    quests = quests.map(q => ({
      ...q,
      difficulty: reduceDifficulty(q.difficulty),
    }));
    geneticAlert = 'Dopamine dip window. The System has adjusted expectations.';
  }

  // ── ACTN3 Sprinter guard ──

  const sprintsToday = countSprintsToday(completionHistory, todayStr);
  const sprintQuests = quests.filter(q => {
    const pool = QUEST_POOL.find(p => p.id === q.id);
    return pool?.tags.includes('sprint');
  });

  if (sprintsToday >= GENETIC_MODIFIERS.actn3Sprinter.maxSprintsBeforeDecay) {
    geneticAlert = GENETIC_MODIFIERS.actn3Sprinter.warningMessage;
    // Remove extra sprint quests
    quests = quests.filter(q => {
      const pool = QUEST_POOL.find(p => p.id === q.id);
      return !pool?.tags.includes('sprint');
    });
  } else if (sprintQuests.length >= 3) {
    // Insert break after 3rd sprint
    const breakQuest = QUEST_POOL.find(q => q.id === 'cal-break')!;
    const idx = quests.findIndex(q => {
      const pool = QUEST_POOL.find(p => p.id === q.id);
      return pool?.tags.includes('sprint');
    });
    if (idx >= 0) {
      const breakCal: CalibratedQuest = {
        id: breakQuest.id,
        title: breakQuest.title,
        stat: breakQuest.stat,
        baseXP: breakQuest.baseXP,
        adjustedXP: breakQuest.baseXP,
        difficulty: 'low',
        isBreak: true,
        isMandatory: true,
      };
      quests.splice(idx + 3, 0, breakCal);
    }
  }

  // ── Day-of-week intelligence ──

  if (dayType === 'work' && timeBlock === 'morning') {
    // Front-load important quests
    quests.sort((a, b) => {
      const priority = (q: CalibratedQuest) =>
        (q.stat === 'sales' || q.stat === 'systems') ? 0 : 1;
      return priority(a) - priority(b);
    });
  }

  if (dayOfWeek === 4) {
    // Thursday = transition day, cap at medium
    quests = quests.map(q => ({
      ...q,
      difficulty: q.difficulty === 'high' ? 'medium' : q.difficulty,
    }));
    if (!systemMessage.includes('transition')) {
      systemMessage += ' [Transition Day — planning focus.]';
    }
  }

  if (dayOfWeek === 5 || dayOfWeek === 6) {
    // Fri-Sat: peak sprint days, boost difficulty
    quests = quests.map(q => ({
      ...q,
      difficulty: q.difficulty === 'low' ? 'medium' : q.difficulty,
    }));
  }

  // ── Evening second-wind quest (post cold exposure) ──
  // This is evaluated by consumers checking cold exposure completion

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
  const q = QUEST_POOL.find(p => p.id === 'cal-second-wind')!;
  return {
    id: q.id,
    title: q.title,
    stat: q.stat,
    baseXP: q.baseXP,
    adjustedXP: q.baseXP,
    difficulty: q.difficulty,
    isBonus: true,
  };
}

/** Recovery bonus XP awarded when all recovery quests are completed */
export const RECOVERY_BONUS_XP = 50;
