// --- Persuasion Engine Types ---

export type PersuasionTechnique =
  | 'loss_aversion'
  | 'variable_reward'
  | 'identity_framing'
  | 'commitment_escalation'
  | 'social_proof'
  | 'temporal_landmark'
  | 'endowed_progress'
  | 'scarcity_window'
  | 'contrast_principle'
  | 'sunk_cost_leverage'
  | 'implementation_intention'
  | 'fresh_start_effect';

export type FramingStyle = 'gain' | 'loss' | 'identity' | 'challenge' | 'stealth';

export interface PersuasionProfile {
  // Tracks which techniques have been most effective for THIS player
  techniqueEffectiveness: Record<PersuasionTechnique, {
    timesUsed: number;
    timesResultedInCompletion: number;
    effectivenessRate: number; // completion / used
    lastUsed: Date | null;
    cooldownDays: number; // prevent overuse / habituation
  }>;

  // Player psychological profile (built over time from behavior)
  playerProfile: {
    lossAversionSensitivity: 'high' | 'medium' | 'low'; // derived from response to loss-framed quests
    competitiveInstinct: 'high' | 'medium' | 'low'; // derived from response to social proof / challenges
    identityAlignment: 'high' | 'medium' | 'low'; // derived from response to identity-framed quests
    commitmentConsistency: 'high' | 'medium' | 'low'; // derived from follow-through on pre-committed quests
    noveltySeeker: 'high' | 'medium' | 'low'; // derived from response to variable rewards
    streakMotivated: 'high' | 'medium' | 'low'; // derived from behavior around streaks
  };

  // Habituation tracking - prevents the same technique from becoming stale
  habituationCounters: Record<PersuasionTechnique, {
    consecutiveUses: number;
    maxBeforeRotation: number; // rotate to different technique after this many
  }>;
}

// --- Technique Definitions ---

export interface TechniqueConfig {
  id: PersuasionTechnique;
  name: string;
  psychologicalBasis: string; // for System's internal reference, never shown to player
  applicationRules: {
    bestWhenState: ('push' | 'steady' | 'recovery')[];
    bestForResistance: boolean; // extra effective on resistance quests
    bestTimeOfDay: ('morning' | 'midday' | 'afternoon' | 'evening')[];
    comtPhaseBonus: ('peak' | 'stable' | 'dip' | 'recovery')[];
    cooldownDays: number;
  };
  templates: string[]; // message templates with {variables}
}

