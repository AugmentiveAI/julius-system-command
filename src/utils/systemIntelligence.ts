import { PlayerStateCheck } from '@/types/playerState';
import { GeneticState, COMTPhase } from '@/utils/geneticEngine';
import { ResistanceAnalysis, ResistancePattern } from '@/utils/resistanceTracker';
import { MainQuest } from '@/types/mainQuest';
import { PlayerStats } from '@/types/player';
import { getSystemDate } from '@/utils/dayCycleEngine';

// ── Types ────────────────────────────────────────────────────────────

export interface QuestOverride {
  action: 'insert' | 'remove';
  questId: string;
  reason: string;
  difficulty?: string;
  category?: string;
}

export interface XPModifier {
  source: string;
  multiplier: number;
  reason: string;
}

export interface SystemWarning {
  level: 'info' | 'caution' | 'critical';
  message: string;
}

export interface SystemStrategy {
  dailyBrief: string;
  strategicFocus: string;
  questOverrides: QuestOverride[];
  xpModifiers: XPModifier[];
  warnings: SystemWarning[];
  predictions: string[];
  weeklyObjective: string;
  shadowMonarchProgress: number;
}

export interface CompletionRecord {
  questId: string;
  questTitle?: string;
  xpEarned: number;
  completedAt: string;
  type: string;
  category?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

function dayNumber(): number {
  const START_DATE_KEY = 'systemStartDate';
  const stored = typeof window !== 'undefined' ? localStorage.getItem(START_DATE_KEY) : null;
  if (!stored) return 1;
  const todayStr = getSystemDate();
  const startMs = new Date(stored + 'T12:00:00').getTime();
  const todayMs = new Date(todayStr + 'T12:00:00').getTime();
  return Math.max(1, Math.round((todayMs - startMs) / (1000 * 60 * 60 * 24)) + 1);
}

function dayOfWeek(d: Date): number {
  return d.getDay(); // 0=Sun
}

function isFreeDay(d: Date): boolean {
  const dow = dayOfWeek(d);
  return dow >= 4; // Thu-Sat
}

function consecutiveRecoveryDays(stateHistory: PlayerStateCheck[]): number {
  let count = 0;
  const sorted = [...stateHistory].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  for (const check of sorted) {
    if (check.systemRecommendation === 'recover') count++;
    else break;
  }
  return count;
}

function weeklyCompletionRate(completionHistory: CompletionRecord[], currentDate: Date): number {
  const weekAgo = new Date(currentDate);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recent = completionHistory.filter(c => new Date(c.completedAt) >= weekAgo);
  // ~5 quests/day * 7 = 35 expected
  return Math.min(100, Math.round((recent.length / 35) * 100));
}

function avgStatValue(stats: PlayerStats): number {
  const vals = Object.values(stats);
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

// ── COMT timing helper ──────────────────────────────────────────────

function minutesUntilPhase(target: COMTPhase, currentHour: number): number | null {
  const windows: Record<COMTPhase, number> = { peak: 8, stable: 6, dip: 14, recovery: 18 };
  const targetHour = windows[target];
  if (currentHour >= targetHour) return null;
  return (targetHour - currentHour) * 60;
}

// ── Daily Brief ──────────────────────────────────────────────────────

function generateDailyBrief(
  day: number,
  playerState: PlayerStateCheck | null,
  geneticState: GeneticState,
  resistanceScore: number,
  recoveryStreak: number,
  currentDate: Date,
): string {
  const free = isFreeDay(currentDate);
  const dayType = free ? 'Free day' : 'Work day';
  const hour = currentDate.getHours();

  const parts: string[] = [`Day ${day}. ${dayType}.`];

  // COMT status
  if (geneticState.comtPhase === 'peak') {
    parts.push('COMT peak window ACTIVE. Maximum cognitive output available.');
  } else if (geneticState.comtPhase === 'dip') {
    parts.push('COMT dip detected. The System has reduced expectations.');
  } else {
    const minsToPeak = minutesUntilPhase('peak', hour);
    if (minsToPeak !== null && minsToPeak > 0 && minsToPeak <= 120) {
      parts.push(`COMT peak window opening in ${minsToPeak} minutes.`);
    }
  }

  // Resistance
  if (resistanceScore <= 20) {
    parts.push(`Resistance score: ${resistanceScore}. All systems nominal.`);
  } else if (resistanceScore <= 50) {
    parts.push(`Resistance score: ${resistanceScore}. Avoidance patterns detected.`);
  } else {
    parts.push(`Resistance score: ${resistanceScore}. Significant avoidance. The System is adapting.`);
  }

  // Recovery streak warning
  if (recoveryStreak >= 3) {
    parts.push(
      `${recoveryStreak} consecutive recovery days logged. The System acknowledges human limits, but warns: momentum is perishable. Tomorrow, regardless of state, one A-Rank quest will be mandatory.`
    );
  }

  // State-based recommendations
  if (playerState) {
    if (playerState.compositeScore >= 3.5 && free) {
      parts.push("Today's directive: S-Rank quests assigned. The System expects excellence.");
    } else if (playerState.compositeScore >= 3.5) {
      parts.push('High capacity detected. Push hard during available windows.');
    } else if (playerState.compositeScore < 2.5) {
      parts.push('Low capacity. The System has reduced quest load. Recovery protocols engaged.');
    }
  }

  return parts.join(' ');
}

// ── Strategic Focus ──────────────────────────────────────────────────

function selectStrategicFocus(
  milestones: MainQuest[],
  resistance: ResistanceAnalysis,
  currentDate: Date,
): string {
  const free = isFreeDay(currentDate);

  // Check milestone proximity
  // We can't calculate exact % without more data, so use completion status
  const incompleteMilestones = milestones.filter(m => !m.completed);

  // Revenue milestones get priority on free days
  if (free) {
    const revenueMilestones = incompleteMilestones.filter(
      m => m.id === '5k-mrr' || m.id === '10k-mrr' || m.id === 'first-client'
    );
    if (revenueMilestones.length > 0) {
      return `Free day priority: ${revenueMilestones[0].title}. Build Augmentive. Revenue is freedom.`;
    }
    return 'Free day. Focus on Augmentive growth — every hour counts toward the exit.';
  }

  // If high resistance in a specific category, target it
  const topResistance = resistance.resistancePoints
    .filter(r => r.pattern === 'category_avoidance')
    .sort((a, b) => b.avoidanceRate - a.avoidanceRate)[0];

  if (topResistance && topResistance.avoidanceRate > 60) {
    return `The System targets weakness: ${topResistance.category} avoidance at ${topResistance.avoidanceRate}%. One mandatory quest assigned.`;
  }

  // Default: lowest performing area
  if (incompleteMilestones.length > 0) {
    return `Progress toward: ${incompleteMilestones[0].title}. Every quest brings you closer.`;
  }

  return 'All milestones tracked. Maintain discipline. The System watches.';
}

// ── Quest Overrides ──────────────────────────────────────────────────

function generateQuestOverrides(
  resistance: ResistanceAnalysis,
  recoveryStreak: number,
  weeklyRate: number,
  currentDate: Date,
): QuestOverride[] {
  const overrides: QuestOverride[] = [];
  const dow = dayOfWeek(currentDate);

  // Insert resistance quest if avoidance > 60% for prolonged period
  for (const rp of resistance.resistancePoints) {
    if (rp.avoidanceRate > 60 && rp.weekNumber >= 1 && rp.pattern === 'category_avoidance') {
      overrides.push({
        action: 'insert',
        questId: `resistance-${rp.category.toLowerCase().replace(/\s+/g, '-')}`,
        reason: `${rp.category} avoidance at ${rp.avoidanceRate}%. Mandatory quest inserted.`,
        difficulty: rp.weekNumber <= 1 ? 'C' : rp.weekNumber === 2 ? 'B' : 'A',
        category: rp.category,
      });
    }
  }

  // Remove S-rank if 3+ recovery days
  if (recoveryStreak >= 3) {
    overrides.push({
      action: 'remove',
      questId: 'all-s-rank',
      reason: `${recoveryStreak} consecutive recovery days. S-rank quests removed to prevent overwhelm on return.`,
    });
  }

  // Friday boss battle
  if (dow === 5 && weeklyRate > 75) {
    overrides.push({
      action: 'insert',
      questId: 'boss-battle-weekly',
      reason: 'Weekly completion rate above 75%. Boss Battle unlocked. Prove your worth.',
      difficulty: 'S',
    });
  }

  // Thursday planning quest
  if (dow === 4) {
    overrides.push({
      action: 'insert',
      questId: 'transition-planning',
      reason: 'Transition Day: Plan the weekend sprint. Strategy before execution.',
      difficulty: 'B',
      category: 'Systems',
    });
  }

  return overrides;
}

// ── XP Modifiers ─────────────────────────────────────────────────────

function buildXPModifiers(
  geneticState: GeneticState,
  resistance: ResistanceAnalysis,
  playerState: PlayerStateCheck | null,
): XPModifier[] {
  const mods: XPModifier[] = [];

  // Genetic modifiers
  if (geneticState.comtPhase === 'peak') {
    mods.push({ source: 'COMT Peak', multiplier: 1.2, reason: 'Warrior gene peak window — +20% XP' });
  } else if (geneticState.comtPhase === 'dip') {
    mods.push({ source: 'COMT Dip', multiplier: 0.8, reason: 'Dopamine dip — S-rank XP reduced 20%' });
  }

  if (geneticState.activeBuffs.some(b => b.name === 'Second Wind')) {
    mods.push({ source: 'Second Wind', multiplier: 1.15, reason: 'Cold exposure recovery — +15% XP' });
  }

  if (geneticState.activeBuffs.some(b => b.name === 'Explosive Potential')) {
    mods.push({ source: 'Sprint Fresh', multiplier: 1.25, reason: 'First sprint bonus — +25% XP' });
  }

  // State modifiers
  if (playerState?.systemRecommendation === 'push') {
    mods.push({ source: 'Push Mode', multiplier: 1.25, reason: 'High capacity — all XP boosted 25%' });
  } else if (playerState?.systemRecommendation === 'recover') {
    mods.push({ source: 'Recovery Mode', multiplier: 0.75, reason: 'Recovery protocol — XP reduced, focus on consistency' });
  }

  // Resistance XP modifiers
  for (const [category, mult] of Object.entries(resistance.xpModifiers)) {
    if (mult !== 1) {
      const label = mult > 1 ? `+${Math.round((mult - 1) * 100)}%` : `-${Math.round((1 - mult) * 100)}%`;
      mods.push({
        source: `Resistance: ${category}`,
        multiplier: mult,
        reason: mult > 1
          ? `${category} under-trained — XP boosted ${label}`
          : `${category} over-trained — diminishing returns ${label}`,
      });
    }
  }

  return mods;
}

// ── Warnings ─────────────────────────────────────────────────────────

function generateWarnings(
  resistance: ResistanceAnalysis,
  geneticState: GeneticState,
  recoveryStreak: number,
): SystemWarning[] {
  const warnings: SystemWarning[] = [];

  if (resistance.overallResistanceScore > 75) {
    warnings.push({
      level: 'critical',
      message: 'Critical resistance levels. The System will not be ignored. Mandatory quests escalating.',
    });
  } else if (resistance.overallResistanceScore > 50) {
    warnings.push({
      level: 'caution',
      message: 'Significant avoidance patterns detected. The System is escalating counter-measures.',
    });
  }

  if (geneticState.actn3Status === 'depleted') {
    warnings.push({
      level: 'critical',
      message: 'Sprint gene depleted. S-rank quests locked. Recovery mandatory.',
    });
  } else if (geneticState.actn3Status === 'fatigued') {
    warnings.push({
      level: 'caution',
      message: 'Sprint fatigue approaching. Diminishing returns on sprint-based quests.',
    });
  }

  if (recoveryStreak >= 3) {
    warnings.push({
      level: 'caution',
      message: `${recoveryStreak} consecutive recovery days. Momentum at risk. Mandatory push incoming.`,
    });
  }

  for (const ha of resistance.hardAvoidanceQuests) {
    warnings.push({
      level: 'caution',
      message: `"${ha.questName}" avoided ${ha.skipCount} times. The System has flagged this as mandatory.`,
    });
  }

  if (resistance.resistancePoints.some(r => r.pattern === 'streak_sabotage')) {
    warnings.push({
      level: 'critical',
      message: 'Streak sabotage pattern detected. The System sees what you refuse to acknowledge.',
    });
  }

  return warnings;
}

// ── Predictions ──────────────────────────────────────────────────────

function generatePredictions(
  resistance: ResistanceAnalysis,
  completionHistory: CompletionRecord[],
  milestones: MainQuest[],
  stats: PlayerStats,
  currentDate: Date,
  coldStreakDays: number,
): string[] {
  const predictions: string[] = [];

  // Revenue trajectory
  const wealthGrowthPerWeek = stats.wealth > 10 ? (stats.wealth - 10) / Math.max(1, dayNumber() / 7) : 0;
  if (wealthGrowthPerWeek > 0) {
    const target10k = milestones.find(m => m.id === '10k-mrr');
    if (target10k && !target10k.completed) {
      // Very rough estimate
      const weeksNeeded = Math.max(1, Math.round((80 - stats.wealth) / Math.max(0.1, wealthGrowthPerWeek)));
      const targetDate = new Date(currentDate);
      targetDate.setDate(targetDate.getDate() + weeksNeeded * 7);
      predictions.push(
        `At current pace, $10K MRR target projected for ${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`
      );
    }
  }

  // Sales resistance warning
  const salesResistance = resistance.resistancePoints.find(
    r => r.category === 'Sales' && r.pattern === 'category_avoidance'
  );
  if (salesResistance) {
    const stallDays = Math.max(7, Math.round(salesResistance.avoidanceRate / 5));
    predictions.push(`Sales resistance is increasing. If not addressed, pipeline will stall in ${stallDays} days.`);
  }

  // Cold streak milestone
  if (coldStreakDays > 0) {
    const nextMilestone = [7, 14, 30].find(m => m > coldStreakDays);
    if (nextMilestone) {
      predictions.push(
        `Discipline streak at ${coldStreakDays} days. Milestone bonus at ${nextMilestone} days.`
      );
    }
  }

  // COMT optimization
  const weeklyCompletions = completionHistory.filter(c => {
    const d = new Date(c.completedAt);
    const weekAgo = new Date(currentDate);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  });
  const coldRelated = weeklyCompletions.filter(c =>
    c.questId?.includes('cold') || c.questTitle?.toLowerCase().includes('cold')
  );
  const coldCompliancePct = Math.min(100, Math.round((coldRelated.length / 7) * 100));
  const optimalLabel = coldCompliancePct >= 60 ? 'above' : 'below';
  predictions.push(
    `COMT optimization: cold exposure compliance is ${coldCompliancePct}%. Dopamine recovery is ${optimalLabel} optimal.`
  );

  return predictions;
}

// ── Weekly Objective ─────────────────────────────────────────────────

function selectWeeklyObjective(
  milestones: MainQuest[],
  resistance: ResistanceAnalysis,
  currentDate: Date,
): string {
  const incomplete = milestones.filter(m => !m.completed);

  // Revenue milestones always take priority for weekly goals
  const revenue = incomplete.find(m => m.id === 'first-client' || m.id === '5k-mrr' || m.id === '10k-mrr');
  if (revenue) {
    return `Weekly objective: Progress toward "${revenue.title}". Every action must serve this goal.`;
  }

  if (resistance.overallResistanceScore > 50) {
    const topResistance = resistance.resistancePoints[0];
    if (topResistance) {
      return `Weekly objective: Break ${topResistance.category} resistance. The System will not allow avoidance to persist.`;
    }
  }

  if (incomplete.length > 0) {
    return `Weekly objective: Advance "${incomplete[0].title}". Consistency compounds.`;
  }

  return 'Weekly objective: Maintain all systems. Prepare for the next phase.';
}

// ── Shadow Monarch Progress ──────────────────────────────────────────

function calculateShadowMonarchProgress(
  milestones: MainQuest[],
  stats: PlayerStats,
  resistanceScore: number,
): number {
  // Milestone completion: 40% weight
  const completedMilestones = milestones.filter(m => m.completed).length;
  const milestoneProgress = (completedMilestones / Math.max(1, milestones.length)) * 100;

  // Stat averages vs targets (target: 80 per stat): 25% weight
  const avg = avgStatValue(stats);
  const statProgress = Math.min(100, (avg / 80) * 100);

  // Revenue progress (using wealth stat as proxy): 20% weight
  // Wealth stat 10 = start, 80 = $10K MRR target equivalent
  const revenueProgress = Math.min(100, ((stats.wealth - 10) / 70) * 100);

  // Resistance inverse: 15% weight
  const resistanceProgress = 100 - resistanceScore;

  const total =
    milestoneProgress * 0.4 +
    statProgress * 0.25 +
    revenueProgress * 0.2 +
    resistanceProgress * 0.15;

  return Math.min(100, Math.max(0, Math.round(total)));
}

// ── Main Export ───────────────────────────────────────────────────────

export function getSystemStrategy(
  playerState: PlayerStateCheck | null,
  stateHistory: PlayerStateCheck[],
  geneticState: GeneticState,
  resistanceData: ResistanceAnalysis,
  completionHistory: CompletionRecord[],
  currentMilestones: MainQuest[],
  currentDate: Date,
  playerStats?: PlayerStats,
  coldStreakDays?: number,
): SystemStrategy {
  const day = dayNumber();
  const recoveryStreak = consecutiveRecoveryDays(stateHistory);
  const weeklyRate = weeklyCompletionRate(completionHistory, currentDate);

  const stats: PlayerStats = playerStats ?? {
    sales: 10, systems: 10, creative: 10, discipline: 10, network: 10, wealth: 10,
  };

  const dailyBrief = generateDailyBrief(
    day, playerState, geneticState, resistanceData.overallResistanceScore, recoveryStreak, currentDate,
  );

  const strategicFocus = selectStrategicFocus(currentMilestones, resistanceData, currentDate);

  const questOverrides = generateQuestOverrides(resistanceData, recoveryStreak, weeklyRate, currentDate);

  const xpModifiers = buildXPModifiers(geneticState, resistanceData, playerState);

  const warnings = generateWarnings(resistanceData, geneticState, recoveryStreak);

  const predictions = generatePredictions(
    resistanceData, completionHistory, currentMilestones, stats, currentDate, coldStreakDays ?? 0,
  );

  const weeklyObjective = selectWeeklyObjective(currentMilestones, resistanceData, currentDate);

  const shadowMonarchProgress = calculateShadowMonarchProgress(
    currentMilestones, stats, resistanceData.overallResistanceScore,
  );

  return {
    dailyBrief,
    strategicFocus,
    questOverrides,
    xpModifiers,
    warnings,
    predictions,
    weeklyObjective,
    shadowMonarchProgress,
  };
}
