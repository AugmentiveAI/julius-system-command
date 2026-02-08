import { PersuasionTechnique, PersuasionProfile, SELECTION_WEIGHTS } from '@/types/persuasionEngine';
import { loadProfile } from '@/utils/persuasionEngine';
import { loadCachedResistance, ResistanceAnalysis } from '@/utils/resistanceTracker';

// ── Types ────────────────────────────────────────────────────────────

interface WinningCombination {
  techniques: PersuasionTechnique[];
  mode: string;
  dayType: string;
  dailyCompletionRate: number;
  occurrences: number;
  lastSeen: string;
}

interface OptimizationDecision {
  timestamp: string;
  type: 'weight_increase' | 'weight_decrease' | 'habituation_reset' | 'combo_detected'
    | 'desensitization' | 'signal_boost' | 'global_decline' | 'resistance_escalation'
    | 'resistance_confrontation' | 'trait_update' | 'monthly_report';
  technique?: PersuasionTechnique;
  detail: string;
}

interface ResistancePersuasionTracker {
  category: string;
  techniquesUsed: { technique: PersuasionTechnique; date: string; completed: boolean }[];
  firstDetected: string;
  escalated: boolean;
  confronted: boolean;
}

interface MonthlyReport {
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  top3: { technique: PersuasionTechnique; rate: number }[];
  bottom3: { technique: PersuasionTechnique; rate: number }[];
  profileChanges: { trait: string; from: string; to: string }[];
  resistanceChanges: { category: string; status: 'improved' | 'worsened' | 'new' | 'resolved' }[];
  recommendedShifts: string[];
}

interface OptimizerState {
  lastWeeklyRun: string | null;
  lastMonthlyRun: string | null;
  weightAdjustments: Partial<Record<PersuasionTechnique, number>>; // multiplier on base weights
  winningCombinations: WinningCombination[];
  resistanceTrackers: ResistancePersuasionTracker[];
  signalBoosts: { technique: PersuasionTechnique; boostUntil: string }[];
  decisions: OptimizationDecision[];
  monthlyReports: MonthlyReport[];
  previousProfile: PersuasionProfile['playerProfile'] | null;
  previousResistanceScore: number | null;
}

// ── Constants ────────────────────────────────────────────────────────

const STORAGE_KEY = 'systemPersuasionOptimizer';
const OUTCOME_LOG_KEY = 'systemPersuasionOutcomes';
const MAX_DECISIONS = 200;

const ALL_TECHNIQUES: PersuasionTechnique[] = [
  'loss_aversion', 'variable_reward', 'identity_framing', 'commitment_escalation',
  'social_proof', 'temporal_landmark', 'endowed_progress', 'scarcity_window',
  'contrast_principle', 'sunk_cost_leverage', 'implementation_intention', 'fresh_start_effect',
];

// ── Persistence ──────────────────────────────────────────────────────

function loadState(): OptimizerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return createDefault();
}

function createDefault(): OptimizerState {
  return {
    lastWeeklyRun: null,
    lastMonthlyRun: null,
    weightAdjustments: {},
    winningCombinations: [],
    resistanceTrackers: [],
    signalBoosts: [],
    decisions: [],
    monthlyReports: [],
    previousProfile: null,
    previousResistanceScore: null,
  };
}

