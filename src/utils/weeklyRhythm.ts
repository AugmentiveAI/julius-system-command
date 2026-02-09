export interface DayProfile {
  dayOfWeek: number; // 0=Sunday
  dayName: string;
  dayType: 'work' | 'transition' | 'sprint';
  energyProfile: 'fresh' | 'moderate' | 'depleted' | 'peak';
  staarSchedule: string | null;
  primaryFocus: string;
  maxSprints: number;
  questDifficultyBias: 'S' | 'A' | 'B' | 'C';
  revenueWeight: number;
  trainingPriority: 'high' | 'medium' | 'low' | 'rest';
  strategicNotes: string;
}

export const WEEKLY_RHYTHM: DayProfile[] = [
  {
    dayOfWeek: 0,
    dayName: 'Sunday',
    dayType: 'work',
    energyProfile: 'fresh',
    staarSchedule: '5:00 AM - 3:30 PM',
    primaryFocus: 'Pre-shift momentum + post-shift light work',
    maxSprints: 2,
    questDifficultyBias: 'B',
    revenueWeight: 0.3,
    trainingPriority: 'medium',
    strategicNotes: 'Fresh from Saturday rest. Front-load one important task before shift. Post-shift: admin and planning only.',
  },
  {
    dayOfWeek: 1,
    dayName: 'Monday',
    dayType: 'work',
    energyProfile: 'moderate',
    staarSchedule: '5:00 AM - 3:30 PM',
    primaryFocus: 'Maintain momentum, light outreach',
    maxSprints: 2,
    questDifficultyBias: 'B',
    revenueWeight: 0.3,
    trainingPriority: 'medium',
    strategicNotes: 'Temporal landmark — fresh start effect applicable. Post-shift: respond to any warm leads from weekend outreach.',
  },
  {
    dayOfWeek: 2,
    dayName: 'Tuesday',
    dayType: 'work',
    energyProfile: 'moderate',
    staarSchedule: '5:00 AM - 3:30 PM',
    primaryFocus: 'Maintenance and follow-ups',
    maxSprints: 2,
    questDifficultyBias: 'B',
    revenueWeight: 0.3,
    trainingPriority: 'medium',
    strategicNotes: 'Mid-week work grind. Conserve energy for Thursday sprint. Post-shift: learning or creative quests only.',
  },
  {
    dayOfWeek: 3,
    dayName: 'Wednesday',
    dayType: 'work',
    energyProfile: 'depleted',
    staarSchedule: '5:00 AM - 3:30 PM',
    primaryFocus: 'Survive and prepare',
    maxSprints: 1,
    questDifficultyBias: 'C',
    revenueWeight: 0.1,
    trainingPriority: 'low',
    strategicNotes: 'Last work day of the stretch. Energy is lowest. Assign only C/D rank quests post-shift. Evening: weekly planning session for Thu-Sat sprint.',
  },
  {
    dayOfWeek: 4,
    dayName: 'Thursday',
    dayType: 'transition',
    energyProfile: 'moderate',
    staarSchedule: null,
    primaryFocus: 'Plan the sprint, start warming up',
    maxSprints: 3,
    questDifficultyBias: 'A',
    revenueWeight: 0.6,
    trainingPriority: 'high',
    strategicNotes: 'Transition day. Morning: weekly planning and pipeline review. Afternoon: begin first revenue sprint. This is the launch pad.',
  },
  {
    dayOfWeek: 5,
    dayName: 'Friday',
    dayType: 'sprint',
    energyProfile: 'peak',
    staarSchedule: null,
    primaryFocus: 'Maximum revenue-generating output',
    maxSprints: 4,
    questDifficultyBias: 'S',
    revenueWeight: 0.9,
    trainingPriority: 'high',
    strategicNotes: 'Peak sprint day. Assign S-rank quests. Discovery calls, client builds, shipping deliverables. This is where the business grows. COMT peak window is critical — schedule hardest work for 8am-12pm.',
  },
  {
    dayOfWeek: 6,
    dayName: 'Saturday',
    dayType: 'sprint',
    energyProfile: 'peak',
    staarSchedule: null,
    primaryFocus: 'Ship and close',
    maxSprints: 4,
    questDifficultyBias: 'S',
    revenueWeight: 0.8,
    trainingPriority: 'high',
    strategicNotes: 'Second peak day. Continue Friday momentum. Focus on finishing what was started. Afternoon: content creation and networking. Evening: wind down and prepare for Sunday shift.',
  },
];

export function getDayProfile(date: Date = new Date()): DayProfile {
  return WEEKLY_RHYTHM[date.getDay()];
}

export type WeekPhase = 'grind' | 'launch' | 'sprint';

export function getWeekPhase(date: Date = new Date()): WeekPhase {
  const day = date.getDay();
  if (day >= 0 && day <= 3) return 'grind';
  if (day === 4) return 'launch';
  return 'sprint';
}
