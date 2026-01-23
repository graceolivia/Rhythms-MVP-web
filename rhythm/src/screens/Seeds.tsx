import { useMemo } from 'react';
import { parseISO, differenceInDays, format } from 'date-fns';
import { useTaskStore } from '../stores/useTaskStore';
import type { TaskInstance } from '../types';

function SeedAge({ date }: { date: string }) {
  const days = differenceInDays(new Date(), parseISO(date));
  if (days === 1) return <span>from yesterday</span>;
  if (days < 7) return <span>{days} days ago</span>;
  return <span>{Math.floor(days / 7)} week{days >= 14 ? 's' : ''} ago</span>;
}

function SeedCard({ instance }: { instance: TaskInstance }) {
  const tasks = useTaskStore((state) => state.tasks);
  const promoteToToday = useTaskStore((state) => state.promoteToToday);
  const dismissSeed = useTaskStore((state) => state.dismissSeed);

  const task = tasks.find((t) => t.id === instance.taskId);
  if (!task) return null;

  return (
    <div className="bg-parchment rounded-lg p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-bark font-medium">{task.title}</h3>
          <p className="text-sm text-bark/50">
            <SeedAge date={instance.date} />
          </p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-linen text-bark/60">
          {task.category}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => promoteToToday(instance.id)}
          className="flex-1 px-3 py-2 rounded-lg bg-sage text-cream text-sm font-medium hover:bg-sage/90 transition-colors"
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

  // Calculate seeds from taskInstances
  const uniqueSeeds = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');

    // Get all deferred tasks from previous days
    const seeds = taskInstances.filter(
      (instance) => instance.status === 'deferred' && instance.date !== today
    );

    // Sort by date (most recent first)
    const sortedSeeds = [...seeds].sort(
      (a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()
    );

    // Group by task to avoid showing duplicates
    return sortedSeeds.reduce<TaskInstance[]>((acc, seed) => {
      const alreadyHasTask = acc.some((s) => s.taskId === seed.taskId);
      if (!alreadyHasTask) {
        acc.push(seed);
      }
      return acc;
    }, []);
  }, [taskInstances]);

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-lg mx-auto p-4 pb-24">
      <header className="mb-6">
        <h1 className="font-display text-2xl text-bark">Tomorrow's Seeds</h1>
        <p className="text-bark/60 text-sm">
          Tasks waiting to be planted
        </p>
      </header>

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
            <p className="text-sm text-bark/70">
              <span className="font-medium">{uniqueSeeds.length} seed{uniqueSeeds.length !== 1 ? 's' : ''}</span> waiting.
              Choose which to plant today, or let them go with grace.
            </p>
          </div>

          <div className="space-y-3">
            {uniqueSeeds.map((seed) => (
              <SeedCard key={seed.id} instance={seed} />
            ))}
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
