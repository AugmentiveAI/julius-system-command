import { useState, useEffect, useCallback, useRef } from 'react';
import { COMTPhase } from '@/utils/geneticEngine';

// ── Types ────────────────────────────────────────────────────────────

export type CommsPriority = 'genetic' | 'quest' | 'state' | 'training' | 'weekly' | 'milestone';

export interface SystemComm {
  id: string;
  message: string;
  priority: CommsPriority;
}

const PRIORITY_ORDER: CommsPriority[] = ['genetic', 'quest', 'state', 'training', 'weekly', 'milestone'];

// ── Storage ──────────────────────────────────────────────────────────

const COMMS_STORAGE_KEY = 'systemCommsState';
const MIN_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

interface CommsState {
  shownIds: string[];
  lastShownAt: number;
  date: string;
}

function loadCommsState(): CommsState {
  try {
    const raw = localStorage.getItem(COMMS_STORAGE_KEY);
    if (raw) {
      const state: CommsState = JSON.parse(raw);
      if (state.date === new Date().toISOString().split('T')[0]) return state;
    }
  } catch { /* ignore */ }
  return { shownIds: [], lastShownAt: 0, date: new Date().toISOString().split('T')[0] };
}

function saveCommsState(state: CommsState) {
  localStorage.setItem(COMMS_STORAGE_KEY, JSON.stringify(state));
}

// ── Message definitions ──────────────────────────────────────────────

function getGeneticMessages(
  comtPhase: COMTPhase,
  prevComtPhase: COMTPhase | null,
  sprintsToday: number,
  prevSprints: number,
): SystemComm[] {
  const msgs: SystemComm[] = [];

  // COMT transitions
  if (prevComtPhase && prevComtPhase !== comtPhase) {
    if (comtPhase === 'peak') {
      msgs.push({ id: 'comt-peak', message: 'Warrior gene active. Peak window open.', priority: 'genetic' });
    } else if (comtPhase === 'dip') {
      msgs.push({ id: 'comt-dip', message: 'Dopamine dip incoming. Adjust expectations or train to reset.', priority: 'genetic' });
    } else if (prevComtPhase === 'dip' && (comtPhase === 'recovery' || comtPhase === 'stable')) {
      msgs.push({ id: 'comt-cleared', message: 'Second wind activated. Resume operations.', priority: 'genetic' });
    }
  }

  // ACTN3 transitions
  if (sprintsToday === 3 && prevSprints < 3) {
    msgs.push({ id: 'actn3-warning', message: 'Sprint 3 of 4. One sprint remains before diminishing returns.', priority: 'genetic' });
  }
  if (sprintsToday >= 4 && prevSprints < 4) {
    msgs.push({ id: 'actn3-depleted', message: 'Sprint capacity exhausted. Recovery required before next session.', priority: 'genetic' });
  }

  return msgs;
}

function getStateMessages(
  systemRec: string | null,
  prevRec: string | null,
  consecutiveCompleted: number,
  prevConsecutiveCompleted: number,
  consecutiveSkipped: number,
  prevConsecutiveSkipped: number,
): SystemComm[] {
  const msgs: SystemComm[] = [];

  if (prevRec && prevRec !== systemRec) {
    if (systemRec === 'push') {
      msgs.push({ id: 'state-push', message: 'High capacity confirmed. S-Rank quests unlocked.', priority: 'state' });
    } else if (systemRec === 'recover') {
      msgs.push({ id: 'state-recovery', message: 'Reduced load assigned. Recover now, dominate tomorrow.', priority: 'state' });
    }
  }

  if (consecutiveCompleted >= 3 && prevConsecutiveCompleted < 3) {
    msgs.push({ id: 'momentum', message: 'Momentum detected. Keep pushing.', priority: 'state' });
  }

  if (consecutiveSkipped >= 2 && prevConsecutiveSkipped < 2) {
    msgs.push({ id: 'hesitation', message: 'The System notices hesitation. One quest. Just one. Start there.', priority: 'state' });
  }

  return msgs;
}

function getWeeklyMessages(): SystemComm[] {
  const msgs: SystemComm[] = [];
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  if (day === 4 && hour >= 5 && hour <= 10) {
    msgs.push({ id: 'thursday', message: 'Transition day. Plan the sprint. Execution starts tomorrow.', priority: 'weekly' });
  }
  if (day === 5 && hour >= 5 && hour <= 10) {
    msgs.push({ id: 'friday', message: 'Sprint day. Revenue weight at maximum. The System expects output.', priority: 'weekly' });
  }
  if (day === 3 && hour >= 18 && hour <= 22) {
    msgs.push({ id: 'wednesday-eve', message: 'Last shift day complete. Rest tonight. Plan tomorrow.', priority: 'weekly' });
  }

  return msgs;
}

