import { Check, Dumbbell, Bike, Wind, Calendar } from 'lucide-react';
import { BottomNav } from '@/components/navigation/BottomNav';
import { useWorkout } from '@/hooks/useWorkout';
import { WEEKLY_SCHEDULE, WorkoutType } from '@/types/training';
import { WORKOUT_CONFIGS } from '@/data/workouts';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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

const Training = () => {
  const {
    workout,
    workoutCompleted,
    toggleExercise,
    completeWorkout,
    completedCount,
    totalCount,
    allExercisesComplete,
  } = useWorkout();
  const { toast } = useToast();

  const Icon = WORKOUT_ICONS[workout.type] || Dumbbell;
  const today = new Date().getDay();

  const handleCompleteWorkout = () => {
    completeWorkout();
    toast({
      title: 'Workout Complete',
      description: `+${workout.xp} XP earned. The System acknowledges your dedication.`,
    });
  };

  return (
    <div className="min-h-screen bg-background px-4 pb-24 pt-6">
      <div className="mx-auto max-w-2xl space-y-4">
        {/* System Header */}
        <div className="text-center">
          <h1 className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground">
            [ The System ]
          </h1>
          <h2 className="mt-1 font-display text-xl font-bold text-foreground">
            Training Module
          </h2>
        </div>

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
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10`}
              >
                <Icon className={`h-5 w-5 ${workout.color}`} />
              </div>
              <div>
                <h3 className={`font-display text-lg font-bold ${workout.color}`}>
                  {workout.label}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {completedCount}/{totalCount} exercises complete
                </p>
              </div>
            </div>
            <div className="rounded-md bg-primary/20 px-3 py-1">
              <span className="font-tech text-sm font-bold text-primary">
                +{workout.xp} XP
              </span>
            </div>
          </div>

          {/* Exercises List */}
          <div className="mt-4 space-y-2">
            {workout.exercises.map(exercise => (
              <div
                key={exercise.id}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
                  exercise.completed
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-border bg-card/50 hover:border-primary/50'
                }`}
              >
                <button
                  onClick={() => toggleExercise(exercise.id)}
                  disabled={workoutCompleted}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
                    exercise.completed
                      ? 'border-green-500 bg-green-500'
                      : 'border-muted-foreground hover:border-primary'
                  } ${workoutCompleted ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  {exercise.completed && <Check className="h-3 w-3 text-white" />}
                </button>
                <div className="flex-1">
                  <p
                    className={`font-tech text-sm ${
                      exercise.completed
                        ? 'text-muted-foreground line-through'
                        : 'text-foreground'
                    }`}
                  >
                    {exercise.name}
                  </p>
                </div>
                <span className="font-tech text-xs text-muted-foreground">
                  {exercise.sets} × {exercise.reps}
                </span>
              </div>
            ))}
          </div>

          {/* Complete Workout Button */}
          {allExercisesComplete && !workoutCompleted && (
            <Button
              onClick={handleCompleteWorkout}
              className="mt-4 w-full bg-green-600 hover:bg-green-700"
            >
              Complete Workout
            </Button>
          )}

          {workoutCompleted && (
            <div className="mt-4 rounded-md bg-green-500/10 px-3 py-2 text-center">
              <p className="font-tech text-sm text-green-400">
                ✓ Workout complete. Well done, hunter.
              </p>
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
          <div className="grid grid-cols-7 gap-1">
            {DAY_LABELS.map((day, index) => {
              const workoutType = WEEKLY_SCHEDULE[index];
              const config = WORKOUT_CONFIGS[workoutType];
              const isToday = index === today;

              return (
                <div
                  key={day}
                  className={`rounded-md p-2 text-center transition-all ${
                    isToday
                      ? 'border-2 border-primary bg-primary/10'
                      : 'border border-border bg-card/50'
                  }`}
                >
                  <p
                    className={`text-xs font-bold ${
                      isToday ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {day}
                  </p>
                  <p className={`mt-1 text-[10px] leading-tight ${config.color}`}>
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
