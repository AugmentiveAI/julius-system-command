import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PreCommitment,
  getEveningPreCommitment,
  loadPreCommitment,
  savePreCommitment,
  loadProfile,
} from '@/utils/persuasionEngine';
import { QUEST_TEMPLATES } from '@/types/questDifficulty';

// ── Constants ────────────────────────────────────────────────────────

const PRECOMMIT_TRIGGER_KEY = 'systemPreCommitTriggerDate';
const STATE_HISTORY_KEY = 'systemStateHistory';

// ── Helpers ──────────────────────────────────────────────────────────

function isEveningWindow(): boolean {
  const hour = new Date().getHours();
  return hour >= 20 && hour < 22;
}

function hasTriggeredTonight(): boolean {
  try {
    const stored = localStorage.getItem(PRECOMMIT_TRIGGER_KEY);
    if (!stored) return false;
    return stored === new Date().toISOString().split('T')[0];
  } catch { return false; }
}

function markTriggeredTonight(): void {
  localStorage.setItem(PRECOMMIT_TRIGGER_KEY, new Date().toISOString().split('T')[0]);
}

function getCurrentMode(): 'push' | 'steady' | 'recover' | null {
  try {
    const stored = localStorage.getItem(STATE_HISTORY_KEY);
    if (!stored) return null;
    const checks = JSON.parse(stored);
    if (checks.length === 0) return null;
    const today = new Date().toISOString().split('T')[0];
    const todayChecks = checks.filter((c: any) =>
      new Date(c.timestamp).toISOString().split('T')[0] === today,
    );
    if (todayChecks.length > 0) return todayChecks[todayChecks.length - 1].systemRecommendation;
    return checks[checks.length - 1].systemRecommendation;
  } catch { return null; }
}

function isTodayCommitmentDate(commitment: PreCommitment | null): boolean {
  if (!commitment) return false;
  const today = new Date().toISOString().split('T')[0];
  return commitment.date === today && commitment.accepted === true;
}

// ── Hook ─────────────────────────────────────────────────────────────

export function usePreCommitment() {
  const [showModal, setShowModal] = useState(false);
  const [commitment, setCommitment] = useState<PreCommitment | null>(loadPreCommitment);

  const isRecovery = useMemo(() => getCurrentMode() === 'recover', []);
  const todayCommitment = useMemo(() =>
    isTodayCommitmentDate(commitment) ? commitment : null,
  [commitment]);

  // Check if we should trigger the evening modal
  useEffect(() => {
    if (!isEveningWindow() || hasTriggeredTonight()) return;

    // Don't show if there's already an active commitment for tomorrow
    const existing = loadPreCommitment();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    if (existing && existing.date === tomorrowStr && existing.accepted !== null) return;

    // Get available quests for pre-commitment
    const quests = QUEST_TEMPLATES
      .filter(t => isRecovery
        ? ['B', 'C'].includes(t.difficulty)
        : ['S', 'A'].includes(t.difficulty),
      )
      .map(t => ({
        id: t.id,
        name: t.name,
        category: t.category,
        difficulty: t.difficulty,
        xp: t.baseXP,
        estimatedMinutes: t.estimatedMinutes,
      }));

    if (quests.length === 0) return;

    const newCommitment = getEveningPreCommitment(quests, new Date(), isRecovery);
    if (newCommitment) {
      setCommitment(newCommitment);
      markTriggeredTonight();
      // Slight delay so page renders first
      setTimeout(() => setShowModal(true), 1500);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAccept = useCallback(() => {
    if (!commitment) return;
    const updated = {
      ...commitment,
      accepted: true,
      acceptedAt: new Date().toISOString(),
    };
    savePreCommitment(updated);
    setCommitment(updated);
    setShowModal(false);
  }, [commitment]);

  const handleRequestAlternative = useCallback(() => {
    if (!commitment || commitment.alternativeUsed) return;

    // Pick a different quest of same difficulty
    const currentId = commitment.questId;
    const candidates = QUEST_TEMPLATES
      .filter(t =>
        t.difficulty === commitment.questDifficulty &&
        t.id !== currentId,
      )
      .map(t => ({
        id: t.id,
        name: t.name,
        category: t.category,
        difficulty: t.difficulty,
        xp: t.baseXP,
        estimatedMinutes: t.estimatedMinutes,
      }));

    if (candidates.length === 0) return;
    const alt = candidates[Math.floor(Math.random() * candidates.length)];

    const updated: PreCommitment = {
      ...commitment,
      questId: alt.id,
      questName: alt.name,
      questCategory: alt.category,
      questXP: alt.xp,
      questEstimatedMinutes: alt.estimatedMinutes,
      alternativeUsed: true,
    };
    savePreCommitment(updated);
    setCommitment(updated);
  }, [commitment]);

  const handleDismiss = useCallback(() => {
    setShowModal(false);
  }, []);

  // Mark commitment as completed or broken
  const resolveCommitment = useCallback((completed: boolean) => {
    if (!commitment) return;
    const updated = { ...commitment, completed };
    savePreCommitment(updated);
    setCommitment(updated);

    // Update persuasion profile commitment tracking
    const profile = loadProfile();
    const eff = profile.techniqueEffectiveness.commitment_escalation;
    if (eff) {
      eff.timesUsed++;
      if (completed) eff.timesResultedInCompletion++;
      eff.effectivenessRate = eff.timesUsed > 0
        ? eff.timesResultedInCompletion / eff.timesUsed
        : 0.5;

      // Update commitmentConsistency trait
      if (eff.timesUsed >= 3) {
        if (eff.effectivenessRate >= 0.7) profile.playerProfile.commitmentConsistency = 'high';
        else if (eff.effectivenessRate >= 0.4) profile.playerProfile.commitmentConsistency = 'medium';
        else profile.playerProfile.commitmentConsistency = 'low';
      }

      localStorage.setItem('systemPersuasionProfile', JSON.stringify(profile));
    }
  }, [commitment]);

  return {
    showModal,
    commitment,
    todayCommitment,
    isRecovery,
    handleAccept,
    handleRequestAlternative,
    handleDismiss,
    resolveCommitment,
  };
}
