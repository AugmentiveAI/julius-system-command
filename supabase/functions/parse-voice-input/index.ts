import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth check ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Process request ---
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI offline' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { text, mode } = await req.json();
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing text' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sanitizedText = text.slice(0, 500);

    const prompt = mode === 'calendar'
      ? `Parse this text into a calendar event. Text: "${sanitizedText}"

Return JSON only:
{
  "title": "event title",
  "start": "ISO datetime string",
  "end": "ISO datetime string (1 hour after start if not specified)",
  "type": "meeting|focus|personal|deadline|other",
  "attendees": ["names mentioned"]
}

Current date/time: ${new Date().toISOString()}`
      : `Parse this voice input and extract structured data.

Voice input: "${sanitizedText}"

Determine the type and extract relevant information. Types:
- task_done: User completed something ("just finished the client call", "done with outreach")
- task_create: User wants to create a task ("need to send proposal", "remind me to follow up")
- note: General note or thought ("thinking about pricing strategy")
- log_time: Logging time spent ("spent 2 hours on automation")
- log_energy: Logging energy level ("feeling tired", "high energy today")
- unknown: Can't determine

Return JSON only:
{
  "type": "task_done|task_create|note|log_time|log_energy|unknown",
  "content": "cleaned up version of input",
  "extracted": {
    "task": "task description if applicable",
    "duration": minutes_as_number_if_mentioned,
    "category": "outreach|client|automation|content|learning|admin|training|personal",
    "energy": "high|medium|low if mentioned",
    "people": ["names mentioned"],
    "deadline": "ISO date if mentioned",
    "sentiment": "positive|neutral|negative"
  },
  "confidence": 0.0_to_1.0
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: 'You are a precise text parser. Return only valid JSON, no markdown.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited. Try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Credits exhausted.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.error('AI gateway error:', response.status);
      return new Response(JSON.stringify({
        type: 'unknown',
        content: sanitizedText,
        extracted: {},
        confidence: 0.3,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content || '';

    try {
      const parsed = JSON.parse(resultText.replace(/```json|```/g, '').trim());
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch {
      return new Response(JSON.stringify({
        type: 'unknown',
        content: sanitizedText,
        extracted: {},
        confidence: 0.3,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  } catch (e) {
    console.error('parse-voice-input error:', e);
    return new Response(JSON.stringify({ error: 'Parse error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
