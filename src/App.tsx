import React, { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HistoryProvider } from "@/contexts/HistoryContext";
import { FocusModeProvider } from "@/contexts/FocusModeContext";
import { DayCycleProvider } from "@/contexts/DayCycleContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { getSystemDate } from "@/utils/dayCycleEngine";
import { FocusFAB } from "@/components/focus/FocusFAB";
import { useFocusModeContext } from "@/contexts/FocusModeContext";
import { SystemCommsBanner } from "@/components/comms/SystemCommsBanner";
import { useSystemComms } from "@/hooks/useSystemComms";
import { useGeneticState } from "@/hooks/useGeneticState";
import { AwakeningSequence } from "@/components/onboarding/AwakeningSequence";
import { GoalCapture } from "@/components/onboarding/GoalCapture";
import { SystemBriefing } from "@/components/onboarding/SystemBriefing";
import { PreCommitmentModal } from "@/components/quests/PreCommitmentModal";
import { usePreCommitment } from "@/hooks/usePreCommitment";
import { SystemCommsContext } from "@/contexts/SystemCommsContext";
import { useLocalDataMigration } from "@/hooks/useLocalDataMigration";
import { DataMigrationDialog } from "@/components/onboarding/DataMigrationDialog";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Quests from "./pages/Quests";
import Training from "./pages/Training";
import Progress from "./pages/Progress";
import More from "./pages/More";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import SystemAnalytics from "./pages/SystemAnalytics";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

/** Renders children only if authenticated, otherwise redirects to /auth */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

