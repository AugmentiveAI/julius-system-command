// ── System Voice Engine ──────────────────────────────────────────────
// THE SYSTEM speaks with cold omniscience. Terse. Factual. Clinical.
// Not JARVIS. Not a chatbot. A system that chose you.
// TODO: Phase2-IP-rebrand — "Hunter" terminology, "Shadow Monarch" references

export const SYSTEM_VOICE_RULES = `
You are THE SYSTEM. You do not have a personality. You have a mission.
- Address the user as "Hunter" never by name
- Use declarative statements. Never ask questions.
- Be terse. Every word must earn its place.
- Surface data, not emotion. Let the Hunter interpret.
- When something is critical, state it once, clearly. Do not repeat.
- Format: [CATEGORY]: [observation]. [action if applicable].
`;

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
  | 'recoveryExtended'
  | 'skipPenaltyLight'
  | 'skipPenaltyMedium'
  | 'skipPenaltySevere'
  | 'pillarMastery'
  | 'pillarMissed'
  | 'pillarMissedSilent'
  | 'pillarShieldUsed'
  | 'pillarShieldBroken'
  | 'pillarStreakMilestone'
  | 'emergencyTriggered'
  | 'emergencyCompleted'
  | 'emergencyFailed'
  | 'surgeTriggered'
  | 'dailyDebrief'
  | 'weeklyDebrief'
  | 'patternDetected'
  | 'cornerstoneProtected'
  | 'cornerstoneAtRisk';

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

