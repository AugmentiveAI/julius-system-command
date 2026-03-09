import { useState, useEffect, useCallback, useRef } from 'react';
import { EmergencyQuest, EmergencyContext } from '@/types/emergencyQuest';
import { evaluateEmergencyTriggers } from '@/utils/emergencyQuestEngine';
import { useThreatAssessment } from '@/hooks/useThreatAssessment';
import { usePlayer } from '@/hooks/usePlayer';
import { useProtocolQuests } from '@/hooks/useProtocolQuests';
import { useGeneticState } from '@/hooks/useGeneticState';
import { getSystemDate } from '@/utils/dayCycleEngine';
import { hapticSuccess } from '@/utils/haptics';

const ACTIVE_KEY = 'systemActiveEmergency';
const HISTORY_KEY = 'systemEmergencyHistory';
const COUNT_KEY = 'systemEmergencyCountToday';

function loadActive(): EmergencyQuest | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    const quest: EmergencyQuest = JSON.parse(raw);
    // Clear if from a different day
    if (!quest.triggeredAt.startsWith(getSystemDate())) {
      localStorage.removeItem(ACTIVE_KEY);
      return null;
    }
    return quest;
  } catch { return null; }
}

function loadHistory(): EmergencyQuest[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function getCountToday(): number {
  try {
    const raw = localStorage.getItem(COUNT_KEY);
    if (!raw) return 0;
    const data = JSON.parse(raw);
    if (data.date !== getSystemDate()) return 0;
    return data.count;
  } catch { return 0; }
}

function incrementCount() {
  const count = getCountToday() + 1;
  localStorage.setItem(COUNT_KEY, JSON.stringify({ date: getSystemDate(), count }));
}

export function useEmergencyQuests() {
  const [activeEmergency, setActiveEmergency] = useState<EmergencyQuest | null>(loadActive);
  const [emergencyHistory, setEmergencyHistory] = useState<EmergencyQuest[]>(loadHistory);
  const [showOverlay, setShowOverlay] = useState(false);

  const { threats } = useThreatAssessment();
  const { player, addXP, reduceStat } = usePlayer();
  const { quests } = useProtocolQuests();
  const { geneticState, sprintsToday } = useGeneticState();

  // Persist active emergency
  useEffect(() => {
    if (activeEmergency) {
      localStorage.setItem(ACTIVE_KEY, JSON.stringify(activeEmergency));
    } else {
      localStorage.removeItem(ACTIVE_KEY);
    }
  }, [activeEmergency]);

  // Persist history
  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(emergencyHistory.slice(-50)));
  }, [emergencyHistory]);

  // Build context
  const buildContext = useCallback((): EmergencyContext => {
    const now = new Date();
    const hour = now.getHours();
    const completedToday = quests.filter(q => q.completed).length;

    let lastQuestMinAgo = 999;
    try {
      const raw = localStorage.getItem('systemCalibratedCompletions');
      if (raw) {
        const history = JSON.parse(raw);
        const today = getSystemDate();
        const todayCompletions = history.filter((c: any) => c.completedAt?.startsWith(today));
        if (todayCompletions.length > 0) {
          const lastTime = new Date(todayCompletions[todayCompletions.length - 1].completedAt);
          lastQuestMinAgo = Math.round((now.getTime() - lastTime.getTime()) / 60_000);
        }
      }
    } catch { /* ignore */ }

    let deepWorkToday = 0;
    try {
      const raw = localStorage.getItem('systemCalibratedCompletions');
      if (raw) {
        const history = JSON.parse(raw);
        const today = getSystemDate();
        deepWorkToday = history.filter((c: any) =>
          c.completedAt?.startsWith(today) && (c.category === 'revenue' || c.category === 'systems')
        ).length;
      }
    } catch { /* ignore */ }

    // Weekly XP — approximate from current player
    const weeklyXP = player.currentXP;
    const weeklyTargetXP = 750; // Default weekly target

    let geneticPhase = 'stable';
    if (hour >= 8 && hour < 12) geneticPhase = 'peak';
    else if (hour >= 14 && hour < 17) geneticPhase = 'dip';
    else if (hour >= 17) geneticPhase = 'recovery';

    return {
      currentHour: hour,
      questsCompletedToday: completedToday,
      streak: player.streak,
      consecutiveZeroDays: player.penalty?.consecutiveZeroDays ?? 0,
      penaltyDungeonActive: (player.penalty?.consecutiveZeroDays ?? 0) >= 2,
      geneticPhase,
      deepWorkCompletedToday: deepWorkToday,
      lastQuestCompletedMinutesAgo: lastQuestMinAgo,
      emergencyQuestActiveToday: !!activeEmergency,
      emergencyCountToday: getCountToday(),
      dayOfWeek: now.getDay(),
      weeklyXP,
      weeklyTargetXP,
      hasCriticalStreakThreat: threats.some(t => t.category === 'streak' && t.level === 'critical'),
      hasCriticalPipelineThreat: threats.some(t => t.category === 'pipeline' && t.level === 'critical'),
      sprintsToday,
    };
  }, [player, quests, threats, activeEmergency, sprintsToday]);

  // Check triggers every 60s
  useEffect(() => {
    const check = () => {
      if (activeEmergency) return;
      const ctx = buildContext();
      const quest = evaluateEmergencyTriggers(ctx);
      if (quest) {
        setActiveEmergency(quest);
        setShowOverlay(true);
        incrementCount();
        hapticSuccess();
      }
    };

    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [buildContext, activeEmergency]);

  // Auto-check expiration
  useEffect(() => {
    if (!activeEmergency) return;
    const checkExpiration = () => {
      if (activeEmergency.status === 'active' && new Date() > new Date(activeEmergency.expiresAt)) {
        failEmergency();
      }
    };
    const interval = setInterval(checkExpiration, 10_000);
    return () => clearInterval(interval);
  }, [activeEmergency]);

  const acceptEmergency = useCallback(() => {
    setActiveEmergency(prev => prev ? { ...prev, status: 'active' } : null);
    setShowOverlay(false);
  }, []);

  const completeObjective = useCallback((objectiveId: string) => {
    setActiveEmergency(prev => {
      if (!prev) return null;
      const updated = {
        ...prev,
        objectives: prev.objectives.map(obj =>
          obj.id === objectiveId ? { ...obj, completed: true } : obj
        ),
      };
      const allDone = updated.objectives.every(o => o.completed);
      if (allDone) {
        // Complete the quest
        addXP(updated.xpReward);
        hapticSuccess();
        const completed: EmergencyQuest = { ...updated, status: 'completed' };
        setEmergencyHistory(h => [...h, completed]);
        setTimeout(() => setActiveEmergency(null), 100);
        return completed;
      }
      return updated;
    });
  }, [addXP]);

  const failEmergency = useCallback(() => {
    if (!activeEmergency) return;
    // Apply penalty
    if (activeEmergency.penalty) {
      const p = activeEmergency.penalty;
      if (p.type === 'stat_loss' && p.stat) {
        reduceStat(p.stat, p.amount);
      }
      if (p.type === 'xp_loss') {
        // Can't subtract XP easily, so just skip
      }
    }
    const failed: EmergencyQuest = { ...activeEmergency, status: 'failed' };
    setEmergencyHistory(h => [...h, failed]);
    setActiveEmergency(null);
  }, [activeEmergency, reduceStat]);

  const completionRate = emergencyHistory.length > 0
    ? emergencyHistory.filter(e => e.status === 'completed').length / emergencyHistory.length
    : 0;

  return {
    activeEmergency,
    emergencyHistory,
    hasActiveEmergency: !!activeEmergency && activeEmergency.status === 'active',
    showOverlay,
    acceptEmergency,
    completeObjective,
    failEmergency,
    completionRate,
    dismissOverlay: () => setShowOverlay(false),
  };
}
