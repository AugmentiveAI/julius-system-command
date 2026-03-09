import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Shadow, ShadowCategory, ShadowStatus } from '@/types/shadowArmy';
import { ResearchFinding, ShadowResearchConfig } from '@/types/learning';
import { SHADOW_TEMPLATES, ShadowTemplate } from '@/data/shadowTemplates';

const FINDINGS_STORAGE_KEY = 'jarvisShadowFindings';

function loadFindings(): Record<string, ResearchFinding[]> {
  try {
    const raw = localStorage.getItem(FINDINGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveFindings(findings: Record<string, ResearchFinding[]>) {
  localStorage.setItem(FINDINGS_STORAGE_KEY, JSON.stringify(findings));
}

export function useShadowArmy() {
  const { user } = useAuth();
  const [shadows, setShadows] = useState<Shadow[]>([]);
  const [loading, setLoading] = useState(true);
  const [findings, setFindings] = useState<Record<string, ResearchFinding[]>>(loadFindings);

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

  // ── Research capabilities ──────────────────────────────────────

  const runShadowResearch = useCallback(async (shadowId: string, researchConfig: ShadowResearchConfig, playerGoal?: string): Promise<ResearchFinding[]> => {
    if (!researchConfig?.enabled || !researchConfig.sources.length) return [];

    const shadow = shadows.find(s => s.id === shadowId);

    try {
      const { data, error } = await supabase.functions.invoke('shadow-research', {
        body: {
          shadowId,
          shadowName: shadow?.name || 'Shadow',
          sources: researchConfig.sources.filter(s => s.active),
          searchPatterns: researchConfig.searchPatterns,
          priorityThreshold: researchConfig.reporting.priorityThreshold,
          playerGoal,
        },
      });

      if (error) {
        console.error('Shadow research failed:', error);
        return [];
      }

      const newFindings: ResearchFinding[] = data?.findings || [];

      // Store findings
      setFindings(prev => {
        const updated = {
          ...prev,
          [shadowId]: [...(prev[shadowId] || []), ...newFindings].slice(-50),
        };
        saveFindings(updated);
        return updated;
      });

      return newFindings;
    } catch (e) {
      console.error('Shadow research error:', e);
      return [];
    }
  }, [shadows]);

  const getUnreadFindings = useCallback((): ResearchFinding[] => {
    return Object.values(findings)
      .flat()
      .filter(f => f.status === 'new')
      .sort((a, b) => b.content.relevanceScore - a.content.relevanceScore);
  }, [findings]);

  const updateFindingStatus = useCallback((findingId: string, status: 'read' | 'acted_on' | 'dismissed') => {
    setFindings(prev => {
      const updated: Record<string, ResearchFinding[]> = {};
      for (const [shadowId, shadowFindings] of Object.entries(prev)) {
        updated[shadowId] = shadowFindings.map(f =>
          f.id === findingId ? { ...f, status } : f
        );
      }
      saveFindings(updated);
      return updated;
    });
  }, []);

  const suggestShadows = useCallback((goalText: string): ShadowTemplate[] => {
    const lower = goalText.toLowerCase();
    return SHADOW_TEMPLATES.filter(template => {
      const matches = template.triggerConditions.goalKeywords?.some(
        keyword => lower.includes(keyword.toLowerCase())
      );
      return matches && !shadows.some(s => s.name === template.name);
    });
  }, [shadows]);

  const createFromTemplate = useCallback(async (template: ShadowTemplate) => {
    const result = await addShadow(template.name, template.category, template.description);
    return result;
  }, [addShadow]);

  return {
    shadows,
    loading,
    addShadow,
    updateShadow,
    removeShadow,
    levelUp,
    refetchShadow,
    // Research capabilities
    runShadowResearch,
    getUnreadFindings,
    updateFindingStatus,
    suggestShadows,
    createFromTemplate,
    shadowTemplates: SHADOW_TEMPLATES,
    findings,
  };
}
