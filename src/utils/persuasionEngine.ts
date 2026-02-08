import {
  PersuasionTechnique,
  PersuasionProfile,
  TECHNIQUE_LIBRARY,
  SELECTION_WEIGHTS,
  TechniqueConfig,
} from '@/types/persuasionEngine';

// ── Constants ────────────────────────────────────────────────────────

const STORAGE_KEY = 'systemPersuasionProfile';
const PRECOMMIT_KEY = 'systemPreCommitment';
const OUTCOME_LOG_KEY = 'systemPersuasionOutcomes';

const ALL_TECHNIQUES: PersuasionTechnique[] = [
  'loss_aversion', 'variable_reward', 'identity_framing', 'commitment_escalation',
  'social_proof', 'temporal_landmark', 'endowed_progress', 'scarcity_window',
  'contrast_principle', 'sunk_cost_leverage', 'implementation_intention', 'fresh_start_effect',
];

// ── Profile Persistence ──────────────────────────────────────────────

function createDefaultProfile(): PersuasionProfile {
  const techniqueEffectiveness = {} as PersuasionProfile['techniqueEffectiveness'];
  const habituationCounters = {} as PersuasionProfile['habituationCounters'];

  for (const t of ALL_TECHNIQUES) {
    techniqueEffectiveness[t] = {
      timesUsed: 0,
      timesResultedInCompletion: 0,
      effectivenessRate: 0.5,
      lastUsed: null,
      cooldownDays: TECHNIQUE_LIBRARY.find(c => c.id === t)?.applicationRules.cooldownDays ?? 2,
    };
    habituationCounters[t] = {
      consecutiveUses: 0,
      maxBeforeRotation: 3,
    };
  }

  return {
    techniqueEffectiveness,
    playerProfile: {
      lossAversionSensitivity: 'medium',
      competitiveInstinct: 'medium',
      identityAlignment: 'medium',
      commitmentConsistency: 'medium',
      noveltySeeker: 'medium',
      streakMotivated: 'medium',
    },
    habituationCounters,
  };
}

export function loadProfile(): PersuasionProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  const profile = createDefaultProfile();
  saveProfile(profile);
  return profile;
}

