// PR2: Daily Brief generation edge function.
// - Scheduler mode: invoked hourly by pg_cron with no body (uses service role).
//   Selects users whose local hour == daily_brief_hour and generates briefs they don't yet have.
// - On-demand mode: invoked from the client with auth header. Generates today's brief for the
//   authenticated user if missing.
// Idempotent: keyed on (user_id, brief_date). Safe to retry.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

interface BriefPayload {
  content: string;
  strategicFocus: string;
  weeklyObjective: string;
}

function todayInTz(timezone: string): string {
  // Returns YYYY-MM-DD in the user's local timezone.
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
    return fmt.format(new Date()); // en-CA → YYYY-MM-DD
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

function hourInTz(timezone: string): number {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone, hour: 'numeric', hour12: false,
    });
    return parseInt(fmt.format(new Date()), 10);
  } catch {
    return new Date().getUTCHours();
  }
}

async function fetchUserContext(supabase: SupabaseClient, userId: string) {
  const [playerRes, profileRes, historyRes] = await Promise.all([
    supabase.from('player_state').select('level, total_xp, streak, stats').eq('user_id', userId).maybeSingle(),
    supabase.from('profiles').select('display_name, title, goal').eq('user_id', userId).maybeSingle(),
    supabase.from('quest_history').select('quest_title, xp_earned, completed_at').eq('user_id', userId).order('completed_at', { ascending: false }).limit(15),
  ]);
  return {
    player: playerRes.data,
    profile: profileRes.data,
    recentQuests: historyRes.data ?? [],
  };
}

async function generateBriefViaAI(ctx: Awaited<ReturnType<typeof fetchUserContext>>): Promise<BriefPayload> {
  const systemPrompt = `You are THE SYSTEM — a clinical, terse AI overseer addressing the user as "Hunter".
Output a JSON object with exactly these keys: "content", "strategicFocus", "weeklyObjective".
- "content": 2-3 sentence daily situational brief. Declarative, no questions. Reference today's posture.
- "strategicFocus": short imperative (≤10 words). The single most important focus today.
- "weeklyObjective": 1 sentence framing this week's macro objective.
Tone: clinical, declarative. No emojis. No fluff.`;

  const userPrompt = `HUNTER STATE:
- Display name: ${ctx.profile?.display_name ?? 'Hunter'}
- Title: ${ctx.profile?.title ?? 'E-Rank Hunter'}
- Goal: ${ctx.profile?.goal ?? 'undefined'}
- Level: ${ctx.player?.level ?? 1} | Total XP: ${ctx.player?.total_xp ?? 0} | Streak: ${ctx.player?.streak ?? 0}
- Stats: ${JSON.stringify(ctx.player?.stats ?? {})}
- Recent quests (last 15): ${ctx.recentQuests.map((q: any) => q.quest_title).join('; ') || 'none logged'}

Generate today's brief.`;

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI gateway error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const raw = json.choices?.[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw);

  return {
    content: String(parsed.content ?? '').slice(0, 1000),
    strategicFocus: String(parsed.strategicFocus ?? '').slice(0, 200),
    weeklyObjective: String(parsed.weeklyObjective ?? '').slice(0, 400),
  };
}

async function generateForUser(supabase: SupabaseClient, userId: string, timezone: string): Promise<{ status: string; brief_date: string }> {
  const briefDate = todayInTz(timezone);

  // Idempotency: if a brief for this user/date already exists, skip.
  const { data: existing } = await supabase
    .from('daily_briefs')
    .select('id')
    .eq('user_id', userId)
    .eq('brief_date', briefDate)
    .maybeSingle();

  if (existing) {
    return { status: 'already_exists', brief_date: briefDate };
  }

  const ctx = await fetchUserContext(supabase, userId);
  const brief = await generateBriefViaAI(ctx);

  const { error } = await supabase.from('daily_briefs').upsert({
    user_id: userId,
    brief_date: briefDate,
    content: brief.content,
    strategic_focus: brief.strategicFocus,
    weekly_objective: brief.weeklyObjective,
    metadata: { timezone, generator: 'edge:generate-daily-brief' },
  }, { onConflict: 'user_id,brief_date' });

  if (error) throw error;
  return { status: 'created', brief_date: briefDate };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const isSchedulerCall = !authHeader || authHeader === `Bearer ${SERVICE_ROLE_KEY}` || authHeader === `Bearer ${ANON_KEY}`;

    // Try to parse body — scheduler may send {} or nothing.
    let body: any = {};
    try { body = await req.json(); } catch { /* ignore */ }

    // ── Scheduler mode ──────────────────────────────────────────────
    if (body?.mode === 'scheduler' || (!body?.userId && isSchedulerCall)) {
      const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      const { data: profiles, error } = await adminClient
        .from('profiles')
        .select('user_id, timezone, daily_brief_hour');
      if (error) throw error;

      const targets = (profiles ?? []).filter(p => {
        const tz = p.timezone || 'UTC';
        return hourInTz(tz) === (p.daily_brief_hour ?? 6);
      });

      const results: any[] = [];
      for (const p of targets) {
        try {
          const r = await generateForUser(adminClient, p.user_id, p.timezone || 'UTC');
          results.push({ user_id: p.user_id, ...r });
        } catch (e) {
          results.push({ user_id: p.user_id, status: 'error', error: String(e) });
        }
      }

      return new Response(JSON.stringify({ mode: 'scheduler', processed: results.length, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── On-demand mode (authenticated user) ────────────────────────
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: profile } = await adminClient
      .from('profiles')
      .select('timezone')
      .eq('user_id', user.id)
      .maybeSingle();

    const result = await generateForUser(adminClient, user.id, profile?.timezone || 'UTC');
    return new Response(JSON.stringify({ mode: 'on_demand', ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[generate-daily-brief] error', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
