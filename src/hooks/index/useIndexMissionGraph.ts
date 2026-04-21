import { useMemo } from 'react';
import { reorderQuestsWithJarvis } from '@/utils/jarvisQuestReorder';
import { CalibratedQuest, QuestCompletionRecord, calibrateQuests } from '@/utils/questCalibration';
import { PlayerStateCheck } from '@/types/playerState';
import { QuestTimeBlock } from '@/types/quests';
import { useProtocolQuests } from '@/hooks/useProtocolQuests';
import { usePillarQuests } from '@/hooks/usePillarQuests';
import { useShadowQuest } from '@/hooks/useShadowQuest';
import { usePersuasion } from '@/hooks/usePersuasion';
import { useAnticipationSlice, useGeneticPhaseSlice } from '@/contexts/jarvisSlices';
import { loadCachedResistance } from '@/utils/resistanceTracker';
import {
  Mission,
  LegacyMissionView,
  toLegacyMission,
} from './missionTypes';

interface UseIndexMissionGraphArgs {
  activeCheck: PlayerStateCheck | null;
  completedCalibratedIds: Set<string>;
  /** Caller-supplied history readers — kept side-effect free for testing. */
  getStateHistory: () => PlayerStateCheck[];
  getCompletionHistory: () => QuestCompletionRecord[];
}

function assignTimeBlock(quest: CalibratedQuest): QuestTimeBlock {
  if (quest.isBreak) return 'morning';
  switch (quest.stat) {
    case 'discipline': return quest.id.includes('walk') || quest.id.includes('cold') ? 'morning' : 'evening';
    case 'systems': return quest.id.includes('second-wind') ? 'evening' : 'morning';
    case 'sales':
    case 'network': return 'midday';
    case 'wealth': return 'evening';
    case 'creative': return 'afternoon';
    default: return 'afternoon';
  }
}

/**
 * Builds the unified, ordered list of missions that show up in `<MissionBatch />`.
 *
 * Pure derivation — every input is either a hook output or a memoized arg.
 * Returned missions are typed as the discriminated `Mission` union AND
 * exposed as `LegacyMissionView` so existing presentational components
 * that read `.type` still work without modification.
 */
export function useIndexMissionGraph({
  activeCheck,
  completedCalibratedIds,
  getStateHistory,
  getCompletionHistory,
}: UseIndexMissionGraphArgs) {
  const { quests } = useProtocolQuests();
  const pillar = usePillarQuests();
  const anticipation = useAnticipationSlice();
  const geneticPhase = useGeneticPhaseSlice();

  const calibration = useMemo(() => {
    if (!activeCheck) return null;
    return calibrateQuests(activeCheck, getStateHistory(), getCompletionHistory(), new Date());
  }, [activeCheck, getStateHistory, getCompletionHistory]);

  const resistanceData = useMemo(() => loadCachedResistance(), []);
  const persuasionMap = usePersuasion(
    calibration?.recommendedQuests ?? [],
    activeCheck ?? null,
    resistanceData,
  );

  const shadowMode = activeCheck?.systemRecommendation === 'recover'
    ? 'recovery' as const
    : activeCheck?.systemRecommendation ?? null;

  const {
    shadowQuest,
    isRevealed: shadowRevealed,
    onCalibratedQuestCompleted,
    completeShadow,
  } = useShadowQuest(shadowMode, resistanceData);

  const missions = useMemo<Mission[]>(() => {
    const list: Mission[] = [];

    quests.forEach(q => {
      const totalXp = q.xp + (q.geneticBonus?.bonusXp || 0);
      list.push({
        kind: 'protocol',
        id: q.id,
        title: q.title,
        xp: totalXp,
        completed: q.completed,
        badge: q.isRehab
          ? { label: 'RECOVERY', color: 'text-green-400 border-green-500/30 bg-green-500/10' }
          : null,
        timeBlock: q.timeBlock,
      });
    });

    if (calibration) {
      const reordered = reorderQuestsWithJarvis(calibration.recommendedQuests, anticipation, geneticPhase);
      reordered.forEach(q => {
        const persuasion = persuasionMap.get(q.id);
        list.push({
          kind: 'calibrated',
          id: q.id,
          title: q.title,
          xp: q.adjustedXP,
          completed: completedCalibratedIds.has(q.id),
          persuasionMessage: persuasion?.message ?? null,
          timeBlock: assignTimeBlock(q),
        });
      });
    }

    pillar.quests.forEach(q => {
      const pillarColor = q.pillar === 'mind'
        ? 'text-blue-400 border-blue-500/30 bg-blue-500/10'
        : q.pillar === 'body'
        ? 'text-green-400 border-green-500/30 bg-green-500/10'
        : 'text-purple-400 border-purple-500/30 bg-purple-500/10';
      list.push({
        kind: 'pillar',
        id: `pillar-${q.id}`,
        pillarId: q.id,
        title: q.title,
        xp: q.xp,
        completed: pillar.isCompleted(q.id),
        badge: { label: q.pillar.toUpperCase(), color: pillarColor },
      });
    });

    if (shadowQuest && shadowRevealed) {
      list.push({
        kind: 'shadow',
        id: shadowQuest.id,
        title: shadowQuest.title,
        xp: shadowQuest.rewardXP,
        completed: shadowQuest.completed,
        badge: { label: 'SHADOW INTEL', color: 'text-secondary border-secondary/30 bg-secondary/10' },
      });
    }

    return list;
  }, [quests, calibration, pillar, shadowQuest, shadowRevealed, completedCalibratedIds, persuasionMap, anticipation, geneticPhase]);

  const legacyMissions = useMemo<LegacyMissionView[]>(
    () => missions.map(toLegacyMission),
    [missions],
  );

  return {
    missions,
    legacyMissions,
    calibration,
    persuasionMap,
    shadowQuest,
    shadowRevealed,
    completeShadow,
    onCalibratedQuestCompleted,
  };
}
