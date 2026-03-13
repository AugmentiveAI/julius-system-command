import { useMemo, useState, useCallback } from 'react';
import { Dumbbell, Bike, Wind, Calendar, ArrowUp, ArrowDown, Minus, Activity, Repeat, Target } from 'lucide-react';
import { JarvisPageBanner } from '@/components/jarvis/JarvisPageBanner';
import { BottomNav } from '@/components/navigation/BottomNav';
import { useWorkout } from '@/hooks/useWorkout';
import { WEEKLY_SCHEDULE, WorkoutType } from '@/types/training';
import { WORKOUT_CONFIGS } from '@/data/workouts';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { GeneticHUD } from '@/components/genetic/GeneticHUD';
import { getSystemToast } from '@/utils/systemVoice';
import { useGeneticState } from '@/hooks/useGeneticState';
import {
  getTrainingRecommendation,
  activateTrainingBuff,
} from '@/utils/trainingIntelligence';
import { useTrainingLog } from '@/hooks/useTrainingLog';
import {
  getMesocycleState,
  getWeeklyPrescription,
  evaluateDeload,
  calibrateToGeneticState,
} from '@/utils/periodizationEngine';
import { ReadinessCheckModal } from '@/components/training/ReadinessCheckModal';
import { SessionSummaryModal } from '@/components/training/SessionSummaryModal';
import { DeloadBanner } from '@/components/training/DeloadBanner';
import { MesocycleProgress } from '@/components/training/MesocycleProgress';
import { FatigueGauge } from '@/components/training/FatigueGauge';
import { ExerciseProgressCard, ExerciseTrackingData, ExerciseSetData } from '@/components/training/ExerciseProgressCard';
import { RestTimer } from '@/components/training/RestTimer';
import { RomTracker } from '@/components/training/RomTracker';

