import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useTaskStore } from '../../stores/useTaskStore';
import type { Task, TaskCategory } from '../../types';

const CATEGORY_OPTIONS: { value: TaskCategory; label: string }[] = [
  { value: 'kids', label: 'Kids' },
  { value: 'meals', label: 'Meals' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'laundry', label: 'Laundry' },
  { value: 'tidying', label: 'Tidying' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'errands', label: 'Errands' },
  { value: 'self-care', label: 'Self-Care' },
  { value: 'focus-work', label: 'Focus Work' },
  { value: 'other', label: 'Other' },
];

interface TaskDetailSheetProps {
  task: Task | null;
  onClose: () => void;
  onMoveToTray?: (date: string) => void;
}

export function TaskDetailSheet({ task, onClose, onMoveToTray }: TaskDetailSheetProps) {
  const updateTask = useTaskStore((state) => state.updateTask);
  const scheduleForDate = useTaskStore((state) => state.scheduleForDate);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState<TaskCategory>('other');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setNotes(task.notes ?? '');
      setScheduledTime(task.scheduledTime ?? '');
      setDueDate(task.dueDate ?? '');
      setCategory(task.category);
    }
  }, [task]);

  if (!task) return null;

  const handleSave = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    updateTask(task.id, {
      title: title.trim() || task.title,
      notes: notes || undefined,
      scheduledTime: scheduledTime || null,
      dueDate: dueDate || undefined,
      category,
    });
    if (task.tier === 'todo' && dueDate && dueDate !== today) {
      scheduleForDate(task.id, dueDate);
      if (dueDate > today) {
        onMoveToTray?.(dueDate);
        onClose();
        return;
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-bark/40" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-cream rounded-t-2xl p-6 pb-8 animate-slide-up max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl text-bark">Edit Task</h2>
          <button onClick={onClose} className="text-bark/40 hover:text-bark p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className="block text-sm text-bark/70 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-full px-4 py-3 rounded-xl border border-bark/20 bg-white focus:outline-none focus:border-sage text-bark"
          />
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="block text-sm text-bark/70 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-bark/20 bg-white focus:outline-none focus:border-sage text-bark resize-none"
          />
        </div>

        {/* Scheduled time */}
        <div className="mb-4">
          <label className="block text-sm text-bark/70 mb-1">Scheduled time</label>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl border border-bark/20 bg-white focus:outline-none focus:border-sage text-bark text-sm"
            />
            {scheduledTime && (
              <button
                type="button"
                onClick={() => setScheduledTime('')}
                className="text-bark/40 hover:text-bark text-sm"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Due date — only if task has one */}
        {task.dueDate !== undefined && (
          <div className="mb-4">
            <label className="block text-sm text-bark/70 mb-1">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-bark/20 bg-white focus:outline-none focus:border-sage text-bark text-sm"
            />
          </div>
        )}

        {/* Category */}
        <div className="mb-6">
          <label className="block text-sm text-bark/70 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TaskCategory)}
            className="w-full px-4 py-2 rounded-xl border border-bark/20 bg-white focus:outline-none focus:border-sage text-bark text-sm"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-bark/10">
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-bark/10 text-bark hover:bg-bark/20 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-sage text-white hover:bg-sage/90 text-sm font-semibold"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
