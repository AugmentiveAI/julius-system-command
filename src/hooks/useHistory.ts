import { useState, useEffect, useCallback, useMemo } from 'react';
import { useHistorySync } from '@/hooks/useHistorySync';
import { HistoryState, QuestCompletionEntry, DaySummary, WeeklySummary } from '@/types/history';

const HISTORY_STORAGE_KEY = 'the-system-history';

function loadHistory(): HistoryState {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load history data:', e);
  }
  return { completions: [] };
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function useHistory() {
  const [history, setHistory] = useState<HistoryState>(loadHistory);

  // Sync with Supabase
  const { syncCompletion } = useHistorySync(history, setHistory);

  useEffect(() => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const addCompletion = useCallback((entry: Omit<QuestCompletionEntry, 'id'>) => {
    const newEntry: QuestCompletionEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setHistory(prev => ({
      completions: [...prev.completions, newEntry],
    }));
    // Write to DB immediately
    syncCompletion(newEntry);
  }, [syncCompletion]);

  const daysSummary = useMemo((): DaySummary[] => {
    const grouped: Record<string, QuestCompletionEntry[]> = {};
    
    history.completions.forEach(entry => {
      const date = entry.completedAt.split('T')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(entry);
    });

    return Object.entries(grouped)
      .map(([date, entries]) => ({
        date,
        entries: entries.sort((a, b) => 
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        ),
        totalXP: entries.reduce((sum, e) => sum + e.xpEarned, 0),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [history.completions]);

  const weeklySummary = useMemo((): WeeklySummary => {
    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekEnd = getWeekEnd(now);

    const thisWeekEntries = history.completions.filter(entry => {
      const entryDate = new Date(entry.completedAt);
      return entryDate >= weekStart && entryDate <= weekEnd;
    });

    const uniqueDays = new Set(
      thisWeekEntries.map(e => e.completedAt.split('T')[0])
    );

    return {
      totalXP: thisWeekEntries.reduce((sum, e) => sum + e.xpEarned, 0),
      questsCompleted: thisWeekEntries.length,
      daysActive: uniqueDays.size,
      startDate: weekStart.toISOString(),
      endDate: weekEnd.toISOString(),
    };
  }, [history.completions]);

  return {
    history,
    addCompletion,
    daysSummary,
    weeklySummary,
  };
}
