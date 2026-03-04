export type DungeonType = 'boss_fight' | 'instant_dungeon' | 's_rank_gate';
export type DungeonDifficulty = 'B-Rank' | 'A-Rank' | 'S-Rank' | 'SS-Rank';
export type DungeonStatus = 'available' | 'active' | 'completed' | 'failed' | 'expired';

export interface DungeonObjective {
  id: string;
  title: string;
  completed: boolean;
}

export interface GeneticModifier {
  gene: string;
  effect: string;
  multiplier: number;
}

export interface Dungeon {
  id: string;
  user_id: string;
  dungeon_type: DungeonType;
  title: string;
  description: string | null;
  difficulty: DungeonDifficulty;
  status: DungeonStatus;
  xp_reward: number;
  time_limit_minutes: number | null;
  objectives: DungeonObjective[];
  unlocked_by: Record<string, any>;
  genetic_modifiers: GeneticModifier[];
  started_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  created_at: string;
  metadata: Record<string, any>;
}

// ── Dungeon Templates (genetically calibrated for Julius) ──

export interface DungeonTemplate {
  type: DungeonType;
  title: string;
  description: string;
  difficulty: DungeonDifficulty;
  baseXP: number;
  timeLimitMinutes: number | null;
  objectives: string[];
  geneticModifiers: GeneticModifier[];
  unlockCondition: string;
  /** Minimum quests completed in last 7 days to unlock */
  minWeeklyCompletions?: number;
  /** Minimum streak to unlock */
  minStreak?: number;
  /** Minimum level to unlock */
  minLevel?: number;
}

// BOSS FIGHTS: Weekly stretch goals that push beyond comfort zone
export const BOSS_FIGHT_TEMPLATES: DungeonTemplate[] = [
  {
    type: 'boss_fight',
    title: "The Revenue Gate",
    description: "Close a new client or generate $500+ in revenue this week. Your COMT Warrior gene thrives under this pressure — the dopamine spike from a real sale will cascade into a 48-hour performance boost.",
    difficulty: 'S-Rank',
    baseXP: 500,
    timeLimitMinutes: null, // Weekly
    objectives: [
      "Send 20+ personalized outreach messages",
      "Book at least 2 discovery calls",
      "Close or advance one deal past proposal stage",
    ],
    geneticModifiers: [
      { gene: 'COMT Val/Val', effect: 'Warrior Focus: +20% XP under sales pressure', multiplier: 1.2 },
    ],
    unlockCondition: 'Available weekly on Monday',
    minWeeklyCompletions: 10,
  },
  {
    type: 'boss_fight',
    title: "The Systems Architect",
    description: "Build or ship a complete automation or system that runs without you. Your BDNF Val/Val rapid adaptation means you learn fastest by building — not planning.",
    difficulty: 'A-Rank',
    baseXP: 350,
    timeLimitMinutes: null,
    objectives: [
      "Design the system architecture",
      "Build the core workflow/automation",
      "Test and deploy to production",
    ],
    geneticModifiers: [
      { gene: 'BDNF Val/Val', effect: 'Rapid Adaptation: Learning boost from building', multiplier: 1.15 },
    ],
    unlockCondition: 'Available when 3+ automations in Shadow Army',
  },
  {
    type: 'boss_fight',
    title: "The Content Dungeon",
    description: "Create and publish 3 pieces of high-value content this week. Your Warrior-Sprinter archetype means batch-producing in explosive sessions, not dripping daily.",
    difficulty: 'A-Rank',
    baseXP: 300,
    timeLimitMinutes: null,
    objectives: [
      "Outline all 3 content pieces in one sprint",
      "Produce content in 2-3 explosive sprint sessions",
      "Publish and distribute all pieces",
    ],
    geneticModifiers: [
      { gene: 'ACTN3 CC', effect: 'Sprint Producer: Optimized for batch output', multiplier: 1.1 },
    ],
    unlockCondition: 'Available biweekly',
    minWeeklyCompletions: 7,
  },
];

