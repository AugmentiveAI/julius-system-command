import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { QuestChain, QuestChainStep, ChainStatus, CHAIN_TEMPLATES } from '@/types/questChain';
import { PlayerStats } from '@/types/player';

const LOCAL_KEY = 'systemQuestChains';

function loadLocal(): QuestChain[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function useQuestChains() {
  const { user } = useAuth();
  const [chains, setChains] = useState<QuestChain[]>(loadLocal);
  const [loading, setLoading] = useState(false);

  // Load from DB
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('quest_chains')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        const mapped: QuestChain[] = data.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          title: row.title,
          description: row.description || '',
          chainType: row.chain_type || 'narrative',
          steps: Array.isArray(row.steps) ? row.steps as unknown as QuestChainStep[] : [],
          currentStep: row.current_step,
          totalSteps: row.total_steps,
          status: row.status as ChainStatus,
          xpPerStep: row.xp_per_step,
          bonusXp: row.bonus_xp,
          stat: (row.stat || 'systems') as keyof PlayerStats,
          startedAt: row.started_at,
          completedAt: row.completed_at,
          expiresAt: row.expires_at,
          metadata: row.metadata || {},
        }));
        setChains(mapped);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(mapped));
      }
      setLoading(false);
    })();
  }, [user]);

  // Persist locally
  useEffect(() => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(chains));
  }, [chains]);

  const activeChains = chains.filter(c => c.status === 'active');
  const completedChains = chains.filter(c => c.status === 'completed');

  const startChain = useCallback(async (templateIndex: number): Promise<QuestChain | null> => {
    if (!user) return null;
    const template = CHAIN_TEMPLATES[templateIndex];
    if (!template) return null;

    const steps: QuestChainStep[] = template.steps.map((s, i) => ({
      id: `step-${i}`,
      title: s.title,
      description: s.description,
      completed: false,
      dayTarget: i + 1,
    }));

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + template.steps.length + 2); // buffer days

    const { data, error } = await supabase.from('quest_chains').insert({
      user_id: user.id,
      title: template.title,
      description: template.description,
      chain_type: template.chainType,
      steps: steps as any,
      current_step: 0,
      total_steps: template.steps.length,
      status: 'active',
      xp_per_step: template.xpPerStep,
      bonus_xp: template.bonusXp,
      stat: template.stat,
      expires_at: expiresAt.toISOString(),
    }).select().single();

    if (error || !data) return null;

    const chain: QuestChain = {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      description: data.description || '',
      chainType: data.chain_type as any,
      steps,
      currentStep: 0,
      totalSteps: template.steps.length,
      status: 'active',
      xpPerStep: template.xpPerStep,
      bonusXp: template.bonusXp,
      stat: template.stat as keyof PlayerStats,
      startedAt: data.started_at,
      expiresAt: expiresAt.toISOString(),
    };

    setChains(prev => [chain, ...prev]);
    return chain;
  }, [user]);

  const completeStep = useCallback(async (chainId: string): Promise<{ xpEarned: number; chainCompleted: boolean }> => {
    const chain = chains.find(c => c.id === chainId);
    if (!chain || chain.status !== 'active') return { xpEarned: 0, chainCompleted: false };

    const stepIdx = chain.currentStep;
    if (stepIdx >= chain.totalSteps) return { xpEarned: 0, chainCompleted: false };

    const updatedSteps = [...chain.steps];
    updatedSteps[stepIdx] = { ...updatedSteps[stepIdx], completed: true, completedAt: new Date().toISOString() };

    const newCurrentStep = stepIdx + 1;
    const chainCompleted = newCurrentStep >= chain.totalSteps;
    const newStatus: ChainStatus = chainCompleted ? 'completed' : 'active';
    const xpEarned = chain.xpPerStep + (chainCompleted ? chain.bonusXp : 0);

    setChains(prev => prev.map(c => c.id === chainId ? {
      ...c,
      steps: updatedSteps,
      currentStep: newCurrentStep,
      status: newStatus,
      completedAt: chainCompleted ? new Date().toISOString() : undefined,
    } : c));

    if (user) {
      await supabase.from('quest_chains').update({
        steps: updatedSteps as any,
        current_step: newCurrentStep,
        status: newStatus,
        completed_at: chainCompleted ? new Date().toISOString() : null,
      }).eq('id', chainId);
    }

    return { xpEarned, chainCompleted };
  }, [chains, user]);

  const abandonChain = useCallback(async (chainId: string) => {
    setChains(prev => prev.map(c => c.id === chainId ? { ...c, status: 'failed' as ChainStatus } : c));
    if (user) {
      await supabase.from('quest_chains').update({ status: 'failed' }).eq('id', chainId);
    }
  }, [user]);

  return {
    chains,
    activeChains,
    completedChains,
    loading,
    startChain,
    completeStep,
    abandonChain,
  };
}
