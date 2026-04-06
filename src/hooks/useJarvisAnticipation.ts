import { useState, useEffect, useCallback } from 'react';
import { JarvisAnticipation, UserLearning } from '@/types/learning';
import { storageKey } from '@/utils/scopedStorage';

const STORAGE_KEY = 'jarvisAnticipations';
const DEBUG_TELEMETRY = import.meta.env.DEV;

function generateId(): string {
  return `antic-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

function setHour(date: Date, hour: number): Date {
  const d = new Date(date);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/** Stable signature for deduplication — same type+prediction = same anticipation */
function anticipationSignature(a: Pick<JarvisAnticipation, 'type' | 'prediction'>): string {
  return `${a.type}::${a.prediction}`;
}

export function useJarvisAnticipation(learning: UserLearning | null) {
  const [anticipations, setAnticipations] = useState<JarvisAnticipation[]>([]);

  // Load stored (scoped, with validation)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(STORAGE_KEY));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setAnticipations(parsed);
        } else {
          if (DEBUG_TELEMETRY) console.debug("[telemetry]", { event: "stale_storage_cleared", key: STORAGE_KEY, valueType: typeof parsed });
          localStorage.removeItem(storageKey(STORAGE_KEY));
        }
      }
    } catch {
      if (DEBUG_TELEMETRY) console.debug("[telemetry]", { event: "stale_storage_cleared", key: STORAGE_KEY, reason: "parse_error" });
      localStorage.removeItem(storageKey(STORAGE_KEY));
    }
  }, []);

  // Save on change (scoped)
  useEffect(() => {
    if (anticipations.length > 0) {
      localStorage.setItem(storageKey(STORAGE_KEY), JSON.stringify(anticipations));
    } else {
      localStorage.removeItem(storageKey(STORAGE_KEY));
    }
  }, [anticipations]);

  const anticipate = useCallback(() => {
    const newAnticipations: JarvisAnticipation[] = [];
    const now = new Date();
    const currentHour = now.getHours();

    if (!learning) return newAnticipations;

    // 1. Peak window approaching
    const nextPeakHour = learning.execution.peakHours.find(h => h > currentHour);
    if (nextPeakHour && nextPeakHour - currentHour <= 2) {
      newAnticipations.push({
        id: generateId(),
        type: 'opportunity',
        prediction: 'Peak performance window approaching',
        confidence: 0.85,
        expectedTime: setHour(now, nextPeakHour).toISOString(),
        windowStart: setHour(now, nextPeakHour - 1).toISOString(),
        windowEnd: setHour(now, nextPeakHour).toISOString(),
        preparation: {
          type: 'task',
          description: 'Prepare your highest-priority task to execute when peak begins',
        },
        surfaced: false,
      });
    }

    // 2. Crash window approaching
    const nextCrashHour = learning.energy.crashHours.find(h => h > currentHour);
    if (nextCrashHour && nextCrashHour - currentHour <= 2) {
      newAnticipations.push({
        id: generateId(),
        type: 'prevention',
        prediction: 'Energy crash expected',
        confidence: 0.75,
        expectedTime: setHour(now, nextCrashHour).toISOString(),
        windowStart: setHour(now, nextCrashHour - 1).toISOString(),
        windowEnd: setHour(now, nextCrashHour).toISOString(),
        preparation: {
          type: 'decision',
          description: 'Plan lighter tasks or a break for this window',
        },
        surfaced: false,
      });
    }

    // 3. Peak window active now
    if (learning.execution.peakHours.includes(currentHour)) {
      newAnticipations.push({
        id: generateId(),
        type: 'opportunity',
        prediction: 'Peak window active — execute now',
        confidence: 0.9,
        expectedTime: now.toISOString(),
        windowStart: setHour(now, currentHour).toISOString(),
        windowEnd: setHour(now, currentHour + 1).toISOString(),
        preparation: {
          type: 'task',
          description: 'Your data shows this is your most productive hour. Start your top priority.',
        },
        surfaced: false,
      });
    }

    // 4. End of day — streak protection
    if (currentHour >= 20) {
      newAnticipations.push({
        id: generateId(),
        type: 'reminder',
        prediction: 'Day ending — protect your streak',
        confidence: 0.95,
        expectedTime: setHour(now, 21).toISOString(),
        windowStart: setHour(now, 20).toISOString(),
        windowEnd: setHour(now, 23).toISOString(),
        preparation: {
          type: 'task',
          description: 'Complete any remaining quests to maintain your streak',
        },
        surfaced: false,
      });
    }

    // Merge: preserve existing id/surfaced/surfacedAt for matching signatures
    setAnticipations(prev => {
      const prevBySignature = new Map<string, JarvisAnticipation>();
      for (const a of prev) {
        prevBySignature.set(anticipationSignature(a), a);
      }

      return newAnticipations.map(fresh => {
        const sig = anticipationSignature(fresh);
        const existing = prevBySignature.get(sig);
        if (existing) {
          // Preserve identity and surfaced state
          return {
            ...fresh,
            id: existing.id,
            surfaced: existing.surfaced,
            surfacedAt: existing.surfacedAt,
          };
        }
        return fresh;
      });
    });

    return newAnticipations;
  }, [learning]);

  // Run on interval
  useEffect(() => {
    anticipate();
    const interval = setInterval(anticipate, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [anticipate]);

  const getActiveAnticipations = useCallback((): JarvisAnticipation[] => {
    const now = new Date();
    return anticipations.filter(a => {
      const start = new Date(a.windowStart);
      const end = new Date(a.windowEnd);
      return !a.surfaced && now >= start && now <= end;
    });
  }, [anticipations]);

  const markSurfaced = useCallback((id: string) => {
    setAnticipations(prev =>
      prev.map(a =>
        a.id === id ? { ...a, surfaced: true, surfacedAt: new Date().toISOString() } : a
      )
    );
  }, []);

  return {
    anticipations,
    getActiveAnticipations,
    markSurfaced,
    anticipate,
  };
}
