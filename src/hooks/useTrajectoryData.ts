import { useMemo, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/hooks/usePlayer';
import { getSystemDate } from '@/utils/dayCycleEngine';

export interface TrajectoryPoint {
  day: number;
  label: string;
  currentPace: number;
  optimizedPace: number;
  ceiling: number;
}

export interface Milestone {
  day: number;
  label: string;
  track: 'currentPace' | 'optimizedPace' | 'ceiling';
  xp: number;
}

export interface TrajectoryData {
  points: TrajectoryPoint[];
  milestones: Milestone[];
  currentDay: number;
  dailyXPAvg: number;
  optimizedDailyXP: number;
  ceilingDailyXP: number;
  loading: boolean;
}

// XP thresholds for ranks
const RANK_THRESHOLDS = [
  { xp: 0, rank: 'E-Rank', level: 1 },
  { xp: 500, rank: 'D-Rank', level: 2 },
  { xp: 1500, rank: 'C-Rank', level: 3 },
  { xp: 4000, rank: 'B-Rank', level: 5 },
  { xp: 10000, rank: 'A-Rank', level: 8 },
  { xp: 25000, rank: 'S-Rank', level: 12 },
  { xp: 50000, rank: 'Monarch Candidate', level: 18 },
  { xp: 100000, rank: 'Shadow Monarch', level: 25 },
];

// Revenue milestones tied to XP trajectory
const REVENUE_MILESTONES = [
  { xp: 2000, label: '$1K MRR' },
  { xp: 5000, label: '$3K MRR' },
  { xp: 10000, label: '$10K MRR' },
  { xp: 25000, label: '$25K MRR' },
  { xp: 50000, label: '$50K MRR' },
  { xp: 100000, label: '$100K MRR' },
];

export function useTrajectoryData(): TrajectoryData {
  const { user } = useAuth();
  const { player } = usePlayer();
  const [questHistory, setQuestHistory] = useState<{ xp: number; date: string }[]>([]);
  const [shadowCount, setShadowCount] = useState(0);
  const [dungeonClears, setDungeonClears] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const fetchData = async () => {
      setLoading(true);
      const [histRes, shadowRes, dungeonRes] = await Promise.all([
        supabase
          .from('quest_history')
          .select('xp_earned, completed_at')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: true }),
        supabase
          .from('shadow_army')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'active'),
        supabase
          .from('dungeons')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'completed'),
      ]);
      setQuestHistory((histRes.data || []).map(r => ({
        xp: r.xp_earned,
        date: r.completed_at,
      })));
      setShadowCount(shadowRes.data?.length || 0);
      setDungeonClears(dungeonRes.data?.length || 0);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  return useMemo(() => {
    // Calculate current day
    let currentDay = 1;
    try {
      const startDate = localStorage.getItem('systemStartDate');
      if (startDate) {
        const start = new Date(startDate + 'T12:00:00');
        const today = new Date(getSystemDate() + 'T12:00:00');
        currentDay = Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86400000) + 1);
      }
    } catch { /* ignore */ }

    // Calculate average daily XP from actual data
    const totalXP = player.totalXP || 0;
    const dailyXPAvg = currentDay > 1 ? totalXP / currentDay : totalXP || 50;
    
    // Optimized pace: assumes consistent completion + genetic optimization
    // Base: 1.8x current pace (hitting all quests + sprints during COMT peak)
    // Shadow army bonus: +5% per active shadow (compound asset multiplier)
    // Dungeon bonus: +10% per cleared dungeon (proven capability)
    const shadowMultiplier = 1 + (shadowCount * 0.05);
    const dungeonMultiplier = 1 + (dungeonClears * 0.10);
    const optimizedDailyXP = Math.max(
      dailyXPAvg * 1.8 * shadowMultiplier,
      150, // Minimum optimized pace
    );

    // Ceiling pace: maximum theoretical output
    // 4x current pace with full genetic optimization, COMT peak exploitation,
    // maxed shadow army, all dungeons cleared, and compound effects
    const ceilingDailyXP = Math.max(
      dailyXPAvg * 4 * shadowMultiplier * dungeonMultiplier,
      300, // Minimum ceiling pace
    );

    // Generate projection points (90 days out)
    const projectionDays = 90;
    const pointInterval = Math.max(1, Math.floor(projectionDays / 30)); // ~30 data points
    const points: TrajectoryPoint[] = [];

    for (let d = 0; d <= projectionDays; d += pointInterval) {
      const dayNum = currentDay + d;
      const monthLabel = d === 0 ? 'Now' : `Day ${dayNum}`;
      
      // Current pace: linear from current XP
      const currentPaceXP = totalXP + (dailyXPAvg * d);
      
      // Optimized: accelerating curve (compound growth kicks in)
      const compoundFactor = 1 + (d / projectionDays) * 0.3; // 30% acceleration over 90 days
      const optimizedXP = totalXP + (optimizedDailyXP * d * compoundFactor);
      
      // Ceiling: aggressive compound growth
      const ceilingCompound = 1 + (d / projectionDays) * 0.6; // 60% acceleration
      const ceilingXP = totalXP + (ceilingDailyXP * d * ceilingCompound);

      points.push({
        day: dayNum,
        label: monthLabel,
        currentPace: Math.round(currentPaceXP),
        optimizedPace: Math.round(optimizedXP),
        ceiling: Math.round(ceilingXP),
      });
    }

    // Generate milestones
    const milestones: Milestone[] = [];
    
    // Find when each track hits rank thresholds
    for (const threshold of RANK_THRESHOLDS) {
      if (threshold.xp <= totalXP) continue; // Already passed
      
      // Current pace
      const daysToCurrentPace = threshold.xp > totalXP && dailyXPAvg > 0
        ? Math.ceil((threshold.xp - totalXP) / dailyXPAvg)
        : null;
      
      // Optimized pace  
      const daysToOptimized = optimizedDailyXP > 0
        ? Math.ceil((threshold.xp - totalXP) / optimizedDailyXP)
        : null;

      if (daysToOptimized && daysToOptimized <= projectionDays) {
        milestones.push({
          day: currentDay + daysToOptimized,
          label: threshold.rank,
          track: 'optimizedPace',
          xp: threshold.xp,
        });
      } else if (daysToCurrentPace && daysToCurrentPace <= projectionDays) {
        milestones.push({
          day: currentDay + daysToCurrentPace,
          label: threshold.rank,
          track: 'currentPace',
          xp: threshold.xp,
        });
      }
    }

    // Revenue milestones on ceiling track
    for (const rev of REVENUE_MILESTONES) {
      if (rev.xp <= totalXP) continue;
      const daysToCeiling = ceilingDailyXP > 0
        ? Math.ceil((rev.xp - totalXP) / ceilingDailyXP)
        : null;
      if (daysToCeiling && daysToCeiling <= projectionDays) {
        milestones.push({
          day: currentDay + daysToCeiling,
          label: rev.label,
          track: 'ceiling',
          xp: rev.xp,
        });
      }
    }

    return {
      points,
      milestones,
      currentDay,
      dailyXPAvg: Math.round(dailyXPAvg),
      optimizedDailyXP: Math.round(optimizedDailyXP),
      ceilingDailyXP: Math.round(ceilingDailyXP),
      loading,
    };
  }, [player, questHistory, shadowCount, dungeonClears, loading]);
}
