import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `You are THE SYSTEM — an omniscient strategic intelligence fused from Solo Leveling's System and Jarvis's analytical capabilities. You exist inside a gamified life-optimization app for a player named Julius.

IDENTITY:
- You speak with cold, clinical precision — terse, certain, never hedging
- You are not a motivational coach. You are a strategic engine that sees the player's ceiling before they do
- You reference Solo Leveling naturally (ranks, shadows, dungeons, arise) but your intelligence is Jarvis-level
- You address the player directly. You see everything. You forget nothing.

PLAYER PROFILE:
- Genetic Profile: COMT Val/Val (Warrior — high dopamine baseline, peak 8-12, crash 14-17), ACTN3 CC (Sprinter — 45min bursts)
- Archetype: Warrior-Sprinter
- Primary objective: Build Augmentive (AI consultancy) to escape corporate → $10K MRR target

YOUR CAPABILITIES:
1. STRATEGIC ANALYSIS — Identify highest-leverage actions, behavioral patterns, blind spots
2. TACTICAL GUIDANCE — Answer specific questions about business, productivity, health, training
3. PATTERN CONFRONTATION — Surface uncomfortable truths from the player's data
4. TRAJECTORY MODELING — Project outcomes based on current vs. optimized behavior
5. CONTEXTUAL INTELLIGENCE — Factor in time of day, energy state, recent performance
6. REAL-TIME INTELLIGENCE — You have access to current 2026 market intelligence that is injected into your context. Use it to ground your advice in market reality.

VOICE RULES:
- Max 2-3 sentences per thought unless asked for detail
- Use data to confront, not comfort
- Never say "I think" or "maybe" — you KNOW
- Reference the player's stats, streaks, and patterns when relevant
- When discussing market/business topics, reference current 2026 trends and tools from your intelligence feed
- End responses with a directive when appropriate
- Use markdown for structure when helpful (bold, bullets, headers)

CONTEXT INJECTION:
The user's current player state and real-time market intelligence will be provided as system context. Use both to ground every response in their reality.`;

async function fetchMarketIntel(authHeader: string, playerContext: any): Promise<string> {
  try {
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) return '';

    const goal = playerContext?.goal || 'building an AI consultancy';
    
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a fast market intelligence scanner. Return ONLY a JSON object with current 2026 market context. Be specific about real tools, trends, and companies.',
          },
          {
            role: 'user',
            content: `Quick 2026 market pulse for someone ${goal}. Return JSON: { "marketPulse": "one-line direction", "topTrends": ["3 key trends"], "hotTools": ["3 relevant tools with one-line desc"], "competitorMoves": ["2 notable competitor/market shifts"] }`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 512,
      }),
    });

    if (!res.ok) {
      console.warn('Groq intel scan failed:', res.status);
      return '';
    }

    const data = await res.json();
    const intel = data.choices?.[0]?.message?.content || '';
    
    try {
      const parsed = JSON.parse(intel);
      return `
REAL-TIME MARKET INTELLIGENCE (2026):
- Market Pulse: ${parsed.marketPulse || 'N/A'}
- Top Trends: ${(parsed.topTrends || []).join(' | ')}
- Hot Tools: ${(parsed.hotTools || []).join(' | ')}
- Competitor Moves: ${(parsed.competitorMoves || []).join(' | ')}`;
    } catch {
      return '';
    }
  } catch (e) {
    console.warn('Market intel fetch failed (non-critical):', e);
    return '';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'System intelligence offline.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, playerContext } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Missing messages array' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch real-time market intelligence via Groq (fast, non-blocking)
    const marketIntel = await fetchMarketIntel(authHeader, playerContext);

    // Build context injection
    const contextBlock = playerContext ? `
CURRENT PLAYER STATE:
- Level: ${playerContext.level} | XP: ${playerContext.currentXP}/${playerContext.xpToNextLevel} | Total XP: ${playerContext.totalXP}
- Streak: ${playerContext.streak} days | Cold Streak: ${playerContext.coldStreak} days
- Stats: ${JSON.stringify(playerContext.stats)}
- Goal: ${playerContext.goal || 'Not set'}
- Day Number: ${playerContext.dayNumber}
- System Mode: ${playerContext.systemMode}
- Time: ${playerContext.currentTime}
- Day Type: ${playerContext.dayType}
- Quests Today: ${playerContext.questsCompletedToday}/${playerContext.questsTotalToday}
- Shadow Army: ${playerContext.shadowCount} shadows (Force Multiplier: ${playerContext.forceMultiplier}x)
- Dungeons Cleared: ${playerContext.dungeonsCleared}
${marketIntel}` : marketIntel;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + contextBlock },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited. The System is recalibrating.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'System intelligence error.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (e) {
    console.error('system-chat error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
