/**
 * Shared rate-limit helper for edge functions.
 * Uses the rate_limits table to enforce per-user, per-function call caps.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MAX_CALLS = 10;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  functionName: string,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  try {
    const { data: existing } = await supabase
      .from('rate_limits')
      .select('call_count, window_start')
      .eq('user_id', userId)
      .eq('function_name', functionName)
      .maybeSingle();

    const now = new Date();

    if (existing) {
      const windowStart = new Date(existing.window_start);
      const elapsed = now.getTime() - windowStart.getTime();

      if (elapsed < WINDOW_MS) {
        // Within current window
        if (existing.call_count >= MAX_CALLS) {
          const retryAfter = Math.ceil((WINDOW_MS - elapsed) / 1000);
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded. Try again later.', retryAfter }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) } },
          );
        }
        // Increment
        await supabase
          .from('rate_limits')
          .update({ call_count: existing.call_count + 1 })
          .eq('user_id', userId)
          .eq('function_name', functionName);
      } else {
        // Window expired — reset
        await supabase
          .from('rate_limits')
          .update({ call_count: 1, window_start: now.toISOString() })
          .eq('user_id', userId)
          .eq('function_name', functionName);
      }
    } else {
      // First call ever
      await supabase
        .from('rate_limits')
        .insert({ user_id: userId, function_name: functionName, call_count: 1, window_start: now.toISOString() });
    }

    return null; // No rate limit hit
  } catch (e) {
    console.warn(`[RateLimit] Check failed for ${functionName}:`, e);
    return null; // Fail open — don't block on rate limit errors
  }
}