export const TECHNIQUE_LIBRARY: TechniqueConfig[] = [
  {
    id: 'loss_aversion',
    name: 'Loss Aversion',
    psychologicalBasis: 'Kahneman & Tversky - losses are psychologically 2x more powerful than equivalent gains',
    applicationRules: {
      bestWhenState: ['steady', 'recovery'],
      bestForResistance: true,
      bestTimeOfDay: ['morning', 'midday'],
      comtPhaseBonus: ['peak', 'stable'],
      cooldownDays: 2
    },
    templates: [
      'This quest expires at midnight. {xp} XP will be permanently lost if incomplete.',
      '{stat} stat will decay by {penalty} points at end of day. This quest prevents the loss.',
      'Your {streak}-day streak is at risk. One skip ends it. {streakXP} XP vanishes.',
      'The System has allocated {xp} XP to this quest. Unclaimed XP does not carry over. Ever.',
      'Failure to complete will trigger a {penalty}-point penalty to {stat}. The System does not negotiate.',
      '{xp} XP is reserved in your name. It will be reassigned to the void at midnight.'
    ]
  },
  {
    id: 'variable_reward',
    name: 'Variable Reward Schedule',
    psychologicalBasis: 'B.F. Skinner - intermittent reinforcement creates strongest behavioral loops',
    applicationRules: {
      bestWhenState: ['push', 'steady'],
      bestForResistance: false,
      bestTimeOfDay: ['morning', 'afternoon'],
      comtPhaseBonus: ['peak'],
      cooldownDays: 1
    },
    templates: [
      'This quest contains a hidden XP modifier. Complete to reveal.',
      'Shadow Quest detected. Unknown reward awaits.',
      'The System has flagged this quest for a potential bonus. Probability: unknown.',
      'Mystery multiplier active on next completed quest. Range: 1.5x — 5x.',
      'A shadow reward has been attached to one of today\'s quests. The System will not reveal which one.',
      'Bonus cache unlocked. Contents hidden until quest completion.'
    ]
  },
  {
    id: 'identity_framing',
    name: 'Identity-Based Motivation',
    psychologicalBasis: 'James Clear / Atomic Habits - behavior change is identity change. People act consistently with who they believe they are.',
    applicationRules: {
      bestWhenState: ['push', 'steady', 'recovery'],
      bestForResistance: true,
      bestTimeOfDay: ['morning', 'evening'],
      comtPhaseBonus: ['peak', 'stable'],
      cooldownDays: 2
    },
    templates: [
      'A Shadow Monarch does not wait for opportunities. He creates them.',
      'Hunters who reach S-Rank did not skip {category} quests. Neither will you.',
      'This is not a task. This is who you are becoming.',
      'The version of you that exits STAAR on his own terms completes this quest. Every time.',
      'Zoro did not become the world\'s greatest swordsman by training only what felt comfortable.',
      'You told the System you are a builder. Builders ship. Complete this quest.',
      'The man your future children will look up to does not skip this.',
      'Every skipped quest is a vote for the old version. Every completed quest is a vote for the Shadow Monarch.'
    ]
  },
  {
    id: 'commitment_escalation',
    name: 'Commitment & Consistency',
    psychologicalBasis: 'Cialdini - once people commit to something, they feel psychological pressure to behave consistently with that commitment',
    applicationRules: {
      bestWhenState: ['push', 'steady'],
      bestForResistance: true,
      bestTimeOfDay: ['evening'],
      comtPhaseBonus: ['recovery'],
      cooldownDays: 3
    },
    templates: [
      'Tomorrow\'s S-Rank quest has been selected: "{questName}". Do you accept this challenge? [ACCEPT / DECLINE]',
      'You committed to completing {category} quests this week. Current progress: {current}/{target}. The System holds you to your word.',
      'Last night you accepted this quest. The System logged your commitment. Will you honor it?',
      'Pre-commitment logged at {time}. The version of you that said yes was clear-headed. Trust that version.',
      'You have accepted {accepted} quests this week and completed {completed}. Your commitment ratio is being tracked.',
      'The System asked if you would rise. You said yes. This quest is part of that promise.'
    ]
  },
  {
    id: 'social_proof',
    name: 'Social Proof & Competition',
    psychologicalBasis: 'Cialdini - people look to others behavior to determine correct action, especially under uncertainty',
    applicationRules: {
      bestWhenState: ['push', 'steady'],
      bestForResistance: false,
      bestTimeOfDay: ['morning', 'midday'],
      comtPhaseBonus: ['peak'],
      cooldownDays: 3
    },
    templates: [
      'Players who completed this quest during recovery mode showed 40% faster stat progression.',
      'Top-ranked hunters complete an average of {avg} quests per day. Your current average: {playerAvg}.',
      'S-Rank hunters maintained a {percent}% completion rate in {category}. Your rate: {playerPercent}%.',
      '92% of players who reached Level {nextLevel} did not skip {category} quests at this stage.',
      'Hunters with your genetic profile who completed cold exposure during COMT dips recovered 35% faster.',
      'The average time to Shadow Monarch for players at your level: {avgDays} days. Your projected pace: {playerDays} days.'
    ]
  },
  {
    id: 'temporal_landmark',
    name: 'Fresh Start Effect',
    psychologicalBasis: 'Milkman et al - people are more likely to pursue goals at temporal landmarks (Mondays, month starts, birthdays, etc.)',
    applicationRules: {
      bestWhenState: ['push', 'steady', 'recovery'],
      bestForResistance: true,
      bestTimeOfDay: ['morning'],
      comtPhaseBonus: ['peak', 'stable'],
      cooldownDays: 5
    },
    templates: [
      'New week. New threshold. The System has reset your momentum multiplier. Make it count.',
      'First day of the month. The System is recalibrating all projections. Today sets the tone.',
      'Monday detected. Statistically, players who complete their first quest on Mondays maintain 73% higher weekly completion.',
      'Week {weekNum} of your 90-day campaign begins now. {weeksRemaining} weeks remain. What will you do with this one?',
      'A new chapter. The System has wiped yesterday\'s data from consideration. You start clean. Prove yourself.',
      'Temporal landmark detected. The old pattern ends here. New data collection begins now.'
    ]
  },
  {
    id: 'endowed_progress',
    name: 'Endowed Progress Effect',
    psychologicalBasis: 'Nunes & Dreze - people are more motivated to complete a goal when they feel they have already made progress toward it',
    applicationRules: {
      bestWhenState: ['steady', 'recovery'],
      bestForResistance: true,
      bestTimeOfDay: ['morning', 'midday'],
      comtPhaseBonus: ['stable', 'dip'],
      cooldownDays: 2
    },
    templates: [
      'You are {percent}% of the way to {milestone}. One quest closer.',
      'You have already completed {completed} quests toward {goal}. Only {remaining} remain.',
      '{stat} is at {current}/{target}. You are closer than you think.',
      'This quest moves you from {currentPercent}% to {newPercent}% on your {milestone} milestone. The gap is shrinking.',
      'The hardest part is starting. You started {daysAgo} days ago. This quest is just the next step.',
      'You\'ve already built {automations} automations and landed {clients} client(s). This quest adds to an existing foundation, not a blank page.'
    ]
  },
  {
    id: 'scarcity_window',
    name: 'Scarcity & Urgency',
    psychologicalBasis: 'Cialdini - perceived scarcity increases perceived value. Time-limited opportunities drive action.',
    applicationRules: {
      bestWhenState: ['push'],
      bestForResistance: false,
      bestTimeOfDay: ['morning', 'midday'],
      comtPhaseBonus: ['peak'],
      cooldownDays: 3
    },
    templates: [
      'COMT peak window active for {minutesRemaining} more minutes. S-Rank bonus available only during peak. Act now.',
      'This quest offers 2x XP for the next {minutes} minutes only. Timer started.',
      'Free day sprint window closing in {hours} hours. Maximum quest density available now.',
      'Your focus state is currently {focus}/5. This level of clarity is temporary. Deploy it on your hardest quest.',
      'Genetic analysis: your optimal performance window has {minutesRemaining} minutes remaining today. Use it or lose it.',
      'This bonus expires when your COMT phase shifts. The System cannot extend it.'
    ]
  },
  {
    id: 'contrast_principle',
    name: 'Contrast Effect',
    psychologicalBasis: 'Cialdini - perception is relative. A task seems easier when contrasted with something harder.',
    applicationRules: {
      bestWhenState: ['steady', 'recovery'],
      bestForResistance: true,
      bestTimeOfDay: ['afternoon', 'evening'],
      comtPhaseBonus: ['dip', 'recovery'],
      cooldownDays: 2
    },
    templates: [
      'Yesterday you completed an S-Rank quest. Today\'s {difficulty}-Rank should feel effortless by comparison.',
      'This quest takes {minutes} minutes. You spent {longerMinutes} minutes on {harderQuest} last week. This is nothing.',
      'You\'ve survived {totalQuests} quests so far. This one is a {difficulty}-Rank. You\'ve done harder in your sleep.',
      'The System could assign you "{harderQuest}" right now. Instead, it\'s offering "{currentQuest}". Take the gift.',
      'Compare: building a full automation workflow takes 6 hours. This quest takes {minutes} minutes. Perspective.',
      'You work 5am-3:30pm at STAAR four days a week. A {minutes}-minute quest on your free day is a luxury. Treat it that way.'
    ]
  },
  {
    id: 'sunk_cost_leverage',
    name: 'Sunk Cost Awareness',
    psychologicalBasis: 'Arkes & Blumer - people continue behavior based on previously invested resources. Used ethically to reinforce positive momentum.',
    applicationRules: {
      bestWhenState: ['steady', 'recovery'],
      bestForResistance: true,
      bestTimeOfDay: ['afternoon', 'evening'],
      comtPhaseBonus: ['dip', 'recovery'],
      cooldownDays: 4
    },
    templates: [
      'You have invested {totalHours} hours into the System over {days} days. This quest protects that investment.',
      '{streak} consecutive days of completion. Skipping now doesn\'t just lose today — it devalues every day that came before.',
      'You\'ve earned {totalXP} total XP. Every point was earned through effort. Don\'t let today be the day the curve flattens.',
      '{days} days since System activation. {questsCompleted} quests completed. You\'ve built something. Don\'t abandon it for one moment of comfort.',
      'Your {stat} stat has grown from {startValue} to {currentValue}. That growth required {questCount} completed quests. Keep compounding.',
      'The Augmentive vision is {daysOld} days old. Every completed quest has been a brick. Skipping this quest leaves a gap in the wall.'
    ]
  },
  {
    id: 'implementation_intention',
    name: 'Implementation Intentions',
    psychologicalBasis: 'Gollwitzer - "when X happens, I will do Y" format doubles follow-through rate vs simple goal-setting',
    applicationRules: {
      bestWhenState: ['push', 'steady'],
      bestForResistance: true,
      bestTimeOfDay: ['evening'],
      comtPhaseBonus: ['recovery'],
      cooldownDays: 2
    },
    templates: [
      'Tomorrow when you {trigger}, you will immediately begin "{questName}". Log this intention now.',
      'When your COMT peak window opens at 8am, you will start "{questName}" before checking messages. Agreed?',
      'After your shift ends on {dayOfWeek}, the first action is "{questName}". No buffer activities. Direct engagement.',
      'When you sit down at your desk on {dayOfWeek}, the first file you open is related to "{questName}". Commit now.',
      'The System has identified your optimal trigger: {trigger}. When it occurs, execute "{questName}". No deliberation.',
      'Implementation logged: When {trigger} → Execute {questName}. Duration: {minutes} minutes. The System will verify completion.'
    ]
  },
  {
    id: 'fresh_start_effect',
    name: 'Clean Slate Framing',
    psychologicalBasis: 'Dai et al - after a setback, framing a new beginning increases goal pursuit. Especially effective post-recovery periods.',
    applicationRules: {
      bestWhenState: ['recovery'],
      bestForResistance: true,
      bestTimeOfDay: ['morning'],
      comtPhaseBonus: ['peak', 'stable'],
      cooldownDays: 5
    },
    templates: [
      'Recovery complete. The System has archived yesterday\'s data. Today is Day 1 of your next phase.',
      'Previous resistance patterns have been noted and filed. This is a clean assessment. Show the System who you are now.',
      'The player who struggled last week no longer exists. The System interfaces with the current version only. Begin.',
      'Slate cleared. Stats preserved. Momentum reset to zero. Every quest today builds fresh velocity.',
      'The System does not judge past performance. It only measures current action. What will you do right now?',
      'Old pattern detected and archived. New behavioral sequence initiated. First quest determines the trajectory.'
    ]
  }
];

