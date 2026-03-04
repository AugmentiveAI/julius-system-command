import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { QuestCompletionEntry, HistoryState } from '@/types/history';

const HISTORY_STORAGE_KEY = 'the-system-history';

/**
 * Syncs quest history to Supabase.
 * - On login: loads completions from quest_history table
 * - On completion: writes to DB immediately (append-only, no debounce needed)
 * - Keeps localStorage as offline cache
 */
export function useHistorySync(
  history: HistoryState,
  setHistory: React.Dispatch<React.SetStateAction<HistoryState>>
) {
  const { user } = useAuth();
  const initialLoadDone = useRef(false);

  // Load from DB on login
  useEffect(() => {
    if (!user) {
      initialLoadDone.current = false;
      return;
    }

    let cancelled = false;

    const loadFromDB = async () => {
      try {
        const { data } = await supabase
          .from('quest_history')
          .select('*')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false });

        if (cancelled) return;

        if (data && data.length > 0) {
          const entries: QuestCompletionEntry[] = data.map(row => ({
            id: row.id,
            questId: row.quest_id,
            questTitle: row.quest_title,
            xpEarned: row.xp_earned,
            completedAt: row.completed_at,
            type: row.type as 'daily' | 'main',
          }));

          setHistory({ completions: entries });
          localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify({ completions: entries }));
        }
      } catch (e) {
        console.error('[HistorySync] Failed to load from DB:', e);
      }

      initialLoadDone.current = true;
    };

    loadFromDB();
    return () => { cancelled = true; };
  }, [user, setHistory]);

  /** Write a single completion to DB immediately (fire-and-forget) */
  const syncCompletion = useCallback(
    (entry: QuestCompletionEntry) => {
      if (!user) return;

      supabase
        .from('quest_history')
        .insert({
          user_id: user.id,
          quest_id: entry.questId,
          quest_title: entry.questTitle,
          xp_earned: entry.xpEarned,
          completed_at: entry.completedAt,
          type: entry.type,
        })
        .then(({ error }) => {
          if (error) console.error('[HistorySync] Failed to write completion:', error);
        });
    },
    [user]
  );

  return { syncCompletion };
}
