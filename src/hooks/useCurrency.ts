import { useState, useEffect, useCallback } from 'react';
import { PlayerCurrency, CurrencyTransaction, INITIAL_CURRENCY } from '@/types/currency';
import { useToast } from '@/hooks/use-toast';

const CURRENCY_KEY = 'systemCurrency';
const TRANSACTIONS_KEY = 'systemCurrencyTransactions';
const LOGIN_DATE_KEY = 'systemLastLoginDate';

function loadCurrency(): PlayerCurrency {
  try {
    const raw = localStorage.getItem(CURRENCY_KEY);
    return raw ? JSON.parse(raw) : { ...INITIAL_CURRENCY };
  } catch { return { ...INITIAL_CURRENCY }; }
}

function loadTransactions(): CurrencyTransaction[] {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function generateId(): string {
  return `txn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useCurrency() {
  const [currency, setCurrency] = useState<PlayerCurrency>(loadCurrency);
  const [transactions, setTransactions] = useState<CurrencyTransaction[]>(loadTransactions);
  const { toast } = useToast();

  // Save on change
  useEffect(() => {
    localStorage.setItem(CURRENCY_KEY, JSON.stringify(currency));
  }, [currency]);

  useEffect(() => {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  }, [transactions]);

  // Daily login reward
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const lastLogin = localStorage.getItem(LOGIN_DATE_KEY);
    if (lastLogin !== today) {
      localStorage.setItem(LOGIN_DATE_KEY, today);
      // Award daily login essence after a short delay
      setTimeout(() => {
        setCurrency(prev => {
          const updated = { ...prev, essence: prev.essence + 15 };
          localStorage.setItem(CURRENCY_KEY, JSON.stringify(updated));
          return updated;
        });
        toast({ title: '+15 Essence', description: 'Daily login reward.' });
      }, 2000);
    }
  }, []);

  const earnCurrency = useCallback((
    type: 'essence' | 'monarchFragments',
    amount: number,
    source: string,
    description: string
  ) => {
    setCurrency(prev => {
      const newBalance = prev[type] + amount;
      const updated = { ...prev, [type]: newBalance };
      localStorage.setItem(CURRENCY_KEY, JSON.stringify(updated));

      const txn: CurrencyTransaction = {
        id: generateId(),
        type: 'earn',
        currency: type,
        amount,
        source,
        description,
        balanceAfter: newBalance,
        timestamp: new Date().toISOString(),
      };
      setTransactions(prev => [txn, ...prev].slice(0, 100));

      return updated;
    });

    toast({
      title: `+${amount} ${type === 'essence' ? 'Essence' : 'Monarch Fragments'}`,
      description,
    });

    return amount;
  }, [toast]);

  const spendCurrency = useCallback((
    type: 'essence' | 'monarchFragments',
    amount: number,
    source: string,
    description: string
  ): boolean => {
    if (currency[type] < amount) {
      toast({
        title: 'Insufficient funds',
        description: `Need ${amount} ${type === 'essence' ? 'Essence' : 'Monarch Fragments'}, have ${currency[type]}.`,
        variant: 'destructive',
      });
      return false;
    }

    setCurrency(prev => {
      const newBalance = prev[type] - amount;
      const updated = { ...prev, [type]: newBalance };
      localStorage.setItem(CURRENCY_KEY, JSON.stringify(updated));

      const txn: CurrencyTransaction = {
        id: generateId(),
        type: 'spend',
        currency: type,
        amount,
        source,
        description,
        balanceAfter: newBalance,
        timestamp: new Date().toISOString(),
      };
      setTransactions(prev => [txn, ...prev].slice(0, 100));

      return updated;
    });

    return true;
  }, [currency, toast]);

  const canAfford = useCallback((type: 'essence' | 'monarchFragments', amount: number): boolean => {
    return currency[type] >= amount;
  }, [currency]);

  return {
    essence: currency.essence,
    monarchFragments: currency.monarchFragments,
    transactions,
    earnCurrency,
    spendCurrency,
    canAfford,
    getRecentTransactions: (count: number) => transactions.slice(0, count),
  };
}
