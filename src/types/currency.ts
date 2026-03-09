import { PlayerStats } from '@/types/player';

export interface PlayerCurrency {
  essence: number;
  monarchFragments: number;
}

export interface CurrencyTransaction {
  id: string;
  type: 'earn' | 'spend';
  currency: 'essence' | 'monarchFragments';
  amount: number;
  source: string;
  description: string;
  balanceAfter: number;
  timestamp: string;
}

export const INITIAL_CURRENCY: PlayerCurrency = {
  essence: 0,
  monarchFragments: 0,
};
