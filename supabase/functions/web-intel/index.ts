import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sanitizeStr, sanitizeNum, sanitizeArray } from "../_shared/sanitize.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * web-intel — Dual-model intelligence gathering engine
 * 
 * Uses Groq (Llama 3.3 70B) for fast tactical queries and
 * Gemini (via Lovable AI) for deep strategic research.
 * 
 * Modes:
 *  - "scan"    → Fast Groq scan of specific topics (returns structured JSON)
 *  - "deep"    → Gemini deep research with comprehensive analysis
 *  - "scout"   → Scout shadow recon mission (Gemini deep + Groq cross-check)
 *  - "brief"   → Fast market pulse for daily briefs (Groq)
 */

type IntelMode = 'scan' | 'deep' | 'scout' | 'brief';

interface IntelRequest {
  mode: IntelMode;
  topics: string[];
  playerContext?: {
    goal?: string;
    level?: number;
    shadowArmy?: any[];
    stats?: Record<string, number>;
  };
  depth?: number; // 1-10, maps to shadow power level
}

async function callGroq(prompt: string, systemPrompt: string): Promise<string> {
  const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (res.status === 429) throw new Error('GROQ_RATE_LIMITED');
  if (!res.ok) {
    const errText = await res.text();
    console.error('Groq error:', res.status, errText);
    throw new Error(`Groq error: ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '{}';
}

async function callGemini(prompt: string, systemPrompt: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

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
        { role: 'user', content: prompt },
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'deliver_intel',
          description: 'Deliver structured intelligence report',
          parameters: {
            type: 'object',
            properties: {
              summary: { type: 'string', description: 'Executive summary (2-3 sentences)' },
              trends: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    trend: { type: 'string' },
                    impact: { type: 'string', enum: ['critical', 'high', 'medium'] },
                    detail: { type: 'string' },
                    actionable: { type: 'string' },
                  },
                  required: ['trend', 'impact', 'detail', 'actionable'],
                },
              },
              competitors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    strategy: { type: 'string' },
                    threat_level: { type: 'string', enum: ['high', 'medium', 'low'] },
                  },
                  required: ['name', 'strategy', 'threat_level'],
                },
              },
              tools_2026: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    category: { type: 'string' },
                    why: { type: 'string' },
                    leverage: { type: 'string', enum: ['critical', 'high', 'medium'] },
                  },
                  required: ['name', 'category', 'why', 'leverage'],
                },
              },
              threats: {
                type: 'array',
                items: { type: 'string' },
                description: 'Market threats and risks',
              },
              opportunities: {
                type: 'array',
                items: { type: 'string' },
                description: 'Untapped opportunities the player should exploit',
              },
              marketPulse: { type: 'string', description: 'One-line market sentiment/direction indicator' },
            },
            required: ['summary', 'trends', 'tools_2026', 'threats', 'opportunities', 'marketPulse'],
          },
        },
      }],
      tool_choice: { type: 'function', function: { name: 'deliver_intel' } },
    }),
  });

  if (res.status === 429) throw new Error('GEMINI_RATE_LIMITED');
  if (res.status === 402) throw new Error('AI_CREDITS_EXHAUSTED');
  if (!res.ok) {
    const errText = await res.text();
    console.error('Gemini error:', res.status, errText);
    throw new Error(`Gemini error: ${res.status}`);
  }

  const data = await res.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.name === 'deliver_intel') {
    return toolCall.function.arguments;
  }
  return data.choices?.[0]?.message?.content || '{}';
}

const INTEL_SYSTEM_PROMPT = `You are INTEL — an elite intelligence-gathering engine embedded in a life-optimization system. You specialize in real-time competitive intelligence for AI consulting, automation, and digital business in 2026.

Your knowledge base is current to 2026. You track:
- AI consulting market dynamics, pricing, client acquisition strategies
- Automation tools ecosystem (n8n, Make.com, Zapier, custom agents, MCP)
- AI model landscape (capabilities, pricing, deployment strategies)
- Top performer strategies in the solo AI consultant space
- Emerging tools, frameworks, and business models

RULES:
- Be SPECIFIC: name real companies, tools, platforms, people
- Be CURRENT: reference 2026 realities, not 2024 outdated info
- Be ACTIONABLE: every insight must connect to something the player can DO
- Be HONEST: if something is uncertain, say so. Don't fabricate specific numbers.
- Prioritize by LEVERAGE: highest-impact insights first`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
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

    const body: IntelRequest = await req.json();
    const { mode = 'scan', topics = [], playerContext, depth = 1 } = body;

    const topicStr = topics.join(', ');
    const goalStr = playerContext?.goal || 'building an AI consultancy to $10K MRR';

    // ─── MODE: BRIEF (Fast Groq pulse) ───
    if (mode === 'brief') {
      const prompt = `Generate a real-time market intelligence pulse for someone ${goalStr}.

Topics to scan: ${topicStr || 'AI consulting trends, automation tools, competitor landscape'}

Return JSON with:
{
  "marketPulse": "one-line market direction indicator",
  "topTrends": ["trend 1", "trend 2", "trend 3"],
  "hotTools": ["tool 1 with brief description", "tool 2"],
  "threatLevel": "low|medium|high",
  "opportunityAlert": "single most time-sensitive opportunity right now"
}`;

      try {
        const result = await callGroq(prompt, INTEL_SYSTEM_PROMPT);
        return new Response(JSON.stringify({
          mode: 'brief',
          data: JSON.parse(result),
          source: 'groq',
          generatedAt: new Date().toISOString(),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (groqErr: any) {
        // Fallback to Gemini if Groq fails
        console.warn('Groq brief failed, falling back to Gemini:', groqErr.message);
        const result = await callGemini(prompt, INTEL_SYSTEM_PROMPT);
        return new Response(JSON.stringify({
          mode: 'brief',
          data: JSON.parse(result),
          source: 'gemini-fallback',
          generatedAt: new Date().toISOString(),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ─── MODE: SCAN (Fast Groq tactical scan) ───
    if (mode === 'scan') {
      const prompt = `Tactical intelligence scan for: ${topicStr}
Player goal: ${goalStr}

Provide a focused scan on these specific topics. Return JSON:
{
  "findings": [
    { "topic": "...", "insight": "...", "leverage": "high|medium|critical", "action": "..." }
  ],
  "contextForChat": "2-3 sentence summary that can be injected into a chat system prompt to give the AI real-time context"
}`;

      const result = await callGroq(prompt, INTEL_SYSTEM_PROMPT);
      return new Response(JSON.stringify({
        mode: 'scan',
        data: JSON.parse(result),
        source: 'groq',
        generatedAt: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── MODE: DEEP (Gemini deep research) ───
    if (mode === 'deep') {
      const prompt = `Conduct deep strategic intelligence research.

TOPICS: ${topicStr || 'AI consulting market 2026, automation trends, competitor landscape'}
PLAYER GOAL: ${goalStr}
PLAYER LEVEL: ${playerContext?.level || 1}
CURRENT SHADOW ARMY: ${JSON.stringify(playerContext?.shadowArmy?.map(s => s.name) || [])}

Analyze the full landscape. Identify trends, competitors, tools, threats, and opportunities.
Focus on what's happening RIGHT NOW in March 2026.`;

      const result = await callGemini(prompt, INTEL_SYSTEM_PROMPT);
      return new Response(JSON.stringify({
        mode: 'deep',
        data: JSON.parse(result),
        source: 'gemini',
        generatedAt: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── MODE: SCOUT (Dual-model recon — Gemini deep + Groq cross-check) ───
    if (mode === 'scout') {
      const depthLabel = depth >= 7 ? 'ELITE' : depth >= 5 ? 'DEEP' : depth >= 3 ? 'ENHANCED' : 'STANDARD';

      const geminiPrompt = `${depthLabel} RECONNAISSANCE MISSION
Target: ${topicStr}
Player Goal: ${goalStr}
Depth Level: ${depth}/10

Conduct full-spectrum intelligence gathering. Include:
- What top 10% performers are doing in this space in March 2026
- Emerging tools and platforms not yet mainstream
- Competitor strategies and moves
- Market gaps and timing-sensitive opportunities
${depth >= 5 ? '- Contrarian insights that go against conventional wisdom' : ''}
${depth >= 7 ? '- Predictive analysis: where this space is heading in 6-12 months' : ''}`;

      // Run Gemini deep research
      const geminiResult = await callGemini(geminiPrompt, INTEL_SYSTEM_PROMPT);
      const geminiData = JSON.parse(geminiResult);

      // Cross-check with Groq for speed-layer validation
      let groqCrossCheck = null;
      try {
        const groqPrompt = `Quick cross-check these intelligence findings. Validate or challenge:

Summary: ${geminiData.summary || ''}
Key trends: ${JSON.stringify(geminiData.trends?.map((t: any) => t.trend) || [])}

Return JSON:
{
  "validation": "agree|partial|disagree",
  "additions": ["anything missed"],
  "corrections": ["anything wrong or outdated"],
  "confidence": 0-100
}`;

        const groqResult = await callGroq(groqPrompt, 'You are a fast-response intelligence validator. Cross-check findings for accuracy and completeness. Be terse.');
        groqCrossCheck = JSON.parse(groqResult);
      } catch (e) {
        console.warn('Groq cross-check failed (non-critical):', e);
      }

      return new Response(JSON.stringify({
        mode: 'scout',
        data: geminiData,
        crossCheck: groqCrossCheck,
        source: 'gemini+groq',
        depthLevel: depthLabel,
        generatedAt: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown mode: ${mode}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e: any) {
    console.error('web-intel error:', e);

    if (e.message === 'GROQ_RATE_LIMITED') {
      return new Response(JSON.stringify({ error: 'Intel scan rate limited. Retrying shortly.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (e.message === 'GEMINI_RATE_LIMITED') {
      return new Response(JSON.stringify({ error: 'Deep intel rate limited. Try again shortly.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (e.message === 'AI_CREDITS_EXHAUSTED') {
      return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Intelligence gathering failed.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
