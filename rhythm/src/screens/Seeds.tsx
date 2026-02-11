import { useMemo } from 'react';
import { parseISO, differenceInDays } from 'date-fns';
import { useTaskStore } from '../stores/useTaskStore';
import { useAvailability } from '../hooks/useAvailability';
import { ChoreQueueSection } from '../components/tasks/ChoreQueueSection';
import type { TaskInstance, Task } from '../types';

function SeedAge({ date }: { date: string }) {
  const days = differenceInDays(new Date(), parseISO(date));
  if (days === 0) return <span>from today</span>;
  if (days === 1) return <span>from yesterday</span>;
  if (days < 7) return <span>{days} days ago</span>;
  return <span>{Math.floor(days / 7)} week{days >= 14 ? 's' : ''} ago</span>;
}

function SeedCard({ instance, isSuggested }: { instance: TaskInstance; isSuggested: boolean }) {
  const tasks = useTaskStore((state) => state.tasks);
  const promoteToToday = useTaskStore((state) => state.promoteToToday);
  const dismissSeed = useTaskStore((state) => state.dismissSeed);

  const task = tasks.find((t) => t.id === instance.taskId);
  if (!task) return null;

  // Get best when labels for display
  const getBestWhenLabel = (t: Task): string | null => {
    if (t.bestWhen && t.bestWhen.length > 0) {
      const labels: Record<string, string> = {
        free: 'free time',
        quiet: 'quiet time',
        parenting: 'with kids',
      };
      return t.bestWhen.map((s) => labels[s] || s).join(' or ');
    }
    if (t.napContext && t.napContext !== 'any') {
      return 'nap time';
    }
    if (t.careContext && t.careContext !== 'any') {
      return t.careContext === 'all-home' ? 'with kids' : 'kids away';
    }
    return null;
  };

  const bestWhenLabel = getBestWhenLabel(task);

  return (
    <div className={`rounded-lg p-4 ${isSuggested ? 'bg-sage/10 border border-sage/30' : 'bg-parchment'}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-bark font-medium">{task.title}</h3>
            {isSuggested && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-sage/20 text-sage font-medium">
                Good now
              </span>
            )}
          </div>
          <p className="text-sm text-bark/50">
            <SeedAge date={instance.date} />
            {bestWhenLabel && (
              <span className="ml-2 text-bark/40">• best: {bestWhenLabel}</span>
            )}
          </p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-linen text-bark/60">
          {task.category}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => promoteToToday(instance.id)}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isSuggested
              ? 'bg-sage text-cream hover:bg-sage/90'
              : 'bg-bark/10 text-bark hover:bg-bark/20'
          }`}
        >
          Plant Today
        </button>
        <button
          onClick={() => dismissSeed(instance.id)}
          className="px-3 py-2 rounded-lg bg-linen text-bark/60 text-sm hover:bg-linen/80 transition-colors"
        >
          Let it go
        </button>
      </div>
    </div>
  );
}

export function Seeds() {
  const taskInstances = useTaskStore((state) => state.taskInstances);
  const tasks = useTaskStore((state) => state.tasks);
  const { isTaskSuggested, stateLabel, stateIcon } = useAvailability();

  // Calculate seeds from taskInstances
  const { uniqueSeeds, suggestedCount } = useMemo(() => {
    // Get all deferred tasks
    const seeds = taskInstances.filter(
      (instance) => instance.status === 'deferred'
    );

    // Group by task to avoid showing duplicates
    const uniqueByTask = seeds.reduce<TaskInstance[]>((acc, seed) => {
      const alreadyHasTask = acc.some((s) => s.taskId === seed.taskId);
      if (!alreadyHasTask) {
        acc.push(seed);
      }
      return acc;
    }, []);

    // Sort: suggested first, then by date (most recent first)
    const sorted = [...uniqueByTask].sort((a, b) => {
      const taskA = tasks.find((t) => t.id === a.taskId);
      const taskB = tasks.find((t) => t.id === b.taskId);
      const aSuggested = taskA ? isTaskSuggested(taskA) : false;
      const bSuggested = taskB ? isTaskSuggested(taskB) : false;

      if (aSuggested && !bSuggested) return -1;
      if (!aSuggested && bSuggested) return 1;
      return parseISO(b.date).getTime() - parseISO(a.date).getTime();
    });

    // Count suggested
    const suggested = sorted.filter((s) => {
      const task = tasks.find((t) => t.id === s.taskId);
      return task ? isTaskSuggested(task) : false;
    }).length;

    return { uniqueSeeds: sorted, suggestedCount: suggested };
  }, [taskInstances, tasks, isTaskSuggested]);

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-lg mx-auto p-4 pb-24">
      <header className="mb-6">
        <h1 className="font-display text-2xl text-bark">Tomorrow's Seeds</h1>
        <p className="text-bark/60 text-sm">
          Tasks waiting to be planted
        </p>
      </header>

      {/* Chore Queue */}
      <ChoreQueueSection />

      {uniqueSeeds.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🌱</div>
          <p className="text-bark/60">Your seed tray is empty.</p>
          <p className="text-bark/40 text-sm mt-2">
            Incomplete tending tasks will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 p-3 rounded-lg bg-spring-light/50 border border-sage/20">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-bark/70">
                <span className="font-medium">{uniqueSeeds.length} seed{uniqueSeeds.length !== 1 ? 's' : ''}</span> waiting.
                Choose which to plant today, or let them go with grace.
              </p>
              <span className="text-xs px-2 py-1 rounded-full bg-cream text-bark/60 whitespace-nowrap flex items-center gap-1">
                <span>{stateIcon}</span>
                <span>{stateLabel}</span>
              </span>
            </div>
            {suggestedCount > 0 && (
              <p className="text-xs text-sage mt-2">
                {suggestedCount} seed{suggestedCount !== 1 ? 's' : ''} marked "Good now" based on your current availability
              </p>
            )}
          </div>

          <div className="space-y-3">
            {uniqueSeeds.map((seed) => {
              const task = tasks.find((t) => t.id === seed.taskId);
              const isSuggested = task ? isTaskSuggested(task) : false;
              return (
                <SeedCard key={seed.id} instance={seed} isSuggested={isSuggested} />
              );
            })}
          </div>

          {uniqueSeeds.length > 3 && (
            <div className="mt-6 text-center">
              <p className="text-sm text-bark/50 italic">
                Remember: it's okay to let seeds go.
                <br />
                Not every task needs to bloom.
              </p>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}
