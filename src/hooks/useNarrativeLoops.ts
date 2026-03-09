import { useState, useCallback, useEffect } from 'react';
import { NarrativeLoop } from '@/types/narrativeLoop';
import { detectLoops, mergeDetectedLoops } from '@/utils/loopDetector';
import { useHistoryContext } from '@/contexts/HistoryContext';

const LOOPS_KEY = 'systemNarrativeLoops';

function loadLoops(): NarrativeLoop[] {
  try {
    return JSON.parse(localStorage.getItem(LOOPS_KEY) || '[]');
  } catch { return []; }
}

export function useNarrativeLoops() {
  const [loops, setLoops] = useState<NarrativeLoop[]>(loadLoops);
  const [newLoopDetected, setNewLoopDetected] = useState<NarrativeLoop | null>(null);
  const { daysSummary } = useHistoryContext();

  const analyzeLoops = useCallback(() => {
    const allCompletions = daysSummary.flatMap(d => d.entries);
    if (allCompletions.length < 10) return;

    const detected = detectLoops(allCompletions);
    const merged = mergeDetectedLoops(loops, detected);

    // Find newly detected loops
    const newOnes = merged.filter(m =>
      !loops.find(l => l.id === m.id) && m.status === 'active'
    );

    if (newOnes.length > 0) {
      setNewLoopDetected(newOnes[0]);
    }

    setLoops(merged);
    localStorage.setItem(LOOPS_KEY, JSON.stringify(merged));
  }, [daysSummary, loops]);

  // Analyze on mount and when history changes significantly
  useEffect(() => {
    const timer = setTimeout(analyzeLoops, 5000); // Delay to not block initial render
    return () => clearTimeout(timer);
  }, [daysSummary.length]); // Re-analyze when new days appear

  const breakLoop = useCallback((loopId: string) => {
    setLoops(prev => {
      const updated = prev.map(l =>
        l.id === loopId ? { ...l, status: 'broken' as const } : l
      );
      localStorage.setItem(LOOPS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    loops,
    activeLoops: loops.filter(l => l.status === 'active'),
    positiveLoops: loops.filter(l => l.valence === 'positive' && l.status === 'active'),
    negativeLoops: loops.filter(l => l.valence === 'negative' && l.status === 'active'),
    newLoopDetected,
    clearNewLoopAlert: () => setNewLoopDetected(null),
    analyzeLoops,
    breakLoop,
  };
}
