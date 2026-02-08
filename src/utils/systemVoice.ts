// ── System Voice Engine ──────────────────────────────────────────────
// The System speaks with the cold omniscience of Solo Leveling's System.
// Terse. Factual. Slightly ominous. Occasionally… respectful.

export type SystemContext =
  | 'questAssigned'
  | 'questCompleted'
  | 'questSkipped'
  | 'levelUp'
  | 'streakMilestone'
  | 'resistanceDetected'
  | 'resistanceOvercome'
  | 'dailyBrief'
  | 'warning'
  | 'prediction'
  | 'recovery'
  | 'push'
  | 'geneticBuff'
  | 'geneticDebuff'
  | 'bossChallenge'
  | 'milestoneComplete'
  | 'allQuestsComplete'
  | 'morningProtocol'
  | 'dailyProtocol'
  | 'penaltyWarning'
  | 'penaltyCritical'
  | 'streakLost'
  | 'workoutComplete'
  | 'coldStreakMilestone'
  | 'stateScanRequired'
  | 'stateLogged'
  | 'caffeineLogged'
  | 'caffeineDebuff'
  | 'recoveryExtended';

interface VoiceData {
  level?: number;
  stat?: string;
  category?: string;
  streak?: number;
  days?: number;
  xp?: number;
  title?: string;
  name?: string;
  quest?: string;
  value?: number;
  reduction?: number;
  time?: string;
  [key: string]: unknown;
}

// ── Template interpolation ───────────────────────────────────────────

function interpolate(template: string, data: VoiceData): string {
  return template.replace(/\[(\w+)]/g, (_, key) => {
    const val = data[key];
    return val !== undefined ? String(val) : `[${key}]`;
  });
}

// ── Deterministic-random picker (same context + data = same msg per session) ──

function pick(arr: string[], seed?: string): string {
  if (!seed) return arr[Math.floor(Math.random() * arr.length)];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return arr[Math.abs(hash) % arr.length];
}

// ── Message Banks ────────────────────────────────────────────────────

