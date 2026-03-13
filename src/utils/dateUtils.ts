/**
 * Consistent date utilities — replaces inconsistent toDateString() comparisons.
 */

/** Returns today as YYYY-MM-DD in the user's local timezone */
export function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Returns the user's IANA timezone */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
