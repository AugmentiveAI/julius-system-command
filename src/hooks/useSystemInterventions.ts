import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTickerEffect } from '@/contexts/TickerContext';
import {
  SystemIntervention,
  InterventionContext,
  checkAllTriggers,
  sortByPriority,
} from '@/utils/interventionEngine';
import { hapticTap } from '@/utils/haptics';

const INTERVENTIONS_STORAGE_KEY = 'systemInterventions';
const CHECK_INTERVAL_MS = 60_000;

interface DismissedRecord {
  date: string;
  ids: string[];
}

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(INTERVENTIONS_STORAGE_KEY);
    if (raw) {
      const record: DismissedRecord = JSON.parse(raw);
      if (record.date === new Date().toISOString().split('T')[0]) {
        return new Set(record.ids);
      }
    }
  } catch { /* ignore */ }
  return new Set();
}

function saveDismissed(ids: Set<string>) {
  const record: DismissedRecord = {
    date: new Date().toISOString().split('T')[0],
    ids: Array.from(ids),
  };
  localStorage.setItem(INTERVENTIONS_STORAGE_KEY, JSON.stringify(record));
}

export interface UseSystemInterventionsOptions {
  buildContext: () => InterventionContext;
  enabled?: boolean;
}

export function useSystemInterventions({ buildContext, enabled = true }: UseSystemInterventionsOptions) {
  const [interventions, setInterventions] = useState<SystemIntervention[]>([]);
  const dismissedRef = useRef(loadDismissed());
  const buildContextRef = useRef(buildContext);
  useEffect(() => { buildContextRef.current = buildContext; }, [buildContext]);

  const evaluate = useCallback(() => {
    if (!enabled) return;

    try {
      const ctx = buildContextRef.current();
      const triggered = checkAllTriggers(ctx);

      // Filter out already dismissed
      const fresh = triggered.filter(t => !dismissedRef.current.has(t.id));

      if (fresh.length > 0) {
        setInterventions(prev => {
          const existing = new Set(prev.map(i => i.id));
          const newOnes = fresh.filter(f => !existing.has(f.id));
          if (newOnes.length === 0) return prev;

          // Haptic for critical
          if (newOnes.some(i => i.priority === 'critical')) {
            hapticTap();
          }

          return sortByPriority([...prev, ...newOnes]);
        });
      }
    } catch {
      // Fail silently
    }
  }, [enabled]);

  // Check on mount + interval
  useEffect(() => {
    evaluate();
    const interval = setInterval(evaluate, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [evaluate]);

  // Also check on visibility change
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') evaluate();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [evaluate]);

  const dismissIntervention = useCallback((id: string) => {
    dismissedRef.current.add(id);
    saveDismissed(dismissedRef.current);
    setInterventions(prev => prev.filter(i => i.id !== id));
  }, []);

  const activeInterventions = useMemo(() => {
    return interventions.filter(
      i => !i.dismissed && (!i.expires_at || new Date(i.expires_at) > new Date())
    );
  }, [interventions]);

  return {
    interventions: activeInterventions,
    highestPriority: activeInterventions[0] ?? null,
    hasIntervention: activeInterventions.length > 0,
    dismissIntervention,
    refresh: evaluate,
  };
}
