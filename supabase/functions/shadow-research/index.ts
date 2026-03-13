import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sanitizeStr } from "../_shared/sanitize.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function generateId(): string {
  return `finding-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub as string;
    const rateLimited = await checkRateLimit(supabase, userId, 'shadow-research', corsHeaders);
    if (rateLimited) return rateLimited;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI gateway not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { shadowId, shadowName, sources, searchPatterns, priorityThreshold, playerGoal } = await req.json();

    if (!sources || sources.length === 0) {
      return new Response(JSON.stringify({ findings: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const safeName = sanitizeStr(shadowName || 'Shadow', 100);
    const safeGoal = sanitizeStr(playerGoal || 'Build business', 200);
    const safeKeywords = (searchPatterns?.keywords || []).slice(0, 10).map((k: string) => sanitizeStr(k, 50));
    const safeTopics = (searchPatterns?.topics || []).slice(0, 5).map((t: string) => sanitizeStr(t, 100));
    const safeSources = sources.slice(0, 10).map((s: any) => ({
      type: sanitizeStr(s.type, 20),
      target: sanitizeStr(s.target, 100),
    }));

    const sourcesDescription = safeSources
      .map((s: any) => `${s.type}: ${s.target}`)
      .join(', ');

    const prompt = `You are "${safeName}", an autonomous research shadow deployed by THE SYSTEM.

MISSION: Monitor these sources for intelligence relevant to the player's goals.

PLAYER GOAL: ${safeGoal}

SOURCES TO MONITOR: ${sourcesDescription}

KEYWORDS: ${safeKeywords.join(', ')}
TOPICS: ${safeTopics.join(', ')}

PRIORITY THRESHOLD: Only include findings with relevanceScore >= ${priorityThreshold || 5}

Simulate checking these sources for recent, relevant content. Generate 2-4 realistic research findings based on what these sources would likely be discussing in March 2026.

For each finding, assess relevance to the player's goal and provide actionable insights.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a research intelligence agent. Return findings using the research_findings tool.',
          },
          { role: 'user', content: prompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'research_findings',
              description: 'Return structured research findings from source monitoring.',
              parameters: {
                type: 'object',
                properties: {
                  findings: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string' },
                        summary: { type: 'string' },
                        keyInsights: { type: 'array', items: { type: 'string' } },
                        relevanceScore: { type: 'number', description: '1-10' },
                        actionability: { type: 'number', description: '1-10' },
                        sourceType: { type: 'string' },
                        sourceTarget: { type: 'string' },
                        sourceUrl: { type: 'string' },
                      },
                      required: ['title', 'summary', 'keyInsights', 'relevanceScore', 'actionability', 'sourceType', 'sourceTarget'],
                    },
                  },
                },
                required: ['findings'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'research_findings' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited', findings: [] }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted', findings: [] }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errText = await response.text();
      console.error('Shadow research AI error:', response.status, errText);
      return new Response(JSON.stringify({ findings: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== 'research_findings') {
      return new Response(JSON.stringify({ findings: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const findings = (parsed.findings || [])
      .filter((f: any) => f.relevanceScore >= (priorityThreshold || 5))
      .map((f: any) => ({
        id: generateId(),
        shadowId,
        timestamp: new Date().toISOString(),
        source: {
          type: f.sourceType,
          target: f.sourceTarget,
          url: f.sourceUrl || undefined,
        },
        content: {
          title: f.title,
          summary: f.summary,
          keyInsights: f.keyInsights || [],
          relevanceScore: f.relevanceScore,
          actionability: f.actionability,
        },
        status: 'new',
      }));

    return new Response(JSON.stringify({ findings }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('shadow-research error:', e);
    return new Response(JSON.stringify({ findings: [], error: 'Research failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
