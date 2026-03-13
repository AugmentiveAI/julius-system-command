import { useState, useEffect, useCallback } from 'react';
import { useTickerEffect } from '@/contexts/TickerContext';
import { getGeneticState, GeneticState } from '@/utils/geneticEngine';
import { getSystemDate } from '@/utils/dayCycleEngine';

const GENETIC_HUD_KEY = 'systemGeneticHUD';

interface GeneticHUDData {
  lastColdExposure: string | null;
  lastMagnesium: string | null;
  sprintsToday: number;
  stressLevel: 1 | 2 | 3 | 4 | 5;
  sprintDate: string;
}

function loadHUDData(): GeneticHUDData {
  try {
    const stored = localStorage.getItem(GENETIC_HUD_KEY);
    if (stored) {
      const data: GeneticHUDData = JSON.parse(stored);
      const today = getSystemDate();
      if (data.sprintDate !== today) {
        data.sprintsToday = 0;
        data.sprintDate = today;
      }
      return data;
    }
  } catch { /* ignore */ }
  return {
    lastColdExposure: null,
    lastMagnesium: null,
    sprintsToday: 0,
    stressLevel: 2,
    sprintDate: getSystemDate(),
  };
}

function saveHUDData(data: GeneticHUDData) {
  localStorage.setItem(GENETIC_HUD_KEY, JSON.stringify(data));
}

export function useGeneticState() {
  const [hudData, setHudData] = useState<GeneticHUDData>(loadHUDData);
  const [geneticState, setGeneticState] = useState<GeneticState>(() =>
    getGeneticState(
      new Date(),
      hudData.lastColdExposure ? new Date(hudData.lastColdExposure) : null,
      hudData.lastMagnesium ? new Date(hudData.lastMagnesium) : null,
      hudData.sprintsToday,
      hudData.stressLevel,
    )
  );

  // Refresh genetic state every minute for real-time COMT phase transitions
  useEffect(() => {
    const refresh = () => {
      const data = loadHUDData();
      setHudData(data);
      setGeneticState(
        getGeneticState(
          new Date(),
          data.lastColdExposure ? new Date(data.lastColdExposure) : null,
          data.lastMagnesium ? new Date(data.lastMagnesium) : null,
          data.sprintsToday,
          data.stressLevel,
        )
      );
    };

    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Listen for storage events from other tabs / quest completions
  useEffect(() => {
    const handler = () => {
      const data = loadHUDData();
      setHudData(data);
      setGeneticState(
        getGeneticState(
          new Date(),
          data.lastColdExposure ? new Date(data.lastColdExposure) : null,
          data.lastMagnesium ? new Date(data.lastMagnesium) : null,
          data.sprintsToday,
          data.stressLevel,
        )
      );
    };
    window.addEventListener('storage', handler);
    window.addEventListener('geneticHudUpdate', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('geneticHudUpdate', handler);
    };
  }, []);

  const logSprint = useCallback(() => {
    setHudData(prev => {
      const next = { ...prev, sprintsToday: prev.sprintsToday + 1 };
      saveHUDData(next);
      window.dispatchEvent(new Event('geneticHudUpdate'));
      return next;
    });
  }, []);

  const logColdExposure = useCallback(() => {
    setHudData(prev => {
      const next = { ...prev, lastColdExposure: new Date().toISOString() };
      saveHUDData(next);
      window.dispatchEvent(new Event('geneticHudUpdate'));
      return next;
    });
  }, []);

  const logMagnesium = useCallback(() => {
    setHudData(prev => {
      const next = { ...prev, lastMagnesium: new Date().toISOString() };
      saveHUDData(next);
      window.dispatchEvent(new Event('geneticHudUpdate'));
      return next;
    });
  }, []);

  return {
    geneticState,
    sprintsToday: hudData.sprintsToday,
    logSprint,
    logColdExposure,
    logMagnesium,
  };
}
