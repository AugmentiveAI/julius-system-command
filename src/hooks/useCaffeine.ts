import { useState, useEffect, useCallback } from 'react';
import { getSystemDate } from '@/utils/dayCycleEngine';

interface CaffeineState {
  logs: string[]; // ISO timestamps
  lastResetDate: string;
  warningDismissed: boolean;
}

const STORAGE_KEY = 'the-system-caffeine';

export function useCaffeine() {
  const [state, setState] = useState<CaffeineState>(() => {
    const today = getSystemDate();
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: CaffeineState = JSON.parse(stored);
        if (parsed.lastResetDate === today) return parsed;
      }
    } catch {}
    return { logs: [], lastResetDate: today, warningDismissed: false };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Daily reset check
  useEffect(() => {
    const today = getSystemDate();
    if (state.lastResetDate !== today) {
      setState({ logs: [], lastResetDate: today, warningDismissed: false });
    }
  }, [state.lastResetDate]);

  const logCaffeine = useCallback(() => {
    setState(prev => ({
      ...prev,
      logs: [...prev.logs, new Date().toISOString()],
      warningDismissed: false,
    }));
  }, []);

  const dismissWarning = useCallback(() => {
    setState(prev => ({ ...prev, warningDismissed: true }));
  }, []);

  const hasLoggedAfter10am = state.logs.some(iso => {
    const d = new Date(iso);
    return d.getHours() >= 10;
  });

  const latestLog = state.logs.length > 0 ? state.logs[state.logs.length - 1] : null;

  return {
    logs: state.logs,
    logCaffeine,
    hasLoggedAfter10am,
    warningDismissed: state.warningDismissed,
    dismissWarning,
    latestLog,
  };
}
