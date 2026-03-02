import { useState, useEffect, useMemo } from 'react';
import { getSystemDate } from '@/utils/dayCycleEngine';
import { getSystemStrategy, SystemStrategy, CompletionRecord } from '@/utils/systemIntelligence';
import { getGeneticState } from '@/utils/geneticEngine';
import { analyzeResistance, CompletionEntry } from '@/utils/resistanceTracker';
import { PlayerStateCheck } from '@/types/playerState';
import { MainQuest } from '@/types/mainQuest';
import { PlayerStats } from '@/types/player';

const STATE_HISTORY_KEY = 'systemStateHistory';
const COMPLETION_HISTORY_KEY = 'systemCompletionHistory';
const MAIN_QUESTS_STORAGE_KEY = 'the-system-main-quests';
const PLAYER_STORAGE_KEY = 'the-system-player';
const GENETIC_HUD_KEY = 'systemGeneticHUD';
const START_DATE_KEY = 'systemStartDate';

function loadStateHistory(): PlayerStateCheck[] {
  try {
    const stored = localStorage.getItem(STATE_HISTORY_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [];
}

function loadLatestState(): PlayerStateCheck | null {
  const history = loadStateHistory();
  return history.length > 0 ? history[history.length - 1] : null;
}

function loadCompletionHistory(): CompletionRecord[] {
  try {
    const stored = localStorage.getItem(COMPLETION_HISTORY_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [];
}

function loadResistanceHistory(): CompletionEntry[] {
  try {
    const stored = localStorage.getItem(COMPLETION_HISTORY_KEY);
    if (stored) {
      const records: CompletionRecord[] = JSON.parse(stored);
      return records.map(r => ({
        questId: r.questId,
        category: (r.category || 'Discipline') as any,
        difficulty: 'C' as any,
        timeBlock: 'morning' as any,
        completedAt: r.completedAt,
        skipped: false,
      }));
    }
  } catch { /* ignore */ }
  return [];
}

function loadMilestones(): MainQuest[] {
  try {
    const stored = localStorage.getItem(MAIN_QUESTS_STORAGE_KEY);
    if (stored) {
      const state = JSON.parse(stored);
      return state.quests || [];
    }
  } catch { /* ignore */ }
  return [];
}

function loadPlayerStats(): { stats: PlayerStats; coldStreak: number; title: string } {
  try {
    const stored = localStorage.getItem(PLAYER_STORAGE_KEY);
    if (stored) {
      const player = JSON.parse(stored);
      return {
        stats: player.stats || { sales: 10, systems: 10, creative: 10, discipline: 10, network: 10, wealth: 10 },
        coldStreak: player.coldStreak ?? 0,
        title: player.title || 'E-Rank Hunter',
      };
    }
  } catch { /* ignore */ }
  return {
    stats: { sales: 10, systems: 10, creative: 10, discipline: 10, network: 10, wealth: 10 },
    coldStreak: 0,
    title: 'E-Rank Hunter',
  };
}

function loadGeneticHUD() {
  try {
    const stored = localStorage.getItem(GENETIC_HUD_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      const today = getSystemDate();
      if (data.sprintDate !== today) {
        data.sprintsToday = 0;
      }
      return data;
    }
  } catch { /* ignore */ }
  return { lastColdExposure: null, lastMagnesium: null, sprintsToday: 0, stressLevel: 2 };
}

export function getDayNumber(): number {
  const stored = localStorage.getItem(START_DATE_KEY);
  if (!stored) {
    localStorage.setItem(START_DATE_KEY, getSystemDate());
    return 1;
  }
  // Use PST-aware today to avoid UTC off-by-one
  const todayStr = getSystemDate(); // YYYY-MM-DD in PST
  const startMs = new Date(stored + 'T12:00:00').getTime();
  const todayMs = new Date(todayStr + 'T12:00:00').getTime();
  return Math.max(1, Math.round((todayMs - startMs) / (1000 * 60 * 60 * 24)) + 1);
}

export function useSystemStrategy(): { strategy: SystemStrategy; dayNumber: number; playerTitle: string } {
  const [strategy, setStrategy] = useState<SystemStrategy | null>(null);
  const dayNum = useMemo(() => getDayNumber(), []);
  const playerData = useMemo(() => loadPlayerStats(), []);

  useEffect(() => {
    const now = new Date();
    const hudData = loadGeneticHUD();
    const geneticState = getGeneticState(
      now,
      hudData.lastColdExposure ? new Date(hudData.lastColdExposure) : null,
      hudData.lastMagnesium ? new Date(hudData.lastMagnesium) : null,
      hudData.sprintsToday,
      hudData.stressLevel,
    );
    const resistanceEntries = loadResistanceHistory();
    const resistanceData = analyzeResistance(resistanceEntries);
    const completionHistory = loadCompletionHistory();
    const milestones = loadMilestones();
    const latestState = loadLatestState();
    const stateHistory = loadStateHistory();

    const result = getSystemStrategy(
      latestState,
      stateHistory,
      geneticState,
      resistanceData,
      completionHistory,
      milestones,
      now,
      playerData.stats,
      playerData.coldStreak,
    );

    setStrategy(result);
  }, [playerData]);

  const defaultStrategy: SystemStrategy = {
    dailyBrief: 'Initializing System Intelligence...',
    strategicFocus: 'Awaiting data.',
    questOverrides: [],
    xpModifiers: [],
    warnings: [],
    predictions: [],
    weeklyObjective: 'Complete daily scans to calibrate the System.',
    shadowMonarchProgress: 0,
  };

  return {
    strategy: strategy ?? defaultStrategy,
    dayNumber: dayNum,
    playerTitle: playerData.title,
  };
}
