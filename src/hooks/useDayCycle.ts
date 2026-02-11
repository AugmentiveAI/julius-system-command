import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getSystemDate,
  getSystemDayOfWeek,
  getTimeUntilMidnightPST,
  checkAndExecuteTransition,
  loadDayCycleState,
  initializeDayCycleState,
  TransitionResult,
  DayArchiveEntry,
  DayCycleState,
} from '@/utils/dayCycleEngine';
import { getDayProfile } from '@/utils/weeklyRhythm';
import { useToast } from '@/hooks/use-toast';

export interface DayCycleInfo {
  currentDay: string;
  dayOfWeek: number;
  dayType: 'work' | 'transition' | 'sprint';
  timeUntilReset: string;
  isNewDay: boolean;
  streak: number;
  longestStreak: number;
  history: DayArchiveEntry[];
  triggerRefresh: () => void;
}

export function useDayCycle(getCurrentDayData: () => {
  questsCompleted: number;
  questsTotal: number;
  xpEarned: number;
  mode: string;
  sprintsCompleted: number;
}): DayCycleInfo {
  const { toast } = useToast();
  const [currentDay, setCurrentDay] = useState(getSystemDate);
  const [isNewDay, setIsNewDay] = useState(false);
  const [cycleState, setCycleState] = useState<DayCycleState>(() => {
    return loadDayCycleState() ?? initializeDayCycleState();
  });
  const [countdown, setCountdown] = useState(() => {
    const t = getTimeUntilMidnightPST();
    return `${t.hours}h ${t.minutes}m`;
  });

  const getCurrentDayDataRef = useRef(getCurrentDayData);
  useEffect(() => { getCurrentDayDataRef.current = getCurrentDayData; }, [getCurrentDayData]);

  const processTransition = useCallback(() => {
    const result = checkAndExecuteTransition(getCurrentDayDataRef.current);
    if (result.transitioned) {
      setCurrentDay(result.newDay);
      const updated = loadDayCycleState();
      if (updated) setCycleState(updated);

      // Flash isNewDay for 5 seconds
      setIsNewDay(true);
      setTimeout(() => setIsNewDay(false), 5000);

      toast({
        title: '🌅 New day. Quests updated.',
        description: result.daysMissed > 0
          ? `${result.daysMissed} day${result.daysMissed > 1 ? 's' : ''} missed. Yesterday archived.`
          : 'Yesterday archived. Fresh start.',
        duration: 4000,
      });
    }
  }, [toast]);

  // Run on mount
  useEffect(() => {
    processTransition();
  }, [processTransition]);

  // 60-second interval check
  useEffect(() => {
    const interval = setInterval(() => {
      processTransition();
      // Update countdown
      const t = getTimeUntilMidnightPST();
      setCountdown(`${t.hours}h ${t.minutes}m`);
    }, 60_000);
    return () => clearInterval(interval);
  }, [processTransition]);

  // Visibility change (app resume from background)
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        processTransition();
        const t = getTimeUntilMidnightPST();
        setCountdown(`${t.hours}h ${t.minutes}m`);
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [processTransition]);

  const dayOfWeek = getSystemDayOfWeek();
  const dayProfile = getDayProfile(new Date());

  const triggerRefresh = useCallback(() => {
    processTransition();
  }, [processTransition]);

  return {
    currentDay,
    dayOfWeek,
    dayType: dayProfile.dayType,
    timeUntilReset: countdown,
    isNewDay,
    streak: cycleState.streak,
    longestStreak: cycleState.longestStreak,
    history: cycleState.history,
    triggerRefresh,
  };
}
