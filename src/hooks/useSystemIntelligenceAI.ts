import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/hooks/usePlayer';
import { getSystemDate } from '@/utils/dayCycleEngine';
import { SystemIntelligence } from '@/types/systemIntelligence';

const CACHE_KEY = 'systemAIIntelligence';

function loadCached(): SystemIntelligence | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SystemIntelligence;
    // Only use cache from today
    if (data.generatedAt?.startsWith(getSystemDate())) return data;
    return null;
  } catch { return null; }
}

function gatherPlayerData(player: any) {
  const today = getSystemDate();
  const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const now = new Date();
  const pstNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const dayNum = pstNow.getDay();
  const dayType = dayNum >= 0 && dayNum <= 3 ? 'work' : 'free';

  // State history
  let stateHistory: any[] = [];
  try {
    const raw = localStorage.getItem('systemStateHistory');
    if (raw) stateHistory = JSON.parse(raw).slice(-7);
  } catch { /* ignore */ }

  // Resistance
  let resistanceData: any = {};
  try {
    const raw = localStorage.getItem('systemResistanceData');
    if (raw) resistanceData = JSON.parse(raw);
  } catch { /* ignore */ }

  // Today's quests
  let questsCompletedToday = 0;
  let questsTotalToday = 0;
  try {
    const raw = localStorage.getItem('the-system-protocol-quests');
    if (raw) {
      const data = JSON.parse(raw);
      const quests = data.quests || [];
      questsTotalToday = quests.length;
      questsCompletedToday = quests.filter((q: any) => q.completed).length;
    }
  } catch { /* ignore */ }

  // Pillar status
  let pillarStatus: any = {};
  try {
    const raw = localStorage.getItem('the-system-pillar-quests');
    if (raw) {
      const data = JSON.parse(raw);
      pillarStatus = {
        mind: data.completions?.[today]?.some((id: string) => id.includes('mind')) || false,
        body: data.completions?.[today]?.some((id: string) => id.includes('body')) || false,
        skill: data.completions?.[today]?.some((id: string) => id.includes('skill')) || false,
      };
    }
  } catch { /* ignore */ }

  // Day number
  let dayNumber = 1;
  try {
    const startDate = localStorage.getItem('systemStartDate');
    if (startDate) {
      const start = new Date(startDate + 'T12:00:00');
      const todayDate = new Date(today + 'T12:00:00');
      dayNumber = Math.max(1, Math.floor((todayDate.getTime() - start.getTime()) / 86400000) + 1);
    }
  } catch { /* ignore */ }

  // System mode
  let systemMode = 'steady';
  if (stateHistory.length > 0) {
    systemMode = stateHistory[stateHistory.length - 1].systemRecommendation || 'steady';
  }

  // Skills
  let unlockedSkills: any[] = [];
  try {
    const raw = localStorage.getItem('systemSkills');
    if (raw) {
      const skills = JSON.parse(raw);
      unlockedSkills = skills
        .filter((s: any) => s.unlocked)
        .map((s: any) => ({ name: s.name, category: s.category, effect: s.effect, level: s.level }));
    }
  } catch { /* ignore */ }

  return {
    level: player.level,
    totalXP: player.totalXP,
    currentXP: player.currentXP,
    xpToNextLevel: player.xpToNextLevel,
    streak: player.streak,
    coldStreak: player.coldStreak,
    stats: player.stats,
    goal: player.goal,
    dayNumber,
    systemMode,
    stateHistory,
    recentCompletions: [] as any[],
    shadowArmy: [] as any[],
    activeDungeons: [] as any[],
    training: null as any,
    resistanceData,
    dayOfWeek: dayOfWeek[dayNum],
    dayType,
    currentTime: pstNow.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    questsCompletedToday,
    questsTotalToday,
    pillarStatus,
    unlockedSkills,
    inventory: null as any, // Will be filled from DB
  };
}

