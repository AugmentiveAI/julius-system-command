import { useState, useEffect, useCallback } from 'react';
import { Activity, DailyActivitySummary, ParsedVoiceInput, QuickEntryData } from '@/types/activity';

const STORAGE_KEY = 'systemActivities';
const MAX_ACTIVITIES = 500;

function generateId(): string {
  return `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useActivityLog() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [todaySummary, setTodaySummary] = useState<DailyActivitySummary | null>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      setActivities(stored);
      calculateTodaySummary(stored);
    } catch { /* ignore */ }
  }, []);

  const calculateTodaySummary = (list: Activity[]) => {
    const today = new Date().toISOString().split('T')[0];
    const todayActivities = list.filter(a => a.timestamp.startsWith(today));

    const minutesByCategory: Record<string, number> = {};
    let totalMinutes = 0;
    const energyLogs: string[] = [];

    for (const activity of todayActivities) {
      if (activity.metadata.duration) {
        totalMinutes += activity.metadata.duration;
        const cat = activity.metadata.category || 'uncategorized';
        minutesByCategory[cat] = (minutesByCategory[cat] || 0) + activity.metadata.duration;
      }
      if (activity.metadata.energy) {
        energyLogs.push(activity.metadata.energy);
      }
    }

    const energyCounts = { high: 0, medium: 0, low: 0 };
    for (const e of energyLogs) {
      energyCounts[e as keyof typeof energyCounts]++;
    }
    const dominantEnergy = (Object.entries(energyCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] as 'high' | 'medium' | 'low') || 'medium';

    const productivityScore = Math.min(100, Math.round(
      (todayActivities.filter(a => a.type === 'task_completed').length * 10) +
      (totalMinutes / 6)
    ));

    setTodaySummary({
      date: today,
      activities: todayActivities,
      stats: { totalActivities: todayActivities.length, totalMinutesLogged: totalMinutes, minutesByCategory, dominantEnergy, productivityScore },
    });
  };

  const logActivity = useCallback((
    type: Activity['type'],
    content: string,
    metadata: Activity['metadata'] = {}
  ): Activity => {
    const activity: Activity = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      type,
      content,
      metadata: { ...metadata, source: metadata.source || 'manual' },
    };

    const updated = [activity, ...activities].slice(0, MAX_ACTIVITIES);
    setActivities(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    calculateTodaySummary(updated);

    // Emit event for learning system
    window.dispatchEvent(new CustomEvent('newActivity', { detail: activity }));

    return activity;
  }, [activities]);

  const logFromVoice = useCallback((parsed: ParsedVoiceInput): Activity => {
    const typeMap: Record<string, Activity['type']> = {
      'task_done': 'task_completed',
      'task_create': 'task_created',
      'note': 'note',
      'log_time': 'time_logged',
      'log_energy': 'energy_log',
    };

    return logActivity(
      typeMap[parsed.type] || 'note',
      parsed.content,
      {
        category: parsed.extracted.category,
        duration: parsed.extracted.duration,
        energy: parsed.extracted.energy,
        people: parsed.extracted.people,
        sentiment: parsed.extracted.sentiment,
        source: 'voice',
      }
    );
  }, [logActivity]);

  const logFromQuickEntry = useCallback((entry: QuickEntryData): Activity => {
    const typeMap: Record<string, Activity['type']> = {
      'task': 'task_created',
      'done': 'task_completed',
      'note': 'note',
      'time': 'time_logged',
      'idea': 'note',
    };

    return logActivity(
      typeMap[entry.parsed.type] || 'note',
      entry.parsed.content,
      {
        category: entry.parsed.category,
        duration: entry.parsed.duration,
        source: 'quick_entry',
      }
    );
  }, [logActivity]);

  const getActivitiesByDate = useCallback((date: string): Activity[] => {
    return activities.filter(a => a.timestamp.startsWith(date));
  }, [activities]);

  const getRecentActivities = useCallback((count: number = 10): Activity[] => {
    return activities.slice(0, count);
  }, [activities]);

  return {
    activities,
    todaySummary,
    logActivity,
    logFromVoice,
    logFromQuickEntry,
    getActivitiesByDate,
    getRecentActivities,
  };
}