const WORKOUT_ICONS: Partial<Record<WorkoutType, React.ElementType>> = {
  'push-hypertrophy': Dumbbell,
  'pull-hypertrophy': Dumbbell,
  'legs-core': Dumbbell,
  'push-pull-power': Dumbbell,
  'peloton-pz-endurance': Bike,
  'peloton-pz-max': Bike,
  'animal-flow': Wind,
  'rest': Calendar,
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const INTENSITY_COLORS = {
  heavy: { border: 'border-red-500/30', bg: 'bg-red-500/10', text: 'text-red-400', label: 'HEAVY' },
  moderate: { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'MODERATE' },
  light: { border: 'border-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'LIGHT' },
};

const SignalIcon = ({ impact }: { impact: 'boost' | 'neutral' | 'reduce' }) => {
  if (impact === 'boost') return <ArrowUp className="h-3 w-3 text-green-400" />;
  if (impact === 'reduce') return <ArrowDown className="h-3 w-3 text-red-400" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
};

const Training = () => {
  const {
    workout,
    workoutCompleted,
    toggleExercise,
    completeWorkout,
    completedCount,
    totalCount,
    allExercisesComplete,
    prescription,
    swapDecision,
    overloadPlan,
    trainingLevel,
    sessionsLogged,
    resetWorkout,
  } = useWorkout();
  const { toast } = useToast();
  const { geneticState, sprintsToday } = useGeneticState();
  const { fatigueAccumulation, recentLogs, logWorkout, getPR, getLastSession } = useTrainingLog();

  // ── Periodization state ────────────────────────────────────────
  const mesocycle = useMemo(() => getMesocycleState(), []);
  const weeklyRx = useMemo(() => getWeeklyPrescription(mesocycle), [mesocycle]);

  const recentRPEs = useMemo(() =>
    recentLogs.slice(0, 5).map(l => l.fatigue_score ?? 5).reverse(),
    [recentLogs]
  );
  const recentReadiness = useMemo(() =>
    recentLogs.slice(0, 5).map(l => l.readiness_pre ?? 5).reverse(),
    [recentLogs]
  );

  const deloadDecision = useMemo(() =>
    evaluateDeload(mesocycle, fatigueAccumulation, recentRPEs, recentReadiness, geneticState?.comtPhase ?? null),
    [mesocycle, fatigueAccumulation, recentRPEs, recentReadiness, geneticState]
  );

  const calibrated = useMemo(() =>
    calibrateToGeneticState(weeklyRx, geneticState?.comtPhase ?? null, sprintsToday),
    [weeklyRx, geneticState, sprintsToday]
  );

  // ── Readiness & Session Summary modals ─────────────────────────
  const [showReadiness, setShowReadiness] = useState(() => {
    const todayLog = recentLogs.find(l => {
      const d = new Date(l.completed_at);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    });
    return !workoutCompleted && !todayLog;
  });
  const [readinessScore, setReadinessScore] = useState<number | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  // ── Per-exercise tracking data ─────────────────────────────────
  const [exerciseTracking, setExerciseTracking] = useState<Record<string, ExerciseTrackingData>>({});
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [prsHit, setPrsHit] = useState<string[]>([]);

  const handleSetComplete = useCallback((exerciseId: string, setData: ExerciseSetData) => {
    setExerciseTracking(prev => {
      const existing = prev[exerciseId];
      const exercise = workout.exercises.find(e => e.id === exerciseId);
      const sets = existing?.sets ? [...existing.sets, setData] : [setData];
      return {
        ...prev,
        [exerciseId]: {
          exerciseId,
          exerciseName: exercise?.name ?? exerciseId,
          sets,
          allSetsComplete: sets.length >= (exercise?.sets ?? 0),
        },
      };
    });

    // Check for PR
    const exercise = workout.exercises.find(e => e.id === exerciseId);
    if (exercise && setData.weight > 0) {
      const pr = getPR(exercise.name);
      if (pr && setData.weight > pr.maxWeight) {
        setPrsHit(prev => [...prev, `${exercise.name}: ${setData.weight} lbs × ${setData.reps}`]);
      }
    }

    // Show rest timer after logging a set (for weight exercises)
    if (setData.weight > 0) {
      setShowRestTimer(true);
    }
  }, [workout.exercises, getPR]);

  const handleExerciseAllComplete = useCallback((exerciseId: string) => {
    toggleExercise(exerciseId);
  }, [toggleExercise]);

  const handleReadinessComplete = useCallback((score: number) => {
    setReadinessScore(score);
    setShowReadiness(false);
  }, []);

  const trainingRec = useMemo(
    () => getTrainingRecommendation(geneticState, sprintsToday, workoutCompleted),
    [geneticState, sprintsToday, workoutCompleted]
  );

  const Icon = WORKOUT_ICONS[workout.type] || Dumbbell;
  const today = new Date().getDay();
  const intensityStyle = prescription
    ? INTENSITY_COLORS[prescription.prescribedIntensity]
    : INTENSITY_COLORS.moderate;

  // Calculate real volume from tracking data
  const totalVolume = useMemo(() => {
    return Object.values(exerciseTracking).reduce((total, ex) => {
      return total + ex.sets
        .filter(s => s.completed)
        .reduce((sum, s) => sum + (s.weight * s.reps), 0);
    }, 0);
  }, [exerciseTracking]);

  const handleCompleteWorkout = () => {
    completeWorkout();
    toast(getSystemToast('workoutComplete', { xp: workout.xp }));

    if (trainingRec.postWorkoutBuff) {
      activateTrainingBuff(trainingRec.postWorkoutBuff);
      const buff = trainingRec.postWorkoutBuff;
      toast({
        title: `${buff.icon} ${buff.name} activated`,
        description: buff.effect,
        duration: 4000,
      });
    }

    setShowRestTimer(false);
    setShowSummary(true);
  };

  const handleSessionLogged = useCallback(async (fatigueScore: number, notes: string) => {
    setShowSummary(false);

    // Build exercise data from tracking
    const exerciseData = workout.exercises.map(ex => {
      const tracking = exerciseTracking[ex.id];
      if (tracking && tracking.sets.length > 0) {
        const completedSets = tracking.sets.filter(s => s.completed);
        const avgWeight = completedSets.length > 0
          ? Math.round(completedSets.reduce((s, set) => s + set.weight, 0) / completedSets.length)
          : 0;
        const avgReps = completedSets.length > 0
          ? Math.round(completedSets.reduce((s, set) => s + set.reps, 0) / completedSets.length)
          : 0;
        const avgRpe = completedSets.length > 0
          ? Math.round(completedSets.reduce((s, set) => s + set.rpe, 0) / completedSets.length)
          : fatigueScore;
        return {
          name: ex.name,
          sets: completedSets.length,
          reps: avgReps,
          weight: avgWeight,
          rpe: avgRpe,
          completed: ex.completed,
        };
      }
      return {
        name: ex.name,
        sets: ex.sets,
        reps: parseInt(ex.reps) || 0,
        weight: 0,
        rpe: fatigueScore,
        completed: ex.completed,
      };
    });

    await logWorkout({
      workout_type: workout.type,
      exercises: exerciseData,
      fatigue_score: fatigueScore,
      readiness_pre: readinessScore,
      genetic_phase: geneticState?.comtPhase ?? null,
      sprint_count: sprintsToday,
      notes: notes || null,
    });

    toast({
      title: 'Session logged',
      description: 'Training data saved to The System.',
      duration: 3000,
    });
  }, [workout, exerciseTracking, readinessScore, geneticState, sprintsToday, logWorkout, toast]);

  return (
    <div className="min-h-screen bg-background pb-24" style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top, 0px))' }}>
      <GeneticHUD />

      <ReadinessCheckModal
        open={showReadiness}
        onComplete={handleReadinessComplete}
      />

      <SessionSummaryModal
        open={showSummary}
        onComplete={handleSessionLogged}
        totalVolume={totalVolume}
        exercisesCompleted={completedCount}
        exercisesTotal={totalCount}
        prsHit={prsHit}
        xpEarned={workout.xp}
      />

      <div className="mx-auto max-w-2xl space-y-4 px-4 mt-3">
        {/* System Header */}
        <div className="text-center">
          <h1 className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground">
            [ The System ]
          </h1>
          <h2 className="mt-1 font-display text-xl font-bold text-foreground">
            Training Module
          </h2>
          <div className="mt-1 flex items-center justify-center gap-2">
            <Target className="h-3 w-3 text-muted-foreground" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Level: {trainingLevel} · {sessionsLogged} session{sessionsLogged !== 1 ? 's' : ''} logged
            </span>
          </div>
        </div>

        {/* Mesocycle + Fatigue Row */}
        <div className="grid grid-cols-1 gap-3">
          <MesocycleProgress mesocycle={mesocycle} />
          <FatigueGauge accumulation={fatigueAccumulation} />
        </div>

        <DeloadBanner decision={deloadDecision} />

        {/* JARVIS Brain Banner */}
        <JarvisPageBanner page="training" />

        {calibrated.geneticAlert && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="font-tech text-sm text-amber-400">
              ⚠ {calibrated.geneticAlert}
            </p>
            {calibrated.xpBonus > 1 && (
              <p className="mt-1 font-mono text-[10px] text-primary">
                XP Bonus: ×{calibrated.xpBonus}
              </p>
            )}
          </div>
        )}

        {swapDecision?.swapped && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-1">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="font-display text-xs font-bold uppercase tracking-wider text-amber-400">
                System Override
              </span>
            </div>
            <p className="font-tech text-sm text-foreground/80">
              {swapDecision.reason}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <span className="font-mono text-[10px] text-muted-foreground">
                Scheduled: {WORKOUT_CONFIGS[swapDecision.originalType]?.label} ({swapDecision.originalReadiness}% ready)
              </span>
              <span className="font-mono text-[10px] text-amber-400">
                → {WORKOUT_CONFIGS[swapDecision.finalType]?.label} ({swapDecision.finalReadiness}% ready)
              </span>
            </div>
          </div>
        )}

        {prescription && (
          <div className={`rounded-lg border ${intensityStyle.border} ${intensityStyle.bg} p-4 space-y-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className={`h-4 w-4 ${intensityStyle.text}`} />
                <span className={`font-display text-sm font-bold ${intensityStyle.text}`}>
                  {intensityStyle.label}
                </span>
                <span className="font-tech text-xs text-muted-foreground">
                  Readiness: {prescription.readinessScore}%
                </span>
              </div>
              <span className="rounded-md bg-primary/20 px-2 py-0.5 font-tech text-[10px] text-primary">
                XP ×{prescription.xpMultiplier}
              </span>
            </div>
            <p className="font-tech text-sm text-foreground/80">
              {prescription.reason}
            </p>
            {prescription.overrideWarning && (
              <p className="font-mono text-[10px] text-amber-400">
                ⚠ {prescription.overrideWarning}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {prescription.signals.map((signal, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 rounded-md border border-border/50 bg-background/50 px-2 py-1"
                >
                  <SignalIcon impact={signal.impact} />
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {signal.source}: {signal.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {trainingRec.reason && trainingRec.nudgeType !== 'none' && (
          <div className={`rounded-lg border p-3 ${
            trainingRec.nudgeType === 'comt-dip'
              ? 'border-amber-500/30 bg-amber-500/5'
              : trainingRec.nudgeType === 'morning-activation' || trainingRec.nudgeType === 'general'
              ? 'border-primary/30 bg-primary/5'
              : trainingRec.nudgeType === 'post-sprint-recovery'
              ? 'border-blue-500/30 bg-blue-500/5'
              : 'border-border bg-card/50'
          }`}>
            <p className="font-tech text-sm text-foreground/80">
              {trainingRec.reason}
            </p>
            {trainingRec.postWorkoutBuff && !workoutCompleted && (
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                After completion: {trainingRec.postWorkoutBuff.icon} {trainingRec.postWorkoutBuff.name} — {trainingRec.postWorkoutBuff.effect}
              </p>
            )}
          </div>
        )}

        {/* Today's Workout Card */}
        <div
          className={`rounded-lg border border-border bg-card p-4 ${
            workoutCompleted ? 'border-green-500/30' : ''
          }`}
          style={
            workoutCompleted
              ? { boxShadow: '0 0 20px hsl(142 76% 36% / 0.2)' }
              : undefined
          }
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Icon className={`h-5 w-5 ${workout.color}`} />
              </div>
              <div>
                <h3 className={`font-display text-lg font-bold ${workout.color}`}>
                  {workout.label}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {completedCount}/{totalCount} exercises complete
                  {totalVolume > 0 && (
                    <span className="ml-1.5 text-primary">
                      · {totalVolume > 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume} lbs
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="rounded-md bg-primary/20 px-3 py-1">
              <span className="font-tech text-sm font-bold text-primary">
                +{workout.xp} XP
              </span>
            </div>
          </div>

          {/* Rest Timer */}
          {showRestTimer && !workoutCompleted && (
            <div className="mt-3">
              <RestTimer
                onDismiss={() => setShowRestTimer(false)}
                defaultSeconds={prescription?.prescribedIntensity === 'heavy' ? 180 : 120}
              />
            </div>
          )}

          {/* Exercise Cards */}
          <div className="mt-4 space-y-2">
            {workout.exercises.map(exercise => {
              const overload = overloadPlan.find(o => o.exerciseId === exercise.id);
              const lastSess = getLastSession(exercise.name);
              const pr = getPR(exercise.name);

              return (
                <ExerciseProgressCard
                  key={exercise.id}
                  exercise={exercise}
                  overload={overload}
                  personalRecord={pr}
                  lastSession={lastSess ? { weight: lastSess.weight, reps: lastSess.reps, rpe: lastSess.rpe } : null}
                  disabled={workoutCompleted}
                  onSetComplete={handleSetComplete}
                  onAllComplete={handleExerciseAllComplete}
                  trackingData={exerciseTracking[exercise.id]}
                />
              );
            })}
          </div>

          {allExercisesComplete && !workoutCompleted && (
            <Button
              onClick={handleCompleteWorkout}
              className="mt-4 w-full bg-green-600 hover:bg-green-700"
            >
              Complete Workout
            </Button>
          )}

          {workoutCompleted && (
            <div className="mt-4 space-y-2">
              <div className="rounded-md bg-green-500/10 px-3 py-2 text-center">
                <p className="font-tech text-sm text-green-400">
                  ✓ Workout complete. Well done, hunter.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetWorkout();
                  setExerciseTracking({});
                  setPrsHit([]);
                  setShowRestTimer(false);
                }}
                className="w-full text-xs"
              >
                Reset Workout
              </Button>
            </div>
          )}
        </div>

        {/* Genetic Tip Box */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="font-tech text-sm text-primary">
            💨 <span className="font-bold">ACTN3 CC Active:</span> Your fast-twitch
            fibers are primed for explosive power. Rest 2-3 min between heavy sets.
          </p>
        </div>

        {/* Weekly Schedule */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 font-display text-sm font-semibold text-foreground">
            Weekly Schedule
          </h3>
        <div className="grid grid-cols-7 gap-[3px]">
            {DAY_LABELS.map((day, index) => {
              const workoutType = WEEKLY_SCHEDULE[index];
              const config = WORKOUT_CONFIGS[workoutType];
              const isToday = index === today;

              return (
                <div
                  key={day}
                  className={`rounded-md px-1 py-2 text-center transition-all ${
                    isToday
                      ? 'border-2 border-primary bg-primary/10'
                      : 'border border-border bg-card/50'
                  }`}
                >
                  <p
                    className={`text-[10px] font-bold ${
                      isToday ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {day}
                  </p>
                  <p className={`mt-1 text-[9px] leading-tight truncate ${config.color}`}>
                    {config.label.split(' ')[0]}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Training;