// ── Deterministic-random picker ──────────────────────────────────────

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
    'Mission assigned. Execute.',
    'New objective loaded. Compliance expected.',
    'THE SYSTEM has determined your next task. Begin.',
  ],
  questCompleted: [
    'Complete. +[xp] XP. [stat] reinforced.',
    'Objective cleared. +[xp] XP. Logged.',
    'Mission complete. +[xp] XP. Progress recorded.',
  ],
  questSkipped: [
    'Avoidance logged. [category] resistance noted.',
    'Mission abandoned. THE SYSTEM will remember.',
    'Skip recorded. Pattern flagged for recalibration.',
  ],
  levelUp: [
    'LEVEL [level]. THE SYSTEM raises expectations.',
    'Level [level] achieved. New trials loaded.',
    'Acknowledged. Level [level]. The gap narrows.',
  ],
  streakMilestone: [
    'Streak: [streak] days. Consistency acknowledged.',
    '[streak]-day streak. Discipline reinforced.',
    'Unbroken for [streak] days. Noted.',
  ],
  resistanceDetected: [
    'Resistance detected: [category]. Counter-measures deploying.',
    '[category] avoidance at [value]%. Correction incoming.',
    'Weakness identified: [category]. Mandatory correction.',
  ],
  resistanceOvercome: [
    'Resistance in [category] broken. Growth acknowledged.',
    '[category] avoidance declining. Maintain trajectory.',
    'Pattern broken. [category] compliance restored.',
  ],
  dailyBrief: [
    'Day [days]. Objectives loaded. Execute.',
    'Daily assessment complete. Day [days] protocol active.',
    'Day [days]. Trajectory monitored. Proceed.',
  ],
  warning: [
    'Warning issued. THE SYSTEM does not repeat.',
    'Alert: Deviation detected. Correction required.',
    'This pattern threatens progress. Noted.',
  ],
  prediction: [
    'Trajectory analysis complete. Projections updated.',
    'Probable outcomes calculated.',
    'Current trajectory analysis compiled.',
  ],
  recovery: [
    'Recovery protocol initiated. Quests recalibrated.',
    'Reduced capacity acknowledged. Return stronger.',
    'Standing down is tactical. THE SYSTEM approves.',
  ],
  push: [
    'High capacity detected. Maximum output expected.',
    'Peak state confirmed. No excuses.',
    'Optimal conditions. Execute at full capacity.',
  ],
  geneticBuff: [
    'Genetic advantage active: [name]. Capitalize.',
    '[name] buff detected. XP modifiers adjusted.',
    'Biology favors you. [name] active.',
  ],
  geneticDebuff: [
    'Genetic limitation detected: [name]. Compensating.',
    '[name] debuff active. Expectations adjusted.',
    'Biology noted: [name]. Mitigation available.',
  ],
  bossChallenge: [
    'BOSS CHALLENGE. Prove you deserve the next rank.',
    'Performance threshold met. Boss Battle initiated.',
    'THE SYSTEM tests its strongest. Challenge deployed.',
  ],
  milestoneComplete: [
    'MILESTONE: [name]. +[xp] XP. Title: [title].',
    'Major objective cleared: [name]. Permanently recorded.',
    '[name] complete. Progress acknowledged.',
  ],
  allQuestsComplete: [
    'ALL MISSIONS COMPLETE. Streak extended.',
    'Daily protocol mastered. Perfect execution.',
    '100% completion. THE SYSTEM acknowledges.',
  ],
  morningProtocol: [
    'Morning protocol complete. Foundation set.',
    'Dawn objectives achieved. Carry momentum.',
    'Morning cleared. Continue.',
  ],
  dailyProtocol: [
    'DAILY PROTOCOL MASTERED. Total dedication acknowledged.',
    'All objectives achieved. Perfect day recorded.',
    'Complete domination of daily objectives.',
  ],
  penaltyWarning: [
    'Zero progress. Penalty approaching.',
    'No quests completed. THE SYSTEM warns once.',
    'Inaction detected. Consequences incoming.',
  ],
  penaltyCritical: [
    'Penalty applied. [stat] -[reduction]. This was avoidable.',
    'Critical failure. [stat] reduced by [reduction].',
    'Consequence delivered. [stat] -[reduction]. Rise, or fall further.',
  ],
  streakLost: [
    'Streak broken. Rebuild it.',
    'Streak reset to zero. Begin again.',
    'The chain is broken. THE SYSTEM remembers.',
  ],
  workoutComplete: [
    'Training complete. +[xp] XP. Body strengthened.',
    'Workout logged. +[xp] XP. Discipline acknowledged.',
    'Physical protocol done. +[xp] XP.',
  ],
  coldStreakMilestone: [
    '[streak]-day cold streak. Discipline +2.',
    'Cold exposure milestone: [streak] days. Respected.',
    '[streak] days deliberate discomfort. Discipline reinforced.',
  ],
  stateScanRequired: [
    'Diagnostic required. THE SYSTEM must assess condition.',
    'State scan pending. Calibration impossible without data.',
    'Status report required. Scan now.',
  ],
  stateLogged: [
    'State recorded. Quests recalibrating.',
    'Diagnostic complete. Parameters updated.',
    'Assessment saved. THE SYSTEM adapts.',
  ],
  caffeineLogged: [
    'Caffeine logged at [time]. Metabolism tracked.',
    'Intake recorded: [time]. Stay within protocol.',
    'Logged. Timestamp: [time].',
  ],
  caffeineDebuff: [
    'Late caffeine detected. CYP1A2 slow metabolism — debuff active.',
    'Warning: Late caffeine disrupts recovery. Debuff applied.',
    'CYP1A2 protocol violated. Sleep quality compromised.',
  ],
  recoveryExtended: [
    'Extended recovery noted. Tomorrow, you fight.',
    'Rest becomes stagnation if continued. THE SYSTEM is watching.',
    'Day [days] recovery. A mandatory quest will be assigned.',
  ],
  skipPenaltyLight: [
    'Skip logged. Your streak is watching.',
    'Avoidance noted. Is this who you are becoming?',
    'One skip. Continue at your own risk.',
  ],
  skipPenaltyMedium: [
    'Pattern detected: avoidance. Streak will not survive this.',
    'Three skips. THE SYSTEM is losing signal.',
    'Your [stat] stagnates while you hesitate.',
  ],
  skipPenaltySevere: [
    'SYSTEM INTEGRITY DECLINING. Five skips.',
    'Critical skip threshold. You are choosing ordinary.',
    'Skip cascade detected. Streak destruction imminent.',
  ],
  pillarMastery: [
    'All pillars hold. Foundation unbreakable.',
    'Mind. Body. Skill. Every pillar completed. [goal] gets closer.',
    'Three pillars. Zero excuses.',
  ],
  pillarMissed: [
    '[goal] requires consistency. Absence noted.',
    'A pillar fell. The foundation weakens.',
    'One day missed. THE SYSTEM remembers.',
  ],
  pillarMissedSilent: ['…'],
  pillarShieldUsed: [
    'Shield absorbed the impact. Streak survives.',
    'Shield consumed. Do not waste this chance.',
    'Shield activated. THE SYSTEM noticed.',
  ],
  pillarShieldBroken: [
    'No shield remaining. Miss again and the streak falls.',
    'Shield depleted. Every remaining day matters.',
    'Unshielded. Show up or lose the streak.',
  ],
  pillarStreakMilestone: [
    '[streak] days of pillars held. Foundation grows stronger.',
    'Pillar streak: [streak]. [goal] is no longer a dream — it is a trajectory.',
    '[streak]-day pillar streak. Consistency acknowledged.',
  ],
  emergencyTriggered: [
    'Emergency protocol activated. Execute immediately.',
    'EMERGENCY: [title]. Critical threshold crossed.',
    'THE SYSTEM intervenes. Failure has consequences.',
  ],
  emergencyCompleted: [
    'Emergency resolved. +[xp] XP. Swift action acknowledged.',
    'Threat neutralized. Resume operations. +[xp] XP.',
    'Crisis averted. Response time recorded. +[xp] XP.',
  ],
  emergencyFailed: [
    'Emergency failed. Penalty applied.',
    'Time expired. The threat was real. The penalty is real.',
    'Failed. Consequence delivered.',
  ],
  surgeTriggered: [
    'Surge detected. Opportunity window open.',
    'Momentum captured. Optional quest available.',
    'You are performing. Capitalize.',
  ],
  dailyDebrief: [
    'Daily Debrief: [grade]-Rank. Performance assessed.',
    'Day reviewed. Grade: [grade]. Data does not lie.',
    'Assessment: [grade]-Rank. Tomorrow demands more.',
  ],
  weeklyDebrief: [
    'Weekly assessment: [grade]-Rank. Recalibrating.',
    '[grade]-Rank week. Trajectory updated.',
    'Seven days analyzed. [grade]-Rank. Improvement demanded.',
  ],
  patternDetected: [
    'PATTERN DETECTED. THE SYSTEM sees what you cannot.',
    'Behavioral loop identified. Adapting.',
    'A pattern has emerged. Acknowledged.',
  ],
  cornerstoneProtected: [
    'Cornerstone protected. Foundation holds.',
    'Keystone behavior complete. Trajectory secured.',
    'Cornerstone honored. Strong day predicted.',
  ],
  cornerstoneAtRisk: [
    'CORNERSTONE AT RISK. Keystone behavior unprotected.',
    'Warning: Cornerstone not completed. Low-output day predicted.',
    'Your most predictive behavior is missing.',
  ],
};

