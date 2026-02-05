import { PlayerStats } from './player';

export type QuestTimeBlock = 'morning' | 'midday' | 'afternoon' | 'evening';

export interface ProtocolQuest {
  id: string;
  title: string;
  stat: keyof PlayerStats;
  xp: number;
  timeBlock: QuestTimeBlock;
  completed: boolean;
  isProtocol?: boolean;
  geneticBonus?: {
    bonusXp: number;
    reason: string;
  };
}

export interface TimeBlockConfig {
  label: string;
  time: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const TIME_BLOCK_CONFIG: Record<QuestTimeBlock, TimeBlockConfig> = {
  morning: {
    label: 'Morning Protocol',
    time: '5:00 AM - 10:00 AM',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-950/20',
    borderColor: 'border-yellow-900/50',
  },
  midday: {
    label: 'Midday Protocol',
    time: '10:00 AM - 2:00 PM',
    color: 'text-orange-400',
    bgColor: 'bg-orange-950/20',
    borderColor: 'border-orange-900/50',
  },
  afternoon: {
    label: 'Afternoon Protocol',
    time: '2:00 PM - 6:00 PM',
    color: 'text-blue-400',
    bgColor: 'bg-blue-950/20',
    borderColor: 'border-blue-900/50',
  },
  evening: {
    label: 'Evening Protocol',
    time: '6:00 PM - 10:00 PM',
    color: 'text-purple-400',
    bgColor: 'bg-purple-950/20',
    borderColor: 'border-purple-900/50',
  },
};
