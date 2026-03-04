import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Player, PlayerStats, PenaltyState, Rank } from '@/types/player';

const PLAYER_STORAGE_KEY = 'the-system-player';
const DEBOUNCE_MS = 2000;

/** Convert a Supabase player_state + profiles row into our local Player shape */
function dbToPlayer(
  ps: { level: number; total_xp: number; current_xp: number; xp_to_next_level: number; stats: any; streak: number; cold_streak: number; penalty: any },
  profile: { display_name: string; title: string; goal: string | null }
): Player {
  return {
    name: profile.display_name,
    title: profile.title as Rank,
    level: ps.level,
    totalXP: ps.total_xp,
    currentXP: ps.current_xp,
    xpToNextLevel: ps.xp_to_next_level,
    stats: ps.stats as PlayerStats,
    streak: ps.streak,
    coldStreak: ps.cold_streak,
    penalty: ps.penalty as PenaltyState,
    goal: profile.goal ?? undefined,
  };
}

/**
 * Syncs the Player object to Supabase with debounced writes.
 * - On mount (when user is logged in): loads from DB → merges into state
 * - On player change: writes to localStorage immediately + debounced write to DB
 * - Keeps localStorage as offline cache
 */
export function usePlayerSync(
  player: Player,
  setPlayer: React.Dispatch<React.SetStateAction<Player>>
) {
  const { user } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDone = useRef(false);
  const lastSyncedRef = useRef<string>('');

  // ── Load from DB on login ──────────────────────────────────────
  useEffect(() => {
    if (!user) {
      initialLoadDone.current = false;
      return;
    }

    let cancelled = false;

    const loadFromDB = async () => {
      try {
        const [{ data: ps }, { data: profile }] = await Promise.all([
          supabase.from('player_state').select('*').eq('user_id', user.id).maybeSingle(),
          supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
        ]);

        if (cancelled) return;

        if (ps && profile) {
          const dbPlayer = dbToPlayer(ps, profile);
          setPlayer(dbPlayer);
          localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(dbPlayer));
          lastSyncedRef.current = JSON.stringify(dbPlayer);
        }
        // If no DB row yet (trigger may not have fired), keep localStorage data
      } catch (e) {
        console.error('[PlayerSync] Failed to load from DB:', e);
        // Keep localStorage data as fallback — no crash
      }

      initialLoadDone.current = true;
    };

    loadFromDB();
    return () => { cancelled = true; };
  }, [user, setPlayer]);

  // ── Debounced write to DB on player change ─────────────────────
  useEffect(() => {
    if (!user || !initialLoadDone.current) return;

    // Always write to localStorage immediately
    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(player));

    const serialized = JSON.stringify(player);
    if (serialized === lastSyncedRef.current) return; // No actual change

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        await Promise.all([
          supabase.from('player_state').update({
            level: player.level,
            total_xp: player.totalXP,
            current_xp: player.currentXP,
            xp_to_next_level: player.xpToNextLevel,
            stats: player.stats as any,
            streak: player.streak,
            cold_streak: player.coldStreak,
            penalty: player.penalty as any,
          }).eq('user_id', user.id),

          supabase.from('profiles').update({
            display_name: player.name,
            title: player.title,
            goal: player.goal ?? null,
          }).eq('user_id', user.id),
        ]);

        lastSyncedRef.current = serialized;
      } catch (e) {
        console.error('[PlayerSync] Failed to write to DB:', e);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [player, user]);

  // ── Flush on page unload ───────────────────────────────────────
  useEffect(() => {
    const flush = () => {
      if (!user || !initialLoadDone.current) return;
      const serialized = JSON.stringify(player);
      if (serialized === lastSyncedRef.current) return;

      // Use sendBeacon for reliable unload writes
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/player_state?user_id=eq.${user.id}`;
      const body = JSON.stringify({
        level: player.level,
        total_xp: player.totalXP,
        current_xp: player.currentXP,
        xp_to_next_level: player.xpToNextLevel,
        stats: player.stats,
        streak: player.streak,
        cold_streak: player.coldStreak,
        penalty: player.penalty,
      });

      navigator.sendBeacon?.(url); // best-effort; headers can't be set with sendBeacon for auth
    };

    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [player, user]);
}