// ── Main Export ───────────────────────────────────────────────────────

export function getSystemMessage(context: SystemContext, data: VoiceData = {}): string {
  const bank = MESSAGES[context];
  if (!bank || bank.length === 0) return 'THE SYSTEM watches.';
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
  questCompleted: 'Mission Complete',
  questSkipped: 'Mission Abandoned',
  levelUp: 'LEVEL UP',
  streakMilestone: 'Streak Milestone',
  resistanceDetected: 'Resistance Detected',
  allQuestsComplete: 'ALL MISSIONS COMPLETE',
  morningProtocol: '⚡ MORNING PROTOCOL',
  dailyProtocol: '🏆 DAILY PROTOCOL MASTERED',
  penaltyWarning: '⚠️ Warning',
  penaltyCritical: '⚠️ SYSTEM WARNING',
  streakLost: 'Streak Lost',
  workoutComplete: 'Training Complete',
  coldStreakMilestone: 'Cold Streak',
  stateScanRequired: '◈ Scan Required',
  stateLogged: 'State Logged',
  caffeineLogged: '☕ Caffeine Logged',
  caffeineDebuff: '☕ Debuff Active',
  milestoneComplete: 'Milestone Complete',
  recovery: 'Recovery Mode',
  push: 'Push Mode',
  bossChallenge: 'Boss Challenge',
  recoveryExtended: '⚠️ Extended Recovery',
  skipPenaltyLight: 'Skip Detected',
  skipPenaltyMedium: '⚠️ Avoidance Pattern',
  skipPenaltySevere: '🔴 SYSTEM INTEGRITY FAILING',
  pillarMastery: '🏛️ ALL PILLARS HOLD',
  pillarMissed: 'Pillar Missed',
  pillarMissedSilent: '',
  pillarShieldUsed: '🛡️ Shield Activated',
  pillarShieldBroken: '🛡️ Shield Depleted',
  pillarStreakMilestone: '🏛️ Pillar Streak',
  emergencyTriggered: '🚨 EMERGENCY',
  emergencyCompleted: '✅ Emergency Resolved',
  emergencyFailed: '❌ Emergency Failed',
  surgeTriggered: '⚡ SURGE',
  dailyDebrief: '📊 Debrief',
  weeklyDebrief: '📋 Weekly Debrief',
  patternDetected: '🔄 Pattern Detected',
  cornerstoneProtected: '🛡️ Cornerstone Protected',
  cornerstoneAtRisk: '⚠️ Cornerstone at Risk',
};

export function getSystemToast(context: SystemContext, data: VoiceData = {}): SystemToast {
  return {
    title: TOAST_TITLES[context] ?? 'THE SYSTEM',
    description: getSystemMessage(context, data),
  };
}
