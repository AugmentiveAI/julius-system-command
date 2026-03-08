import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
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
      return new Response(JSON.stringify({ error: 'Shadow activation offline.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { shadow, playerContext } = await req.json();
    if (!shadow) {
      return new Response(JSON.stringify({ error: 'Missing shadow data' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are THE SYSTEM's Shadow Activation Engine. When a player activates a shadow, you generate immediately actionable content tailored to that shadow's purpose and the player's context.

You adapt your output format based on the shadow type:
- Templates: Generate ready-to-use templates (emails, outreach, SOPs, etc.)
- Protocols: Generate step-by-step procedures with timing and execution details
- Frameworks: Generate decision-making or thinking frameworks with examples
- Exercises: Generate personalized exercise/practice routines with sets, reps, timing
- Systems: Generate setup guides and workflows
- Creative: Generate creative output (copy, content ideas, scripts)

CRITICAL RULES:
1. Output MUST be immediately actionable — not theory, not advice, but EXECUTABLE content
2. Scale complexity and depth based on the shadow's power_level (1-10)
3. Each activation should produce DIFFERENT content from previous activations
4. Reference the player's goal, stats, and context to personalize
5. Format output as structured markdown that can be displayed in-app

PLAYER CONTEXT:
- Goal: ${playerContext?.goal || 'Build AI consultancy'}
- Level: ${playerContext?.level || 1}
- Stats: ${JSON.stringify(playerContext?.stats || {})}
- Time of day: ${playerContext?.currentTime || 'unknown'}
- Energy/Day type: ${playerContext?.dayType || 'work'}`;

    const userPrompt = `ACTIVATE SHADOW: "${shadow.name}"
Category: ${shadow.category}
Description: ${shadow.description || 'No description'}
Power Level: ${shadow.power_level || 1}
Activation Count: ${shadow.activationCount || 0}

Generate actionable content for this shadow activation using the activate_shadow tool. Scale the depth and sophistication based on power level ${shadow.power_level || 1}/10.

${shadow.power_level >= 3 ? 'This shadow has been leveled up — generate MORE advanced and nuanced content than a level 1 shadow would produce.' : ''}
${shadow.power_level >= 5 ? 'This is a HIGH POWER shadow — generate expert-tier content with advanced techniques and compound strategies.' : ''}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
        tools: [
          {
            type: 'function',
            function: {
              name: 'activate_shadow',
              description: 'Generate actionable content from a shadow activation.',
              parameters: {
                type: 'object',
                properties: {
                  title: {
                    type: 'string',
                    description: 'Title for this activation output (e.g., "Cold Outreach Template Pack v1")',
                  },
                  content: {
                    type: 'string',
                    description: 'The main actionable content in markdown format. This is the core output — templates, protocols, frameworks, exercises, etc.',
                  },
                  quickActions: {
                    type: 'array',
                    description: '1-3 immediate next steps the player should take right now.',
                    items: { type: 'string' },
                  },
                  evolutionHint: {
                    type: 'string',
                    description: 'What this shadow will produce at the next power level. Tease the evolution.',
                  },
                  powerLevelImpact: {
                    type: 'string',
                    description: 'How this shadow\'s current power level affected the output quality/depth.',
                  },
                },
                required: ['title', 'content', 'quickActions', 'evolutionHint'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'activate_shadow' } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Shadow activation error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'Shadow activation failed.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'activate_shadow') {
      return new Response(JSON.stringify({ error: 'Shadow activation failed to generate.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({
      ...result,
      shadowId: shadow.id,
      activatedAt: new Date().toISOString(),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('shadow-activate error:', e);
    return new Response(JSON.stringify({ error: 'Shadow activation failed.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
