import { useNavigate } from 'react-router-dom';
import { useTaskStore } from '../stores/useTaskStore';
import type { Task, TaskInput } from '../types';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function DayPicker({ task, onUpdate }: { task: Task; onUpdate: (id: string, updates: Partial<TaskInput>) => void }) {
  const activeDays = task.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6];

  const toggleDay = (day: number) => {
    const newDays = activeDays.includes(day)
      ? activeDays.filter((d) => d !== day)
      : [...activeDays, day].sort();
    onUpdate(task.id, { daysOfWeek: newDays.length === 7 ? null : newDays });
  };

  return (
    <div className="flex gap-1">
      {DAY_LABELS.map((label, index) => {
        const isActive = activeDays.includes(index);
        return (
          <button
            key={index}
            onClick={() => toggleDay(index)}
            className={`w-7 h-7 rounded-full text-xs font-semibold transition-all ${
              isActive
                ? 'bg-sage text-cream'
                : 'bg-bark/5 text-bark/30'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function EditWeeklyRhythm() {
  const navigate = useNavigate();
  const tasks = useTaskStore((state) => state.tasks);
  const updateTask = useTaskStore((state) => state.updateTask);

  const activeTasks = tasks.filter((t) => t.isActive);

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
          <h1 className="font-display text-2xl text-bark">Edit Weekly Rhythm</h1>
          <p className="text-bark/60 text-sm">Choose which days each task appears.</p>
        </header>

        {activeTasks.length === 0 ? (
          <p className="text-bark/50 text-sm py-4 text-center">No tasks yet.</p>
        ) : (
          <div className="space-y-3">
            {activeTasks.map((task) => (
              <div key={task.id} className="bg-parchment rounded-xl p-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-sm font-medium text-bark truncate">{task.title}</span>
                  <span className="text-xs text-bark/40 flex-shrink-0">{task.tier}</span>
                </div>
                <DayPicker task={task} onUpdate={updateTask} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
