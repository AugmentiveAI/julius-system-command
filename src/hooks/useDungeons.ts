import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/hooks/usePlayer';
import {
  Dungeon, DungeonType, DungeonStatus, DungeonTemplate,
  ALL_DUNGEON_TEMPLATES, DungeonObjective,
} from '@/types/dungeon';

function checkUnlockConditions(
  template: DungeonTemplate,
  playerLevel: number,
  playerStreak: number,
  weeklyCompletions: number,
  shadowCount: number,
): boolean {
  if (template.minLevel && playerLevel < template.minLevel) return false;
  if (template.minStreak && playerStreak < template.minStreak) return false;
  if (template.minWeeklyCompletions && weeklyCompletions < template.minWeeklyCompletions) return false;
  // Special: Systems Architect requires 3+ automations
  if (template.title === 'The Systems Architect' && shadowCount < 3) return false;
  // Special: Automation Empire requires 5+ shadows
  if (template.title === 'The Automation Empire Gate' && shadowCount < 5) return false;
  return true;
}

export function useDungeons() {
  const { user } = useAuth();
  const { player } = usePlayer();
  const [dungeons, setDungeons] = useState<Dungeon[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch dungeons
  useEffect(() => {
    if (!user) { setDungeons([]); setLoading(false); return; }
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('dungeons')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setDungeons((data as unknown as Dungeon[] | null) || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  // Get available dungeon templates based on player state
  const getAvailableTemplates = useCallback(async () => {
    if (!user) return [];

    // Get weekly quest completions
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data: weeklyData } = await supabase
      .from('quest_history')
      .select('id')
      .eq('user_id', user.id)
      .gte('completed_at', weekAgo.toISOString());
    const weeklyCompletions = weeklyData?.length || 0;

    // Get shadow count
    const { data: shadowData } = await supabase
      .from('shadow_army')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active');
    const shadowCount = shadowData?.length || 0;

    // Filter templates by unlock conditions
    const activeDungeonTitles = new Set(
      dungeons.filter(d => d.status === 'active' || d.status === 'available').map(d => d.title)
    );

    return ALL_DUNGEON_TEMPLATES.filter(t => {
      // Don't show duplicates of already active/available dungeons
      if (activeDungeonTitles.has(t.title)) return false;
      return checkUnlockConditions(t, player.level, player.streak, weeklyCompletions, shadowCount);
    });
  }, [user, player, dungeons]);

  // Generate a dungeon from template
  const createDungeon = useCallback(async (template: DungeonTemplate) => {
    if (!user) return;

    const objectives: DungeonObjective[] = template.objectives.map((title, i) => ({
      id: `obj-${i}`,
      title,
      completed: false,
    }));

    const expiresAt = template.type === 'boss_fight'
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week
      : template.type === 'instant_dungeon' && template.timeLimitMinutes
        ? new Date(Date.now() + template.timeLimitMinutes * 60 * 1000).toISOString()
        : null;

    const { data, error } = await supabase
      .from('dungeons')
      .insert({
        user_id: user.id,
        dungeon_type: template.type,
        title: template.title,
        description: template.description,
        difficulty: template.difficulty,
        xp_reward: Math.round(template.baseXP * template.geneticModifiers.reduce((m, g) => m * g.multiplier, 1)),
        time_limit_minutes: template.timeLimitMinutes,
        objectives: objectives as any,
        genetic_modifiers: template.geneticModifiers as any,
        unlocked_by: { condition: template.unlockCondition } as any,
        expires_at: expiresAt,
        status: 'available',
      })
      .select()
      .single();

    if (data && !error) setDungeons(prev => [data as unknown as Dungeon, ...prev]);
    return { data, error };
  }, [user]);

  // Enter a dungeon
  const enterDungeon = useCallback(async (id: string) => {
    const dungeon = dungeons.find(d => d.id === id);
    if (!dungeon) return;

    const expiresAt = dungeon.time_limit_minutes
      ? new Date(Date.now() + dungeon.time_limit_minutes * 60 * 1000).toISOString()
      : dungeon.expires_at;

    const { data, error } = await supabase
      .from('dungeons')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
        expires_at: expiresAt,
      })
      .eq('id', id)
      .select()
      .single();

    if (data && !error) setDungeons(prev => prev.map(d => d.id === id ? (data as unknown as Dungeon) : d));
  }, [dungeons]);

  // Complete an objective
  const completeObjective = useCallback(async (dungeonId: string, objectiveId: string) => {
    const dungeon = dungeons.find(d => d.id === dungeonId);
    if (!dungeon) return;

    const objectives = (dungeon.objectives as DungeonObjective[]).map(o =>
      o.id === objectiveId ? { ...o, completed: true } : o
    );

    const allDone = objectives.every(o => o.completed);

    const { data, error } = await supabase
      .from('dungeons')
      .update({
        objectives: objectives as any,
        status: allDone ? 'completed' : 'active',
        completed_at: allDone ? new Date().toISOString() : null,
      })
      .eq('id', dungeonId)
      .select()
      .single();

    if (data && !error) setDungeons(prev => prev.map(d => d.id === dungeonId ? (data as unknown as Dungeon) : d));
    return { completed: allDone, xp: allDone ? dungeon.xp_reward : 0 };
  }, [dungeons]);

  // Abandon a dungeon
  const abandonDungeon = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('dungeons')
      .update({ status: 'failed' })
      .eq('id', id);
    if (!error) setDungeons(prev => prev.map(d => d.id === id ? { ...d, status: 'failed' as DungeonStatus } : d));
  }, []);

  const activeDungeons = dungeons.filter(d => d.status === 'active' || d.status === 'available');
  const completedDungeons = dungeons.filter(d => d.status === 'completed');

  return {
    dungeons,
    activeDungeons,
    completedDungeons,
    loading,
    getAvailableTemplates,
    createDungeon,
    enterDungeon,
    completeObjective,
    abandonDungeon,
  };
}
