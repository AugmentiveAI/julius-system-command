import { useState, useCallback, useEffect } from 'react';
import { generateAIQuests, loadAIQuests, isAIEnabled, AIQuestResult } from '@/utils/aiQuestGenerator';
import { getSystemDate } from '@/utils/dayCycleEngine';
import { useToast } from '@/hooks/use-toast';

export function useAIQuests() {
  const [aiResult, setAiResult] = useState<AIQuestResult | null>(loadAIQuests);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const enabled = isAIEnabled();

  // Check if today's quests exist
  const hasTodayQuests = aiResult?.generatedAt?.startsWith(getSystemDate()) ?? false;

  const generate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const result = await generateAIQuests();
      setAiResult(result);
      toast({
        title: '⚡ Quests Generated',
        description: `AI (${result.provider}) generated ${result.quests.length} quests.`,
        duration: 3000,
      });
    } catch (err: any) {
      console.error('[AI Quests]', err);
      if (err.message === 'NO_API_KEYS') {
        toast({ title: '⚠️ No API Keys', description: 'Add API keys in Settings → AI Quest Engine.', variant: 'destructive', duration: 4000 });
      } else {
        toast({ title: '⚠️ Generation Failed', description: 'System capacity exceeded. Using default quests.', variant: 'destructive', duration: 3000 });
      }
    } finally {
      setIsGenerating(false);
    }
  }, [toast]);

  // Auto-generate at midnight if enabled and no today quests
  useEffect(() => {
    if (!enabled || hasTodayQuests) return;
    // Check every minute for day change
    const interval = setInterval(() => {
      const stored = loadAIQuests();
      if (!stored?.generatedAt?.startsWith(getSystemDate())) {
        generate();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [enabled, hasTodayQuests, generate]);

  return {
    aiResult: hasTodayQuests ? aiResult : null,
    isGenerating,
    generate,
    enabled,
    hasTodayQuests,
  };
}
