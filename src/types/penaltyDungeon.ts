import { DungeonTemplate } from './dungeon';

export const PENALTY_DUNGEON_TEMPLATE: DungeonTemplate = {
  type: 'penalty',
  title: 'PENALTY QUEST: System Enforcement',
  description: 'You have failed to complete any quests for 2+ consecutive days. The System does not tolerate stagnation. Complete these objectives within 4 hours or suffer permanent stat reduction.',
  difficulty: 'S-Rank',
  baseXP: 200,
  timeLimitMinutes: 240,
  objectives: [
    'Complete 2 quests within the time limit',
    'Complete a training session or cold exposure',
    'Complete a 30-minute focused sprint',
  ],
  geneticModifiers: [
    { gene: 'COMT Val/Val', effect: 'Penalty Pressure: The System demands compliance', multiplier: 1.0 },
  ],
  unlockCondition: 'Auto-triggered by 2+ consecutive zero-completion days',
};

export const PENALTY_STAT_REDUCTION = 3;
