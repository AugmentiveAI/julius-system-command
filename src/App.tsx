import { useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HistoryProvider } from "@/contexts/HistoryContext";
import { AwakeningSequence, isFirstRun } from "@/components/onboarding/AwakeningSequence";
import { PreCommitmentModal } from "@/components/quests/PreCommitmentModal";
import { usePreCommitment } from "@/hooks/usePreCommitment";
import Index from "./pages/Index";
import Quests from "./pages/Quests";
import Training from "./pages/Training";
import Milestones from "./pages/Milestones";
import Inventory from "./pages/Inventory";
import History from "./pages/History";
import Genetics from "./pages/Genetics";
import NotFound from "./pages/NotFound";
import SystemAnalytics from "./pages/SystemAnalytics";

const queryClient = new QueryClient();

const AppContent = () => {
  const [showAwakening, setShowAwakening] = useState(isFirstRun);
  const [triggerScan, setTriggerScan] = useState(false);
  const {
    showModal,
    commitment,
    isRecovery,
    handleAccept,
    handleRequestAlternative,
    handleDismiss,
  } = usePreCommitment();

  const handleAwakeningComplete = () => {
    setShowAwakening(false);
    setTriggerScan(true);
  };

  return (
    <>
      <Toaster />
      <Sonner />
      {showAwakening && (
        <AwakeningSequence onComplete={handleAwakeningComplete} />
      )}
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
          <Route path="/milestones" element={<Milestones />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/history" element={<History />} />
          <Route path="/genetics" element={<Genetics />} />
          <Route path="/system-analytics" element={<SystemAnalytics />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <HistoryProvider>
          <AppContent />
        </HistoryProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
