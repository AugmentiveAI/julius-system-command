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

export function sanitizeStr(value: unknown, maxLength = 500): string {
  if (value === null || value === undefined) return '';
  let str = String(value).slice(0, maxLength);
  for (const pattern of INJECTION_PATTERNS) {
    str = str.replace(pattern, '[FILTERED]');
  }
  return str;
}

export function sanitizeNum(value: unknown, defaultVal = 0, min = 0, max = 99999): number {
  const num = Number(value);
  if (isNaN(num)) return defaultVal;
  return Math.max(min, Math.min(max, num));
}

export function sanitizeStats(stats: unknown): Record<string, number> {
  if (!stats || typeof stats !== 'object') return {};
  return Object.fromEntries(
    Object.entries(stats as Record<string, unknown>).slice(0, 10).map(([k, v]) => [
      String(k).slice(0, 30).replace(/[^a-zA-Z0-9_]/g, ''),
      sanitizeNum(v, 10, 0, 100),
    ])
  );
}

export function sanitizeArray(arr: unknown, maxItems = 20): unknown[] {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, maxItems);
}
