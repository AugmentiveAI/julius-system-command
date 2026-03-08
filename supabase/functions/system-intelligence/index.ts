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
You MUST also recommend shadows (compounding assets) and dungeons (challenges) for the player. Base these on:

1. **2026 Best Practices**: What tools, automations, frameworks, and systems are top performers using RIGHT NOW in 2026? Reference specific tools (n8n, Make.com, Claude, Cursor, Lovable, etc.), frameworks, and strategies that are proven effective.

2. **Top 10% Performer Benchmark**: For the player's specific goal, what do the top 10% of people pursuing the same objective have in their arsenal? What shadows (automations, SOPs, skills, tools) do they deploy? What challenges have they conquered to get there?

3. **Gap Analysis**: Compare the player's current shadow army and completed dungeons against what top performers have. Identify the MISSING pieces — the shadows they haven't extracted and the challenges they haven't faced.

4. **Behavioral Evidence**: Use the player's quest history, stat distribution, resistance patterns, and avoidance tendencies to recommend shadows that address weaknesses and dungeons that force growth in avoided areas.

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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { playerData } = await req.json();
    if (!playerData) {
      return new Response(JSON.stringify({ error: 'Missing playerData' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
                    description: '1-3 shadow (compounding asset) recommendations based on what top 10% performers with the same goal use in 2026, and what gaps exist in the player\'s current army.',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Shadow name. Specific and actionable (e.g., "n8n Lead Nurture Flow", "Client Onboarding SOP").' },
                        category: { type: 'string', enum: ['automation', 'client', 'content', 'sop', 'skill', 'tool'], description: 'Shadow category.' },
                        description: { type: 'string', description: 'What this shadow does and how it compounds.' },
                        reasoning: { type: 'string', description: 'Why the player needs this NOW. Reference their specific data, 2026 best practices, and what top 10% performers have.' },
                      },
                      required: ['name', 'category', 'description', 'reasoning'],
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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
