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
import { AwakeningSequence, isFirstRun } from "@/components/onboarding/AwakeningSequence";
import { PreCommitmentModal } from "@/components/quests/PreCommitmentModal";
import { usePreCommitment } from "@/hooks/usePreCommitment";
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
  const { active, activate } = useFocusModeContext();
  return (
    <>
      <AppContent />
      <FocusFAB onClick={activate} active={active} />
    </>
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