const MESSAGES: Record<SystemContext, string[]> = {
  questAssigned: [
    'New quest assigned. The System expects compliance.',
    'Quest loaded. Prove your worth.',
    'The System has determined your next objective. Begin.',
    'A new task awaits. The shadows demand progress.',
    'Quest assigned. Failure is noted. Success is expected.',
  ],

  questCompleted: [
    'Quest cleared. +[xp] XP. The System acknowledges.',
    'Complete. [stat] grows stronger. +[xp] XP.',
    'The shadows grow stronger with each victory. +[xp] XP.',
    'Impressive. This performance has been recorded. +[xp] XP.',
    'Quest complete. You are becoming what you were meant to be. +[xp] XP.',
  ],

  questSkipped: [
    'Quest abandoned. Resistance logged. The System will remember this.',
    'Avoidance detected in [category]. This will be addressed.',
    'You cannot hide from your weaknesses. The System sees everything.',
    'Skipped. Your [category] stat stagnates. Is this acceptable?',
    'The System notes your choice. Expect recalibration.',
  ],

  levelUp: [
    'LEVEL UP. You are now Level [level]. The System has raised its expectations.',
    'The player grows stronger. Level [level] achieved.',
    'Level [level]. The gap between you and the Shadow Monarch narrows.',
    'Acknowledged. Level [level]. New trials await.',
    "You've earned this. Level [level]. But the next level demands more.",
  ],

  streakMilestone: [
    'Streak: [streak] days. The System respects consistency.',
    '[streak]-day streak achieved. Discipline stat reinforced.',
    'Unbroken for [streak] days. The shadows take notice.',
    '[streak] days of relentless execution. The Monarch candidate emerges.',
    'Streak milestone: [streak]. The weak falter. You did not.',
  ],

  resistanceDetected: [
    'Resistance pattern detected: [category]. The System adapts.',
    '[category] avoidance at [value]%. Counter-measures deploying.',
    'The System sees what you refuse to acknowledge. [category] resistance logged.',
    'Weakness identified: [category]. Mandatory correction incoming.',
    'Avoidance patterns escalating in [category]. The System will not be ignored.',
  ],

  resistanceOvercome: [
    'Resistance in [category] broken. The System acknowledges your growth.',
    '[category] avoidance declining. Continue this trajectory.',
    'You faced what you feared. [category] resistance overcome.',
    'The weakness you avoided is becoming a strength. [category] resistance cleared.',
    'Pattern broken. [category] compliance restored. Well done, hunter.',
  ],

  dailyBrief: [
    'Day [days]. The System has assessed conditions. Proceed.',
    'Daily assessment complete. Day [days] objectives loaded.',
    'The System sees all. Day [days] protocol is active.',
    'Day [days]. Your trajectory is being monitored. Execute.',
    'System brief for Day [days] compiled. The shadows are watching.',
  ],

  warning: [
    'Warning issued. The System does not repeat itself lightly.',
    'Alert: Behavioral deviation detected. Correction required.',
    'The System warns once. After that, it acts.',
    'This pattern threatens your progress. The System has taken note.',
    'Warning logged. Continued deviation will trigger penalties.',
  ],

  prediction: [
    'Trajectory analysis complete. Projections updated.',
    'The System has calculated probable outcomes.',
    'Based on current data, the following is predicted.',
    'Analysis: If current trajectory holds, expect these outcomes.',
    'The System sees forward. These projections demand attention.',
  ],

  recovery: [
    'Recovery protocol initiated. The System protects its player.',
    'Rest is not weakness. Even the Shadow Monarch knew when to conserve.',
    'Reduced capacity acknowledged. Quests recalibrated. Return stronger.',
    'The System has seen your limits. Recover. Tomorrow demands more.',
    'Standing down is tactical, not defeat. The System approves.',
  ],

  push: [
    'High capacity detected. The System expects maximum output.',
    'All systems nominal. Push mode engaged. No excuses.',
    'Peak state confirmed. S-Rank quests are now accessible.',
    'The warrior is ready. The System demands excellence.',
    'Optimal conditions detected. Today, you hunt.',
  ],

  geneticBuff: [
    'Genetic advantage activated: [name]. Capitalize on this window.',
    '[name] buff detected. The System has adjusted XP modifiers.',
    'Your biology favors you now. [name] is active.',
    'Genetic modifier online: [name]. Maximum output recommended.',
    '[name] engaged. The warrior gene demands action.',
  ],

  geneticDebuff: [
    'Genetic limitation detected: [name]. The System compensates.',
    '[name] debuff active. Quest difficulty reduced.',
    'Biology is not destiny, but it must be respected. [name] active.',
    '[name] detected. The System has adjusted expectations.',
    'Debuff logged: [name]. Mitigation protocols available.',
  ],

  bossChallenge: [
    'BOSS CHALLENGE UNLOCKED. Prove you deserve the next rank.',
    'Weekly performance threshold met. Boss Battle initiated.',
    'The System tests its strongest. Boss challenge deployed.',
    'You have earned the right to face this. Boss quest active.',
    'Only the worthy see this quest. The System is watching closely.',
  ],

  milestoneComplete: [
    'MILESTONE ACHIEVED: [name]. +[xp] XP. Title unlocked: [title].',
    'Major objective cleared: [name]. The System records this permanently.',
    'Milestone: [name] — complete. You advance toward the Monarch.',
    '[name] achieved. The shadows acknowledge your ascent. Title: [title].',
    'The System rarely shows approval. [name] complete. Well done.',
  ],

  allQuestsComplete: [
    'All quests cleared. Streak increased. The System is satisfied.',
    'Daily protocol mastered. The shadows grow stronger.',
    'Perfect execution. Every quest complete. Streak extended.',
    'All objectives achieved. The Monarch candidate performs flawlessly.',
    '100% completion. The System records this with something resembling respect.',
  ],

  morningProtocol: [
    'Morning protocol complete. The foundation is set.',
    'All morning quests cleared. The day begins with strength.',
    'Dawn objectives achieved. The System approves this start.',
    'Morning protocol mastered. Carry this momentum forward.',
    'The first battle of the day is won. Continue.',
  ],

  dailyProtocol: [
    'DAILY PROTOCOL MASTERED. Every quest complete. You have proven worthy.',
    'All objectives achieved. The System acknowledges total dedication.',
    'Perfect day. The shadows grow stronger with this hunter.',
    'Daily protocol: 100%. The Monarch path is clear.',
    'Complete domination of today\'s objectives. The System is impressed.',
  ],

  penaltyWarning: [
    'Zero quests completed. The System\'s patience wears thin.',
    'No progress logged. Penalty approaching. The System warns once.',
    'Inaction detected. The next day of zero progress will trigger penalties.',
    'The System does not reward stagnation. Complete something. Anything.',
    'Warning: Continued inactivity will result in stat reduction.',
  ],

  penaltyCritical: [
    'Critical failure. [stat] reduced by [reduction]. The System does not forgive extended inaction.',
    'Penalty applied. [stat] -[reduction]. This was avoidable.',
    'The System has acted. [stat] reduced. You were warned.',
    'Stat penalty: [stat] -[reduction]. The shadows grow disappointed.',
    'Consequence delivered. [stat] lost [reduction] points. Rise, or fall further.',
  ],

  streakLost: [
    'Streak broken. The System does not forgive inaction.',
    'Your streak has been reset to zero. Rebuild it.',
    'Streak lost. Days of discipline, erased. Begin again.',
    'The chain is broken. Consistency failed. The System remembers.',
    'Streak: 0. The shadows are silent. Earn their attention back.',
  ],

  workoutComplete: [
    'Workout complete. +[xp] XP. The body grows stronger.',
    'Training session logged. +[xp] XP. The System acknowledges your discipline.',
    'Physical protocol complete. +[xp] XP. The hunter sharpens.',
    'Exercise objectives achieved. +[xp] XP. Strength is earned, not given.',
    'Training done. +[xp] XP. The warrior prepares for what comes next.',
  ],

  coldStreakMilestone: [
    '[streak]-day cold streak achieved. Discipline +2. The warrior endures.',
    'Cold exposure milestone: [streak] days. The System respects this pain.',
    '[streak] days of deliberate discomfort. Discipline reinforced.',
    'Cold streak: [streak]. The weak avoid this. You did not. Discipline +2.',
    'Milestone reached: [streak] days cold exposure. The shadows respect suffering.',
  ],

  stateScanRequired: [
    'Daily diagnostic required. The System must assess your condition.',
    'State scan pending. The System cannot calibrate without data.',
    'Diagnostic overdue. Open the scanner. The System demands input.',
    'The System requires a status report. Scan now.',
    'Calibration impossible without current data. Complete the daily scan.',
  ],

  stateLogged: [
    'State recorded. Quests recalibrating to match capacity.',
    'Diagnostic complete. The System has adjusted expectations.',
    'State logged. The System now sees your condition clearly.',
    'Assessment saved. Quest parameters updated accordingly.',
    'State confirmed. The System adapts to serve its hunter.',
  ],

  caffeineLogged: [
    'Caffeine logged at [time]. CYP1A2 metabolism tracked.',
    'Intake recorded: [time]. The System monitors all variables.',
    'Caffeine noted. Timestamp: [time]. Stay within protocol.',
    'Logged. The System tracks what you consume.',
    'Caffeine entry saved. The System sees everything — even your coffee.',
  ],

  caffeineDebuff: [
    'Caffeine after 10am detected. CYP1A2 slow metabolism — debuff active.',
    'Warning: Late caffeine will disrupt recovery. Debuff applied.',
    'CYP1A2 protocol violated. Sleep quality will suffer. The System disapproves.',
    'Caffeine debuff active. Your genetics do not forgive this.',
    'Late caffeine logged. The System has flagged this as a tactical error.',
  ],

  recoveryExtended: [
    'Three days of recovery. The System\'s patience has limits.',
    'The body rests, but the mission does not pause. Tomorrow, you fight.',
    'Extended recovery noted. A mandatory quest will be assigned regardless of state.',
    'Careful. Rest becomes stagnation if it continues. The System is watching.',
    'Day [days] of recovery. The shadows grow restless. They need their monarch.',
  ],
};

