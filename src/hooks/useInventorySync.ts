import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { InventoryState, INITIAL_INVENTORY } from '@/types/inventory';

const INVENTORY_STORAGE_KEY = 'the-system-inventory';
const DEBOUNCE_MS = 2000;

/**
 * Syncs inventory state to Supabase with debounced writes.
 * Loads from DB on login, keeps localStorage as offline cache.
 */
export function useInventorySync(
  inventory: InventoryState,
  setInventory: React.Dispatch<React.SetStateAction<InventoryState>>
) {
  const { user } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDone = useRef(false);
  const lastSyncedRef = useRef<string>('');

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
          .from('inventory')
          .select('data')
          .eq('user_id', user.id)
          .maybeSingle();

        if (cancelled) return;

        if (data?.data && typeof data.data === 'object' && Object.keys(data.data).length > 0) {
          const dbInventory = data.data as unknown as InventoryState;
          setInventory(dbInventory);
          localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(dbInventory));
          lastSyncedRef.current = JSON.stringify(dbInventory);
        }
      } catch (e) {
        console.error('[InventorySync] Failed to load from DB:', e);
      }

      initialLoadDone.current = true;
    };

    loadFromDB();
    return () => { cancelled = true; };
  }, [user, setInventory]);

  // Debounced write to DB on inventory change
  useEffect(() => {
    if (!user || !initialLoadDone.current) return;

    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(inventory));

    const serialized = JSON.stringify(inventory);
    if (serialized === lastSyncedRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        await supabase
          .from('inventory')
          .update({ data: inventory as any })
          .eq('user_id', user.id);

        lastSyncedRef.current = serialized;
      } catch (e) {
        console.error('[InventorySync] Failed to write to DB:', e);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [inventory, user]);
}
