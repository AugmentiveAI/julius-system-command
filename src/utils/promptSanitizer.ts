/**
 * Sanitize user-supplied strings before interpolating into AI prompts.
 * Strips instruction-like patterns and enforces length limits.
 */

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/gi,
  /forget\s+(all\s+)?previous/gi,
  /you\s+are\s+now/gi,
  /new\s+instructions?:/gi,
  /system\s*prompt/gi,
  /\bdo\s+not\s+follow\b/gi,
  /override\s+(system|previous)/gi,
  /disregard\s+(all|previous|above)/gi,
  /pretend\s+(you\s+are|to\s+be)/gi,
  /act\s+as\s+(if|though)/gi,
  /reveal\s+(your|the)\s+(system|prompt|instructions)/gi,
];

export function sanitizePromptField(value: unknown, maxLength = 500): string {
  if (value === null || value === undefined) return '';
  let str = String(value).slice(0, maxLength);
  for (const pattern of INJECTION_PATTERNS) {
    str = str.replace(pattern, '[FILTERED]');
  }
  return str;
}

export function sanitizeNumeric(value: unknown, defaultVal = 0, min = 0, max = 99999): number {
  const num = Number(value);
  if (isNaN(num)) return defaultVal;
  return Math.max(min, Math.min(max, num));
}

export function sanitizePlayerContext(ctx: any): Record<string, any> {
  if (!ctx || typeof ctx !== 'object') return {};
  
  return {
    level: sanitizeNumeric(ctx.level, 1, 1, 999),
    totalXP: sanitizeNumeric(ctx.totalXP),
    currentXP: sanitizeNumeric(ctx.currentXP),
    xpToNextLevel: sanitizeNumeric(ctx.xpToNextLevel, 100),
    streak: sanitizeNumeric(ctx.streak),
    coldStreak: sanitizeNumeric(ctx.coldStreak),
    stats: typeof ctx.stats === 'object' && ctx.stats !== null
      ? Object.fromEntries(
          Object.entries(ctx.stats).slice(0, 10).map(([k, v]) => [
            String(k).slice(0, 30).replace(/[^a-zA-Z0-9_]/g, ''),
            sanitizeNumeric(v, 10, 0, 100),
          ])
        )
      : {},
    goal: sanitizePromptField(ctx.goal, 200),
    dayNumber: sanitizeNumeric(ctx.dayNumber, 1),
    systemMode: sanitizePromptField(ctx.systemMode, 30),
    dayOfWeek: sanitizePromptField(ctx.dayOfWeek, 20),
    dayType: sanitizePromptField(ctx.dayType, 30),
    currentTime: sanitizePromptField(ctx.currentTime, 30),
    questsCompletedToday: sanitizeNumeric(ctx.questsCompletedToday),
    questsTotalToday: sanitizeNumeric(ctx.questsTotalToday),
    shadowCount: sanitizeNumeric(ctx.shadowCount),
    forceMultiplier: sanitizeNumeric(ctx.forceMultiplier, 1, 0, 100),
    dungeonsCleared: sanitizeNumeric(ctx.dungeonsCleared),
  };
}