export function useSystemIntelligenceAI() {
  const { user } = useAuth();
  const { player } = usePlayer();
  const [intelligence, setIntelligence] = useState<SystemIntelligence | null>(loadCached);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate on mount if no cached data for today
  useEffect(() => {
    if (!user || intelligence || loading) return;
    generate();
  }, [user]);

  const generate = useCallback(async () => {
    if (!user || loading) return;
    setLoading(true);
    setError(null);

    try {
      // Gather local data
      const playerData = gatherPlayerData(player);

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch recent completions, shadow army, dungeons, and training logs from DB in parallel
      const [completionsRes, shadowsRes, dungeonsRes, trainingRes] = await Promise.all([
        supabase
          .from('quest_history')
          .select('quest_title, xp_earned, type, completed_at')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(50),
        supabase
          .from('shadow_army')
          .select('name, category, power_level, contribution_score, status')
          .eq('user_id', user.id),
        supabase
          .from('dungeons')
          .select('title, dungeon_type, difficulty, status, xp_reward, objectives')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
        (supabase
          .from('training_log' as any)
          .select('workout_type, total_volume, fatigue_score, readiness_pre, exercises, completed_at')
          .eq('user_id', user.id)
          .gte('completed_at', thirtyDaysAgo)
          .order('completed_at', { ascending: false })) as any,
      ]);

      playerData.recentCompletions = (completionsRes.data || []).map((c: any) => ({
        title: c.quest_title,
        xp: c.xp_earned,
        type: c.type,
        date: c.completed_at,
      }));

      playerData.shadowArmy = (shadowsRes.data || []).map((s: any) => ({
        name: s.name,
        category: s.category,
        powerLevel: s.power_level,
        contributionScore: s.contribution_score,
        status: s.status,
      }));

      playerData.activeDungeons = (dungeonsRes.data || []).map((d: any) => ({
        title: d.title,
        type: d.dungeon_type,
        difficulty: d.difficulty,
        status: d.status,
        xpReward: d.xp_reward,
      }));

      // Build training context from logs
      const trainingLogs = (trainingRes.data || []) as any[];
      if (trainingLogs.length > 0) {
        const totalSessions = trainingLogs.length;
        const totalVolume = trainingLogs.reduce((s: number, l: any) => s + (l.total_volume ?? 0), 0);
        const avgFatigue = Math.round(trainingLogs.reduce((s: number, l: any) => s + (l.fatigue_score ?? 0), 0) / totalSessions);
        const readinessLogs = trainingLogs.filter((l: any) => l.readiness_pre != null);
        const avgReadiness = readinessLogs.length > 0
          ? Math.round(readinessLogs.reduce((s: number, l: any) => s + (l.readiness_pre ?? 0), 0) / readinessLogs.length)
          : 0;
        const sevenDayAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const fatigueAccum = trainingLogs
          .filter((l: any) => new Date(l.completed_at).getTime() > sevenDayAgo)
          .reduce((s: number, l: any) => s + (l.fatigue_score ?? 0), 0);
        const workoutDist: Record<string, number> = {};
        for (const l of trainingLogs) {
          workoutDist[l.workout_type] = (workoutDist[l.workout_type] || 0) + 1;
        }

        // Extract PRs
        const prMap = new Map<string, { name: string; weight: number; reps: number }>();
        for (const log of trainingLogs) {
          for (const ex of ((log.exercises as any[]) || [])) {
            if (!ex.completed || !ex.weight) continue;
            const existing = prMap.get(ex.name);
            if (!existing || ex.weight > existing.weight) {
              prMap.set(ex.name, { name: ex.name, weight: ex.weight, reps: ex.reps });
            }
          }
        }

        playerData.training = {
          totalSessions,
          totalVolume,
          avgFatigue,
          avgReadiness,
          fatigueAccumulation: fatigueAccum,
          mesocycleWeek: 1,
          mesocycleLength: 4,
          trainingLevel: totalSessions >= 10 ? 'intermediate' : totalSessions >= 3 ? 'beginner' : 'novice',
          todayWorkoutType: trainingLogs[0]?.workout_type || 'unknown',
          recentPRs: Array.from(prMap.values()).slice(0, 5),
          workoutDistribution: workoutDist,
        };
      }

      // Call edge function
      const { data, error: fnError } = await supabase.functions.invoke('system-intelligence', {
        body: { playerData },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      const result = data as SystemIntelligence;
      setIntelligence(result);
      localStorage.setItem(CACHE_KEY, JSON.stringify(result));
    } catch (e: any) {
      console.error('[SystemIntelligence] Generation failed:', e);
      setError(e.message || 'Intelligence generation failed');
    } finally {
      setLoading(false);
    }
  }, [user, player, loading]);

  return { intelligence, loading, error, generate };
}
