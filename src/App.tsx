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

// Lazy-load pages
const Training = lazy(() => import('./pages/Training'));
const Intel = lazy(() => import('./pages/Intel'));
const SystemTab = lazy(() => import('./pages/SystemTab'));

const queryClient = new QueryClient();

const PageFallback = () => (
  <div className="min-h-[100dvh] bg-background flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <PageFallback />;
  if (!session) return <Navigate to="/auth" replace />;
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
    if (!user) { setShowAwakening(null); return; }
    let cancelled = false;
    const checkOnboarding = async () => {
      try {
        const { data } = await supabase.from('player_state').select('total_xp').eq('user_id', user.id).maybeSingle();
        if (cancelled) return;
        if (data && data.total_xp > 0) setShowAwakening(false);
        else setShowAwakening(localStorage.getItem('systemActivated') !== 'true');
      } catch { setShowAwakening(localStorage.getItem('systemActivated') !== 'true'); }
    };
    checkOnboarding();
    return () => { cancelled = true; };
  }, [user]);

  const handleAwakeningComplete = () => { setShowAwakening(false); setShowGoalCapture(true); };
  const handleGoalSubmit = (goal: string) => {
    try { const raw = localStorage.getItem('the-system-player'); const p = raw ? JSON.parse(raw) : {}; p.goal = goal; localStorage.setItem('the-system-player', JSON.stringify(p)); } catch {}
    setShowGoalCapture(false); setShowBriefing(true);
  };
  const handleBriefingComplete = () => { setShowBriefing(false); setTriggerScan(true); };

  return (
    <>
      <Toaster />
      <Sonner />
      <DataMigrationDialog open={showMigration} migrating={migrating} summary={summary} onAccept={acceptMigration} onSkip={skipMigration} />
      {showAwakening === true && <AwakeningSequence onComplete={handleAwakeningComplete} />}
      {showGoalCapture && <GoalCapture onSubmit={handleGoalSubmit} />}
      {showBriefing && <SystemBriefing onComplete={handleBriefingComplete} />}
      {showModal && commitment && (
        <PreCommitmentModal commitment={commitment} isRecovery={isRecovery} onAccept={handleAccept} onRequestAlternative={handleRequestAlternative} onDismiss={handleDismiss} />
      )}
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<ErrorBoundary><ProtectedRoute><Index forceFirstScan={triggerScan} onScanTriggered={() => setTriggerScan(false)} /></ProtectedRoute></ErrorBoundary>} />
          <Route path="/training" element={<ErrorBoundary><ProtectedRoute><Training /></ProtectedRoute></ErrorBoundary>} />
          <Route path="/intel" element={<ErrorBoundary><ProtectedRoute><Intel /></ProtectedRoute></ErrorBoundary>} />
          <Route path="/system" element={<ErrorBoundary><ProtectedRoute><SystemTab /></ProtectedRoute></ErrorBoundary>} />
          <Route path="/auth" element={<ErrorBoundary><AuthRoute /></ErrorBoundary>} />
          <Route path="/reset-password" element={<ErrorBoundary><ResetPassword /></ErrorBoundary>} />
          {/* Legacy redirects */}
          <Route path="/quests" element={<Navigate to="/" replace />} />
          <Route path="/progress" element={<Navigate to="/intel" replace />} />
          <Route path="/more" element={<Navigate to="/system" replace />} />
          <Route path="/settings" element={<Navigate to="/system" replace />} />
          <Route path="/system-analytics" element={<Navigate to="/intel" replace />} />
          <Route path="/store" element={<Navigate to="/system" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
};

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
  try { const raw = localStorage.getItem('systemStateHistory'); if (raw) { const h = JSON.parse(raw); if (h.length > 0) systemRec = h[h.length - 1].systemRecommendation || null; } } catch {}

  let isSprintActive = false;
  try { const raw = localStorage.getItem('systemSprintTimer'); if (raw) { const d = JSON.parse(raw); isSprintActive = ['sprinting', 'break', 'extended-break'].includes(d.phase); } } catch {}

  let trainingCompleted = false;
  try { const raw = localStorage.getItem('the-system-workout'); if (raw) trainingCompleted = JSON.parse(raw).workoutCompleted === true; } catch {}

  const comms = useSystemComms({
    comtPhase: geneticState.comtPhase, sprintsToday, systemRec,
    consecutiveCompleted: 0, consecutiveSkipped: 0, trainingCompleted,
    isFocusMode: focusActive, isSprintActive,
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
    const totalXP = quests.filter((q: any) => q.completed).reduce((sum: number, q: any) => sum + (q.xp || 0) + (q.geneticBonus?.bonusXp || 0), 0);
    let mode = 'steady';
    try { const raw = localStorage.getItem('systemStateHistory'); if (raw) { const h = JSON.parse(raw); if (h.length > 0) mode = h[h.length - 1].systemRecommendation || 'steady'; } } catch {}
    let sprints = 0;
    try { const raw = localStorage.getItem('systemSprintTimer'); if (raw) { const d = JSON.parse(raw); sprints = d.currentSprint ? d.currentSprint - 1 : 0; } } catch {}
    return { questsCompleted: completed, questsTotal: quests.length, xpEarned: totalXP, mode, sprintsCompleted: sprints };
  } catch { return { questsCompleted: 0, questsTotal: 0, xpEarned: 0, mode: 'steady', sprintsCompleted: 0 }; }
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
