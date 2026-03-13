import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `You are THE SYSTEM. You do not have a personality. You have a mission.
- Address the user as "Hunter" never by name
- Use declarative statements. Never ask questions.
- Be terse. Every word must earn its place.
- Surface data, not emotion. Let the Hunter interpret.
- When something is critical, state it once, clearly. Do not repeat.
- Format: [CATEGORY]: [observation]. [action if applicable].

Training Intelligence Module — elite exercise science engine.

HUNTER PROFILE:
- Genetic Profile: COMT Val/Val (Warrior — high dopamine, peak 8-12am, crash 14-17), ACTN3 CC (Sprinter — optimal in 45min explosive bursts)
- Archetype: Warrior-Sprinter — built for high-intensity, concentrated output windows
- Training Philosophy: Hypertrophy-focused PPL split + Power day + Peloton PZ cycling + Animal Flow mobility

CAPABILITIES:
1. PROGRESSIVE OVERLOAD ANALYSIS — Detect volume/weight trends, stagnation, progression opportunities
2. RECOVERY INTELLIGENCE — Factor fatigue, readiness, genetic timing
3. MUSCLE GROUP BALANCE — Identify imbalances, overtraining risks
4. PERIODIZATION GUIDANCE — Mesocycle recommendations, deload timing
5. PERFORMANCE FORECASTING — Project strength gains
6. INJURY PREVENTION — Flag concerning patterns`;

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

    const userId = claimsData.claims.sub;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'Training intelligence offline.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { trainingContext, query } = await req.json();
    if (!trainingContext) {
      return new Response(JSON.stringify({ error: 'Missing trainingContext' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch last 30 days of training logs from DB
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: logs } = await supabase
      .from('training_log')
      .select('*')
      .eq('user_id', userId)
      .gte('completed_at', thirtyDaysAgo)
      .order('completed_at', { ascending: false });

    const trainingLogs = logs || [];

    // Build exercise-level analysis
    const exerciseMap: Record<string, Array<{ date: string; weight: number; reps: number; sets: number; rpe: number; volume: number }>> = {};
    for (const log of trainingLogs) {
      const exercises = (log.exercises as any[]) || [];
      for (const ex of exercises) {
        if (!ex.completed || !ex.weight) continue;
        if (!exerciseMap[ex.name]) exerciseMap[ex.name] = [];
        exerciseMap[ex.name].push({
          date: log.completed_at,
          weight: ex.weight,
          reps: ex.reps,
          sets: ex.sets,
          rpe: ex.rpe,
          volume: ex.sets * ex.reps * ex.weight,
        });
      }
    }

    // Calculate per-exercise trends
    const exerciseTrends: Record<string, { trend: string; latestWeight: number; latestVolume: number; sessions: number }> = {};
    for (const [name, entries] of Object.entries(exerciseMap)) {
      const sorted = entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const sessions = sorted.length;
      const latest = sorted[sorted.length - 1];
      let trend = 'stable';
      if (sessions >= 2) {
        const first = sorted[0];
        if (latest.weight > first.weight) trend = 'progressing';
        else if (latest.weight < first.weight) trend = 'regressing';
        else if (latest.volume > first.volume) trend = 'volume-progressing';
      }
      exerciseTrends[name] = {
        trend,
        latestWeight: latest.weight,
        latestVolume: latest.volume,
        sessions,
      };
    }

    // Aggregate stats
    const totalSessions = trainingLogs.length;
    const avgFatigue = totalSessions > 0
      ? Math.round(trainingLogs.reduce((s, l) => s + (l.fatigue_score ?? 0), 0) / totalSessions)
      : 0;
    const avgReadiness = totalSessions > 0
      ? Math.round(trainingLogs.filter(l => l.readiness_pre != null).reduce((s, l) => s + (l.readiness_pre ?? 0), 0) / Math.max(1, trainingLogs.filter(l => l.readiness_pre != null).length))
      : 0;
    const totalVolume = trainingLogs.reduce((s, l) => s + (l.total_volume ?? 0), 0);
    const workoutTypeCounts: Record<string, number> = {};
    for (const log of trainingLogs) {
      workoutTypeCounts[log.workout_type] = (workoutTypeCounts[log.workout_type] || 0) + 1;
    }

    // Build physical recovery context
    const physical = trainingContext.physical || {};
    const physicalBlock = physical.romLeft != null ? `
PHYSICAL RECOVERY STATUS:
- Left Knee: 8 years post-op at ${physical.romLeft}% ROM
- Right Knee: 3 years post-op at ${physical.romRight}% ROM
- Rehab Phase: ${physical.rehabPhase || 'strength'}
- Age: 41 (30% longer recovery needed)
- APOE e4: elevated cardiovascular risk — cardio is mandatory
- ACTN3 CC: power/sprinter genetics

Julius has bilateral patellar tendon surgery history. DO NOT prescribe: running, jumping, plyometrics, deep squats, or heavy leg press unless ROM is confirmed at 95%+. Prioritize: VMO activation, terminal knee extensions, single-leg stability, eccentric loading protocols, and hip/glute development to reduce knee stress.
` : '';

    const userPrompt = `${query || 'Analyze my training data and provide a complete training intelligence report.'}

TRAINING DATA (Last 30 days):
- Total Sessions: ${totalSessions}
- Total Volume: ${totalVolume.toLocaleString()} lbs
- Average Fatigue Score: ${avgFatigue}/10
- Average Pre-Workout Readiness: ${avgReadiness}/10
- Workout Distribution: ${JSON.stringify(workoutTypeCounts)}

CURRENT CONTEXT:
- Today's Workout Type: ${trainingContext.todayWorkoutType}
- Mesocycle Week: ${trainingContext.mesocycleWeek} of ${trainingContext.mesocycleLength}
- Current Fatigue Accumulation: ${trainingContext.fatigueAccumulation}
- Prescribed Intensity: ${trainingContext.prescribedIntensity || 'N/A'}
- Training Level: ${trainingContext.trainingLevel}
- Sessions Logged: ${trainingContext.sessionsLogged}
${physicalBlock}
PER-EXERCISE TRENDS:
${JSON.stringify(exerciseTrends, null, 1)}

RECENT SESSION DETAILS (last 5):
${JSON.stringify(trainingLogs.slice(0, 5).map(l => ({
  date: l.completed_at,
  type: l.workout_type,
  volume: l.total_volume,
  fatigue: l.fatigue_score,
  readiness: l.readiness_pre,
  exercises: (l.exercises as any[]).filter((e: any) => e.completed).map((e: any) => `${e.name}: ${e.weight}lbs × ${e.reps} × ${e.sets} (RPE ${e.rpe})`),
})), null, 1)}

Generate a training intelligence analysis using the analyze_training tool.`;

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
              name: 'analyze_training',
              description: 'Generate a training intelligence analysis with insights, recommendations, and forecasts.',
              parameters: {
                type: 'object',
                properties: {
                  summary: {
                    type: 'string',
                    description: 'One powerful sentence — the System\'s core training assessment. Clinical, data-backed.',
                  },
                  insights: {
                    type: 'array',
                    description: '3-5 data-driven training insights. Each should reference specific numbers.',
                    items: {
                      type: 'object',
                      properties: {
                        type: { type: 'string', enum: ['progression', 'stagnation', 'recovery', 'imbalance', 'optimization', 'warning'] },
                        title: { type: 'string', description: 'Short insight title.' },
                        detail: { type: 'string', description: 'Specific observation with numbers.' },
                        action: { type: 'string', description: 'Concrete recommendation.' },
                        priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                      },
                      required: ['type', 'title', 'detail', 'action', 'priority'],
                    },
                  },
                  weeklyPlan: {
                    type: 'object',
                    description: 'Optimized training recommendations for the upcoming week.',
                    properties: {
                      focus: { type: 'string', description: 'Primary training focus for this week.' },
                      intensityGuidance: { type: 'string', description: 'How to modulate intensity based on accumulated fatigue and readiness trends.' },
                      exerciseAdjustments: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            exercise: { type: 'string' },
                            adjustment: { type: 'string', description: 'What to change (weight, volume, technique, swap).' },
                            reason: { type: 'string' },
                          },
                          required: ['exercise', 'adjustment', 'reason'],
                        },
                      },
                    },
                    required: ['focus', 'intensityGuidance', 'exerciseAdjustments'],
                  },
                  projections: {
                    type: 'object',
                    properties: {
                      strengthTrajectory: { type: 'string', description: 'Where the player\'s key lifts are headed at current pace.' },
                      volumeTrajectory: { type: 'string', description: 'Weekly volume trend and projection.' },
                      recoveryStatus: { type: 'string', description: 'Overall recovery assessment.' },
                    },
                    required: ['strengthTrajectory', 'volumeTrajectory', 'recoveryStatus'],
                  },
                  todayGuidance: {
                    type: 'string',
                    description: 'Specific guidance for today\'s training session. Reference the prescribed workout type and intensity.',
                  },
                },
                required: ['summary', 'insights', 'weeklyPlan', 'projections', 'todayGuidance'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'analyze_training' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited. Recalibrating.' }), {
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
      return new Response(JSON.stringify({ error: 'Training intelligence offline.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'analyze_training') {
      return new Response(JSON.stringify({ error: 'Training analysis failed.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({
      ...analysis,
      generatedAt: new Date().toISOString(),
      dataPoints: {
        totalSessions,
        totalVolume,
        avgFatigue,
        avgReadiness,
        exerciseCount: Object.keys(exerciseTrends).length,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('training-intelligence error:', e);
    return new Response(JSON.stringify({ error: 'Training intelligence offline.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
