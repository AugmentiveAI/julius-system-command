import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * ai-quest-proxy — Server-side proxy for AI quest generation.
 * Uses server-stored GROQ_API_KEY and LOVABLE_API_KEY instead of client-side keys.
 */

async function callGroq(prompt: string, apiKey: string): Promise<{ provider: string; response: string }> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (res.status === 429) throw new Error('RATE_LIMITED');
  if (!res.ok) throw new Error(`Provider error: ${res.status}`);

  const data = await res.json();
  return { provider: 'groq', response: data.choices?.[0]?.message?.content || '' };
}

async function callLovableAI(prompt: string, apiKey: string): Promise<{ provider: string; response: string }> {
  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      tools: [{
        type: 'function',
        function: {
          name: 'generate_quests',
          description: 'Generate daily quests',
          parameters: {
            type: 'object',
            properties: {
              quests: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    reason: { type: 'string' },
                    stat: { type: 'string', enum: ['sales', 'systems', 'creative', 'discipline', 'network', 'wealth'] },
                    xp: { type: 'number' },
                  },
                  required: ['title', 'reason', 'stat', 'xp'],
                },
              },
              system_message: { type: 'string' },
            },
            required: ['quests', 'system_message'],
          },
        },
      }],
      tool_choice: { type: 'function', function: { name: 'generate_quests' } },
    }),
  });

  if (res.status === 429) throw new Error('RATE_LIMITED');
  if (res.status === 402) throw new Error('CREDITS_EXHAUSTED');
  if (!res.ok) throw new Error(`Provider error: ${res.status}`);

  const data = await res.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.name === 'generate_quests') {
    return { provider: 'gemini', response: toolCall.function.arguments };
  }
  return { provider: 'gemini', response: data.choices?.[0]?.message?.content || '' };
}

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

    const { prompt, taskType } = await req.json();
    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid prompt' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enforce max prompt length
    const sanitizedPrompt = prompt.slice(0, 8000);

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    // Route: speed/simple → Groq first, strategy/research/analysis → Gemini first
    const useGroqFirst = taskType === 'speed' || taskType === 'simple';
    const providers: Array<() => Promise<{ provider: string; response: string }>> = [];

    if (useGroqFirst) {
      if (GROQ_API_KEY) providers.push(() => callGroq(sanitizedPrompt, GROQ_API_KEY));
      if (LOVABLE_API_KEY) providers.push(() => callLovableAI(sanitizedPrompt, LOVABLE_API_KEY));
    } else {
      if (LOVABLE_API_KEY) providers.push(() => callLovableAI(sanitizedPrompt, LOVABLE_API_KEY));
      if (GROQ_API_KEY) providers.push(() => callGroq(sanitizedPrompt, GROQ_API_KEY));
    }

    if (providers.length === 0) {
      return new Response(JSON.stringify({ error: 'AI services not configured.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    for (let i = 0; i < providers.length; i++) {
      try {
        const result = await providers[i]();
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        console.warn(`Provider ${i} failed:`, err.message);
        if (i < providers.length - 1) continue;

        if (err.message === 'RATE_LIMITED') {
          return new Response(JSON.stringify({ error: 'Rate limited. Try again shortly.' }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (err.message === 'CREDITS_EXHAUSTED') {
          return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), {
            status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ error: 'Quest generation failed.' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'All providers failed.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('ai-quest-proxy error:', e);
    return new Response(JSON.stringify({ error: 'Quest generation failed.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