function saveProfile(profile: PersuasionProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

// ── Outcome Log (for weekly analysis) ────────────────────────────────

interface OutcomeEntry {
  technique: PersuasionTechnique;
  completed: boolean;
  responseTimeMinutes: number;
  timestamp: string;
}

function loadOutcomeLog(): OutcomeEntry[] {
  try {
    const raw = localStorage.getItem(OUTCOME_LOG_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveOutcomeLog(log: OutcomeEntry[]): void {
  // Keep only last 90 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const trimmed = log.filter(e => new Date(e.timestamp) > cutoff);
  localStorage.setItem(OUTCOME_LOG_KEY, JSON.stringify(trimmed));
}

// ── Helpers ──────────────────────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isOnCooldown(
  lastUsed: Date | string | null,
  cooldownDays: number,
  now: Date,
): boolean {
  if (!lastUsed) return false;
  const last = typeof lastUsed === 'string' ? new Date(lastUsed) : lastUsed;
  const diffDays = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays < cooldownDays;
}

function profileTraitBonus(
  technique: PersuasionTechnique,
  profile: PersuasionProfile,
): number {
  const p = profile.playerProfile;
  const bonusMap: Partial<Record<PersuasionTechnique, { trait: keyof typeof p; }>> = {
    loss_aversion: { trait: 'lossAversionSensitivity' },
    social_proof: { trait: 'competitiveInstinct' },
    identity_framing: { trait: 'identityAlignment' },
    commitment_escalation: { trait: 'commitmentConsistency' },
    variable_reward: { trait: 'noveltySeeker' },
    temporal_landmark: { trait: 'streakMotivated' },
    fresh_start_effect: { trait: 'streakMotivated' },
    sunk_cost_leverage: { trait: 'streakMotivated' },
  };

  const entry = bonusMap[technique];
  if (!entry) return 1;
  const level = p[entry.trait];
  if (level === 'high') return 1.4;
  if (level === 'medium') return 1.0;
  return 0.6;
}

function conditionBonus(
  config: TechniqueConfig,
  playerState: { mode: string; comtPhase: string; timeBlock: string },
): number {
  let bonus = 1;
  if (config.applicationRules.bestWhenState.includes(playerState.mode as any)) bonus += 0.3;
  if (config.applicationRules.comtPhaseBonus.includes(playerState.comtPhase as any)) bonus += 0.2;
  if (config.applicationRules.bestTimeOfDay.includes(playerState.timeBlock as any)) bonus += 0.15;
  return bonus;
}

// ── Variable Filling ─────────────────────────────────────────────────

function fillTemplate(
  template: string,
  questContext: {
    questName: string;
    questCategory: string;
    difficulty: string;
    xp: number;
  },
  extras: Record<string, string | number> = {},
): string {
  const vars: Record<string, string> = {
    questName: questContext.questName,
    category: questContext.questCategory,
    difficulty: questContext.difficulty,
    xp: String(questContext.xp),
    stat: questContext.questCategory,
    penalty: String(Math.round(questContext.xp * 0.3)),
    minutes: String(45),
    streak: String(extras.streak ?? 0),
    streakXP: String(extras.streakXP ?? 0),
    totalXP: String(extras.totalXP ?? 0),
    totalQuests: String(extras.totalQuests ?? 0),
    questsCompleted: String(extras.questsCompleted ?? 0),
    days: String(extras.days ?? 1),
    daysAgo: String(extras.daysAgo ?? 1),
    daysOld: String(extras.daysOld ?? 1),
    percent: String(extras.percent ?? 50),
    currentPercent: String(extras.currentPercent ?? 40),
    newPercent: String(extras.newPercent ?? 45),
    current: String(extras.current ?? 0),
    target: String(extras.target ?? 100),
    completed: String(extras.completed ?? 0),
    remaining: String(extras.remaining ?? 5),
    avg: String(extras.avg ?? 5),
    playerAvg: String(extras.playerAvg ?? 3),
    playerPercent: String(extras.playerPercent ?? 60),
    nextLevel: String(extras.nextLevel ?? 5),
    avgDays: String(extras.avgDays ?? 45),
    playerDays: String(extras.playerDays ?? 50),
    weekNum: String(extras.weekNum ?? 1),
    weeksRemaining: String(extras.weeksRemaining ?? 12),
    milestone: String(extras.milestone ?? 'next rank'),
    goal: String(extras.goal ?? 'weekly target'),
    trigger: String(extras.trigger ?? 'your morning routine completes'),
    time: String(extras.time ?? '21:00'),
    dayOfWeek: String(extras.dayOfWeek ?? 'Monday'),
    accepted: String(extras.accepted ?? 5),
    focus: String(extras.focus ?? 3),
    minutesRemaining: String(extras.minutesRemaining ?? 60),
    hours: String(extras.hours ?? 2),
    longerMinutes: String(extras.longerMinutes ?? 90),
    harderQuest: String(extras.harderQuest ?? 'an S-Rank mission'),
    currentQuest: questContext.questName,
    totalHours: String(extras.totalHours ?? 20),
    startValue: String(extras.startValue ?? 10),
    currentValue: String(extras.currentValue ?? 25),
    questCount: String(extras.questCount ?? 30),
    automations: String(extras.automations ?? 0),
    clients: String(extras.clients ?? 0),
    bonusXP: String(extras.bonusXP ?? 0),
    multiplier: String(extras.multiplier ?? 1),
  };

  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

// ── 1. selectTechnique ───────────────────────────────────────────────

interface QuestContext {
  questName: string;
  questCategory: string;
  difficulty: string;
  isResistanceQuest: boolean;
  xp: number;
}

interface PlayerState {
  mode: 'push' | 'steady' | 'recovery';
  compositeScore: number;
  comtPhase: string;
  timeBlock: string;
}

export interface TechniqueSelection {
  technique: PersuasionTechnique;
  message: string;
  isSubtle: boolean;
}

export function selectTechnique(
  questContext: QuestContext,
  playerState: PlayerState,
  persuasionProfile: PersuasionProfile,
  currentDate: Date,
  extraVars: Record<string, string | number> = {},
): TechniqueSelection {
  // a. Get weight table
  const weightTable = playerState.mode === 'recovery'
    ? SELECTION_WEIGHTS.recoveryMode
    : questContext.isResistanceQuest
      ? SELECTION_WEIGHTS.resistanceQuest
      : SELECTION_WEIGHTS.normalQuest;

  // b. Filter cooldowns
  const available = ALL_TECHNIQUES.filter(t => {
    const eff = persuasionProfile.techniqueEffectiveness[t];
    if (!eff) return true;
    return !isOnCooldown(eff.lastUsed, eff.cooldownDays, currentDate);
  });

  // c. Filter habituation
  const notHabituated = available.filter(t => {
    const hab = persuasionProfile.habituationCounters[t];
    if (!hab) return true;
    return hab.consecutiveUses < hab.maxBeforeRotation;
  });

  const candidates = notHabituated.length > 0 ? notHabituated : available.length > 0 ? available : ALL_TECHNIQUES;

  // d. Weighted scoring
  const scored = candidates.map(t => {
    const baseWeight = weightTable[t] ?? 1;
    const eff = persuasionProfile.techniqueEffectiveness[t];
    const effectivenessMultiplier = eff ? eff.effectivenessRate + 0.5 : 1; // 0.5-1.5 range
    const config = TECHNIQUE_LIBRARY.find(c => c.id === t);
    const condBonus = config ? conditionBonus(config, playerState) : 1;
    const traitBonus = profileTraitBonus(t, persuasionProfile);

    // e. Randomness factor 0.7-1.3
    const randomFactor = 0.7 + Math.random() * 0.6;

    const finalWeight = baseWeight * effectivenessMultiplier * condBonus * traitBonus * randomFactor;
    return { technique: t, weight: finalWeight };
  });

  // f. Select highest
  scored.sort((a, b) => b.weight - a.weight);
  const selected = scored[0].technique;

  // g. Pick template
  const config = TECHNIQUE_LIBRARY.find(c => c.id === selected);
  const template = config ? pickRandom(config.templates) : 'The System demands action.';

  // h. Fill variables
  const message = fillTemplate(template, questContext, extraVars);

  // Subtle if identity_framing, endowed_progress, or contrast_principle
  const subtleTechniques: PersuasionTechnique[] = [
    'identity_framing', 'endowed_progress', 'contrast_principle', 'sunk_cost_leverage',
  ];
  const isSubtle = subtleTechniques.includes(selected);

  return { technique: selected, message, isSubtle };
}

// ── 2. recordTechniqueOutcome ────────────────────────────────────────

export function recordTechniqueOutcome(
  technique: PersuasionTechnique,
  questCompleted: boolean,
  responseTimeMinutes: number,
): void {
  const profile = loadProfile();
  const eff = profile.techniqueEffectiveness[technique];

  if (eff) {
    eff.timesUsed++;
    if (questCompleted) eff.timesResultedInCompletion++;
    eff.effectivenessRate = eff.timesUsed > 0
      ? eff.timesResultedInCompletion / eff.timesUsed
      : 0.5;
    eff.lastUsed = new Date() as any;
  }

  const hab = profile.habituationCounters[technique];
  if (hab) {
    if (questCompleted) {
      hab.consecutiveUses++;
    } else {
      hab.consecutiveUses = 0; // reset on skip/failure
    }
  }

  // Reset consecutive uses for all OTHER techniques (since a different one was used)
  for (const t of ALL_TECHNIQUES) {
    if (t !== technique && profile.habituationCounters[t]) {
      profile.habituationCounters[t].consecutiveUses = 0;
    }
  }

  saveProfile(profile);

  // Append to outcome log
  const log = loadOutcomeLog();
  log.push({
    technique,
    completed: questCompleted,
    responseTimeMinutes,
    timestamp: new Date().toISOString(),
  });
  saveOutcomeLog(log);
}

// ── 3. updatePlayerPsychProfile ──────────────────────────────────────

type SensitivityLevel = 'high' | 'medium' | 'low';

function deriveLevel(rate: number): SensitivityLevel {
  if (rate >= 0.7) return 'high';
  if (rate >= 0.4) return 'medium';
  return 'low';
}

function techniqueCompletionRate(
  entries: OutcomeEntry[],
  techniqueId: PersuasionTechnique,
): number | null {
  const relevant = entries.filter(e => e.technique === techniqueId);
  if (relevant.length < 2) return null; // not enough data
  const completed = relevant.filter(e => e.completed).length;
  return completed / relevant.length;
}

export function updatePlayerPsychProfile(): void {
  const profile = loadProfile();
  const log = loadOutcomeLog();

  // Filter to last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recent = log.filter(e => new Date(e.timestamp) > weekAgo);

  if (recent.length < 3) return; // not enough data to update

  const lossRate = techniqueCompletionRate(recent, 'loss_aversion');
  if (lossRate !== null) profile.playerProfile.lossAversionSensitivity = deriveLevel(lossRate);

  const socialRate = techniqueCompletionRate(recent, 'social_proof');
  if (socialRate !== null) profile.playerProfile.competitiveInstinct = deriveLevel(socialRate);

  const identityRate = techniqueCompletionRate(recent, 'identity_framing');
  if (identityRate !== null) profile.playerProfile.identityAlignment = deriveLevel(identityRate);

  const commitRate = techniqueCompletionRate(recent, 'commitment_escalation');
  if (commitRate !== null) profile.playerProfile.commitmentConsistency = deriveLevel(commitRate);

  const noveltyRate = techniqueCompletionRate(recent, 'variable_reward');
  if (noveltyRate !== null) profile.playerProfile.noveltySeeker = deriveLevel(noveltyRate);

  // Streak motivation: derived from sunk_cost + temporal_landmark combined
  const streakEntries = recent.filter(e =>
    e.technique === 'sunk_cost_leverage' || e.technique === 'temporal_landmark',
  );
  if (streakEntries.length >= 2) {
    const streakRate = streakEntries.filter(e => e.completed).length / streakEntries.length;
    profile.playerProfile.streakMotivated = deriveLevel(streakRate);
  }

  saveProfile(profile);
}

// ── 4. getEveningPreCommitment ───────────────────────────────────────

export interface PreCommitment {
  questName: string;
  commitMessage: string;
  accepted: boolean | null;
  date: string;
}

export function getEveningPreCommitment(
  availableQuests: { name: string; category: string; difficulty: string; xp: number }[],
  currentDate: Date,
): PreCommitment | null {
  if (availableQuests.length === 0) return null;

  // Select hardest quest
  const difficultyOrder: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };
  const sorted = [...availableQuests].sort(
    (a, b) => (difficultyOrder[b.difficulty] ?? 0) - (difficultyOrder[a.difficulty] ?? 0),
  );
  const hardest = sorted[0];

  const config = TECHNIQUE_LIBRARY.find(c => c.id === 'commitment_escalation');
  const template = config ? pickRandom(config.templates) : 'Will you accept tomorrow\'s challenge?';

  const message = fillTemplate(template, {
    questName: hardest.name,
    questCategory: hardest.category,
    difficulty: hardest.difficulty,
    xp: hardest.xp,
  });

  const commitment: PreCommitment = {
    questName: hardest.name,
    commitMessage: message,
    accepted: null,
    date: currentDate.toISOString().split('T')[0],
  };

  localStorage.setItem(PRECOMMIT_KEY, JSON.stringify(commitment));
  return commitment;
}

export function loadPreCommitment(): PreCommitment | null {
  try {
    const raw = localStorage.getItem(PRECOMMIT_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

export function acceptPreCommitment(accepted: boolean): void {
  const commitment = loadPreCommitment();
  if (commitment) {
    commitment.accepted = accepted;
    localStorage.setItem(PRECOMMIT_KEY, JSON.stringify(commitment));
  }
}

// ── 5. checkTemporalLandmarks ────────────────────────────────────────

export interface TemporalLandmarks {
  isMonday: boolean;
  isFirstOfMonth: boolean;
  isWeekOfMonthStart: boolean;
  daysUntilMilestone: number;
  specialMessage: string | null;
}

export function checkTemporalLandmarks(currentDate: Date): TemporalLandmarks {
  const dayOfWeek = currentDate.getDay();
  const dayOfMonth = currentDate.getDate();
  const isMonday = dayOfWeek === 1;
  const isFirstOfMonth = dayOfMonth === 1;
  const isWeekOfMonthStart = dayOfMonth <= 3;

  // Calculate days until 90-day milestone
  const startDateStr = localStorage.getItem('systemStartDate');
  const startDate = startDateStr ? new Date(startDateStr) : currentDate;
  const daysSinceStart = Math.ceil(
    (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const milestones = [7, 14, 21, 30, 45, 60, 75, 90];
  const nextMilestone = milestones.find(m => m > daysSinceStart) ?? 90;
  const daysUntilMilestone = nextMilestone - daysSinceStart;

  let specialMessage: string | null = null;

  const config = TECHNIQUE_LIBRARY.find(c => c.id === 'temporal_landmark');
  if (config) {
    if (isFirstOfMonth) {
      specialMessage = 'First day of the month. The System is recalibrating all projections. Today sets the tone.';
    } else if (isMonday) {
      specialMessage = pickRandom(config.templates.filter(t => t.includes('Monday') || t.includes('week')));
      if (specialMessage) {
        specialMessage = specialMessage
          .replace('{weekNum}', String(Math.ceil(daysSinceStart / 7)))
          .replace('{weeksRemaining}', String(Math.max(0, Math.ceil((90 - daysSinceStart) / 7))));
      }
    } else if (daysUntilMilestone <= 1) {
      specialMessage = `Day ${daysSinceStart} of 90. Milestone ${nextMilestone} is tomorrow. The System is watching.`;
    }
  }

  return { isMonday, isFirstOfMonth, isWeekOfMonthStart, daysUntilMilestone, specialMessage };
}

// ── 6. generateVariableReward ────────────────────────────────────────

export interface VariableReward {
  isActive: boolean;
  multiplier: number | null;
  revealMessage: string | null;
}

const REVEAL_MESSAGES = [
  'Shadow reward unlocked. {multiplier}x XP applied.',
  'The System rewards the unexpected. +{bonusXP} XP.',
  'Hidden cache revealed. Your persistence has been noted.',
  'Bonus protocol activated. {multiplier}x modifier deployed.',
  'The System saw your effort. Reward multiplied.',
];

export function generateVariableReward(baseXP: number): VariableReward {
  const roll = Math.random();
  if (roll > 0.2) {
    return { isActive: false, multiplier: null, revealMessage: null };
  }

  // 20% chance — generate multiplier between 1.5x and 5x
  const multiplier = Math.round((1.5 + Math.random() * 3.5) * 10) / 10;
  const bonusXP = Math.round(baseXP * multiplier) - baseXP;

  let message = pickRandom(REVEAL_MESSAGES);
  message = message
    .replace('{multiplier}', String(multiplier))
    .replace('{bonusXP}', String(bonusXP));

  return { isActive: true, multiplier, revealMessage: message };
}
