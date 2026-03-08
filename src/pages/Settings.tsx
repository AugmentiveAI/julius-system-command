import { useState, useEffect } from 'react';
import { Eye, EyeOff, Zap, Key, Bot, Sparkles, RotateCcw, Calendar, Trash2, LogOut } from 'lucide-react';
import { BottomNav } from '@/components/navigation/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';
import { useAIQuests } from '@/hooks/useAIQuests';
import { hasAnyApiKey } from '@/utils/aiModelRouter';
import { AwakeningSequence } from '@/components/onboarding/AwakeningSequence';

const AI_SETTINGS_KEY = 'systemAISettings';

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(AI_SETTINGS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveSettings(s: any) {
  localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(s));
}

const MaskedInput = ({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-border bg-muted/30 px-3 py-2.5 pr-10 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus:border-primary/50 focus:outline-none transition-colors"
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
};

const Settings = () => {
  const { signOut } = useAuth();
  const [settings, setSettings] = useState(loadSettings);
  const { isGenerating, generate } = useAIQuests();
  const [showReplay, setShowReplay] = useState(false);
  const [startDate, setStartDate] = useState(() =>
    localStorage.getItem('systemStartDate') || new Date().toISOString().split('T')[0]
  );

  const groqKey = settings.groqApiKey || '';
  const geminiKey = settings.geminiApiKey || '';
  const aiEnabled = settings.aiEnabled || false;

  const updateField = (key: string, val: any) => {
    const next = { ...settings, [key]: val };
    setSettings(next);
    saveSettings(next);
  };

  const [pulseGenerate, setPulseGenerate] = useState(false);

  const handleGenerate = async () => {
    setPulseGenerate(true);
    await generate();
    setTimeout(() => setPulseGenerate(false), 1500);
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
    localStorage.setItem('systemStartDate', e.target.value);
  };

  const handleReplayComplete = () => {
    const keysToReset = [
      'the-system-protocol-quests', 'the-system-quests', 'the-system-daily-xp',
      'the-system-pillar-quests', 'the-system-pillar-streaks', 'the-system-workout',
      'systemMuscleRecovery', 'systemStateHistory', 'systemLastScanDate', 'systemDayCycle',
      'systemGeneticHUD', 'systemSprintTimer', 'systemFocusMode', 'systemFocusModeActive',
      'systemPreCommitment', 'systemPreCommitTriggerDate', 'systemCalibratedCompletions',
      'systemCompletionHistory', 'systemResistanceData', 'systemPersuasionProfile',
      'systemPersuasionOutcomes', 'systemPersuasionOptimizer', 'systemShadowQuest',
      'systemCommsState', 'the-system-caffeine', 'systemWeeklyPlan',
      'systemWeeklyPlanDismissed', 'systemResistancePrevScore',
    ];
    keysToReset.forEach(k => localStorage.removeItem(k));
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
    localStorage.setItem('systemStartDate', today);
    setStartDate(today);
    setShowReplay(false);
    window.location.reload();
  };

  const handleClearData = () => {
    if (confirm('This will reset ALL System data. Are you sure?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  if (showReplay) {
    return <AwakeningSequence onComplete={handleReplayComplete} isReplay />;
  }

  return (
    <div className="min-h-screen bg-background pb-24" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}>
      <div className="mx-auto max-w-md space-y-6 px-4">
        <h1 className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground text-center">
          Settings
        </h1>

        {/* AI Quest Engine Section */}
        <div className="rounded-lg border border-primary/20 bg-card/80 p-5 space-y-5"
          style={{ boxShadow: '0 0 20px hsl(187 100% 50% / 0.06)' }}>
          <div className="flex items-center gap-2.5">
            <Bot className="h-4 w-4 text-primary" />
            <h2 className="font-display text-xs uppercase tracking-[0.2em] text-foreground">
              AI Quest Engine
            </h2>
          </div>

          {/* API Key Inputs */}
          <div className="space-y-4">
            <MaskedInput
              label="Groq API Key (free tier)"
              icon={Key}
              value={groqKey}
              onChange={(v) => updateField('groqApiKey', v)}
              placeholder="gsk_..."
            />
            <MaskedInput
              label="Google Gemini API Key (free tier)"
              icon={Sparkles}
              value={geminiKey}
              onChange={(v) => updateField('geminiApiKey', v)}
              placeholder="AIza..."
            />
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-xs text-foreground">Enable AI Quest Generation</span>
            </div>
            <Switch
              checked={aiEnabled}
              onCheckedChange={(v) => updateField('aiEnabled', v)}
              disabled={!hasAnyApiKey()}
            />
          </div>

          {!hasAnyApiKey() && (
            <p className="font-mono text-[10px] text-muted-foreground/60 text-center">
              Add at least one API key to enable AI generation.
            </p>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !hasAnyApiKey()}
            className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3.5 font-display text-xs uppercase tracking-[0.15em] transition-all
              ${hasAnyApiKey()
                ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 hover:shadow-[0_0_20px_hsl(187_100%_50%/0.3)]'
                : 'border-border bg-muted/10 text-muted-foreground/40 cursor-not-allowed'}
              ${pulseGenerate ? 'animate-pulse shadow-[0_0_30px_hsl(187_100%_50%/0.4)]' : ''}
            `}
          >
            {isGenerating ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="h-3.5 w-3.5" />
                Generate Today's Quests
              </>
            )}
          </button>
        </div>

        {/* System Autonomy */}
        <div className="rounded-lg border border-purple-500/20 bg-card/80 p-5 space-y-4"
          style={{ boxShadow: '0 0 20px hsl(270 60% 50% / 0.06)' }}>
          <div className="flex items-center gap-2.5">
            <Zap className="h-4 w-4 text-purple-400" />
            <h2 className="font-display text-xs uppercase tracking-[0.2em] text-foreground">
              System Autonomy
            </h2>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-4 py-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-purple-400" />
                <span className="font-mono text-xs text-foreground">Auto-Deploy Shadows & Dungeons</span>
              </div>
              <p className="font-mono text-[10px] text-muted-foreground/60 mt-1 ml-5">
                System Intelligence will automatically create recommended shadows and dungeons without manual approval.
              </p>
            </div>
            <Switch
              checked={autoDeploy}
              onCheckedChange={(v) => {
                updateField('autoDeploy', v);
                setAutoDeploy(v);
              }}
            />
          </div>
        </div>

        {/* General Settings */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <h2 className="font-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
            General
          </h2>

          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <label className="font-mono text-xs text-muted-foreground">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
              className="flex-1 rounded-md border border-border bg-muted/30 px-3 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary/50"
            />
          </div>

          <button
            onClick={() => setShowReplay(true)}
            className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 font-mono text-xs text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
          >
            <RotateCcw className="h-4 w-4" />
            Replay Awakening Sequence
          </button>

          <button
            onClick={handleClearData}
            className="flex w-full items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 font-mono text-xs text-destructive/70 transition-all hover:border-destructive/50 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Clear All Data
          </button>

          <button
            onClick={() => signOut()}
            className="flex w-full items-center gap-2 rounded-lg border border-muted-foreground/20 bg-muted/10 px-4 py-3 font-mono text-xs text-muted-foreground transition-all hover:border-foreground/30 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Settings;
