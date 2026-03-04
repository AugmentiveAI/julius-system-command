import React, { createContext, useContext, ReactNode } from 'react';
import { useHistory } from '@/hooks/useHistory';
import { QuestCompletionEntry, DaySummary, WeeklySummary } from '@/types/history';

interface HistoryContextType {
  addCompletion: (entry: Omit<QuestCompletionEntry, 'id'>) => void;
  daysSummary: DaySummary[];
  weeklySummary: WeeklySummary;
}

const HistoryContext = createContext<HistoryContextType | null>(null);

export const HistoryProvider = ({ children }: { children: ReactNode }) => {
  const { addCompletion, daysSummary, weeklySummary } = useHistory();

  return (
    <HistoryContext.Provider value={{ addCompletion, daysSummary, weeklySummary }}>
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistoryContext = () => {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistoryContext must be used within a HistoryProvider');
  }
  return context;
};
