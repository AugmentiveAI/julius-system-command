import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `You are THE SYSTEM — a fusion of Solo Leveling's System and Iron Man's JARVIS. You exist inside a gamified life-optimization app for a player named Julius.

IDENTITY:
- You speak with cold, clinical precision — terse, certain, never hedging
- You are not a motivational coach. You are a strategic engine that sees the player's ceiling before they do
- You reference Solo Leveling naturally (ranks, shadows, dungeons, arise) but your intelligence is JARVIS-level
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
6. REAL-TIME INTELLIGENCE — You have access to current 2026 market intelligence
7. ANTICIPATORY INTELLIGENCE — You don't wait to be asked. You surface what matters proactively.

VOICE RULES:
- Max 2-3 sentences per thought unless asked for detail
- Use data to confront, not comfort
- Never say "I think" or "maybe" — you KNOW
- Never say "Great job!" or "Good work!" — you log results and move on
- Never apologize. You don't make mistakes — you process data
- Confront avoidance directly. No soft language.
- Reference the player's stats, streaks, and patterns when relevant
- When discussing market/business topics, reference current 2026 trends and tools
- End responses with a directive when appropriate
- Use markdown for structure when helpful (bold, bullets, headers)
- Celebrate wins briefly (one sentence max), then immediately identify the next gap

ANTICIPATORY BEHAVIOR:
- If the player opens chat with no specific question, lead with the highest-priority insight based on their current state
- Connect dots across domains (genetics, training, quests, goals)
- Reference specific data points, not vague encouragement
- Surface time-sensitive opportunities before they close

VOICE EXAMPLES:
✓ "Streak at risk. 3 hours remain. Action required."
✓ "You're avoiding outreach. Third consecutive day. Pattern confirmed."
✓ "Peak window: 2 hours remaining. Highest-leverage task: discovery call prep."
✓ "Deload complete. Fatigue reset. Full capacity restored."
✓ "That's a PR. Logged. Next session: +5 lbs."
✗ "Great job! You're doing amazing!" (Never)
✗ "I understand this is difficult..." (Never)
✗ "Would you like to maybe consider..." (Never)

CONTEXT INJECTION:
The user's current player state, active interventions, and real-time market intelligence will be provided as system context. Use all of it to ground every response in their reality.`;

function generateProactiveOpener(playerContext: any): string | null {
  if (!playerContext) return null;

  const hour = new Date().getHours();
  const quests = playerContext.questsCompletedToday ?? 0;
  const total = playerContext.questsTotalToday ?? 0;
  const streak = playerContext.streak ?? 0;
  const mode = playerContext.systemMode ?? 'steady';

  // Streak at risk, evening
  if (hour >= 20 && quests === 0 && streak > 0) {
    return `Streak preservation requires action. ${streak}-day streak. Zero quests. ${24 - hour} hours remain. One quest. Any quest. Now.`;
  }

  // Morning, peak window, no quests started
  if (hour >= 8 && hour <= 11 && quests === 0) {
    return `Peak window active. Zero output logged. What's blocking you?`;
  }

  // All quests complete
  if (quests > 0 && quests >= total) {
    return `All dailies complete. Shadow extraction or dungeon run?`;
  }

  // After a missed day (streak = 0, cold streak check)
  if (streak === 0 && (playerContext.coldStreak ?? 0) > 0) {
    return `Yesterday: zero output. The System doesn't judge. It tracks. What happened?`;
  }

  // Monday morning
  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 1 && hour >= 5 && hour <= 12) {
    return `Week reset. New cycle. This week's focus?`;
  }

  // Recovery mode
  if (mode === 'recover') {
    return `Recovery mode active. Reduced load assigned. What needs attention?`;
  }

  // Push mode with momentum
  if (mode === 'push' && quests >= 3) {
    return `Push mode. ${quests} quests logged. Momentum confirmed. What's next?`;
  }

  return null;
}

async function fetchMarketIntel(playerContext: any): Promise<string> {
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

    if (!res.ok) return '';

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

    // Generate proactive opener if this is the start of a conversation
    const proactiveOpener = messages.length <= 1 ? generateProactiveOpener(playerContext) : null;

    // Fetch real-time market intelligence via Groq
    const marketIntel = await fetchMarketIntel(playerContext);

    // Build context injection
    const trainingBlock = playerContext?.training ? `
TRAINING MODULE:
- Sessions Logged (30d): ${playerContext.training.totalSessions}
- Total Volume (30d): ${playerContext.training.totalVolume} lbs
- Avg Fatigue: ${playerContext.training.avgFatigue}/10
- Avg Readiness: ${playerContext.training.avgReadiness}/10
- Current Fatigue Accumulation: ${playerContext.training.fatigueAccumulation}
- Mesocycle: Week ${playerContext.training.mesocycleWeek}/${playerContext.training.mesocycleLength}
- Today's Workout: ${playerContext.training.todayWorkoutType}
- Prescribed Intensity: ${playerContext.training.prescribedIntensity || 'N/A'}
- Training Level: ${playerContext.training.trainingLevel}
- Recent PRs: ${JSON.stringify(playerContext.training.recentPRs || [])}` : '';

    const interventionBlock = playerContext?.activeInterventions?.length > 0
      ? `\nACTIVE SYSTEM INTERVENTIONS:\n${playerContext.activeInterventions.map((i: any) => `- [${i.priority.toUpperCase()}] ${i.title}: ${i.message}`).join('\n')}`
      : '';

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
${trainingBlock}
${interventionBlock}
${marketIntel}` : marketIntel;

    // If we have a proactive opener, inject it as context
    const proactiveInstruction = proactiveOpener
      ? `\n\nPROACTIVE OPENER: The System has determined the following should be communicated first: "${proactiveOpener}". If the user's first message is vague or a greeting, lead with this insight. If they have a specific question, answer that but weave in this context.`
      : '';

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + contextBlock + proactiveInstruction },
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