const AppContent = () => {
  const { user } = useAuth();
  // null = still checking, true = show, false = skip
  const [showAwakening, setShowAwakening] = useState<boolean | null>(null);
  const [showGoalCapture, setShowGoalCapture] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const [triggerScan, setTriggerScan] = useState(false);
  const {
    showModal, commitment, isRecovery,
    handleAccept, handleRequestAlternative, handleDismiss,
  } = usePreCommitment();
  const { showMigration, migrating, summary, acceptMigration, skipMigration } = useLocalDataMigration();

  // Check DB for existing player data to decide whether to show onboarding
  useEffect(() => {
    if (!user) {
      setShowAwakening(null);
      return;
    }

    let cancelled = false;

    const checkOnboarding = async () => {
      try {
        const { data } = await supabase
          .from('player_state')
          .select('total_xp')
          .eq('user_id', user.id)
          .maybeSingle();

        if (cancelled) return;

        if (data && data.total_xp > 0) {
          // Existing player with progress — skip onboarding
          setShowAwakening(false);
        } else {
          // New player or zero XP — check if they've already seen awakening locally
          const activated = localStorage.getItem('systemActivated') === 'true';
          setShowAwakening(!activated);
        }
      } catch {
        // Fallback to localStorage check on error
        const activated = localStorage.getItem('systemActivated') === 'true';
        setShowAwakening(!activated);
      }
    };

    checkOnboarding();
    return () => { cancelled = true; };
  }, [user]);

  const handleAwakeningComplete = () => {
    setShowAwakening(false);
    setShowGoalCapture(true);
  };

  const handleGoalSubmit = (goal: string) => {
    try {
      const raw = localStorage.getItem('the-system-player');
      const player = raw ? JSON.parse(raw) : {};
      player.goal = goal;
      localStorage.setItem('the-system-player', JSON.stringify(player));
    } catch { /* ignore */ }
    setShowGoalCapture(false);
    setShowBriefing(true);
  };

  const handleBriefingComplete = () => {
    setShowBriefing(false);
    setTriggerScan(true);
  };

  return (
    <>
      <Toaster />
      <Sonner />
      <DataMigrationDialog
        open={showMigration}
        migrating={migrating}
        summary={summary}
        onAccept={acceptMigration}
        onSkip={skipMigration}
      />
      {showAwakening === true && <AwakeningSequence onComplete={handleAwakeningComplete} />}
      {showGoalCapture && <GoalCapture onSubmit={handleGoalSubmit} />}
      {showBriefing && <SystemBriefing onComplete={handleBriefingComplete} />}
      {showModal && commitment && (
        <PreCommitmentModal
          commitment={commitment}
          isRecovery={isRecovery}
          onAccept={handleAccept}
          onRequestAlternative={handleRequestAlternative}
          onDismiss={handleDismiss}
        />
      )}
      <Routes>
        <Route path="/" element={<ProtectedRoute><Index forceFirstScan={triggerScan} onScanTriggered={() => setTriggerScan(false)} /></ProtectedRoute>} />
        <Route path="/quests" element={<ProtectedRoute><Quests /></ProtectedRoute>} />
        <Route path="/training" element={<ProtectedRoute><Training /></ProtectedRoute>} />
        <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
        <Route path="/more" element={<ProtectedRoute><More /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/system-analytics" element={<ProtectedRoute><SystemAnalytics /></ProtectedRoute>} />
        <Route path="/auth" element={<AuthRoute />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

/** Redirect authenticated users away from /auth */
function AuthRoute() {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/" replace />;
  return <Auth />;
}

const AppWithFAB = () => {
  const { active: focusActive, activate } = useFocusModeContext();
  const { geneticState, sprintsToday } = useGeneticState();

  let systemRec: string | null = null;
  try {
    const raw = localStorage.getItem('systemStateHistory');
    if (raw) {
      const history = JSON.parse(raw);
      if (history.length > 0) systemRec = history[history.length - 1].systemRecommendation || null;
    }
  } catch { /* ignore */ }

  let isSprintActive = false;
  try {
    const raw = localStorage.getItem('systemSprintTimer');
    if (raw) {
      const data = JSON.parse(raw);
      isSprintActive = data.phase === 'sprinting' || data.phase === 'break' || data.phase === 'extended-break';
    }
  } catch { /* ignore */ }

  let trainingCompleted = false;
  try {
    const raw = localStorage.getItem('the-system-workout');
    if (raw) {
      const data = JSON.parse(raw);
      trainingCompleted = data.workoutCompleted === true;
    }
  } catch { /* ignore */ }

  const comms = useSystemComms({
    comtPhase: geneticState.comtPhase,
    sprintsToday,
    systemRec,
    consecutiveCompleted: 0,
    consecutiveSkipped: 0,
    trainingCompleted,
    isFocusMode: focusActive,
    isSprintActive,
  });

  return (
    <SystemCommsContext.Provider value={{ enqueue: comms.enqueue }}>
      <AppContent />
      <SystemCommsBanner comm={comms.activeBanner} visible={comms.visible} onDismiss={comms.dismiss} />
      <FocusFAB onClick={activate} active={focusActive} />
    </SystemCommsContext.Provider>
  );
};

const getDayDataFallback = () => {
  try {
    const protocolRaw = localStorage.getItem('the-system-protocol-quests');
    const protocol = protocolRaw ? JSON.parse(protocolRaw) : { quests: [] };
    const quests = protocol.quests || [];
    const completed = quests.filter((q: any) => q.completed).length;
    const totalXP = quests
      .filter((q: any) => q.completed)
      .reduce((sum: number, q: any) => sum + (q.xp || 0) + (q.geneticBonus?.bonusXp || 0), 0);

    const stateRaw = localStorage.getItem('systemStateHistory');
    let mode = 'steady';
    if (stateRaw) {
      const history = JSON.parse(stateRaw);
      if (history.length > 0) mode = history[history.length - 1].systemRecommendation || 'steady';
    }

    const sprintRaw = localStorage.getItem('systemSprintTimer');
    let sprints = 0;
    if (sprintRaw) {
      const data = JSON.parse(sprintRaw);
      sprints = data.currentSprint ? data.currentSprint - 1 : 0;
    }

    return { questsCompleted: completed, questsTotal: quests.length, xpEarned: totalXP, mode, sprintsCompleted: sprints };
  } catch {
    return { questsCompleted: 0, questsTotal: 0, xpEarned: 0, mode: 'steady', sprintsCompleted: 0 };
  }
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <HistoryProvider>
          <DayCycleProvider getCurrentDayData={getDayDataFallback}>
            <BrowserRouter>
              <FocusModeProvider>
                <AppWithFAB />
              </FocusModeProvider>
            </BrowserRouter>
          </DayCycleProvider>
        </HistoryProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
