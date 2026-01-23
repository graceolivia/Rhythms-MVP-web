import { useState } from 'react';
import { useTaskStore } from '../../stores/useTaskStore';
import type { Task, TaskInput, TaskTier, RecurrenceRule, NapContext, TaskCategory } from '../../types';

interface TaskEditorProps {
  tier: TaskTier;
  isOpen: boolean;
  onClose: () => void;
}

const TIER_LABELS: Record<TaskTier, string> = {
  anchor: 'Anchors',
  rhythm: 'Rhythms',
  tending: 'Tending Tasks',
};

const RECURRENCE_OPTIONS: { value: RecurrenceRule; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const NAP_CONTEXT_OPTIONS: { value: NapContext | 'null'; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: 'both-awake', label: 'Both awake' },
  { value: 'both-asleep', label: 'Both asleep' },
  { value: 'toddler-asleep', label: 'Toddler asleep' },
  { value: 'baby-asleep', label: 'Baby asleep' },
  { value: 'null', label: 'N/A' },
];

const CATEGORY_OPTIONS: { value: TaskCategory; label: string }[] = [
  { value: 'kids', label: 'Kids' },
  { value: 'meals', label: 'Meals' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'laundry', label: 'Laundry' },
  { value: 'tidying', label: 'Tidying' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'errands', label: 'Errands' },
  { value: 'self-care', label: 'Self-care' },
  { value: 'focus-work', label: 'Focus work' },
  { value: 'other', label: 'Other' },
];

function EditableTask({
  task,
  tier,
  onUpdate,
  onDelete,
}: {
  task: Task;
  tier: TaskTier;
  onUpdate: (id: string, updates: Partial<TaskInput>) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-cream rounded-lg p-3 border border-bark/5">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={task.title}
          onChange={(e) => onUpdate(task.id, { title: e.target.value })}
          className="flex-1 bg-transparent font-medium text-bark text-sm border-b border-transparent focus:border-bark/20 focus:outline-none py-1"
        />
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-bark/40 hover:text-bark p-1"
          aria-label="Toggle details"
        >
          <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="text-bark/30 hover:text-red-500 p-1"
          aria-label="Delete task"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 pt-3 border-t border-bark/10">
          {tier === 'anchor' && (
            <div>
              <label className="text-xs text-bark/50 block mb-1">Scheduled time</label>
              <input
                type="time"
                value={task.scheduledTime || ''}
                onChange={(e) => onUpdate(task.id, { scheduledTime: e.target.value || null })}
                className="bg-parchment rounded px-2 py-1 text-sm text-bark border border-bark/10"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-bark/50 block mb-1">Recurrence</label>
            <select
              value={typeof task.recurrence === 'string' ? task.recurrence : 'daily'}
              onChange={(e) => onUpdate(task.id, { recurrence: e.target.value as RecurrenceRule })}
              className="bg-parchment rounded px-2 py-1 text-sm text-bark border border-bark/10 w-full"
            >
              {RECURRENCE_OPTIONS.map((opt) => (
                <option key={opt.value as string} value={opt.value as string}>{opt.label}</option>
              ))}
            </select>
          </div>

          {tier !== 'anchor' && (
            <div>
              <label className="text-xs text-bark/50 block mb-1">Nap context</label>
              <select
                value={task.napContext || 'null'}
                onChange={(e) => onUpdate(task.id, { napContext: e.target.value === 'null' ? null : e.target.value as NapContext })}
                className="bg-parchment rounded px-2 py-1 text-sm text-bark border border-bark/10 w-full"
              >
                {NAP_CONTEXT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs text-bark/50 block mb-1">Category</label>
            <select
              value={task.category}
              onChange={(e) => onUpdate(task.id, { category: e.target.value as TaskCategory })}
              className="bg-parchment rounded px-2 py-1 text-sm text-bark border border-bark/10 w-full"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-bark/50">Active</label>
            <input
              type="checkbox"
              checked={task.isActive}
              onChange={(e) => onUpdate(task.id, { isActive: e.target.checked })}
              className="rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function TaskEditor({ tier, isOpen, onClose }: TaskEditorProps) {
  const tasks = useTaskStore((state) => state.tasks);
  const updateTask = useTaskStore((state) => state.updateTask);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const addTask = useTaskStore((state) => state.addTask);

  const tierTasks = tasks.filter((t) => t.tier === tier);

  const handleAdd = () => {
    addTask({
      type: 'standard',
      title: 'New task',
      tier,
      scheduledTime: tier === 'anchor' ? '09:00' : null,
      recurrence: 'daily',
      napContext: tier === 'anchor' ? null : 'any',
      isActive: true,
      category: 'other',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-bark/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-parchment rounded-t-2xl w-full max-w-lg max-h-[80vh] overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-bark/10">
          <h2 className="font-display text-lg text-bark">Edit {TIER_LABELS[tier]}</h2>
          <button onClick={onClose} className="text-bark/40 hover:text-bark p-1">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Task list */}
        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-2">
          {tierTasks.length === 0 && (
            <p className="text-center text-bark/40 py-4 text-sm">No {TIER_LABELS[tier].toLowerCase()} yet.</p>
          )}
          {tierTasks.map((task) => (
            <EditableTask
              key={task.id}
              task={task}
              tier={tier}
              onUpdate={updateTask}
              onDelete={deleteTask}
            />
          ))}
        </div>

        {/* Add button */}
        <div className="p-4 border-t border-bark/10">
          <button
            onClick={handleAdd}
            className="w-full py-3 bg-sage/20 hover:bg-sage/30 text-sage font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add {tier === 'anchor' ? 'Anchor' : tier === 'rhythm' ? 'Rhythm' : 'Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
