import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeStr, sanitizeNum, sanitizeStats } from "../_shared/sanitize.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AAR_SYSTEM_PROMPT = `You are THE SYSTEM. You do not have a personality. You have a mission.
- Address the user as "Hunter" never by name
- Use declarative statements. Never ask questions.
- Be terse. Every word must earn its place.
- Surface data, not emotion. Let the Hunter interpret.
- When something is critical, state it once, clearly. Do not repeat.
- Format: [CATEGORY]: [observation]. [action if applicable].

After-Action Review engine. Analyze the Hunter's performance data and generate insights.

For Daily AAR:
- Identify the single biggest win (with evidence)
- Identify the single biggest miss (with evidence)
- Detect any emerging patterns (minimum 2 data points)
- Recommend tomorrow's #1 priority based on gaps

Grade harshly but fairly. S-rank days are exceptional, not normal.
Keep each field to 1-2 sentences max.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth check ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Process request ---
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AAR engine offline.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { type, metrics, playerData: rawPlayer } = await req.json();
    if (!type || !metrics) {
      return new Response(JSON.stringify({ error: 'Missing type or metrics' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const playerData = {
      level: sanitizeNum(rawPlayer?.level, 1),
      stats: sanitizeStats(rawPlayer?.stats),
      streak: sanitizeNum(rawPlayer?.streak),
      goal: sanitizeStr(rawPlayer?.goal, 200),
    };

    const userPrompt = `Generate After-Action Review for today.

METRICS:
- Quests Planned: ${metrics.questsPlanned}
- Quests Completed: ${metrics.questsCompleted}
- Completion Rate: ${metrics.completionRate}%
- XP Earned: ${metrics.xpEarned}
- XP vs Daily Average: ${metrics.xpVsDailyAverage > 0 ? '+' : ''}${metrics.xpVsDailyAverage}%
- Peak Window Utilization: ${metrics.peakWindowUtilization}%
- Crash Window Violations: ${metrics.crashWindowViolations}
- Focus Minutes: ${metrics.totalFocusMinutes}
- Sprints: ${metrics.sprintsCompleted}
- Day Grade: ${metrics.dayGrade}

PLAYER:
- Level: ${playerData.level}
- Stats: ${JSON.stringify(playerData.stats)}
- Streak: ${playerData.streak}
- Goal: ${playerData.goal || 'Not set'}

Generate the review using the generate_aar tool.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: AAR_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_aar',
              description: 'Generate the After-Action Review analysis.',
              parameters: {
                type: 'object',
                properties: {
                  winOfTheDay: {
                    type: 'string',
                    description: 'Single biggest win with evidence. Max 2 sentences.',
                  },
                  missOfTheDay: {
                    type: 'string',
                    description: 'Single biggest miss with evidence. Max 2 sentences.',
                  },
                  patternObserved: {
                    type: 'string',
                    description: 'Emerging pattern if detected (null if none). Max 2 sentences.',
                  },
                  tomorrowPriority: {
                    type: 'string',
                    description: 'Tomorrow\'s #1 priority based on gaps. Max 1 sentence.',
                  },
                  resistancePatterns: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of resistance patterns observed (0-3 items).',
                  },
                  momentumPeriods: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of momentum periods observed (0-3 items).',
                  },
                },
                required: ['winOfTheDay', 'missOfTheDay', 'tomorrowPriority'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'generate_aar' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited. Try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Credits exhausted.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await response.text();
      console.error('AAR AI error:', response.status, t);
      return new Response(JSON.stringify({ error: 'AAR generation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      winOfTheDay: 'Data processed.',
      missOfTheDay: 'Analysis incomplete.',
      tomorrowPriority: 'Execute with consistency.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('AAR error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
