import { useState, useCallback, useEffect, useMemo } from 'react';
import { Cornerstone } from '@/types/cornerstone';
import { identifyCornerstone, isCornerstoneHonoredToday } from '@/utils/cornerstoneEngine';
import { useAfterActionReview } from '@/hooks/useAfterActionReview';
import { useHistoryContext } from '@/contexts/HistoryContext';

const CORNERSTONE_KEY = 'systemCornerstone';

function loadCornerstone(): Cornerstone | null {
  try {
    const raw = localStorage.getItem(CORNERSTONE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function useCornerstone() {
  const [cornerstone, setCornerstone] = useState<Cornerstone | null>(loadCornerstone);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { aarHistory } = useAfterActionReview();
  const { daysSummary } = useHistoryContext();

  const allCompletions = useMemo(() =>
    daysSummary.flatMap(d => d.entries),
    [daysSummary]
  );

  const analyzeCornerstone = useCallback(() => {
    if (aarHistory.length < 7) return;

    setIsAnalyzing(true);
    const identified = identifyCornerstone(aarHistory, allCompletions);

    if (identified) {
      setCornerstone(identified);
      localStorage.setItem(CORNERSTONE_KEY, JSON.stringify(identified));
    }
    setIsAnalyzing(false);
  }, [aarHistory, allCompletions]);

  // Auto-analyze weekly
  useEffect(() => {
    if (aarHistory.length >= 7 && aarHistory.length % 7 === 0) {
      analyzeCornerstone();
    }
  }, [aarHistory.length, analyzeCornerstone]);

  // Also analyze on mount if we have enough data
  useEffect(() => {
    if (!cornerstone && aarHistory.length >= 7) {
      analyzeCornerstone();
    }
  }, []);

  const todayHonored = useMemo(() =>
    isCornerstoneHonoredToday(cornerstone, allCompletions),
    [cornerstone, allCompletions]
  );

  return {
    cornerstone,
    isAnalyzing,
    analyzeCornerstone,
    hasCornerstone: !!cornerstone,
    todayHonored,
  };
}
