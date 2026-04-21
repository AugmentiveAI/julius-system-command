// Slice selectors built on top of `useJarvisSelector`.
// Each hook subscribes to the smallest snapshot it needs so consumers
// don't rerender on unrelated brain updates.

import { useCallback } from 'react';
import { useJarvisSelector, shallowEqual } from '@/contexts/JarvisBrainContext';
import { ResearchFinding } from '@/types/learning';

interface ShadowIntelSlice {
  findings: ResearchFinding[];
  unreadCount: number;
  updateStatus: (id: string, status: 'read' | 'acted_on' | 'dismissed') => void;
}

/**
 * Subscribe only to shadow-intel findings + the status updater.
 * Re-renders when the unread count or first finding id changes.
 */
export function useShadowIntelSlice(): ShadowIntelSlice | null {
  return useJarvisSelector<ShadowIntelSlice | null>(
    (brain) => {
      if (!brain) return null;
      return {
        findings: brain.unreadFindings,
        unreadCount: brain.unreadFindings.length,
        updateStatus: brain.updateFindingStatus,
      };
    },
    (a, b) => {
      if (a === b) return true;
      if (!a || !b) return false;
      return shallowEqual(
        { count: a.unreadCount, firstId: a.findings[0]?.id ?? null },
        { count: b.unreadCount, firstId: b.findings[0]?.id ?? null },
      );
    },
  );
}

/** Subscribe to just the COMT genetic phase (string | null). */
export function useGeneticPhaseSlice(): string | null {
  return useJarvisSelector((brain) => brain?.geneticState?.comtPhase ?? null);
}

/** Subscribe to just the anticipation object (referentially stable). */
export function useAnticipationSlice() {
  return useJarvisSelector((brain) => brain?.anticipation ?? null);
}

/** Subscribe to the highest-priority intervention. */
export function useHighestInterventionSlice() {
  return useJarvisSelector(
    (brain) => brain?.highestPriority ?? null,
    (a, b) => (a?.id ?? null) === (b?.id ?? null),
  );
}

/** Stable callback that calls `logColdExposure` from current snapshot. */
export function useLogColdExposureCallback(): (() => void) {
  const fn = useJarvisSelector((brain) => brain?.logColdExposure ?? null);
  return useCallback(() => { fn?.(); }, [fn]);
}
