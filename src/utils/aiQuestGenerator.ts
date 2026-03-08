/**
 * AI Quest Generation Engine — gathers context and generates daily quests via AI.
 */

import { routeAIRequest } from './aiModelRouter';
import { getSystemDate } from './dayCycleEngine';
import { PlayerStats, getLowestStat } from '@/types/player';

export interface AIGeneratedQuest {
  title: string;
  reason: string;
  stat: keyof PlayerStats;
  xp: number;
}

export interface AIQuestResult {
  quests: AIGeneratedQuest[];
  systemMessage: string;
  generatedAt: string;
  provider: string;
}

const AI_QUESTS_KEY = 'systemAIQuests';
const AI_LAST_GEN_KEY = 'systemAILastGen';

function gatherContext() {
  let stats: PlayerStats = { sales: 10, systems: 10, creative: 10, discipline: 10, network: 10, wealth: 10 };
  let streak = 0;
  let goal = 'Build AI automation consultancy to $10K MRR';

  try {
    const raw = localStorage.getItem('the-system-player');
    if (raw) {
      const player = JSON.parse(raw);
      stats = player.stats || stats;
      streak = player.streak || 0;
      goal = player.goal || goal;
    }
  } catch { /* ignore */ }

  let completionRate = 0;
  try {
    const historyRaw = localStorage.getItem('systemDayHistory');
    if (historyRaw) {
      const history = JSON.parse(historyRaw);
      const recent = history.slice(-7);
      if (recent.length > 0) {
        const totalCompleted = recent.reduce((s: number, d: any) => s + (d.questsCompleted || 0), 0);
        const totalQuests = recent.reduce((s: number, d: any) => s + (d.questsTotal || 5), 0);
        completionRate = totalQuests > 0 ? Math.round((totalCompleted / totalQuests) * 100) : 50;
      }
    }
  } catch { /* ignore */ }

  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/Los_Angeles' });
  const dayNum = new Date().getDay();
  const energyLevel = [4, 5, 6].includes(dayNum) ? 'high' : [1, 2, 3].includes(dayNum) ? 'medium' : 'low';
  const lowestStat = getLowestStat(stats);

  return { stats, streak, goal, completionRate, dayOfWeek, energyLevel, lowestStat };
}

function buildPrompt(ctx: ReturnType<typeof gatherContext>): string {
  return `You are The System — an elite AI strategist embedded in Julius's productivity command center.

CONTEXT:
- Current stats: ${JSON.stringify(ctx.stats)}
- Lowest stat: ${ctx.lowestStat} (prioritize growth here)
- Streak: ${ctx.streak} days
- Completion rate: ${ctx.completionRate}% (last 7 days)
- Today: ${ctx.dayOfWeek}
- Energy level: ${ctx.energyLevel}

JULIUS'S SITUATION:
- ${ctx.goal}
- Current tools: n8n, Make.com, GoHighLevel, Instantly.ai
- Works in 45-minute sprint cycles

OBJECTIVE:
Generate exactly 5 daily quests that maximize progress toward the goal.

RULES:
- At least 1 quest must target the lowest stat (${ctx.lowestStat})
- At least 1 quest must be pipeline/revenue focused
- Match intensity to today's energy level (${ctx.energyLevel})
- Be specific and actionable (not vague)
- Each quest completable in under 60 minutes

OUTPUT FORMAT (JSON only, no markdown):
{
  "quests": [
    {
      "title": "string",
      "reason": "string (1 sentence why this matters today)",
      "stat": "sales|systems|creative|discipline|network|wealth",
      "xp": 3
    }
  ],
  "system_message": "string (motivational message, terse, System voice)"
}`;
}

function parseAIResponse(raw: string): { quests: AIGeneratedQuest[]; systemMessage: string } | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed.quests && Array.isArray(parsed.quests)) {
      const validStats: Set<string> = new Set(['sales', 'systems', 'creative', 'discipline', 'network', 'wealth']);
      const quests: AIGeneratedQuest[] = parsed.quests
        .slice(0, 5)
        .map((q: any) => ({
          title: String(q.title || 'Unknown Quest'),
          reason: String(q.reason || ''),
          stat: validStats.has(q.stat) ? q.stat : 'discipline',
          xp: Math.min(Math.max(Number(q.xp) || 3, 1), 10),
        }));
      return { quests, systemMessage: String(parsed.system_message || 'The System watches.') };
    }
  } catch {
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) return parseAIResponse(match[0]);
    } catch { /* ignore */ }
  }
  return null;
}

export async function generateAIQuests(): Promise<AIQuestResult> {
  // Rate limit: don't generate more than once per hour
  try {
    const lastGen = localStorage.getItem(AI_LAST_GEN_KEY);
    if (lastGen) {
      const elapsed = Date.now() - Number(lastGen);
      if (elapsed < 60 * 60 * 1000) {
        const existing = loadAIQuests();
        if (existing && existing.generatedAt.startsWith(getSystemDate())) {
          return existing;
        }
      }
    }
  } catch { /* ignore */ }

  const ctx = gatherContext();
  const prompt = buildPrompt(ctx);

  const { provider, response } = await routeAIRequest(prompt, 'strategy');
  const parsed = parseAIResponse(response);

  if (!parsed || parsed.quests.length === 0) {
    throw new Error('PARSE_FAILED');
  }

  const result: AIQuestResult = {
    quests: parsed.quests,
    systemMessage: parsed.systemMessage,
    generatedAt: new Date().toISOString(),
    provider,
  };

  localStorage.setItem(AI_QUESTS_KEY, JSON.stringify(result));
  localStorage.setItem(AI_LAST_GEN_KEY, String(Date.now()));

  return result;
}

export function loadAIQuests(): AIQuestResult | null {
  try {
    const raw = localStorage.getItem(AI_QUESTS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isAIEnabled(): boolean {
  try {
    const settings = JSON.parse(localStorage.getItem('systemAISettings') || '{}');
    return settings.aiEnabled === true;
  } catch {
    return false;
  }
}

export function clearAIQuests(): void {
  localStorage.removeItem(AI_QUESTS_KEY);
  localStorage.removeItem(AI_LAST_GEN_KEY);
}
