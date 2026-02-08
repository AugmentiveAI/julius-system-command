import { useMemo } from 'react';
import {
  selectTechnique,
  recordTechniqueOutcome,
  generateVariableReward,
  loadProfile,
  TechniqueSelection,
  VariableReward,
} from '@/utils/persuasionEngine';
import { PersuasionTechnique } from '@/types/persuasionEngine';
import { CalibratedQuest } from '@/utils/questCalibration';
import { PlayerStateCheck } from '@/types/playerState';
import { getGeneticState, COMTPhase } from '@/utils/geneticEngine';
import { getDayNumber } from '@/hooks/useSystemStrategy';
import { ResistanceAnalysis } from '@/utils/resistanceTracker';

// ── Types ────────────────────────────────────────────────────────────

export type FramingColor = 'loss' | 'identity' | 'variable' | 'scarcity' | 'default';

export interface QuestPersuasionData {
  message: string | null;
  technique: PersuasionTechnique | null;
  framingColor: FramingColor;
  variableReward: VariableReward;
  isSubtle: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────

function shouldShowMessage(quest: CalibratedQuest, isResistanceQuest: boolean): boolean {
  // Always show for resistance quests
  if (isResistanceQuest) return true;
  // Always show for S-rank
  if (quest.difficulty === 'S') return true;
  // Rarely show for D-rank (15%)
  if (quest.difficulty === 'D') return Math.random() < 0.15;
  // ~65% for everything else
  return Math.random() < 0.65;
}

function getFramingColor(technique: PersuasionTechnique | null): FramingColor {
  if (!technique) return 'default';
  switch (technique) {
    case 'loss_aversion':
    case 'sunk_cost_leverage':
      return 'loss';
    case 'identity_framing':
    case 'fresh_start_effect':
      return 'identity';
    case 'variable_reward':
      return 'variable';
    case 'scarcity_window':
      return 'scarcity';
    default:
      return 'default';
  }
}

function getCOMTPhase(now: Date): COMTPhase {
  const hudRaw = localStorage.getItem('systemGeneticHUD');
  let hudData: { lastColdExposure: string | null; lastMagnesium: string | null; sprintsToday: number; stressLevel: number } = { lastColdExposure: null, lastMagnesium: null, sprintsToday: 0, stressLevel: 2 };
  try {
    if (hudRaw) hudData = JSON.parse(hudRaw);
  } catch { /* ignore */ }
  const state = getGeneticState(
    now,
    hudData.lastColdExposure ? new Date(hudData.lastColdExposure) : null,
    hudData.lastMagnesium ? new Date(hudData.lastMagnesium) : null,
    hudData.sprintsToday,
    hudData.stressLevel as 1 | 2 | 3 | 4 | 5,
  );
  return state.comtPhase;
}

function getTimeBlock(hour: number): string {
  if (hour >= 5 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 18) return 'afternoon';
  return 'evening';
}

// ── Main Hook ────────────────────────────────────────────────────────

export function usePersuasion(
  quests: CalibratedQuest[],
  playerState: PlayerStateCheck | null,
  resistanceData: ResistanceAnalysis | null,
): Map<string, QuestPersuasionData> {
  return useMemo(() => {
    const map = new Map<string, QuestPersuasionData>();
    if (!playerState || quests.length === 0) return map;

    const now = new Date();
    const profile = loadProfile();
    const comtPhase = getCOMTPhase(now);
    const timeBlock = getTimeBlock(now.getHours());
    const dayNumber = getDayNumber();

    // Resistance quest IDs
    const resistanceQuestIds = new Set<string>();
    if (resistanceData) {
      for (const rp of resistanceData.hardAvoidanceQuests) {
        resistanceQuestIds.add(rp.questId);
      }
    }

    // Build extra vars for template filling
    const extraVars: Record<string, string | number> = {
      days: dayNumber,
      daysAgo: dayNumber,
      daysOld: dayNumber,
      weekNum: Math.ceil(dayNumber / 7),
      weeksRemaining: Math.max(0, Math.ceil((90 - dayNumber) / 7)),
      streak: 0,
      totalXP: 0,
    };

    // Load streak/xp from player storage
    try {
      const playerRaw = localStorage.getItem('the-system-player');
      if (playerRaw) {
        const p = JSON.parse(playerRaw);
        extraVars.streak = p.streak ?? 0;
        extraVars.streakXP = (p.streak ?? 0) * 10;
        extraVars.totalXP = p.totalXP ?? 0;
      }
    } catch { /* ignore */ }

    for (const quest of quests) {
      const isResistance = resistanceQuestIds.has(quest.id);
      const showMsg = shouldShowMessage(quest, isResistance);
      const variableReward = generateVariableReward(quest.adjustedXP);

      if (!showMsg && !variableReward.isActive) {
        map.set(quest.id, {
          message: null,
          technique: null,
          framingColor: 'default',
          variableReward,
          isSubtle: false,
        });
        continue;
      }

      let technique: PersuasionTechnique | null = null;
      let message: string | null = null;
      let isSubtle = false;

      if (showMsg) {
        const selection = selectTechnique(
          {
            questName: quest.title,
            questCategory: quest.category,
            difficulty: quest.difficulty,
            isResistanceQuest: isResistance,
            xp: quest.adjustedXP,
          },
          {
            mode: (playerState.systemRecommendation === 'recover' ? 'recovery' : playerState.systemRecommendation) as 'push' | 'steady' | 'recovery',
            compositeScore: playerState.compositeScore,
            comtPhase,
            timeBlock,
          },
          profile,
          now,
          extraVars,
        );
        technique = selection.technique;
        message = selection.message;
        isSubtle = selection.isSubtle;
      }

      map.set(quest.id, {
        message,
        technique,
        framingColor: getFramingColor(technique),
        variableReward,
        isSubtle,
      });
    }

    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quests, playerState, resistanceData]);
}

// ── Outcome Recording (exposed for Quests page) ──────────────────────

export function recordCompletion(technique: PersuasionTechnique | null, responseMinutes = 0): void {
  if (!technique) return;
  recordTechniqueOutcome(technique, true, responseMinutes);
}

export function recordSkip(technique: PersuasionTechnique | null, responseMinutes = 0): void {
  if (!technique) return;
  recordTechniqueOutcome(technique, false, responseMinutes);
}
