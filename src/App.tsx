import React, { useState, useEffect, lazy, Suspense } from 'react';
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HistoryProvider } from "@/contexts/HistoryContext";
import { FocusModeProvider } from "@/contexts/FocusModeContext";
import { DayCycleProvider } from "@/contexts/DayCycleContext";
import { TickerProvider } from "@/contexts/TickerContext";
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
import { JarvisBrainProvider } from "@/contexts/JarvisBrainContext";
import { useLocalDataMigration } from "@/hooks/useLocalDataMigration";
import { DataMigrationDialog } from "@/components/onboarding/DataMigrationDialog";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

// Lazy-load heavy pages
const Quests = lazy(() => import('./pages/Quests'));
const Training = lazy(() => import('./pages/Training'));
const Progress = lazy(() => import('./pages/Progress'));
const More = lazy(() => import('./pages/More'));
const Settings = lazy(() => import('./pages/Settings'));
const SystemAnalytics = lazy(() => import('./pages/SystemAnalytics'));
const Store = lazy(() => import('./pages/Store'));

const queryClient = new QueryClient();

const PageFallback = () => (
  <div className="min-h-[100dvh] bg-background flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

/** Renders children only if authenticated, otherwise redirects to /auth */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return <PageFallback />;
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

const AppContent = () => {
  const { user } = useAuth();
  const [showAwakening, setShowAwakening] = useState<boolean | null>(null);
  const [showGoalCapture, setShowGoalCapture] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const [triggerScan, setTriggerScan] = useState(false);
  const {
    showModal, commitment, isRecovery,
    handleAccept, handleRequestAlternative, handleDismiss,
  } = usePreCommitment();
  const { showMigration, migrating, summary, acceptMigration, skipMigration } = useLocalDataMigration();

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
          setShowAwakening(false);
        } else {
          const activated = localStorage.getItem('systemActivated') === 'true';
          setShowAwakening(!activated);
        }
      } catch {
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
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<ErrorBoundary><ProtectedRoute><Index forceFirstScan={triggerScan} onScanTriggered={() => setTriggerScan(false)} /></ProtectedRoute></ErrorBoundary>} />
          <Route path="/quests" element={<ErrorBoundary><ProtectedRoute><Quests /></ProtectedRoute></ErrorBoundary>} />
          <Route path="/training" element={<ErrorBoundary><ProtectedRoute><Training /></ProtectedRoute></ErrorBoundary>} />
          <Route path="/progress" element={<ErrorBoundary><ProtectedRoute><Progress /></ProtectedRoute></ErrorBoundary>} />
          <Route path="/more" element={<ErrorBoundary><ProtectedRoute><More /></ProtectedRoute></ErrorBoundary>} />
          <Route path="/settings" element={<ErrorBoundary><ProtectedRoute><Settings /></ProtectedRoute></ErrorBoundary>} />
          <Route path="/system-analytics" element={<ErrorBoundary><ProtectedRoute><SystemAnalytics /></ProtectedRoute></ErrorBoundary>} />
          <Route path="/store" element={<ErrorBoundary><ProtectedRoute><Store /></ProtectedRoute></ErrorBoundary>} />
          <Route path="/auth" element={<ErrorBoundary><AuthRoute /></ErrorBoundary>} />
          <Route path="/reset-password" element={<ErrorBoundary><ResetPassword /></ErrorBoundary>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
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
    <TickerProvider>
    <TooltipProvider>
      <AuthProvider>
        <HistoryProvider>
          <DayCycleProvider getCurrentDayData={getDayDataFallback}>
            <BrowserRouter>
              <FocusModeProvider>
                <JarvisBrainProvider>
                  <AppWithFAB />
                </JarvisBrainProvider>
              </FocusModeProvider>
            </BrowserRouter>
          </DayCycleProvider>
        </HistoryProvider>
      </AuthProvider>
    </TooltipProvider>
    </TickerProvider>
  </QueryClientProvider>
);

export default App;
