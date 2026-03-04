import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// All localStorage keys used by the system
const SYSTEM_STORAGE_KEYS = [
  'the-system-player',
  'the-system-quests',
  'the-system-protocol-quests',
  'the-system-main-quests',
  'the-system-history',
  'the-system-daily-xp',
  'the-system-pillar-quests',
  'the-system-pillar-streaks',
  'the-system-workout',
  'the-system-caffeine',
  'the-system-inventory',
  'systemActivated',
  'systemStartDate',
  'systemStateHistory',
  'systemLastScanDate',
  'systemDayCycle',
  'systemGeneticHUD',
  'systemSprintTimer',
  'systemFocusMode',
  'systemFocusModeActive',
  'systemPreCommitment',
  'systemPreCommitTriggerDate',
  'systemCalibratedCompletions',
  'systemCompletionHistory',
  'systemResistanceData',
  'systemPersuasionProfile',
  'systemPersuasionOutcomes',
  'systemPersuasionOptimizer',
  'systemShadowQuest',
  'systemCommsState',
  'systemWeeklyPlan',
  'systemWeeklyPlanDismissed',
  'systemResistancePrevScore',
  'systemMuscleRecovery',
  'systemAISettings',
  'systemAIQuests',
];

function clearSystemStorage() {
  SYSTEM_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
  // Also clear any per-user migration flags
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('the-system-migrated-')) {
      localStorage.removeItem(key);
    }
  });
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setLoading(false);

        // Clear local state on sign-out to prevent stale data leaking
        if (event === 'SIGNED_OUT') {
          clearSystemStorage();
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