function saveState(state: OptimizerState): void {
  // Trim decisions
  if (state.decisions.length > MAX_DECISIONS) {
    state.decisions = state.decisions.slice(-MAX_DECISIONS);
  }
  // Keep only last 6 monthly reports
  if (state.monthlyReports.length > 6) {
    state.monthlyReports = state.monthlyReports.slice(-6);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function logDecision(state: OptimizerState, decision: Omit<OptimizationDecision, 'timestamp'>): void {
  state.decisions.push({ ...decision, timestamp: new Date().toISOString() });
}

// ── Outcome Log Reader ───────────────────────────────────────────────

interface OutcomeEntry {
  technique: PersuasionTechnique;
  completed: boolean;
  responseTimeMinutes: number;
  timestamp: string;
}

function loadOutcomeLog(): OutcomeEntry[] {
  try {
    const raw = localStorage.getItem(OUTCOME_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ── Helpers ──────────────────────────────────────────────────────────

function daysBetween(a: string | Date, b: string | Date): number {
  const d1 = typeof a === 'string' ? new Date(a) : a;
  const d2 = typeof b === 'string' ? new Date(b) : b;
  return Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24);
}

function techniqueRate(entries: OutcomeEntry[], t: PersuasionTechnique): { rate: number; count: number } {
  const relevant = entries.filter(e => e.technique === t);
  if (relevant.length === 0) return { rate: 0.5, count: 0 };
  const completed = relevant.filter(e => e.completed).length;
  return { rate: completed / relevant.length, count: relevant.length };
}

function groupByDay(entries: OutcomeEntry[]): Record<string, OutcomeEntry[]> {
  const groups: Record<string, OutcomeEntry[]> = {};
  for (const e of entries) {
    const day = e.timestamp.split('T')[0];
    if (!groups[day]) groups[day] = [];
    groups[day].push(e);
  }
  return groups;
}

// ── 1. Weekly Optimization ───────────────────────────────────────────

function runWeeklyOptimization(state: OptimizerState, profile: PersuasionProfile, now: Date): void {
  const log = loadOutcomeLog();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekEntries = log.filter(e => new Date(e.timestamp) > weekAgo);

  if (weekEntries.length < 3) return; // not enough data

  // a. Review technique outcomes
  for (const t of ALL_TECHNIQUES) {
    const { rate, count } = techniqueRate(weekEntries, t);

    // b. High effectiveness → increase weight
    if (rate > 0.7 && count >= 3) {
      const current = state.weightAdjustments[t] ?? 1.0;
      state.weightAdjustments[t] = Math.min(2.0, current * 1.1);
      logDecision(state, {
        type: 'weight_increase',
        technique: t,
        detail: `${t} effectiveness ${Math.round(rate * 100)}% (${count} uses). Weight increased to ${(state.weightAdjustments[t]!).toFixed(2)}x.`,
      });
    }

    // c. Low effectiveness → decrease weight
    if (rate < 0.3 && count >= 5) {
      const current = state.weightAdjustments[t] ?? 1.0;
      state.weightAdjustments[t] = Math.max(0.3, current * 0.8);
      logDecision(state, {
        type: 'weight_decrease',
        technique: t,
        detail: `${t} effectiveness ${Math.round(rate * 100)}% after ${count} uses. Weight decreased to ${(state.weightAdjustments[t]!).toFixed(2)}x.`,
      });
    }

    // d. Not used in 14+ days → reset habituation
    const eff = profile.techniqueEffectiveness[t];
    if (eff?.lastUsed) {
      const daysSinceUse = daysBetween(eff.lastUsed as any, now);
      if (daysSinceUse >= 14) {
        logDecision(state, {
          type: 'habituation_reset',
          technique: t,
          detail: `${t} unused for ${Math.round(daysSinceUse)} days. Flagged for re-testing.`,
        });
      }
    }
  }

  // e. Trait updates are handled by persuasionEngine's updatePlayerPsychProfile

  // f. Combination detection
  detectWinningCombinations(state, weekEntries, now);

  state.lastWeeklyRun = now.toISOString();
}

function detectWinningCombinations(state: OptimizerState, entries: OutcomeEntry[], now: Date): void {
  const byDay = groupByDay(entries);

  for (const [day, dayEntries] of Object.entries(byDay)) {
    if (dayEntries.length < 3) continue;

    const completionRate = dayEntries.filter(e => e.completed).length / dayEntries.length;
    if (completionRate < 0.8) continue; // only interested in high-completion days

    const techniquesUsed = [...new Set(dayEntries.map(e => e.technique))];
    if (techniquesUsed.length < 2) continue;

    // Determine mode/dayType from day of week
    const date = new Date(day);
    const dayOfWeek = date.getDay();
    const dayType = [0, 1, 2, 3].includes(dayOfWeek) ? 'work' : 'free';
    // Mode is approximated — we don't store it in outcomes, so use 'unknown'
    const mode = 'unknown';

    // Check if this combo already exists
    const comboKey = techniquesUsed.sort().join('+');
    const existing = state.winningCombinations.find(
      c => c.techniques.sort().join('+') === comboKey,
    );

    if (existing) {
      existing.occurrences++;
      existing.lastSeen = now.toISOString();
      existing.dailyCompletionRate = (existing.dailyCompletionRate + completionRate) / 2;
    } else {
      state.winningCombinations.push({
        techniques: techniquesUsed,
        mode,
        dayType,
        dailyCompletionRate: completionRate,
        occurrences: 1,
        lastSeen: now.toISOString(),
      });
      logDecision(state, {
        type: 'combo_detected',
        detail: `Winning combination detected: ${techniquesUsed.join(' + ')} → ${Math.round(completionRate * 100)}% daily completion on ${dayType} day.`,
      });
    }
  }

  // Prune combos not seen in 30 days
  state.winningCombinations = state.winningCombinations.filter(
    c => daysBetween(c.lastSeen, now) < 30,
  );
}

// ── 2. Monthly Deep Analysis ─────────────────────────────────────────

function runMonthlyAnalysis(state: OptimizerState, profile: PersuasionProfile, now: Date): void {
  const log = loadOutcomeLog();
  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const monthEntries = log.filter(e => new Date(e.timestamp) > monthAgo);

  if (monthEntries.length < 10) return;

  // Top 3 / Bottom 3
  const rates = ALL_TECHNIQUES.map(t => {
    const { rate, count } = techniqueRate(monthEntries, t);
    return { technique: t, rate, count };
  }).filter(r => r.count >= 2);

  rates.sort((a, b) => b.rate - a.rate);
  const top3 = rates.slice(0, 3).map(r => ({ technique: r.technique, rate: Math.round(r.rate * 100) }));
  const bottom3 = rates.slice(-3).map(r => ({ technique: r.technique, rate: Math.round(r.rate * 100) }));

  // Profile changes
  const profileChanges: { trait: string; from: string; to: string }[] = [];
  if (state.previousProfile) {
    const prev = state.previousProfile;
    const curr = profile.playerProfile;
    for (const key of Object.keys(curr) as (keyof typeof curr)[]) {
      if (prev[key] !== curr[key]) {
        profileChanges.push({ trait: key, from: prev[key], to: curr[key] });
      }
    }
  }

  // Resistance changes
  const resistance = loadCachedResistance();
  const resistanceChanges: MonthlyReport['resistanceChanges'] = [];
  if (resistance && state.previousResistanceScore !== null) {
    const scoreDiff = resistance.overallResistanceScore - state.previousResistanceScore;
    if (scoreDiff > 10) {
      resistanceChanges.push({ category: 'Overall', status: 'worsened' });
    } else if (scoreDiff < -10) {
      resistanceChanges.push({ category: 'Overall', status: 'improved' });
    }
  }

  // Recommended shifts
  const recommendedShifts: string[] = [];

  // a. Desensitization detection
  const twoMonthsAgo = new Date(now);
  twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);
  const prevMonthEntries = log.filter(
    e => new Date(e.timestamp) > twoMonthsAgo && new Date(e.timestamp) <= monthAgo,
  );

  for (const t of ALL_TECHNIQUES) {
    const prevRate = techniqueRate(prevMonthEntries, t);
    const currRate = techniqueRate(monthEntries, t);
    if (prevRate.count >= 3 && currRate.count >= 3) {
      const drop = prevRate.rate - currRate.rate;
      if (drop >= 0.2) {
        state.weightAdjustments[t] = Math.max(0.3, (state.weightAdjustments[t] ?? 1.0) * 0.5);
        logDecision(state, {
          type: 'desensitization',
          technique: t,
          detail: `Desensitization detected for ${t}: ${Math.round(prevRate.rate * 100)}% → ${Math.round(currRate.rate * 100)}%. Forced rotation.`,
        });
        recommendedShifts.push(`Rotate away from ${t} (desensitization detected).`);
      }
    }
  }

  // b. Signal boost detection — new technique with sudden high effectiveness
  for (const t of ALL_TECHNIQUES) {
    const prevRate = techniqueRate(prevMonthEntries, t);
    const currRate = techniqueRate(monthEntries, t);
    if (prevRate.count < 2 && currRate.count >= 3 && currRate.rate > 0.7) {
      const boostUntil = new Date(now);
      boostUntil.setDate(boostUntil.getDate() + 14);
      state.signalBoosts.push({ technique: t, boostUntil: boostUntil.toISOString() });
      state.weightAdjustments[t] = Math.min(2.0, (state.weightAdjustments[t] ?? 1.0) * 1.3);
      logDecision(state, {
        type: 'signal_boost',
        technique: t,
        detail: `${t} shows sudden high effectiveness (${Math.round(currRate.rate * 100)}%). Boosted deployment for 2 weeks to confirm.`,
      });
      recommendedShifts.push(`Increase ${t} deployment (strong new signal).`);
    }
  }

  // c. Global decline detection
  const overallPrevRate = prevMonthEntries.length > 0
    ? prevMonthEntries.filter(e => e.completed).length / prevMonthEntries.length
    : 0.5;
  const overallCurrRate = monthEntries.length > 0
    ? monthEntries.filter(e => e.completed).length / monthEntries.length
    : 0.5;

  if (overallCurrRate < overallPrevRate - 0.15 && overallCurrRate < 0.5) {
    // All techniques declining — shift to recovery + identity
    for (const t of ALL_TECHNIQUES) {
      if (t === 'identity_framing' || t === 'fresh_start_effect') {
        state.weightAdjustments[t] = Math.min(2.0, (state.weightAdjustments[t] ?? 1.0) * 1.3);
      } else {
        state.weightAdjustments[t] = Math.max(0.5, (state.weightAdjustments[t] ?? 1.0) * 0.8);
      }
    }
    logDecision(state, {
      type: 'global_decline',
      detail: `Global effectiveness declined from ${Math.round(overallPrevRate * 100)}% to ${Math.round(overallCurrRate * 100)}%. Shifting to recovery + identity-framing strategy.`,
    });
    recommendedShifts.push('Global decline detected. Shifting to recovery-focused persuasion.');
  }

  // Store snapshot for next month comparison
  state.previousProfile = { ...profile.playerProfile };
  state.previousResistanceScore = resistance?.overallResistanceScore ?? null;

  // Expire old signal boosts
  state.signalBoosts = state.signalBoosts.filter(b => new Date(b.boostUntil) > now);

  // Generate report
  const report: MonthlyReport = {
    generatedAt: now.toISOString(),
    periodStart: monthAgo.toISOString(),
    periodEnd: now.toISOString(),
    top3,
    bottom3,
    profileChanges,
    resistanceChanges,
    recommendedShifts,
  };

  state.monthlyReports.push(report);
  logDecision(state, {
    type: 'monthly_report',
    detail: `Monthly report generated. Top: ${top3.map(t => t.technique).join(', ')}. Bottom: ${bottom3.map(t => t.technique).join(', ')}. ${recommendedShifts.length} strategy shifts recommended.`,
  });

  state.lastMonthlyRun = now.toISOString();
}

// ── 3. Resistance-Specific Optimization ──────────────────────────────

function optimizeResistance(state: OptimizerState, now: Date): void {
  const resistance = loadCachedResistance();
  if (!resistance) return;

  const log = loadOutcomeLog();

  for (const point of resistance.resistancePoints) {
    let tracker = state.resistanceTrackers.find(t => t.category === point.category);
    if (!tracker) {
      tracker = {
        category: point.category,
        techniquesUsed: [],
        firstDetected: now.toISOString(),
        escalated: false,
        confronted: false,
      };
      state.resistanceTrackers.push(tracker);
    }

    const daysSinceDetected = daysBetween(tracker.firstDetected, now);

    // Track techniques used on resistance quests in this category
    // We approximate by checking outcomes log for techniques used recently
    const recent = log.filter(e => {
      const entryDate = new Date(e.timestamp);
      return entryDate > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    });
    for (const entry of recent) {
      const alreadyTracked = tracker.techniquesUsed.some(
        t => t.technique === entry.technique && t.date === entry.timestamp.split('T')[0],
      );
      if (!alreadyTracked) {
        tracker.techniquesUsed.push({
          technique: entry.technique,
          date: entry.timestamp.split('T')[0],
          completed: entry.completed,
        });
      }
    }

    // Trim to last 30 days of tracking
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    tracker.techniquesUsed = tracker.techniquesUsed.filter(
      t => new Date(t.date) > thirtyDaysAgo,
    );

    // Escalation at 14+ days
    if (daysSinceDetected >= 14 && !tracker.escalated) {
      tracker.escalated = true;
      logDecision(state, {
        type: 'resistance_escalation',
        detail: `Resistance in \"${point.category}\" persists after ${Math.round(daysSinceDetected)} days. Escalating: dual-technique deployment activated (loss_aversion + variable_reward).`,
      });
    }

    // Final confrontation at 21+ days
    if (daysSinceDetected >= 21 && !tracker.confronted) {
      tracker.confronted = true;
      logDecision(state, {
        type: 'resistance_confrontation',
        detail: `Resistance in \"${point.category}\" persists after ${Math.round(daysSinceDetected)} days. All techniques exhausted. Deploying direct identity confrontation.`,
      });
    }
  }

  // Clean up trackers for resolved resistance points
  const activeCategories = new Set(resistance.resistancePoints.map(p => p.category));
  state.resistanceTrackers = state.resistanceTrackers.filter(
    t => activeCategories.has(t.category) || daysBetween(t.firstDetected, now) < 30,
  );
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Run optimization on app load. Checks if weekly/monthly cycles are due
 * and processes accordingly. Safe to call on every load — exits early
 * if cycles aren't due yet.
 */
export function runOptimization(): void {
  const state = loadState();
  const profile = loadProfile();
  const now = new Date();

  // Weekly check
  const weeklyDue = !state.lastWeeklyRun || daysBetween(state.lastWeeklyRun, now) >= 7;
  if (weeklyDue) {
    runWeeklyOptimization(state, profile, now);
  }

  // Monthly check
  const monthlyDue = !state.lastMonthlyRun || daysBetween(state.lastMonthlyRun, now) >= 30;
  if (monthlyDue) {
    runMonthlyAnalysis(state, profile, now);
  }

  // Resistance optimization runs every time (lightweight)
  optimizeResistance(state, now);

  saveState(state);
}

/**
 * Get the current weight adjustment for a technique.
 * Returns a multiplier (default 1.0) that should be applied
 * on top of the base SELECTION_WEIGHTS.
 */
export function getWeightAdjustment(technique: PersuasionTechnique): number {
  const state = loadState();
  const base = state.weightAdjustments[technique] ?? 1.0;

  // Check signal boost
  const boost = state.signalBoosts.find(b => b.technique === technique);
  if (boost && new Date(boost.boostUntil) > new Date()) {
    return base * 1.2;
  }

  return base;
}

/**
 * Get the confrontation message for a resistance category
 * that has persisted 21+ days. Returns null if not confronted.
 */
export function getResistanceConfrontation(category: string): string | null {
  const state = loadState();
  const tracker = state.resistanceTrackers.find(t => t.category === category && t.confronted);
  if (!tracker) return null;
  return `The System has spent ${Math.round(daysBetween(tracker.firstDetected, new Date()))} days attempting to move you past ${category}. Every technique has been deployed. The only remaining variable is your decision. Who are you?`;
}

/**
 * Check if a resistance category should use dual-technique escalation.
 */
export function isResistanceEscalated(category: string): boolean {
  const state = loadState();
  const tracker = state.resistanceTrackers.find(t => t.category === category);
  return tracker?.escalated === true && !tracker.confronted;
}

/**
 * Get winning combinations for the current day context.
 */
export function getWinningCombinations(dayType: string): WinningCombination[] {
  const state = loadState();
  return state.winningCombinations
    .filter(c => c.dayType === dayType && c.occurrences >= 2)
    .sort((a, b) => b.dailyCompletionRate - a.dailyCompletionRate);
}

/**
 * Get the most recent monthly report.
 */
export function getLatestMonthlyReport(): MonthlyReport | null {
  const state = loadState();
  return state.monthlyReports.length > 0
    ? state.monthlyReports[state.monthlyReports.length - 1]
    : null;
}

/**
 * Get all optimization decisions (for analytics page).
 */
export function getOptimizationLog(): OptimizationDecision[] {
  const state = loadState();
  return state.decisions;
}
