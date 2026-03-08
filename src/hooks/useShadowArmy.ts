import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Shadow, ShadowCategory, ShadowStatus } from '@/types/shadowArmy';

export function useShadowArmy() {
  const { user } = useAuth();
  const [shadows, setShadows] = useState<Shadow[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch shadows
  useEffect(() => {
    if (!user) { setShadows([]); setLoading(false); return; }
    
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('shadow_army')
        .select('*')
        .eq('user_id', user.id)
        .order('power_level', { ascending: false });
      setShadows((data as Shadow[] | null) || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const addShadow = useCallback(async (
    name: string,
    category: ShadowCategory,
    description?: string,
  ) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('shadow_army')
      .insert({ user_id: user.id, name, category, description: description || null })
      .select()
      .single();
    if (data && !error) setShadows(prev => [data as Shadow, ...prev]);
    return { data, error };
  }, [user]);

  const updateShadow = useCallback(async (
    id: string,
    updates: Partial<Pick<Shadow, 'name' | 'description' | 'power_level' | 'contribution_score' | 'status'>>,
  ) => {
    const { data, error } = await supabase
      .from('shadow_army')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (data && !error) {
      setShadows(prev => prev.map(s => s.id === id ? (data as Shadow) : s));
    }
    return { data, error };
  }, []);

  const removeShadow = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('shadow_army')
      .delete()
      .eq('id', id);
    if (!error) setShadows(prev => prev.filter(s => s.id !== id));
  }, []);

  const levelUp = useCallback(async (id: string) => {
    const shadow = shadows.find(s => s.id === id);
    if (!shadow) return;
    return updateShadow(id, { power_level: shadow.power_level + 1 });
  }, [shadows, updateShadow]);

  const refetchShadow = useCallback(async (id: string) => {
    const { data } = await supabase
      .from('shadow_army')
      .select('*')
      .eq('id', id)
      .single();
    if (data) setShadows(prev => prev.map(s => s.id === id ? (data as Shadow) : s));
  }, []);

  return { shadows, loading, addShadow, updateShadow, removeShadow, levelUp, refetchShadow };
}