// ── Main Export ───────────────────────────────────────────────────────

export function getSystemMessage(context: SystemContext, data: VoiceData = {}): string {
  const bank = MESSAGES[context];
  if (!bank || bank.length === 0) return 'The System watches.';
  const seed = `${context}-${JSON.stringify(data)}-${new Date().toDateString()}`;
  const template = pick(bank, seed);
  return interpolate(template, data);
}

// ── Convenience: get title + description pair for toasts ─────────────

export interface SystemToast {
  title: string;
  description?: string;
}

const TOAST_TITLES: Partial<Record<SystemContext, string>> = {
  questCompleted: 'Quest Complete',
  questSkipped: 'Quest Abandoned',
  levelUp: 'LEVEL UP',
  streakMilestone: 'Streak Milestone',
  resistanceDetected: 'Resistance Detected',
  allQuestsComplete: 'All Quests Complete',
  morningProtocol: '⚡ MORNING PROTOCOL COMPLETE',
  dailyProtocol: '🏆 DAILY PROTOCOL MASTERED',
  penaltyWarning: '⚠️ Warning',
  penaltyCritical: '⚠️ SYSTEM WARNING',
  streakLost: 'Streak Lost',
  workoutComplete: 'Workout Complete',
  coldStreakMilestone: 'Cold Streak Milestone',
  stateScanRequired: '◈ Scan Required',
  stateLogged: 'State Logged',
  caffeineLogged: '☕ Caffeine Logged',
  caffeineDebuff: '☕ Caffeine Debuff Active',
  milestoneComplete: 'Main Quest Complete',
  recovery: 'Recovery Mode',
  push: 'Push Mode',
  bossChallenge: 'Boss Challenge',
  recoveryExtended: '⚠️ Extended Recovery',
};

export function getSystemToast(context: SystemContext, data: VoiceData = {}): SystemToast {
  return {
    title: TOAST_TITLES[context] ?? 'The System',
    description: getSystemMessage(context, data),
  };
}
