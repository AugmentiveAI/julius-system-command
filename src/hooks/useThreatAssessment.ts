import { useState, useEffect, useCallback, useMemo } from 'react';
import { Threat, ThreatAssessment, ThreatCategory, ThreatContext, ThreatLevel } from '@/types/threat';
import { evaluateThreats, getOverallLevel } from '@/utils/threatEngine';
import { usePlayer } from '@/hooks/usePlayer';
import { useProtocolQuests } from '@/hooks/useProtocolQuests';
import { useTrainingLog } from '@/hooks/useTrainingLog';
import { useGeneticState } from '@/hooks/useGeneticState';
import { getSystemDate } from '@/utils/dayCycleEngine';

export function useThreatAssessment() {
  const [assessment, setAssessment] = useState<ThreatAssessment | null>(null);
  const { player } = usePlayer();
  const { quests } = useProtocolQuests();
  const { fatigueAccumulation } = useTrainingLog();
  const { geneticState, sprintsToday } = useGeneticState();

  const buildContext = useCallback((): ThreatContext => {
    const now = new Date();
    const hour = now.getHours();
    const completedToday = quests.filter(q => q.completed).length;

    // Check consecutive zero days from penalty state
    const consecutiveZeroDays = player.penalty?.consecutiveZeroDays ?? 0;

    // Check penalty dungeon active
    let penaltyDungeonActive = false;
    let penaltyTimeRemaining: string | undefined;
    try {
      // Simple check via localStorage or we rely on the penalty state
      penaltyDungeonActive = consecutiveZeroDays >= 2;
    } catch { /* ignore */ }

    // Quest completions last 3 days
    let questsCompletedLast3Days = completedToday;
    try {
      const raw = localStorage.getItem('systemCalibratedCompletions');
      if (raw) {
        const history = JSON.parse(raw);
        const today = getSystemDate();
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        questsCompletedLast3Days = history.filter((c: any) => {
          if (!c.completedAt) return false;
          return new Date(c.completedAt) >= threeDaysAgo;
        }).length;
      }
    } catch { /* ignore */ }

    // Days since last outreach — defaults to safe value (no trigger) until pipeline tracking exists
    let daysSinceLastOutreach = 0;
    try {
      const raw = localStorage.getItem('systemLastOutreach');
      if (raw) {
        const lastDate = new Date(raw);
        daysSinceLastOutreach = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      }
    } catch { /* ignore */ }

    // Genetic phase mapping
    let geneticPhase = 'stable';
    if (hour >= 8 && hour < 12) geneticPhase = 'peak';
    else if (hour >= 14 && hour < 17) geneticPhase = 'dip';
    else if (hour >= 17) geneticPhase = 'recovery';

    // Deep work — check if any high-cognition quests completed
    let deepWorkCompletedToday = 0;
    try {
      const raw = localStorage.getItem('systemCalibratedCompletions');
      if (raw) {
        const history = JSON.parse(raw);
        const today = getSystemDate();
        deepWorkCompletedToday = history.filter((c: any) =>
          c.completedAt?.startsWith(today) && (c.category === 'revenue' || c.category === 'systems')
        ).length;
      }
    } catch { /* ignore */ }

    return {
      currentHour: hour,
      questsCompletedToday: completedToday,
      questsTotalToday: quests.length,
      streak: player.streak,
      coldStreak: player.coldStreak ?? 0,
      fatigueAccumulation,
      geneticPhase,
      consecutiveZeroDays,
      penaltyDungeonActive,
      penaltyTimeRemaining,
      daysSinceLastOutreach,
      questsCompletedLast3Days,
      deepWorkCompletedToday,
      attemptingHighCognitionTask: false, // Can't detect this passively
      daysToExitDeadline: 999, // Safe default — won't trigger until deadline tracking built
      currentMRR: 0,
      targetMRR: 10000,
      sprintsToday,
    };
  }, [player, quests, fatigueAccumulation, geneticState, sprintsToday]);

  // Run assessment every 60 seconds
  useEffect(() => {
    const assess = () => {
      const ctx = buildContext();
      const threats = evaluateThreats(ctx);
      const overallLevel = getOverallLevel(threats);
      setAssessment({
        overallLevel,
        threats,
        lastUpdated: new Date().toISOString(),
      });
    };

    assess();
    const interval = setInterval(assess, 60_000);
    return () => clearInterval(interval);
  }, [buildContext]);

  const threats = assessment?.threats ?? [];
  const overallLevel: ThreatLevel = assessment?.overallLevel ?? 'nominal';

  const getThreatsByCategory = useCallback(
    (cat: ThreatCategory) => threats.filter(t => t.category === cat),
    [threats]
  );

  return {
    assessment,
    overallLevel,
    threats,
    hasCriticalThreat: threats.some(t => t.level === 'critical'),
    hasAnyThreat: threats.length > 0,
    getThreatsByCategory,
  };
}
