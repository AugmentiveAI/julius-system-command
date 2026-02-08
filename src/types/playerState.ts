// --- Player State Types ---

export type EnergyLevel = 1 | 2 | 3 | 4 | 5;

export type FocusLevel = 1 | 2 | 3 | 4 | 5;

export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export type StressLevel = 1 | 2 | 3 | 4 | 5;

export interface PlayerStateCheck {
  id: string;
  timestamp: Date;
  energy: EnergyLevel;
  focus: FocusLevel;
  mood: MoodLevel;
  stress: StressLevel;
  compositeScore: number; // calculated: (energy + focus + mood + (6 - stress)) / 4
  dayType: 'work' | 'free'; // Sun-Wed = work, Thu-Sat = free
  timeBlock: 'morning' | 'midday' | 'afternoon' | 'evening';
  systemRecommendation: 'push' | 'steady' | 'recover';
}

export interface PlayerStateHistory {
  checks: PlayerStateCheck[];
  rollingAverage: {
    energy: number;
    focus: number;
    mood: number;
    stress: number;
    composite: number;
  };
  trend: 'rising' | 'stable' | 'declining';
  currentStreak: {
    type: 'push' | 'steady' | 'recover';
    days: number;
  };
}

// System recommendation thresholds
export const STATE_THRESHOLDS = {
  push: { minComposite: 3.5, description: 'High capacity detected. The System demands maximum output.' },
  steady: { minComposite: 2.5, description: 'Stable capacity. Maintain current trajectory.' },
  recover: { minComposite: 0, description: 'Low capacity detected. Strategic recovery initiated.' },
};

// Time block definitions based on Julius's schedule
export const TIME_BLOCKS = {
  morning: { start: 5, end: 10, label: 'Morning Protocol', color: '#FFD700' },
  midday: { start: 10, end: 14, label: 'Midday Operations', color: '#FF8C00' },
  afternoon: { start: 14, end: 18, label: 'Afternoon Push', color: '#4A90D9' },
  evening: { start: 18, end: 22, label: 'Evening Wind-Down', color: '#8B5CF6' },
};

// Day type mapping (0 = Sunday)
export const DAY_TYPES: Record<number, 'work' | 'free'> = {
  0: 'work',  // Sunday
  1: 'work',  // Monday
  2: 'work',  // Tuesday
  3: 'work',  // Wednesday
  4: 'free',  // Thursday
  5: 'free',  // Friday
  6: 'free',  // Saturday
};

// COMT Val/Val Warrior integration
export const GENETIC_MODIFIERS = {
  comtWarrior: {
    peakWindow: { start: 8, end: 12, bonus: 'dopamine_peak' },
    crashWindow: { start: 14, end: 17, warning: 'dopamine_dip' },
    recoveryBoost: { coldExposure: true, magnesiumWindow: 'evening' },
  },
  actn3Sprinter: {
    optimalSprintDuration: 45, // minutes
    restBetweenSprints: 15,    // minutes
    maxSprintsBeforeDecay: 4,
    warningMessage: 'Sprinter gene detected. Diminishing returns after 4 consecutive sprints.',
  },
};
