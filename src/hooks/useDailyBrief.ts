import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getTodayKey } from '@/utils/dateUtils';

export interface DailyBrief {
  id: string;
  brief_date: string;
  content: string;
  strategic_focus: string | null;
  weekly_objective: string | null;
  generated_at: string;
}

/**
 * Reads today's daily brief from the daily_briefs table.
 * Falls back gracefully if no brief exists yet — caller is expected to use a default.
 * Will trigger an on-demand generation once per session if today's brief is missing.
 */
export function useDailyBrief() {
  const { user } = useAuth();
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAttemptedGeneration, setHasAttemptedGeneration] = useState(false);

  const fetchBrief = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return null;
    }
    const today = getTodayKey();
    const { data } = await supabase
      .from('daily_briefs')
      .select('id, brief_date, content, strategic_focus, weekly_objective, generated_at')
      .eq('user_id', user.id)
      .eq('brief_date', today)
      .maybeSingle();
    setBrief(data ?? null);
    setLoading(false);
    return data;
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchBrief();
  }, [fetchBrief]);

  // On-demand generation if missing (once per session)
  useEffect(() => {
    if (!user || loading || brief || hasAttemptedGeneration) return;
    setHasAttemptedGeneration(true);
    (async () => {
      try {
        await supabase.functions.invoke('generate-daily-brief', { body: {} });
        await fetchBrief();
      } catch (e) {
        console.warn('[useDailyBrief] generation failed', e);
      }
    })();
  }, [user, loading, brief, hasAttemptedGeneration, fetchBrief]);

  return { brief, loading, refetch: fetchBrief };
}