function getTrainingMessages(
  trainingCompleted: boolean,
  prevTrainingCompleted: boolean,
): SystemComm[] {
  const msgs: SystemComm[] = [];

  if (trainingCompleted && !prevTrainingCompleted) {
    msgs.push({ id: 'training-done', message: 'Training logged. Buffs updated. You\'re sharper now.', priority: 'training' });
  }

  return msgs;
}

// ── Hook ─────────────────────────────────────────────────────────────

interface UseSystemCommsOptions {
  comtPhase: COMTPhase;
  sprintsToday: number;
  systemRec: string | null;
  consecutiveCompleted: number;
  consecutiveSkipped: number;
  trainingCompleted: boolean;
  isFocusMode: boolean;
  isSprintActive: boolean;
}

export function useSystemComms(options: UseSystemCommsOptions) {
  const {
    comtPhase, sprintsToday, systemRec,
    consecutiveCompleted, consecutiveSkipped,
    trainingCompleted, isFocusMode, isSprintActive,
  } = options;

  const [activeBanner, setActiveBanner] = useState<SystemComm | null>(null);
  const [visible, setVisible] = useState(false);
  const prevRef = useRef({
    comtPhase: comtPhase as COMTPhase | null,
    sprintsToday,
    systemRec: systemRec as string | null,
    consecutiveCompleted,
    consecutiveSkipped,
    trainingCompleted,
  });
  const commsStateRef = useRef(loadCommsState());
  const queueRef = useRef<SystemComm[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => setActiveBanner(null), 400); // wait for slide-out animation
  }, []);

  const showNext = useCallback(() => {
    if (isFocusMode || isSprintActive) return;

    const state = commsStateRef.current;
    const now = Date.now();

    // Throttle: 30 min between messages
    if (now - state.lastShownAt < MIN_INTERVAL_MS) return;

    // Sort queue by priority
    const sorted = [...queueRef.current].sort(
      (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
    );

    // Find first not-yet-shown today
    const next = sorted.find(m => !state.shownIds.includes(m.id));
    if (!next) return;

    // Mark shown
    state.shownIds.push(next.id);
    state.lastShownAt = now;
    saveCommsState(state);

    setActiveBanner(next);
    setVisible(true);

    // Auto-dismiss after 4 seconds
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setActiveBanner(null), 400);
    }, 4000);
  }, [isFocusMode, isSprintActive]);

  // Collect messages on state changes
  useEffect(() => {
    const prev = prevRef.current;
    const newMessages: SystemComm[] = [];

    newMessages.push(...getGeneticMessages(comtPhase, prev.comtPhase, sprintsToday, prev.sprintsToday));
    newMessages.push(...getStateMessages(systemRec, prev.systemRec, consecutiveCompleted, prev.consecutiveCompleted, consecutiveSkipped, prev.consecutiveSkipped));
    newMessages.push(...getWeeklyMessages());
    newMessages.push(...getTrainingMessages(trainingCompleted, prev.trainingCompleted));

    // Update prev
    prevRef.current = {
      comtPhase, sprintsToday, systemRec,
      consecutiveCompleted, consecutiveSkipped, trainingCompleted,
    };

    if (newMessages.length > 0) {
      // Deduplicate
      const existing = new Set(queueRef.current.map(m => m.id));
      const fresh = newMessages.filter(m => !existing.has(m.id));
      queueRef.current.push(...fresh);

      // Try to show immediately
      showNext();
    }
  }, [comtPhase, sprintsToday, systemRec, consecutiveCompleted, consecutiveSkipped, trainingCompleted, showNext]);

  // Check for weekly messages on mount
  useEffect(() => {
    const weeklyMsgs = getWeeklyMessages();
    if (weeklyMsgs.length > 0) {
      const existing = new Set(queueRef.current.map(m => m.id));
      const fresh = weeklyMsgs.filter(m => !existing.has(m.id));
      queueRef.current.push(...fresh);
      // Small delay to let app render first
      setTimeout(showNext, 2000);
    }
  }, [showNext]);

  // Suppress when entering focus/sprint mode
  useEffect(() => {
    if ((isFocusMode || isSprintActive) && visible) {
      dismiss();
    }
  }, [isFocusMode, isSprintActive, visible, dismiss]);

  // Enqueue a message externally (for quest context, milestones, etc.)
  const enqueue = useCallback((comm: SystemComm) => {
    const existing = new Set(queueRef.current.map(m => m.id));
    if (!existing.has(comm.id)) {
      queueRef.current.push(comm);
      showNext();
    }
  }, [showNext]);

  return {
    activeBanner,
    visible,
    dismiss,
    enqueue,
  };
}
