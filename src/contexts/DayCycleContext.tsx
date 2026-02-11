import React, { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { useDayCycle, DayCycleInfo } from '@/hooks/useDayCycle';
import { DayArchiveEntry } from '@/utils/dayCycleEngine';

const DayCycleContext = createContext<DayCycleInfo | null>(null);

interface DayCycleProviderProps {
  children: ReactNode;
  getCurrentDayData: () => {
    questsCompleted: number;
    questsTotal: number;
    xpEarned: number;
    mode: string;
    sprintsCompleted: number;
  };
}

export const DayCycleProvider = ({ children, getCurrentDayData }: DayCycleProviderProps) => {
  const dayCycle = useDayCycle(getCurrentDayData);

  return (
    <DayCycleContext.Provider value={dayCycle}>
      {children}
    </DayCycleContext.Provider>
  );
};

export const useDayCycleContext = (): DayCycleInfo => {
  const context = useContext(DayCycleContext);
  if (!context) {
    throw new Error('useDayCycleContext must be used within a DayCycleProvider');
  }
  return context;
};