// --- Persuasion Selection Weights ---
// Used to determine which technique to deploy at any given moment

export const SELECTION_WEIGHTS = {
  // Higher weight = more likely to be selected when conditions match
  resistanceQuest: {
    loss_aversion: 5,
    identity_framing: 5,
    commitment_escalation: 4,
    contrast_principle: 3,
    sunk_cost_leverage: 3,
    endowed_progress: 3,
    implementation_intention: 3,
    social_proof: 2,
    variable_reward: 1,
    scarcity_window: 1,
    temporal_landmark: 2,
    fresh_start_effect: 2
  },
  normalQuest: {
    variable_reward: 5,
    endowed_progress: 4,
    scarcity_window: 3,
    temporal_landmark: 3,
    social_proof: 3,
    identity_framing: 2,
    contrast_principle: 2,
    loss_aversion: 2,
    commitment_escalation: 2,
    sunk_cost_leverage: 1,
    implementation_intention: 2,
    fresh_start_effect: 1
  },
  recoveryMode: {
    fresh_start_effect: 5,
    contrast_principle: 5,
    endowed_progress: 4,
    identity_framing: 3,
    sunk_cost_leverage: 3,
    temporal_landmark: 2,
    loss_aversion: 1,
    variable_reward: 1,
    social_proof: 1,
    scarcity_window: 0,
    commitment_escalation: 1,
    implementation_intention: 2
  }
};
