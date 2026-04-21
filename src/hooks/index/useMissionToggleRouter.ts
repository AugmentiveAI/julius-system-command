import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getSystemToast } from '@/utils/systemVoice';
import { recordCompletion } from '@/hooks/usePersuasion';
import { CalibratedQuest, QuestCompletionRecord } from '@/utils/questCalibration';
import { PersuasionTechnique } from '@/types/persuasionEngine';
import { Mission } from './missionTypes';

interface UseMissionToggleRouterArgs {
  missions: Mission[];

  // Protocol quest dependencies
  quests: Array<{
    id: string;
    title: string;
    xp: number;
    completed: boolean;
    stat: string;
    geneticBonus?: { bonusXp?: number } | null;
  }>;
  toggleQuest: (id: string) => void;

  // Pillar dependencies
  pillar: {
    quests: Array<{ id: string; title: string; xp: number; stat: string }>;
    isCompleted: (id: string) => boolean;
    toggleQuest: (id: string) => void;
  };
  pillarStreak: {
    hasCompletedToday: boolean;
    recordAllPillarsComplete: () => number;
  };

  // Shadow quest
  shadowQuest: { id: string; title: string; rewardXP: number; completed: boolean; expired?: boolean } | null;
  completeShadow: () => void;

  // Calibrated
  calibration: { recommendedQuests: CalibratedQuest[] } | null;
  persuasionMap: Map<string, { technique: PersuasionTechnique | null; message?: string | null }>;
  setCompletedCalibratedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  saveCompletionRecord: (record: QuestCompletionRecord) => void;
  onCalibratedQuestCompleted: () => void;

  // Cross-cutting effects
  addCompletion: (entry: { questId: string; questTitle: string; xpEarned: number; completedAt: string; type: 'daily' }) => void;
  addXP: (xp: number) => void;
  rollForLoot: (stat: string, streak: number) => void;
  recordQuestForMastery: (id: string, title: string) => void;
  player: { streak: number; goal?: string };
}

/**
 * Discriminated-union dispatch for mission toggles.
 *
 * Routes by `mission.kind` with an exhaustive `never` safeguard at the end —
 * adding a new variant to `Mission` will fail to compile until handled here.
 */
export function useMissionToggleRouter(args: UseMissionToggleRouterArgs) {
  const {
    missions, quests, toggleQuest,
    pillar, pillarStreak,
    shadowQuest, completeShadow,
    calibration, persuasionMap, setCompletedCalibratedIds, saveCompletionRecord, onCalibratedQuestCompleted,
    addCompletion, addXP, rollForLoot, recordQuestForMastery, player,
  } = args;
  const { toast } = useToast();

  return useCallback((id: string) => {
    const mission = missions.find(m => m.id === id);
    if (!mission) return;

    switch (mission.kind) {
      case 'protocol': {
        const protocolQuest = quests.find(q => q.id === id);
        if (!protocolQuest) return;
        if (!protocolQuest.completed) {
          const xp = protocolQuest.xp + (protocolQuest.geneticBonus?.bonusXp || 0);
          addCompletion({ questId: id, questTitle: protocolQuest.title, xpEarned: xp, completedAt: new Date().toISOString(), type: 'daily' });
          addXP(xp);
          rollForLoot(protocolQuest.stat, player.streak);
          recordQuestForMastery(id, protocolQuest.title);
        }
        toggleQuest(id);
        return;
      }

      case 'pillar': {
        const pq = pillar.quests.find(q => q.id === mission.pillarId);
        if (!pq) return;
        if (!pillar.isCompleted(mission.pillarId)) {
          addCompletion({ questId: pq.id, questTitle: pq.title, xpEarned: pq.xp, completedAt: new Date().toISOString(), type: 'daily' });
          addXP(pq.xp);
          rollForLoot(pq.stat, player.streak);
          recordQuestForMastery(pq.id, pq.title);
        }
        pillar.toggleQuest(mission.pillarId);

        // Bonus XP if all pillars now complete (check based on pre-toggle state)
        const wasCompleted = pillar.isCompleted(mission.pillarId);
        if (!wasCompleted) {
          const othersDone = pillar.quests
            .filter(q => q.id !== mission.pillarId)
            .every(q => pillar.isCompleted(q.id));
          if (othersDone && !pillarStreak.hasCompletedToday) {
            const bonus = pillarStreak.recordAllPillarsComplete();
            if (bonus > 0) {
              addXP(bonus);
              toast(getSystemToast('pillarMastery', { goal: player.goal ?? '' }));
            }
          }
        }
        return;
      }

      case 'shadow': {
        if (!shadowQuest || shadowQuest.id !== id) return;
        if (shadowQuest.completed || shadowQuest.expired) return;
        completeShadow();
        addCompletion({
          questId: id,
          questTitle: shadowQuest.title,
          xpEarned: shadowQuest.rewardXP,
          completedAt: new Date().toISOString(),
          type: 'daily',
        });
        return;
      }

      case 'calibrated': {
        if (!calibration) return;
        const quest = calibration.recommendedQuests.find(q => q.id === id);
        if (!quest) return;
        setCompletedCalibratedIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
            saveCompletionRecord({ questId: id, completedAt: new Date().toISOString(), stat: quest.stat });
            addCompletion({ questId: id, questTitle: quest.title, xpEarned: quest.adjustedXP, completedAt: new Date().toISOString(), type: 'daily' });
            addXP(quest.adjustedXP);
            const persuasion = persuasionMap.get(id);
            recordCompletion(persuasion?.technique ?? null);
            onCalibratedQuestCompleted();
            rollForLoot(quest.stat, player.streak);
            recordQuestForMastery(id, quest.title);
          }
          return next;
        });
        return;
      }

      case 'emergency': {
        // Emergency missions are managed by EmergencyQuestBanner; toggling is a no-op here.
        return;
      }

      default: {
        // Exhaustiveness guard — adding a new Mission variant fails to compile here.
        const _exhaustive: never = mission;
        return _exhaustive;
      }
    }
  }, [
    missions, quests, toggleQuest, pillar, pillarStreak,
    shadowQuest, completeShadow,
    calibration, persuasionMap, setCompletedCalibratedIds, saveCompletionRecord, onCalibratedQuestCompleted,
    addCompletion, addXP, rollForLoot, recordQuestForMastery, player, toast,
  ]);
}
