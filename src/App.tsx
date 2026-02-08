import { useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HistoryProvider } from "@/contexts/HistoryContext";
import { AwakeningSequence, isFirstRun } from "@/components/onboarding/AwakeningSequence";
import Index from "./pages/Index";
import Quests from "./pages/Quests";
import Training from "./pages/Training";
import Milestones from "./pages/Milestones";
import Inventory from "./pages/Inventory";
import History from "./pages/History";
import Genetics from "./pages/Genetics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [showAwakening, setShowAwakening] = useState(isFirstRun);
  const [triggerScan, setTriggerScan] = useState(false);

  const handleAwakeningComplete = () => {
    setShowAwakening(false);
    setTriggerScan(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <HistoryProvider>
          <Toaster />
          <Sonner />
          {showAwakening && (
            <AwakeningSequence onComplete={handleAwakeningComplete} />
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
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </HistoryProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
