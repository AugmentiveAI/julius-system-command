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

const PING_CACHE_KEY = 'systemAIPingResult';
const PING_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface PingCache {
  available: boolean;
  checkedAt: number;
}

function getCachedPing(): PingCache | null {
  try {
    const raw = localStorage.getItem(PING_CACHE_KEY);
    if (!raw) return null;
    const cached: PingCache = JSON.parse(raw);
    if (Date.now() - cached.checkedAt > PING_CACHE_TTL) return null;
    return cached;
  } catch {
    return null;
  }
}

function setCachedPing(available: boolean) {
  const entry: PingCache = { available, checkedAt: Date.now() };
  try {
    localStorage.setItem(PING_CACHE_KEY, JSON.stringify(entry));
  } catch { /* ignore */ }
}

let pingPromise: Promise<boolean> | null = null;

/**
 * Checks if the AI backend is reachable by pinging the proxy.
 * Result is cached in localStorage for 10 minutes.
 */
export async function hasAnyApiKey(): Promise<boolean> {
  const cached = getCachedPing();
  if (cached !== null) return cached.available;

  // Deduplicate concurrent calls
  if (pingPromise) return pingPromise;

  pingPromise = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-quest-proxy', {
        body: { prompt: 'ping', taskType: 'simple', ping: true },
      });

      const available = !error && !data?.error;
      if (!available) {
        console.warn('[AI Router] AI backend unreachable:', error?.message || data?.error);
      }
      setCachedPing(available);
      return available;
    } catch (e) {
      console.warn('[AI Router] AI ping failed:', e);
      setCachedPing(false);
      return false;
    } finally {
      pingPromise = null;
    }
  })();

  return pingPromise;
}
