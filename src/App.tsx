import { useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HistoryProvider } from "@/contexts/HistoryContext";
import { FocusModeProvider } from "@/contexts/FocusModeContext";
import { FocusFAB } from "@/components/focus/FocusFAB";
import { useFocusModeContext } from "@/contexts/FocusModeContext";
import { SystemCommsBanner } from "@/components/comms/SystemCommsBanner";
import { useSystemComms } from "@/hooks/useSystemComms";
import { useGeneticState } from "@/hooks/useGeneticState";
import { AwakeningSequence, isFirstRun } from "@/components/onboarding/AwakeningSequence";
import { PreCommitmentModal } from "@/components/quests/PreCommitmentModal";
import { usePreCommitment } from "@/hooks/usePreCommitment";
import { SystemCommsContext } from "@/contexts/SystemCommsContext";
import Index from "./pages/Index";
import Quests from "./pages/Quests";
import Training from "./pages/Training";
import Progress from "./pages/Progress";
import More from "./pages/More";
import NotFound from "./pages/NotFound";
import SystemAnalytics from "./pages/SystemAnalytics";

const queryClient = new QueryClient();

const AppContent = () => {
  const [showAwakening, setShowAwakening] = useState(isFirstRun);
  const [triggerScan, setTriggerScan] = useState(false);
  const {
    showModal, commitment, isRecovery,
    handleAccept, handleRequestAlternative, handleDismiss,
  } = usePreCommitment();

  const handleAwakeningComplete = () => {
    setShowAwakening(false);
    setTriggerScan(true);
  };

  return (
    <>
      <Toaster />
      <Sonner />
      {showAwakening && <AwakeningSequence onComplete={handleAwakeningComplete} />}
      {showModal && commitment && (
        <PreCommitmentModal
          commitment={commitment}
          isRecovery={isRecovery}
          onAccept={handleAccept}
          onRequestAlternative={handleRequestAlternative}
          onDismiss={handleDismiss}
        />
      )}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index forceFirstScan={triggerScan} onScanTriggered={() => setTriggerScan(false)} />} />
          <Route path="/quests" element={<Quests />} />
          <Route path="/training" element={<Training />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/more" element={<More />} />
          <Route path="/system-analytics" element={<SystemAnalytics />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const AppWithFAB = () => {
  const { active: focusActive, activate } = useFocusModeContext();
  const { geneticState, sprintsToday } = useGeneticState();

  // Determine system rec and sprint active from localStorage
  let systemRec: string | null = null;
  try {
    const raw = localStorage.getItem('systemStateHistory');
    if (raw) {
      const history = JSON.parse(raw);
      if (history.length > 0) systemRec = history[history.length - 1].systemRecommendation || null;
    }
  } catch { /* ignore */ }

  // Check if sprint timer is active
  let isSprintActive = false;
  try {
    const raw = localStorage.getItem('systemSprintTimer');
    if (raw) {
      const data = JSON.parse(raw);
      isSprintActive = data.phase === 'sprinting' || data.phase === 'break' || data.phase === 'extended-break';
    }
  } catch { /* ignore */ }

  // Check training completion
  let trainingCompleted = false;
  try {
    const raw = localStorage.getItem('systemWorkoutData');
    if (raw) {
      const data = JSON.parse(raw);
      trainingCompleted = data.completedToday === true;
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <HistoryProvider>
        <FocusModeProvider>
          <AppWithFAB />
        </FocusModeProvider>
      </HistoryProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
