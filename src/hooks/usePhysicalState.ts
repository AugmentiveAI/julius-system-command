import { useState, useCallback, useEffect } from 'react';
import { PhysicalState, RomEntry, RehabPhase, INITIAL_PHYSICAL_STATE } from '@/types/player';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const LOCAL_KEY = 'systemPhysicalState';

const PHASE_ORDER: RehabPhase[] = ['mobility', 'strength', 'power', 'performance'];

function phaseIndex(p: RehabPhase): number {
  return PHASE_ORDER.indexOf(p);
}

function calculatePhase(log: RomEntry[], currentPhase: RehabPhase): RehabPhase {
  if (log.length === 0) return currentPhase;

  const latest = log[log.length - 1];
  const weaker = Math.min(latest.leftKnee, latest.rightKnee);

  // mobility → strength: both knees ≥ 85%
  if (currentPhase === 'mobility' && weaker >= 85) return 'strength';

  // strength → power: both knees ≥ 95% + 60 days in strength phase
  if (currentPhase === 'strength' && weaker >= 95) {
    const strengthEntries = log.filter(e => {
      const idx = log.indexOf(e);
      // entries while in strength phase
      return idx >= 0;
    });
    if (strengthEntries.length > 0) {
      const firstStrength = new Date(strengthEntries[0].date);
      const daysSince = (Date.now() - firstStrength.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince >= 60) return 'power';
    }
  }

  // power → performance: both knees at 100% + 90 days in power phase
  if (currentPhase === 'power' && weaker >= 100) {
    const daysSince = log.length >= 2
      ? (Date.now() - new Date(log[0].date).getTime()) / (1000 * 60 * 60 * 24)
      : 0;
    if (daysSince >= 90) return 'performance';
  }

  return currentPhase;
}

export function usePhysicalState() {
  const { user } = useAuth();
  const [state, setState] = useState<PhysicalState>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return INITIAL_PHYSICAL_STATE;
  });

  // Load from profiles on login
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('rom_left_knee, rom_right_knee, rehab_phase, rehab_log')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        const loaded: PhysicalState = {
          romLeftKnee: data.rom_left_knee ?? 90,
          romRightKnee: data.rom_right_knee ?? 90,
          rehabPhase: (data.rehab_phase as RehabPhase) ?? 'strength',
          lastRomUpdate: new Date().toISOString(),
          rehabLog: Array.isArray(data.rehab_log) ? data.rehab_log as unknown as RomEntry[] : [],
        };
        setState(loaded);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(loaded));
      }
    })();
  }, [user]);

  // Persist locally on change
  useEffect(() => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  }, [state]);

  const logRomReading = useCallback(async (left: number, right: number, notes?: string) => {
    const entry: RomEntry = {
      date: new Date().toISOString(),
      leftKnee: left,
      rightKnee: right,
      notes,
    };

    setState(prev => {
      const newLog = [...prev.rehabLog, entry];
      const newPhase = calculatePhase(newLog, prev.rehabPhase);
      const updated: PhysicalState = {
        romLeftKnee: left,
        romRightKnee: right,
        rehabPhase: newPhase,
        lastRomUpdate: entry.date,
        rehabLog: newLog,
      };
      return updated;
    });

    // Save to Supabase
    if (user) {
      const newLog = [...state.rehabLog, entry];
      const newPhase = calculatePhase(newLog, state.rehabPhase);
      await supabase
        .from('profiles')
        .update({
          rom_left_knee: left,
          rom_right_knee: right,
          rehab_phase: newPhase,
          rehab_log: newLog as any,
        })
        .eq('user_id', user.id);
    }
  }, [user, state]);

  const getWeakerKnee = useCallback(() => {
    return Math.min(state.romLeftKnee, state.romRightKnee);
  }, [state]);

  const getLimitingFactor = useCallback((): string => {
    const weaker = Math.min(state.romLeftKnee, state.romRightKnee);
    switch (state.rehabPhase) {
      case 'mobility':
        return 'No high-load lower body exercises. Focus on ROM restoration.';
      case 'strength':
        return weaker < 95
          ? `No running, jumping, or deep squats until both knees reach 95% ROM (currently ${weaker}%).`
          : 'Building strength base. Avoid plyometrics and sprinting.';
      case 'power':
        return weaker < 100
          ? 'Controlled power movements only. No max-effort plyometrics until 100% ROM.'
          : 'Full power training available. Monitor tendon response.';
      case 'performance':
        return 'All exercises unlocked. Monitor for any regression.';
    }
  }, [state]);

  const getRehabProgress = useCallback((): number => {
    const weaker = Math.min(state.romLeftKnee, state.romRightKnee);
    const phaseWeight = phaseIndex(state.rehabPhase) * 25;
    const romWeight = (weaker / 100) * 25;
    return Math.min(100, Math.round(phaseWeight + romWeight));
  }, [state]);

  const hasRomPlateau = useCallback((): boolean => {
    if (state.rehabLog.length < 2) return false;
    const recent = state.rehabLog.slice(-1)[0];
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const oldEntries = state.rehabLog.filter(e => new Date(e.date).getTime() < twoWeeksAgo);
    if (oldEntries.length === 0) return false;
    const lastOld = oldEntries[oldEntries.length - 1];
    return recent.leftKnee <= lastOld.leftKnee && recent.rightKnee <= lastOld.rightKnee;
  }, [state]);

  const hasRomRegression = useCallback((): { regressed: boolean; knee: string } => {
    if (state.rehabLog.length < 2) return { regressed: false, knee: '' };
    const last = state.rehabLog[state.rehabLog.length - 1];
    const prev = state.rehabLog[state.rehabLog.length - 2];
    if (last.leftKnee < prev.leftKnee - 1) return { regressed: true, knee: 'Left' };
    if (last.rightKnee < prev.rightKnee - 1) return { regressed: true, knee: 'Right' };
    return { regressed: false, knee: '' };
  }, [state]);

  return {
    physicalState: state,
    logRomReading,
    getWeakerKnee,
    getLimitingFactor,
    getRehabProgress,
    hasRomPlateau,
    hasRomRegression,
  };
}
