import { useState, useEffect, useCallback, useRef } from 'react';

interface RestTimerState {
  isRunning: boolean;
  secondsRemaining: number;
  totalSeconds: number;
}

export function useRestTimer(defaultSeconds = 120) {
  const [state, setState] = useState<RestTimerState>({
    isRunning: false,
    secondsRemaining: defaultSeconds,
    totalSeconds: defaultSeconds,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback((seconds?: number) => {
    clearTimer();
    const duration = seconds ?? defaultSeconds;
    setState({ isRunning: true, secondsRemaining: duration, totalSeconds: duration });

    intervalRef.current = setInterval(() => {
      setState(prev => {
        if (prev.secondsRemaining <= 1) {
          clearTimer();
          // Vibrate if available
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          return { ...prev, isRunning: false, secondsRemaining: 0 };
        }
        return { ...prev, secondsRemaining: prev.secondsRemaining - 1 };
      });
    }, 1000);
  }, [defaultSeconds, clearTimer]);

  const stop = useCallback(() => {
    clearTimer();
    setState(prev => ({ ...prev, isRunning: false }));
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setState({ isRunning: false, secondsRemaining: defaultSeconds, totalSeconds: defaultSeconds });
  }, [defaultSeconds, clearTimer]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return {
    ...state,
    start,
    stop,
    reset,
    progress: state.totalSeconds > 0
      ? ((state.totalSeconds - state.secondsRemaining) / state.totalSeconds) * 100
      : 0,
  };
}
