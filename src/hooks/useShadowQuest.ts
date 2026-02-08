import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShadowQuest,
  ShadowQuestState,
  rollForShadowQuest,
  onQuestCompleted,
  completeShadowQuest,
  checkShadowExpiry,
  getShadowState,
  getShadowTimeRemaining,
} from '@/utils/shadowQuests';
import { ResistanceAnalysis } from '@/utils/resistanceTracker';

interface UseShadowQuestReturn {
  shadowQuest: ShadowQuest | null;
  isRevealed: boolean;
  showNotification: boolean;
  timeRemaining: { minutes: number; seconds: number } | null;
  dismissNotification: () => void;
  onCalibratedQuestCompleted: () => void;
  completeShadow: () => void;
}

export function useShadowQuest(
  mode: 'push' | 'steady' | 'recovery' | null,
  resistanceData: ResistanceAnalysis | null,
): UseShadowQuestReturn {
  const [state, setState] = useState<ShadowQuestState>(getShadowState);
  const [showNotification, setShowNotification] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<{ minutes: number; seconds: number } | null>(null);
  const initDone = useRef(false);

  // Roll on app load (once mode is known)
  useEffect(() => {
    if (!mode || initDone.current) return;
    initDone.current = true;
    const newState = rollForShadowQuest(mode, resistanceData);
    setState(newState);

    // If already triggered (returning to app), reveal immediately
    if (newState.triggered && newState.quest && !newState.quest.completed && !newState.quest.expired) {
      setIsRevealed(true);
    }
  }, [mode, resistanceData]);

  // Expiry check timer
  useEffect(() => {
    if (!state.quest || state.quest.completed || state.quest.expired) return;

    const interval = setInterval(() => {
      const updated = checkShadowExpiry();
      setState(updated);

      if (updated.quest && !updated.quest.completed && !updated.quest.expired) {
        const remaining = getShadowTimeRemaining(updated.quest);
        setTimeRemaining(remaining);
      } else {
        setTimeRemaining(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state.quest?.id, state.quest?.completed, state.quest?.expired]);

  const onCalibratedQuestCompleted = useCallback(() => {
    const { shouldNotify, state: newState } = onQuestCompleted();
    setState(newState);

    if (shouldNotify) {
      setShowNotification(true);
      // Auto-reveal after notification delay
      setTimeout(() => {
        setIsRevealed(true);
      }, 3000);
    }
  }, []);

  const dismissNotification = useCallback(() => {
    setShowNotification(false);
  }, []);

  const completeShadow = useCallback(() => {
    const newState = completeShadowQuest();
    setState(newState);
  }, []);

  return {
    shadowQuest: state.quest,
    isRevealed,
    showNotification,
    timeRemaining,
    dismissNotification,
    onCalibratedQuestCompleted,
    completeShadow,
  };
}
