import { PillarQuest } from '@/types/pillarQuests';

export const PILLAR_QUESTS: PillarQuest[] = [
  // ── MIND ────────────────────────────────────────────────────────────
  {
    id: 'pillar-deep-work',
    pillar: 'mind',
    title: 'Deep work sprint (45 min)',
    stat: 'systems',
    xp: 40,
    dayTypes: ['work'],
    description: 'One focused block. No notifications.',
  },
  {
    id: 'pillar-weekly-planning',
    pillar: 'mind',
    title: 'Weekly sprint planning',
    stat: 'systems',
    xp: 35,
    dayTypes: ['transition'],
    description: 'Map Thursday-Saturday priorities.',
  },
  {
    id: 'pillar-sprint-execute',
    pillar: 'mind',
    title: 'Execute primary sprint objective',
    stat: 'systems',
    xp: 50,
    dayTypes: ['sprint'],
    description: 'Ship the highest-priority deliverable.',
  },

  // ── BODY ────────────────────────────────────────────────────────────
  {
    id: 'pillar-movement',
    pillar: 'body',
    title: 'Movement session (30 min)',
    stat: 'discipline',
    xp: 35,
    dayTypes: ['work'],
    description: 'Any training. Walk, lift, flow.',
  },
  {
    id: 'pillar-recovery',
    pillar: 'body',
    title: 'Active recovery session',
    stat: 'discipline',
    xp: 25,
    dayTypes: ['transition'],
    description: 'Stretch, walk, or mobility work.',
  },
  {
    id: 'pillar-peak-training',
    pillar: 'body',
    title: 'Peak performance training',
    stat: 'discipline',
    xp: 50,
    dayTypes: ['sprint'],
    description: 'High-intensity. Prime BDNF for output.',
  },

  // ── SKILL ───────────────────────────────────────────────────────────
  {
    id: 'pillar-outreach',
    pillar: 'skill',
    title: 'Revenue outreach (10 messages)',
    stat: 'sales',
    xp: 35,
    dayTypes: ['work'],
    description: 'Plant seeds. Consistency compounds.',
  },
  {
    id: 'pillar-pipeline-review',
    pillar: 'skill',
    title: 'Pipeline & funnel review',
    stat: 'wealth',
    xp: 30,
    dayTypes: ['transition'],
    description: 'Audit leads. Identify bottlenecks.',
  },
  {
    id: 'pillar-client-delivery',
    pillar: 'skill',
    title: 'Client delivery or discovery call',
    stat: 'sales',
    xp: 50,
    dayTypes: ['sprint'],
    description: 'Direct revenue action. Close or ship.',
  },
];
