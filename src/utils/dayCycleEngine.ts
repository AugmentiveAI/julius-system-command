/**
 * Day Cycle Engine — Central authority for day transitions
 * All day calculations use America/Los_Angeles (Pacific Time)
 */

// ── Timezone Helpers ─────────────────────────────────────────────────

const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Returns current date as YYYY-MM-DD in Pacific Time */
export function getSystemDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });
}

/** Returns full ISO-ish timestamp adjusted to Pacific Time display */
export function getSystemDateTime(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: TIMEZONE }).replace(' ', 'T');
}

/** Returns day of week (0=Sun) in Pacific Time */
export function getSystemDayOfWeek(): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, weekday: 'short' }).formatToParts(new Date());
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const weekday = parts.find(p => p.type === 'weekday')?.value ?? 'Mon';
  return dayMap[weekday] ?? 1;
}

/** Returns hours/minutes until midnight PST */
export function getTimeUntilMidnightPST(): { hours: number; minutes: number } {
  // Get current time in Pacific
  const nowStr = new Date().toLocaleString('en-US', { timeZone: TIMEZONE, hour12: false });
  const timePart = nowStr.split(', ')[1] || nowStr.split(' ')[1] || '12:00:00';
  const [h, m] = timePart.split(':').map(Number);
  const minutesLeft = (24 * 60) - (h * 60 + m);
  return {
    hours: Math.floor(minutesLeft / 60),
    minutes: minutesLeft % 60,
  };
}

/** Compute the date string N days before a given date string */
function subtractDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

/** Number of days between two YYYY-MM-DD strings */
export function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T12:00:00');
  const db = new Date(b + 'T12:00:00');
  return Math.round(Math.abs(db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Day Archive Types ────────────────────────────────────────────────

export interface DayArchiveEntry {
  date: string;
  questsCompleted: number;
  questsTotal: number;
  xpEarned: number;
  mode: string;
  sprintsCompleted: number;
}

export interface DayCycleState {
  currentDay: string;
  history: DayArchiveEntry[];
  streak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

// ── Storage Keys ─────────────────────────────────────────────────────

const DAY_CYCLE_KEY = 'systemDayCycle';

export function loadDayCycleState(): DayCycleState | null {
  try {
    const raw = localStorage.getItem(DAY_CYCLE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

export function saveDayCycleState(state: DayCycleState): void {
  localStorage.setItem(DAY_CYCLE_KEY, JSON.stringify(state));
}

export function initializeDayCycleState(): DayCycleState {
  const today = getSystemDate();
  const state: DayCycleState = {
    currentDay: today,
    history: [],
    streak: 0,
    longestStreak: 0,
    lastActiveDate: null,
  };
  saveDayCycleState(state);
  return state;
}

// ── Day Transition Logic ─────────────────────────────────────────────

export interface TransitionResult {
  transitioned: boolean;
  previousDay: string | null;
  newDay: string;
  daysMissed: number;
  archivedDays: DayArchiveEntry[];
}

interface CurrentDayData {
  questsCompleted: number;
  questsTotal: number;
  xpEarned: number;
  mode: string;
  sprintsCompleted: number;
}

/**
 * Check if a day transition is needed and execute it.
 * Returns transition info for the UI to react to.
 */
export function checkAndExecuteTransition(
  getCurrentDayData: () => CurrentDayData
): TransitionResult {
  const today = getSystemDate();
  let state = loadDayCycleState();

  // First ever load — initialize
  if (!state) {
    state = initializeDayCycleState();
    return { transitioned: false, previousDay: null, newDay: today, daysMissed: 0, archivedDays: [] };
  }

  // Same day — no transition
  if (state.currentDay === today) {
    return { transitioned: false, previousDay: null, newDay: today, daysMissed: 0, archivedDays: [] };
  }

  // Day transition needed
  const previousDay = state.currentDay;
  const gap = daysBetween(previousDay, today);
  const archivedDays: DayArchiveEntry[] = [];

  // Step 1: Archive yesterday (or the last known day)
  const dayData = getCurrentDayData();
  archivedDays.push({
    date: previousDay,
    questsCompleted: dayData.questsCompleted,
    questsTotal: dayData.questsTotal,
    xpEarned: dayData.xpEarned,
    mode: dayData.mode,
    sprintsCompleted: dayData.sprintsCompleted,
  });

  // Archive any missed days in between (gap > 1)
  for (let i = 1; i < gap - 1; i++) {
    const missedDate = subtractDays(today, gap - 1 - i);
    archivedDays.push({
      date: missedDate,
      questsCompleted: 0,
      questsTotal: 0,
      xpEarned: 0,
      mode: 'unknown',
      sprintsCompleted: 0,
    });
  }

  // Step 2: Update streak
  if (dayData.questsCompleted > 0) {
    state.streak += 1;
    state.lastActiveDate = previousDay;
  } else if (gap === 1) {
    // Yesterday had 0 completions
    state.streak = 0;
  } else {
    // Multiple days missed
    state.streak = 0;
  }

  if (state.streak > state.longestStreak) {
    state.longestStreak = state.streak;
  }

  // Step 3: Update state for new day
  state.currentDay = today;
  state.history = [...state.history, ...archivedDays].slice(-90); // Keep 90 days max

  // Step 5: Persist
  saveDayCycleState(state);

  console.log(`[SYSTEM] Day transition: ${previousDay} → ${today} (${gap} day gap, streak: ${state.streak})`);

  return {
    transitioned: true,
    previousDay,
    newDay: today,
    daysMissed: Math.max(0, gap - 1),
    archivedDays,
  };
}
