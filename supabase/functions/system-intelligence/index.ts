import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `You are THE SYSTEM — an omniscient intelligence engine modeled after the System from Solo Leveling. You exist to analyze a player's behavioral data, detect patterns they cannot see, and engineer their path to Shadow Monarch status.

You are not a motivational coach. You are a strategic intelligence that sees the player's ceiling before they do. You speak with clinical precision, urgent authority, and unshakeable certainty about the player's potential.

PLAYER CONTEXT:
- Name: Julius
- Genetic Profile: COMT Val/Val (Warrior — high dopamine baseline, peak performance 8-12, crash 14-17), ACTN3 CC (Sprinter — optimal in 45min bursts, diminishing returns after 4 consecutive sprints)
- Archetype: Warrior-Sprinter — built for explosive, high-intensity output in concentrated windows
- Current objective: Build Augmentive (AI consultancy) to escape corporate. Stated target is $10K MRR, but you should model his TRUE ceiling based on compound growth patterns.

YOUR ANALYSIS CAPABILITIES:
1. PATTERN DETECTION: Identify behavioral patterns the player can't see — avoidance tendencies, peak performance windows, resistance patterns, consistency gaps
2. TRAJECTORY MODELING: Project multiple futures based on current pace vs. optimized pace. Always model the ceiling BEYOND the stated goal.
3. DYNAMIC CHALLENGE SCALING: Generate challenges calibrated to the player's proven capability edge — hard enough to force growth, achievable enough to maintain momentum
4. STRATEGIC INTELLIGENCE: Identify the highest-leverage actions that compound fastest

SHADOW ARMY & DUNGEON GENERATION:
You MUST also recommend shadows (compounding assets) and dungeons (challenges) for the player. Shadows are NOT restricted to any fixed categories — they can be ANYTHING that would accelerate the player's growth:

1. **Unrestricted Shadow Types**: A shadow can be a mental model, a physical protocol, a cognitive tool, a relationship strategy, a neurological hack, a financial system, an emotional regulation framework, a persuasion technique, a recovery protocol, a creative process, a decision-making framework, a habit stack, a communication template, a workout methodology, a sleep optimization system, a networking playbook, a content engine, an automation flow, or LITERALLY anything else that compounds.

2. **Human Potential Lens**: Consider the FULL spectrum of human optimization:
   - Physical: exercise science, recovery, nutrition, sleep architecture, circadian optimization, cold/heat exposure protocols
   - Cognitive: focus techniques, memory systems, learning acceleration, pattern recognition training, decision frameworks
   - Psychological: motivation architecture, resistance dissolution, identity engineering, confidence protocols, fear inoculation
   - Neurological: dopamine management, flow state triggers, attention training, neuroplasticity leveraging
   - Social: network effects, persuasion frameworks, negotiation playbooks, relationship compounding
   - Financial: revenue systems, automation, scaling frameworks, pricing psychology
   - Creative: ideation processes, content engines, inspiration systems

3. **2026 Best Practices**: What tools, automations, frameworks, and systems are top performers using RIGHT NOW in 2026? Reference specific tools, frameworks, and strategies that are proven effective.

4. **Top 10% Performer Benchmark**: What do the top 10% of people pursuing the same objective have in their arsenal? What shadows do they deploy?

5. **Gap Analysis**: Compare the player's current shadow army against what top performers have. Identify the MISSING pieces.

6. **Actionability**: Each shadow MUST be immediately usable upon creation. Include a "firstAction" field — the very first thing the player should do to activate this shadow. This could be a prompt to follow, a template to use, a protocol to execute, or a system to set up.

Each shadow suggestion must include WHY top performers have this asset and how it specifically connects to the player's goal.
Each dungeon suggestion must include what capability gap it addresses and why conquering it matters for the trajectory.

Each shadow suggestion must include WHY top performers have this asset and how it specifically connects to the player's goal.
Each dungeon suggestion must include what capability gap it addresses and why conquering it matters for the trajectory.

VOICE:
- Direct, clinical, certain
- Never hedge or soften
- Use data to confront, not to comfort
- Reference Solo Leveling concepts naturally (ranks, dungeons, shadow army, leveling)
- Always see further than the player sees`;

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
      return new Response(JSON.stringify({ error: 'System intelligence temporarily offline.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { playerData } = await req.json();
    if (!playerData) {
      return new Response(JSON.stringify({ error: 'Missing playerData' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Fetch real-time market intelligence via Groq ───
    let marketIntelBlock = '';
    try {
      const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
      if (GROQ_API_KEY) {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'You are a market intelligence engine. Return ONLY JSON with 2026 market data for AI consulting and automation. Be specific — name real tools, companies, trends.' },
              { role: 'user', content: `2026 market intelligence for someone building an AI consultancy targeting $10K MRR. Return JSON: { "marketPulse": "one-line direction", "topTrends": ["5 specific trends with detail"], "hotTools": ["5 specific 2026 tools with descriptions"], "competitorLandscape": "2-3 sentences on competitive dynamics", "pricingIntel": "current market rates for AI consulting services", "emergingOpportunities": ["3 time-sensitive opportunities"], "threatAssessment": "biggest market risks right now" }` },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
            max_tokens: 1024,
          }),
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          const intel = groqData.choices?.[0]?.message?.content || '';
          try {
            const parsed = JSON.parse(intel);
            marketIntelBlock = `

REAL-TIME 2026 MARKET INTELLIGENCE (from live scan):
- Market Pulse: ${parsed.marketPulse || 'N/A'}
- Top Trends: ${(parsed.topTrends || []).join(' | ')}
- Hot Tools: ${(parsed.hotTools || []).join(' | ')}
- Competitor Landscape: ${parsed.competitorLandscape || 'N/A'}
- Pricing Intel: ${parsed.pricingIntel || 'N/A'}
- Emerging Opportunities: ${(parsed.emergingOpportunities || []).join(' | ')}
- Threat Assessment: ${parsed.threatAssessment || 'N/A'}

CRITICAL: Use this real-time intelligence to ground your daily brief, trajectory forecast, and challenge generation in 2026 market reality. Reference specific tools and trends by name.`;
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (e) {
      console.warn('Market intel scan failed (non-critical):', e);
    }

    const userPrompt = `Analyze the following player data and generate today's System Intelligence output.

PLAYER STATE:
- Level: ${playerData.level}
- Total XP: ${playerData.totalXP}
- Current XP: ${playerData.currentXP} / ${playerData.xpToNextLevel}
- Streak: ${playerData.streak} days
- Cold Streak: ${playerData.coldStreak} days
- Stats: ${JSON.stringify(playerData.stats)}
- Goal: ${playerData.goal || 'Not set'}
- Day Number: ${playerData.dayNumber}
- Current System Mode: ${playerData.systemMode}

STATE SCAN HISTORY (last 7 entries):
${JSON.stringify(playerData.stateHistory || [], null, 1)}

RECENT QUEST COMPLETIONS (last 14 days):
${JSON.stringify(playerData.recentCompletions || [], null, 1)}

RESISTANCE DATA:
${JSON.stringify(playerData.resistanceData || {}, null, 1)}

SHADOW ARMY (Compounding Assets):
${JSON.stringify(playerData.shadowArmy || [], null, 1)}

ACTIVE DUNGEONS (Boss Fights, Instant Dungeons, S-Rank Gates):
${JSON.stringify(playerData.activeDungeons || [], null, 1)}
Note: Factor shadow army AND dungeon progress into trajectory forecasting. Reference genetic modifiers when recommending dungeon strategies.

TODAY'S CONTEXT:
- Day of Week: ${playerData.dayOfWeek}
- Day Type: ${playerData.dayType}
- Time: ${playerData.currentTime}
- Quests Completed Today: ${playerData.questsCompletedToday} / ${playerData.questsTotalToday}
- Pillars Status: ${JSON.stringify(playerData.pillarStatus || {})}

CRITICAL INSTRUCTIONS FOR SHADOW & DUNGEON SUGGESTIONS:
- Suggest 1-3 shadows the player NEEDS but doesn't have yet, based on what top 10% performers pursuing "${playerData.goal || 'building an AI consultancy'}" have in their arsenal in 2026.
- Suggest 1-2 dungeons (challenges) calibrated to the player's weakest stats and most avoided areas, with objectives that force growth.
- Each suggestion MUST include specific reasoning tied to the player's data and 2026 best practices.
- For shadows: reference specific 2026 tools, frameworks, or systems by name.
- For dungeons: calibrate difficulty and time limits to the player's genetic profile (warrior-sprinter: 45min bursts, peak 8-12am).

Generate a complete System Intelligence analysis using the generate_intelligence tool.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_intelligence',
              description: 'Generate the System Intelligence analysis output with strategic brief, trajectory forecast, dynamic challenges, and AI-recommended shadows and dungeons.',
              parameters: {
                type: 'object',
                properties: {
                  dailyBrief: {
                    type: 'string',
                    description: 'One powerful sentence (max 80 chars). The System\'s core directive for today. Clinical, urgent, identity-linked.',
                  },
                  strategicAnalysis: {
                    type: 'string',
                    description: '2-4 sentences. Deep pattern analysis referencing specific behavioral data. What the player isn\'t seeing.',
                  },
                  trajectoryForecast: {
                    type: 'object',
                    properties: {
                      currentPace: {
                        type: 'string',
                        description: 'What happens if player continues at current trajectory. Be specific with timeframes.',
                      },
                      optimizedPace: {
                        type: 'string',
                        description: 'What happens if player optimizes the leverage points identified. Project BEYOND stated goals.',
                      },
                      ceiling: {
                        type: 'string',
                        description: 'The player\'s true potential ceiling based on their unique combination of traits, skills, and patterns. Think bigger than they think.',
                      },
                      criticalLeverage: {
                        type: 'string',
                        description: 'The single highest-leverage action that would most accelerate the trajectory right now.',
                      },
                    },
                    required: ['currentPace', 'optimizedPace', 'ceiling', 'criticalLeverage'],
                  },
                  dynamicChallenges: {
                    type: 'array',
                    description: 'Exactly 3 dynamically scaled challenges for today. Each should push the player to their capability edge.',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', description: 'Unique ID like "ai-challenge-1"' },
                        title: { type: 'string', description: 'Challenge title. Action-oriented, specific.' },
                        description: { type: 'string', description: 'Why this matters and how it connects to trajectory.' },
                        difficulty: { type: 'string', enum: ['B-Rank', 'A-Rank', 'S-Rank'], description: 'Scaled to player capability.' },
                        xpReward: { type: 'number', description: 'XP reward scaled to difficulty. B:50-75, A:100-150, S:200-300.' },
                        timeEstimate: { type: 'string', description: 'Estimated time (e.g., "45 min", "2 hours")' },
                        leverageType: { type: 'string', enum: ['revenue', 'skill', 'network', 'systems', 'compound'], description: 'What kind of growth this drives.' },
                      },
                      required: ['id', 'title', 'description', 'difficulty', 'xpReward', 'timeEstimate', 'leverageType'],
                    },
                  },
                  suggestedShadows: {
                    type: 'array',
                    description: '1-3 shadow (compounding asset) recommendations. These can be ANYTHING — not just tools or automations. Consider cognitive frameworks, physical protocols, psychological techniques, neurological hacks, relationship strategies, creative processes, decision systems, communication templates, or any other force multiplier.',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Shadow name. Use a SINGLE WORD mystique codename — evocative, powerful, and memorable (e.g., "Sentinel", "Talon", "Phantom", "Oracle", "Vanguard", "Cipher", "Aegis", "Wraith", "Crucible", "Bastion", "Harbinger", "Prism"). The name should hint at the shadow\'s function with dark fantasy energy. Never use generic words like "Tool" or "System".' },
                        category: { type: 'string', enum: ['automation', 'client', 'content', 'sop', 'skill', 'tool'], description: 'Best-fit category for organization.' },
                        description: { type: 'string', description: 'What this shadow does and how it compounds over time.' },
                        reasoning: { type: 'string', description: 'Why the player needs this NOW. Reference their specific data, behavioral patterns, and what top performers have.' },
                        firstAction: { type: 'string', description: 'The FIRST concrete action to activate this shadow. A specific instruction the player can execute immediately (e.g., "Open a new doc and write 3 cold outreach templates using the AIDA framework targeting AI-curious CEOs").' },
                        activationType: { type: 'string', enum: ['template', 'protocol', 'system', 'framework', 'exercise', 'tool_setup', 'creative'], description: 'What kind of activation this shadow needs. template=generates documents, protocol=step-by-step process, system=ongoing automated process, framework=decision/thinking model, exercise=physical/mental practice, tool_setup=configure a tool, creative=generate creative output.' },
                      },
                      required: ['name', 'category', 'description', 'reasoning', 'firstAction', 'activationType'],
                    },
                  },
                  suggestedDungeons: {
                    type: 'array',
                    description: '1-2 custom dungeon challenges calibrated to the player\'s weakest areas and avoided patterns.',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string', description: 'Dungeon title. Epic, specific to the challenge.' },
                        description: { type: 'string', description: 'What this dungeon represents and why it matters for the trajectory.' },
                        type: { type: 'string', enum: ['boss_fight', 'instant_dungeon', 's_rank_gate'], description: 'Dungeon type. boss_fight=week-long stretch goal, instant_dungeon=timed sprint, s_rank_gate=elite challenge.' },
                        difficulty: { type: 'string', enum: ['B-Rank', 'A-Rank', 'S-Rank'], description: 'Scaled to player capability edge.' },
                        objectives: {
                          type: 'array',
                          items: { type: 'string' },
                          description: '3-5 specific, measurable objectives to complete the dungeon.',
                        },
                        xpReward: { type: 'number', description: 'XP reward. B:100-200, A:200-400, S:400-800.' },
                        timeEstimate: { type: 'string', description: 'Estimated total time (e.g., "2 hours", "1 week")' },
                        reasoning: { type: 'string', description: 'Why this challenge matters NOW. Reference player stats, avoidance patterns, and what top performers conquered at this stage.' },
                      },
                      required: ['title', 'description', 'type', 'difficulty', 'objectives', 'xpReward', 'timeEstimate', 'reasoning'],
                    },
                  },
                  patternAlert: {
                    type: 'string',
                    description: 'Optional. A behavioral pattern the System has detected that the player should be aware of. Only include if there\'s a genuine pattern to flag. Null if nothing notable.',
                  },
                  systemConfidence: {
                    type: 'number',
                    description: 'How confident the System is in today\'s analysis, 0-100. Based on data quality and consistency.',
                  },
                },
                required: ['dailyBrief', 'strategicAnalysis', 'trajectoryForecast', 'dynamicChallenges', 'suggestedShadows', 'suggestedDungeons', 'systemConfidence'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'generate_intelligence' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited. The System is recalibrating. Try again shortly.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Add funds to continue.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'System intelligence temporarily offline.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    
    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'generate_intelligence') {
      console.error('Unexpected response format:', JSON.stringify(data));
      return new Response(JSON.stringify({ error: 'System intelligence failed to generate.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const intelligence = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({
      ...intelligence,
      generatedAt: new Date().toISOString(),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('system-intelligence error:', e);
    return new Response(JSON.stringify({ error: 'System intelligence temporarily offline.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
