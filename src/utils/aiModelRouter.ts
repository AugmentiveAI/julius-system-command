/**
 * AI Model Router — routes requests through server-side edge function proxy.
 * API keys are stored server-side, never in the browser.
 */

import { supabase } from '@/integrations/supabase/client';

export type TaskType = 'research' | 'analysis' | 'speed' | 'strategy' | 'simple';

interface RouterResult {
  provider: string;
  response: string;
}

export async function routeAIRequest(
  prompt: string,
  taskType: TaskType = 'strategy'
): Promise<RouterResult> {
  const { data, error } = await supabase.functions.invoke('ai-quest-proxy', {
    body: { prompt, taskType },
  });

  if (error) {
    console.error('[AI Router] Edge function error:', error);
    throw new Error(error.message || 'AI_REQUEST_FAILED');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return {
    provider: data.provider || 'unknown',
    response: data.response || '',
  };
}

/**
 * AI is available if the user is authenticated (server-side keys handle the rest).
 */
export function hasAnyApiKey(): boolean {
  return true; // Server-side keys are always available for authenticated users
}
