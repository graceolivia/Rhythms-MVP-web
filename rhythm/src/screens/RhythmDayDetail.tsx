import { useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useTaskStore } from '../stores/useTaskStore';
import { shouldTaskOccurOnDate } from '../stores/useTaskStore';
import type { TaskTier } from '../types';

const TIER_ORDER: TaskTier[] = ['anchor', 'rhythm', 'tending'];

const TIER_STYLES: Record<TaskTier, { bg: string; text: string; label: string }> = {
  anchor: { bg: 'bg-terracotta/15', text: 'text-terracotta', label: 'Anchor' },
  rhythm: { bg: 'bg-sage/15', text: 'text-sage', label: 'Rhythm' },
  tending: { bg: 'bg-skyblue/15', text: 'text-skyblue', label: 'Tending' },
};

export function RhythmDayDetail() {
  const navigate = useNavigate();
  const { date } = useParams<{ date: string }>();
  const tasks = useTaskStore((state) => state.tasks);

  if (!date) {
    navigate('/rhythm');
    return null;
  }

  const parsedDate = parseISO(date);
  const dayTasks = tasks.filter(
    (task) => task.isActive && shouldTaskOccurOnDate(task, parsedDate)
  );

  const groupedByTier = TIER_ORDER.map((tier) => ({
    tier,
    tasks: dayTasks.filter((t) => t.tier === tier),
  })).filter((group) => group.tasks.length > 0);

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-lg mx-auto p-4 pb-24">
        <header className="mb-6">
          <button
            onClick={() => navigate('/rhythm')}
            className="text-sm text-bark/50 hover:text-bark mb-2 flex items-center gap-1"
          >
            ← Back
          </button>
          <h1 className="font-display text-2xl text-bark">
            {format(parsedDate, 'EEEE')}
          </h1>
          <p className="text-bark/60 text-sm">{format(parsedDate, 'MMMM d, yyyy')}</p>
        </header>

        {groupedByTier.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-bark/50 text-sm">No tasks scheduled for this day.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedByTier.map(({ tier, tasks: tierTasks }) => {
              const styles = TIER_STYLES[tier];
              return (
                <section key={tier}>
                  <h2 className={`text-sm font-semibold mb-2 ${styles.text}`}>
                    {styles.label}
                  </h2>
                  <div className="space-y-2">
                    {tierTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg ${styles.bg}`}
                      >
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${styles.text} ${styles.bg}`}>
                          {styles.label[0]}
                        </span>
                        <span className="text-sm text-bark">{task.title}</span>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
