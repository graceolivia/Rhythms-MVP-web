import type { ActiveChallenge, Task, TaskInstance } from '../../types';
import { CHALLENGE_TEMPLATES } from '../../stores/useChallengeStore';
import { TaskCard } from './TaskCard';

interface RoutineTaskItem {
  task: Task;
  instance: TaskInstance;
}

interface RoutineBlockProps {
  challenge: ActiveChallenge;
  items: RoutineTaskItem[];
  today: string;
  onTaskTap: (instance: TaskInstance) => void;
  onEdit: (task: Task) => void;
  fadingOut: Set<string>;
}

export function RoutineBlock({
  challenge,
  items,
  today,
  onTaskTap,
  onEdit,
  fadingOut,
}: RoutineBlockProps) {
  const template = CHALLENGE_TEMPLATES.find(t => t.id === challenge.templateId);
  if (!template) return null;

  const title = template.groupTitle ?? template.title;
  const doneCount = items.filter(i => i.instance.status === 'completed').length;
  const total = items.length;
  const allDone = doneCount === total && total > 0;

  return (
    <div className={`mb-4 rounded-xl overflow-hidden border transition-colors ${
      allDone ? 'border-sage/40 bg-sage/5' : 'border-bark/8 bg-cream'
    }`}>
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm text-bark">{title}</h3>
          <p className="text-xs text-bark/40 mt-0.5">
            {allDone
              ? 'All done today ✓'
              : `${doneCount} of ${total} done`}
          </p>
        </div>
        {/* Mini progress dots */}
        <div className="flex gap-1 items-center">
          {items.map(({ instance }) => (
            <span
              key={instance.id}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                instance.status === 'completed' ? 'bg-sage' : 'bg-bark/15'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Tasks */}
      <div className="px-3 pb-3 space-y-2">
        {items.map(({ task, instance }) => {
          const isFading = fadingOut.has(instance.id);
          return (
            <div
              key={instance.id}
              className={`transition-all duration-300 ease-in-out ${
                isFading ? 'opacity-0 max-h-0 overflow-hidden -my-1' : 'opacity-100 max-h-40'
              }`}
            >
              <TaskCard
                task={task}
                instance={instance}
                today={today}
                onTap={() => onTaskTap(instance)}
                onEdit={() => onEdit(task)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