// INSTANT DUNGEONS: Timed high-intensity sprints (45-90 min)
export const INSTANT_DUNGEON_TEMPLATES: DungeonTemplate[] = [
  {
    type: 'instant_dungeon',
    title: "Warrior's Sprint Dungeon",
    description: "45-minute maximum intensity output. Your COMT Val/Val peaks between 8-12 — this dungeon activates your Warrior gene's pressure response for explosive focus.",
    difficulty: 'B-Rank',
    baseXP: 150,
    timeLimitMinutes: 45,
    objectives: [
      "Enter the dungeon during peak COMT window (8AM-12PM)",
      "Complete focused output for full 45 minutes",
      "Produce a tangible deliverable",
    ],
    geneticModifiers: [
      { gene: 'COMT Val/Val', effect: 'Peak Window Bonus: +25% XP if completed 8AM-12PM', multiplier: 1.25 },
      { gene: 'ACTN3 CC', effect: 'Sprint Optimized: 45min is your genetic sweet spot', multiplier: 1.1 },
    ],
    unlockCondition: 'Always available during COMT peak hours',
  },
  {
    type: 'instant_dungeon',
    title: "The Outreach Blitz",
    description: "30 minutes. Maximum cold outreach. Your high dopamine baseline craves novel social interactions — weaponize it.",
    difficulty: 'B-Rank',
    baseXP: 100,
    timeLimitMinutes: 30,
    objectives: [
      "Send 10+ personalized messages in 30 minutes",
      "Follow up with 5+ warm leads",
    ],
    geneticModifiers: [
      { gene: 'COMT Val/Val', effect: 'Dopamine Drive: Social pressure activates focus', multiplier: 1.15 },
    ],
    unlockCondition: 'Available during work days',
  },
  {
    type: 'instant_dungeon',
    title: "Double Sprint Gauntlet",
    description: "Two consecutive 45-min sprints with a 15-min break. Pushes your ACTN3 limit — but your Sprinter gene handles 2 sprints before diminishing returns.",
    difficulty: 'A-Rank',
    baseXP: 250,
    timeLimitMinutes: 105,
    objectives: [
      "Complete Sprint 1 with full output",
      "Take exactly 15 minutes break (no more)",
      "Complete Sprint 2 with equal or higher output",
    ],
    geneticModifiers: [
      { gene: 'ACTN3 CC', effect: 'Double Sprint Window: 2 sprints before diminishing returns', multiplier: 1.2 },
      { gene: 'COMT Val/Val', effect: 'Sustained Warrior Mode: Pressure maintained across sprints', multiplier: 1.1 },
    ],
    unlockCondition: 'Unlocks after 3+ sprints completed in a day',
    minStreak: 3,
  },
  {
    type: 'instant_dungeon',
    title: "Post-Training Learning Dungeon",
    description: "Your BDNF Val/Val means exercise immediately boosts neuroplasticity. Complete a focused learning session 2-4 hours after training for maximum skill absorption.",
    difficulty: 'B-Rank',
    baseXP: 120,
    timeLimitMinutes: 60,
    objectives: [
      "Complete training/exercise first",
      "Wait 2-4 hours for BDNF activation",
      "Execute a focused skill-building session",
    ],
    geneticModifiers: [
      { gene: 'BDNF Val/Val', effect: 'Neuroplasticity Window: +30% learning after exercise', multiplier: 1.3 },
    ],
    unlockCondition: 'Available after completing daily training',
  },
];

// S-RANK GATES: Unlock based on proven capability patterns
export const S_RANK_GATE_TEMPLATES: DungeonTemplate[] = [
  {
    type: 's_rank_gate',
    title: "Gate of the Shadow Monarch",
    description: "You've proven consistency. Now prove you can sustain MAXIMUM output for an entire week. Every daily quest. Every pillar. Every sprint. No exceptions.",
    difficulty: 'SS-Rank',
    baseXP: 1000,
    timeLimitMinutes: null,
    objectives: [
      "Complete ALL daily quests for 7 consecutive days",
      "Complete all 3 pillars every day",
      "Complete at least 2 sprints per day",
      "Maintain or grow Shadow Army by 2+ assets",
    ],
    geneticModifiers: [
      { gene: 'COMT Val/Val', effect: 'The Warrior\'s ultimate test: sustained peak performance', multiplier: 1.5 },
      { gene: 'APOE e4', effect: 'Neuroprotection critical: sleep 7+ hours every night', multiplier: 1.0 },
    ],
    unlockCondition: 'Requires Level 5+ and 14-day streak',
    minLevel: 5,
    minStreak: 14,
  },
  {
    type: 's_rank_gate',
    title: "The First Client Gate",
    description: "Land your first (or next) $1K+ client through Augmentive. This gate tests your full stack: outreach → discovery → proposal → close.",
    difficulty: 'S-Rank',
    baseXP: 750,
    timeLimitMinutes: null,
    objectives: [
      "Generate 10+ qualified leads",
      "Book 3+ discovery calls",
      "Send 2+ proposals",
      "Close 1 client at $1K+ value",
    ],
    geneticModifiers: [
      { gene: 'COMT Val/Val', effect: 'Sales Warrior: Pressure of closing activates peak state', multiplier: 1.3 },
    ],
    unlockCondition: 'Requires Level 3+ and 20+ outreach quests completed',
    minLevel: 3,
    minWeeklyCompletions: 15,
  },
  {
    type: 's_rank_gate',
    title: "The Automation Empire Gate",
    description: "Build 3 automations that collectively save 10+ hours per week. Your Shadow Army needs soldiers that fight while you sleep.",
    difficulty: 'S-Rank',
    baseXP: 600,
    timeLimitMinutes: null,
    objectives: [
      "Identify 3 repetitive processes to automate",
      "Build and deploy all 3 automations",
      "Verify each saves 3+ hours/week",
    ],
    geneticModifiers: [
      { gene: 'BDNF Val/Val', effect: 'Systems Learning: Rapid skill acquisition for new tools', multiplier: 1.2 },
    ],
    unlockCondition: 'Requires 5+ Shadow Army assets',
    minLevel: 2,
  },
];

export const ALL_DUNGEON_TEMPLATES = [
  ...BOSS_FIGHT_TEMPLATES,
  ...INSTANT_DUNGEON_TEMPLATES,
  ...S_RANK_GATE_TEMPLATES,
];
