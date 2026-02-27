/**
 * AI Model Router — routes requests to Groq or Gemini based on task type,
 * with fallback and rate-limit handling.
 */

export type TaskType = 'research' | 'analysis' | 'speed' | 'strategy' | 'simple';

interface RouterResult {
  provider: 'groq' | 'gemini';
  response: string;
}

function getApiKeys(): { groq: string | null; gemini: string | null } {
  try {
    const settings = JSON.parse(localStorage.getItem('systemAISettings') || '{}');
    return {
      groq: settings.groqApiKey || null,
      gemini: settings.geminiApiKey || null,
    };
  } catch {
    return { groq: null, gemini: null };
  }
}

const PRIMARY_ROUTES: Record<TaskType, 'groq' | 'gemini'> = {
  research: 'gemini',
  analysis: 'gemini',
  speed: 'groq',
  strategy: 'gemini',
  simple: 'groq',
};

async function callGroq(prompt: string, apiKey: string): Promise<string> {
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
  if (!res.ok) throw new Error(`Groq error: ${res.status}`);

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    }
  );

  if (res.status === 429) throw new Error('RATE_LIMITED');
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function routeAIRequest(
  prompt: string,
  taskType: TaskType = 'strategy'
): Promise<RouterResult> {
  const keys = getApiKeys();
  const primary = PRIMARY_ROUTES[taskType];
  const fallback = primary === 'groq' ? 'gemini' : 'groq';

  const providers: Array<'groq' | 'gemini'> = [];
  // Order: primary first, fallback second — but only if key exists
  if (keys[primary]) providers.push(primary);
  if (keys[fallback]) providers.push(fallback);

  if (providers.length === 0) {
    throw new Error('NO_API_KEYS');
  }

  for (const provider of providers) {
    try {
      const apiKey = keys[provider]!;
      const response =
        provider === 'groq'
          ? await callGroq(prompt, apiKey)
          : await callGemini(prompt, apiKey);

      console.log(`[AI Router] Used: ${provider} for task: ${taskType}`);
      return { provider, response };
    } catch (err: any) {
      console.warn(`[AI Router] ${provider} failed:`, err.message);
      if (err.message === 'RATE_LIMITED' && providers.indexOf(provider) < providers.length - 1) {
        console.log(`[AI Router] Rate limited on ${provider}, trying fallback...`);
        continue;
      }
      if (providers.indexOf(provider) < providers.length - 1) continue;
      throw err;
    }
  }

  throw new Error('ALL_PROVIDERS_FAILED');
}

export function hasAnyApiKey(): boolean {
  const keys = getApiKeys();
  return !!(keys.groq || keys.gemini);
}
