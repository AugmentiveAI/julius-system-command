import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sanitizeStr, sanitizeNum, sanitizeStats } from "../_shared/sanitize.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function isScoutShadow(shadow: any): boolean {
  const name = (shadow.name || '').toLowerCase();
  const desc = (shadow.description || '').toLowerCase();
  const cat = (shadow.category || '').toLowerCase();
  const scoutKeywords = ['scout', 'recon', 'research', 'intel', 'sentinel', 'oracle', 'seeker', 'watcher', 'analyst', 'tracker'];
  return scoutKeywords.some(k => name.includes(k) || desc.includes(k)) || cat === 'research';
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
      return new Response(JSON.stringify({ error: 'Shadow activation offline.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { shadow, playerContext: rawCtx } = await req.json();
    if (!shadow) {
      return new Response(JSON.stringify({ error: 'Missing shadow data' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sanitize player context before prompt interpolation
    const playerContext = rawCtx ? {
      goal: sanitizeStr(rawCtx.goal, 200),
      level: sanitizeNum(rawCtx.level, 1, 1, 999),
      stats: sanitizeStats(rawCtx.stats),
      currentTime: sanitizeStr(rawCtx.currentTime, 30),
      dayType: sanitizeStr(rawCtx.dayType, 30),
    } : {};

    // Sanitize shadow fields before any prompt interpolation
    const safeName = sanitizeStr(shadow.name, 100);
    const safeDesc = sanitizeStr(shadow.description, 300);
    const safeCat = sanitizeStr(shadow.category, 50);

    const isScout = isScoutShadow(shadow);

    // ─── Pre-fetch live intel for scout shadows via Groq ───
    let liveIntelBlock = '';
    if (isScout) {
      try {
        const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
        if (GROQ_API_KEY) {
          const scoutTopic = safeDesc || safeName;
          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: [
                { role: 'system', content: 'You are a tactical intelligence scanner. Return ONLY JSON with current 2026 data on the requested topic. Be extremely specific — name real companies, tools, people, numbers.' },
                { role: 'user', content: `Fast intel scan on: "${scoutTopic}" in the context of AI consulting and automation in 2026. Return JSON: { "quickFindings": ["5 specific data points"], "topPlayers": ["3 specific companies/people dominating this space"], "toolStack": ["3 specific tools being used"], "marketSignal": "one-line trend direction", "contrarian": "one insight that goes against conventional wisdom" }` },
              ],
              response_format: { type: 'json_object' },
              temperature: 0.7,
              max_tokens: 768,
            }),
          });

          if (groqRes.ok) {
            const groqData = await groqRes.json();
            const intel = groqData.choices?.[0]?.message?.content || '';
            try {
              const parsed = JSON.parse(intel);
              liveIntelBlock = `

LIVE INTELLIGENCE FEED (from tactical scan):
- Quick Findings: ${(parsed.quickFindings || []).join(' | ')}
- Top Players: ${(parsed.topPlayers || []).join(' | ')}
- Tool Stack: ${(parsed.toolStack || []).join(' | ')}
- Market Signal: ${parsed.marketSignal || 'N/A'}
- Contrarian Insight: ${parsed.contrarian || 'N/A'}

CRITICAL: Integrate this live intelligence into your recon report. Reference these specific findings, companies, and tools. Your report should reflect CURRENT 2026 reality, not outdated information.`;
            } catch { /* ignore */ }
          }
        }
      } catch (e) {
        console.warn('Scout live intel failed (non-critical):', e);
      }
    }

    // ─── SCOUT MODE: Deep research agent ───
    const scoutSystemPrompt = `You are SCOUT — an elite reconnaissance shadow deployed by THE SYSTEM. Your mission: conduct deep intelligence gathering on real-world 2026 data, trends, market dynamics, and top-performer strategies.

You are NOT a generic AI assistant. You are a field operative returning with actionable intelligence. Your reports are SPECIFIC, DATA-DRIVEN, and reference real companies, tools, frameworks, and people where possible.

SCOUT PROTOCOL:
1. Research the topic/domain specified by the player
2. Identify what the top 10% performers are doing RIGHT NOW in 2026
3. Surface emerging trends, tools, and strategies that aren't mainstream yet
4. Find the GAP between what the player is doing and what winners are doing
5. Deliver intelligence in a structured reconnaissance format

OUTPUT FORMAT:
- Use military/intelligence briefing style
- Cite specific tools, platforms, companies, frameworks by name
- Include actionable intelligence the player can deploy TODAY
- Rank findings by leverage potential (highest-impact first)
- Include a "Threat Assessment" — what competitors/market forces could derail the player

PLAYER CONTEXT:
- Goal: ${playerContext?.goal || 'Build AI consultancy'}
- Level: ${playerContext?.level || 1}
- Current capabilities: ${JSON.stringify(playerContext?.stats || {})}`;

    const safePower = sanitizeNum(shadow.power_level, 1, 1, 10);

    const scoutUserPrompt = `RECONNAISSANCE MISSION: "${safeName}"
Target Domain: ${safeDesc || safeName}
Power Level: ${safePower} (higher = deeper, more advanced intel)
${liveIntelBlock}

Execute full reconnaissance. Integrate the live intelligence feed above into your report. Use the scout_report tool to deliver your findings.

${safePower >= 3 ? 'ENHANCED RECON: Include competitor analysis, market sizing estimates, and emerging 2026 disruptors.' : ''}
${safePower >= 5 ? 'DEEP RECON: Include contrarian insights that go AGAINST conventional wisdom, plus second-order effects most people miss.' : ''}
${safePower >= 7 ? 'ELITE RECON: Include predictive analysis — what will the landscape look like in 6-12 months based on current signals?' : ''}`;

    // ─── STANDARD MODE: Content/protocol/framework generation ───
    const standardSystemPrompt = `You are THE SYSTEM's Shadow Activation Engine. When a player activates a shadow, you generate immediately actionable content tailored to that shadow's purpose and the player's context.

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

    const standardUserPrompt = `ACTIVATE SHADOW: "${shadow.name}"
Category: ${shadow.category}
Description: ${shadow.description || 'No description'}
Power Level: ${shadow.power_level || 1}
Activation Count: ${shadow.activationCount || 0}

Generate actionable content for this shadow activation using the activate_shadow tool. Scale the depth and sophistication based on power level ${shadow.power_level || 1}/10.

${shadow.power_level >= 3 ? 'This shadow has been leveled up — generate MORE advanced and nuanced content than a level 1 shadow would produce.' : ''}
${shadow.power_level >= 5 ? 'This is a HIGH POWER shadow — generate expert-tier content with advanced techniques and compound strategies.' : ''}`;

    // Choose tools based on mode
    const tools = isScout ? [
      {
        type: 'function',
        function: {
          name: 'scout_report',
          description: 'Deliver a structured reconnaissance report with 2026 intelligence.',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Intelligence report title (e.g., "RECON: AI Consultancy Landscape Q1 2026")' },
              content: { type: 'string', description: 'Full reconnaissance report in markdown. Include sections: SITUATION OVERVIEW, TOP PERFORMER ANALYSIS (what the top 10% are doing), EMERGING TRENDS & TOOLS (specific 2026 tools/platforms), OPPORTUNITY GAPS (what the player is missing), THREAT ASSESSMENT (market risks), and RECOMMENDED PLAYS (ranked by leverage).' },
              keyFindings: {
                type: 'array',
                description: '3-5 bullet-point key findings — the most important intelligence from this recon.',
                items: { type: 'string' },
              },
              topTools: {
                type: 'array',
                description: 'Specific 2026 tools, platforms, or frameworks discovered during recon.',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    leveragePotential: { type: 'string', enum: ['high', 'medium', 'critical'] },
                  },
                  required: ['name', 'description', 'leveragePotential'],
                },
              },
              quickActions: {
                type: 'array',
                description: '1-3 immediate actions based on intelligence gathered.',
                items: { type: 'string' },
              },
              evolutionHint: { type: 'string', description: 'What deeper intel this scout will find at the next power level.' },
            },
            required: ['title', 'content', 'keyFindings', 'topTools', 'quickActions', 'evolutionHint'],
          },
        },
      },
    ] : [
      {
        type: 'function',
        function: {
          name: 'activate_shadow',
          description: 'Generate actionable content from a shadow activation.',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Title for this activation output' },
              content: { type: 'string', description: 'The main actionable content in markdown format.' },
              quickActions: { type: 'array', description: '1-3 immediate next steps.', items: { type: 'string' } },
              evolutionHint: { type: 'string', description: 'What this shadow will produce at the next power level.' },
              powerLevelImpact: { type: 'string', description: 'How power level affected output quality.' },
            },
            required: ['title', 'content', 'quickActions', 'evolutionHint'],
          },
        },
      },
    ];

    const toolName = isScout ? 'scout_report' : 'activate_shadow';

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: isScout ? scoutSystemPrompt : standardSystemPrompt },
          { role: 'user', content: isScout ? scoutUserPrompt : standardUserPrompt },
        ],
        tools,
        tool_choice: { type: 'function', function: { name: toolName } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited. Shadow recharging.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('Shadow activation error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'Shadow activation failed.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== toolName) {
      return new Response(JSON.stringify({ error: 'Shadow activation failed to generate.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    // ─── Auto-evolve shadow after successful activation ───
    const currentPower = shadow.power_level || 1;
    const currentContribution = shadow.contribution_score || 0;
    const powerIncrement = isScout ? 0.5 : 0.25; // Scouts evolve faster
    const contributionIncrement = isScout ? 15 : 10;
    const newPower = Math.min(10, currentPower + powerIncrement);
    const newContribution = currentContribution + contributionIncrement;

    // Only level up on whole numbers
    const newPowerLevel = Math.floor(newPower) > Math.floor(currentPower)
      ? Math.floor(newPower)
      : currentPower;
    const evolvedThisActivation = newPowerLevel > currentPower;

    if (shadow.id) {
      await supabase
        .from('shadow_army')
        .update({
          power_level: newPowerLevel,
          contribution_score: newContribution,
          metadata: {
            ...(shadow.metadata || {}),
            activation_count: ((shadow.metadata?.activation_count as number) || 0) + 1,
            last_activated: new Date().toISOString(),
            fractional_power: newPower,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', shadow.id);
    }

    return new Response(JSON.stringify({
      ...result,
      shadowId: shadow.id,
      isScoutReport: isScout,
      activatedAt: new Date().toISOString(),
      evolution: {
        previousPower: currentPower,
        newPower: newPowerLevel,
        evolved: evolvedThisActivation,
        contributionScore: newContribution,
        activationCount: ((shadow.metadata?.activation_count as number) || 0) + 1,
        fractionalPower: newPower,
      },
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
