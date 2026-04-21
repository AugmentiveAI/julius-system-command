/**
 * PR2b: Hook to read & update the user's daily brief delivery schedule
 * (timezone + daily_brief_hour) on the profiles table.
 *
 * Single source of truth for any future scheduled-notification feature
 * that needs to fire at a user-local hour.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getUserTimezone } from '@/utils/dateUtils';

export interface BriefSchedule {
  timezone: string;
  dailyBriefHour: number;
}

const DEFAULT: BriefSchedule = { timezone: 'UTC', dailyBriefHour: 6 };

export function useBriefSchedule() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<BriefSchedule>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load current settings
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('timezone, daily_brief_hour')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error('[useBriefSchedule] load error', error);
        setError(error.message);
      } else if (data) {
        setSchedule({
          timezone: data.timezone || 'UTC',
          dailyBriefHour: data.daily_brief_hour ?? 6,
        });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const update = useCallback(async (next: Partial<BriefSchedule>) => {
    if (!user) return;
    const merged = { ...schedule, ...next };
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from('profiles')
      .update({
        timezone: merged.timezone,
        daily_brief_hour: merged.dailyBriefHour,
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('[useBriefSchedule] update error', error);
      setError(error.message);
    } else {
      setSchedule(merged);
    }
    setSaving(false);
    return !error;
  }, [user, schedule]);

  const detectTimezone = useCallback(async () => {
    const tz = getUserTimezone();
    return update({ timezone: tz });
  }, [update]);

  return { schedule, loading, saving, error, update, detectTimezone };
}
