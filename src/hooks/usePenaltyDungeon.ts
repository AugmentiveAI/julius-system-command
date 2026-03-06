import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dungeon, DungeonObjective } from '@/types/dungeon';
import { PENALTY_DUNGEON_TEMPLATE, PENALTY_STAT_REDUCTION } from '@/types/penaltyDungeon';
import { Player, getLowestStat } from '@/types/player';

interface UsePenaltyDungeonProps {
  player: Player;
  onStatReduction: (stat: string, amount: number) => void;
  onXPGained: (xp: number) => void;
  onPenaltyCleared: () => void;
  addNotification: (type: string, title: string, message: string, metadata?: Record<string, any>) => void;
}

export function usePenaltyDungeon({
  player,
  onStatReduction,
  onXPGained,
  onPenaltyCleared,
  addNotification,
}: UsePenaltyDungeonProps) {
  const { user } = useAuth();
  const [activePenalty, setActivePenalty] = useState<Dungeon | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [penaltyApplied, setPenaltyApplied] = useState(false);
  const [showFailure, setShowFailure] = useState(false);
  const creatingRef = useRef(false);

  // Check for existing penalty dungeon or create one
  useEffect(() => {
    if (!user || player.penalty.consecutiveZeroDays < 2) return;

    const checkOrCreate = async () => {
      // Check for existing active/available penalty dungeon
      const { data } = await supabase
        .from('dungeons')
        .select('*')
        .eq('user_id', user.id)
        .eq('dungeon_type', 'penalty')
        .in('status', ['active', 'available'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setActivePenalty(data[0] as unknown as Dungeon);
        return;
      }

      // No active penalty — create one
      if (creatingRef.current) return;
      creatingRef.current = true;

      const tpl = PENALTY_DUNGEON_TEMPLATE;
      const objectives: DungeonObjective[] = tpl.objectives.map((title, i) => ({
        id: `penalty-obj-${i}`,
        title,
        completed: false,
      }));

      const expiresAt = new Date(Date.now() + tpl.timeLimitMinutes! * 60 * 1000).toISOString();

      const { data: created } = await supabase
        .from('dungeons')
        .insert({
          user_id: user.id,
          dungeon_type: 'penalty',
          title: tpl.title,
          description: tpl.description,
          difficulty: tpl.difficulty,
          xp_reward: tpl.baseXP,
          time_limit_minutes: tpl.timeLimitMinutes,
          objectives: objectives as any,
          genetic_modifiers: tpl.geneticModifiers as any,
          unlocked_by: { condition: tpl.unlockCondition } as any,
          expires_at: expiresAt,
          started_at: new Date().toISOString(),
          status: 'active',
        })
        .select()
        .single();

      if (created) {
        setActivePenalty(created as unknown as Dungeon);
        addNotification('penalty_warning', 'PENALTY QUEST ACTIVATED', 'You have 4 hours to complete the penalty objectives or suffer permanent stat reduction.', {});
      }
      creatingRef.current = false;
    };

    checkOrCreate();
  }, [user, player.penalty.consecutiveZeroDays, addNotification]);

  // Countdown timer
  useEffect(() => {
    if (!activePenalty || activePenalty.status === 'completed') return;

    const tick = () => {
      if (!activePenalty.expires_at) return;
      const remaining = Math.max(0, new Date(activePenalty.expires_at).getTime() - Date.now());
      setTimeRemaining(remaining);

      if (remaining <= 0 && !penaltyApplied) {
        handleFailure();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activePenalty, penaltyApplied]);

  const handleFailure = useCallback(async () => {
    if (penaltyApplied || !activePenalty || !user) return;
    setPenaltyApplied(true);
    setShowFailure(true);

    const lowestStat = getLowestStat(player.stats);
    onStatReduction(lowestStat, PENALTY_STAT_REDUCTION);

    addNotification(
      'penalty_applied',
      'PENALTY APPLIED',
      `You failed the Penalty Quest. ${lowestStat.charAt(0).toUpperCase() + lowestStat.slice(1)} permanently reduced by ${PENALTY_STAT_REDUCTION}.`,
      { stat: lowestStat, reduction: PENALTY_STAT_REDUCTION }
    );

    await supabase
      .from('dungeons')
      .update({ status: 'failed' })
      .eq('id', activePenalty.id);

    // Auto-dismiss failure screen after 5 seconds
    setTimeout(() => {
      setShowFailure(false);
      setActivePenalty(null);
    }, 5000);
  }, [penaltyApplied, activePenalty, user, player.stats, onStatReduction, addNotification]);

  const completeObjective = useCallback(async (objectiveId: string) => {
    if (!activePenalty || !user) return;

    const objectives = (activePenalty.objectives as DungeonObjective[]).map(o =>
      o.id === objectiveId ? { ...o, completed: true } : o
    );
    const allDone = objectives.every(o => o.completed);

    const { data } = await supabase
      .from('dungeons')
      .update({
        objectives: objectives as any,
        status: allDone ? 'completed' : 'active',
        completed_at: allDone ? new Date().toISOString() : null,
      })
      .eq('id', activePenalty.id)
      .select()
      .single();

    if (data) {
      const updated = data as unknown as Dungeon;
      setActivePenalty(updated);

      if (allDone) {
        onXPGained(activePenalty.xp_reward);
        onPenaltyCleared();
        addNotification('penalty_survived', 'PENALTY QUEST SURVIVED', `You completed the penalty quest. ${activePenalty.xp_reward} XP claimed. Consecutive zero days reset.`, { xp: activePenalty.xp_reward });
        setTimeout(() => setActivePenalty(null), 2000);
      }
    }
  }, [activePenalty, user, onXPGained, onPenaltyCleared, addNotification]);

  const isPenaltyActive = !!activePenalty && activePenalty.status !== 'completed';
  const lowestStat = getLowestStat(player.stats);

  return {
    activePenalty,
    isPenaltyActive,
    timeRemaining,
    completeObjective,
    showFailure,
    lowestStat,
    penaltyReduction: PENALTY_STAT_REDUCTION,
  };
}
