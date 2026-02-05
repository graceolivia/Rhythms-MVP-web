import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useTaskStore, getTaskDisplayTitle } from '../stores/useTaskStore';
import { useChildStore } from '../stores/useChildStore';
import type { Task, TaskTier, RecurrenceRule, TaskInput } from '../types';

const TIER_CONFIG: Record<TaskTier, { label: string; color: string; bg: string; border: string }> = {
  anchor: { label: 'Anchors', color: 'text-terracotta', bg: 'bg-terracotta/10', border: 'border-terracotta/30' },
  rhythm: { label: 'Rhythms', color: 'text-sage', bg: 'bg-sage/10', border: 'border-sage/30' },
  tending: { label: 'Tending', color: 'text-skyblue', bg: 'bg-skyblue/10', border: 'border-skyblue/30' },
};

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAY_LABELS_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getFrequencyDisplay(task: Task): { emoji: string; label: string } {
  if (!task.recurrence || task.recurrence === 'daily') {
    return { emoji: '☀️', label: 'Daily' };
  }
  if (task.recurrence === 'weekdays') {
    return { emoji: '💼', label: 'Weekdays' };
  }
  if (task.recurrence === 'weekends') {
    return { emoji: '🌴', label: 'Weekends' };
  }
  if (task.recurrence === 'weekly') {
    if (task.daysOfWeek && task.daysOfWeek.length > 0 && task.daysOfWeek.length < 7) {
      const days = task.daysOfWeek.sort().map(d => DAY_LABELS[d]).join('');
      return { emoji: '🔁', label: days };
    }
    return { emoji: '🔁', label: 'Weekly' };
  }
  return { emoji: '📌', label: 'Once' };
}

function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const hour12 = h % 12 || 12;
  return m === 0 ? `${hour12}${ampm}` : `${hour12}:${String(m).padStart(2, '0')}${ampm}`;
}

interface TaskItemProps {
  task: Task;
  onClick: () => void;
  getChild: (id: string) => { name: string } | undefined;
}

function TaskItem({ task, onClick, getChild }: TaskItemProps) {
  const config = TIER_CONFIG[task.tier];
  const freq = getFrequencyDisplay(task);
  const displayTitle = getTaskDisplayTitle(task, getChild);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border ${config.bg} ${config.border} hover:scale-[1.01] transition-all`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className={`font-medium ${config.color} truncate`}>{displayTitle}</h3>
          <div className="flex items-center gap-2 text-xs text-bark/50 mt-0.5">
            {task.scheduledTime && (
              <span>{formatTime12(task.scheduledTime)}</span>
            )}
            {task.duration && (
              <span>• {task.duration}m</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-sm" title={freq.label}>
          <span>{freq.emoji}</span>
          <span className="text-xs text-bark/40 hidden sm:inline">{freq.label}</span>
        </div>
      </div>
    </button>
  );
}

interface TaskEditModalProps {
  task: Task;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  children: { id: string; name: string }[];
}

function TaskEditModal({ task, onClose, onSave, onDelete, children }: TaskEditModalProps) {
  const [title, setTitle] = useState(task.title);
  const [scheduledTime, setScheduledTime] = useState(task.scheduledTime || '');
  const [duration, setDuration] = useState(task.duration || 30);
  const [recurrence, setRecurrence] = useState<RecurrenceRule>(task.recurrence || 'daily');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(task.daysOfWeek || []);
  const [childId, setChildId] = useState<string | null>(task.childId || null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const config = TIER_CONFIG[task.tier];

  const handleSave = () => {
    onSave(task.id, {
      title,
      scheduledTime: scheduledTime || null,
      duration,
      recurrence,
      daysOfWeek: recurrence === 'weekly' && daysOfWeek.length > 0 ? daysOfWeek : null,
      childId: childId || null,
    });
    onClose();
  };

  const handleDelete = () => {
    onDelete(task.id);
    onClose();
  };

  const toggleDay = (day: number) => {
    if (daysOfWeek.includes(day)) {
      setDaysOfWeek(daysOfWeek.filter(d => d !== day));
    } else {
      setDaysOfWeek([...daysOfWeek, day].sort());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/20" onClick={onClose}>
      <div
        className="bg-cream rounded-xl shadow-xl p-5 w-full max-w-md border border-bark/10 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {showDeleteConfirm ? (
          <div className="text-center py-4">
            <p className="text-bark mb-4">Delete "{task.title}"?</p>
            <p className="text-sm text-bark/50 mb-6">This cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-bark/10 text-bark hover:bg-bark/20"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                  {config.label}
                </span>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-bark/10 text-bark/40">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Title */}
            <div className="mb-4">
              <label className="text-xs text-bark/60 block mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-white focus:outline-none focus:border-sage"
              />
            </div>

            {/* Child link */}
            {children.length > 0 && (
              <div className="mb-4">
                <label className="text-xs text-bark/60 block mb-2">For child (optional)</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setChildId(null)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      childId === null
                        ? 'bg-bark/20 text-bark'
                        : 'bg-bark/5 text-bark/50 hover:bg-bark/10'
                    }`}
                  >
                    Everyone
                  </button>
                  {children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => setChildId(child.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        childId === child.id
                          ? 'bg-lavender/30 text-lavender border border-lavender'
                          : 'bg-bark/5 text-bark/50 hover:bg-bark/10'
                      }`}
                    >
                      {child.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Time (for anchors and rhythms) */}
            {task.tier !== 'tending' && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs text-bark/60 block mb-1">Time</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-white focus:outline-none focus:border-sage"
                  />
                </div>
                <div>
                  <label className="text-xs text-bark/60 block mb-1">Duration (min)</label>
                  <input
                    type="number"
                    min="5"
                    max="480"
                    step="5"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                    className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-white focus:outline-none focus:border-sage"
                  />
                </div>
              </div>
            )}

            {/* Recurrence */}
            <div className="mb-4">
              <label className="text-xs text-bark/60 block mb-2">Frequency</label>
              <div className="grid grid-cols-2 gap-2">
                {(['daily', 'weekdays', 'weekends', 'weekly'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRecurrence(r)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      recurrence === r
                        ? 'bg-sage text-cream'
                        : 'bg-bark/5 text-bark/60 hover:bg-bark/10'
                    }`}
                  >
                    {r === 'daily' && '☀️ Daily'}
                    {r === 'weekdays' && '💼 Weekdays'}
                    {r === 'weekends' && '🌴 Weekends'}
                    {r === 'weekly' && '🔁 Custom'}
                  </button>
                ))}
              </div>
            </div>

            {/* Day picker for weekly */}
            {recurrence === 'weekly' && (
              <div className="mb-4">
                <label className="text-xs text-bark/60 block mb-2">Days</label>
                <div className="flex gap-1">
                  {DAY_LABELS_FULL.map((label, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleDay(idx)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                        daysOfWeek.includes(idx)
                          ? 'bg-terracotta text-cream'
                          : 'bg-bark/5 text-bark/40 hover:text-bark'
                      }`}
                    >
                      {label.charAt(0)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-bark/10">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 rounded-lg text-red-500 hover:bg-red-50 text-sm"
              >
                Delete
              </button>
              <div className="flex-1" />
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-bark/10 text-bark hover:bg-bark/20 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-sage text-white hover:bg-sage/90 text-sm"
              >
                Save
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface NewTaskModalProps {
  onClose: () => void;
  onAdd: (task: TaskInput) => void;
  defaultTier?: TaskTier;
  children: { id: string; name: string }[];
}

function NewTaskModal({ onClose, onAdd, defaultTier = 'rhythm', children }: NewTaskModalProps) {
  const [title, setTitle] = useState('');
  const [tier, setTier] = useState<TaskTier>(defaultTier);
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [duration, setDuration] = useState(30);
  const [recurrence, setRecurrence] = useState<RecurrenceRule>('daily');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [childId, setChildId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!title.trim()) return;

    onAdd({
      type: 'standard',
      title: title.trim(),
      tier,
      scheduledTime: tier !== 'tending' ? scheduledTime : null,
      duration,
      recurrence,
      daysOfWeek: recurrence === 'weekly' && daysOfWeek.length > 0 ? daysOfWeek : null,
      napContext: null,
      isActive: true,
      category: 'other',
      childId: childId || null,
    });
    onClose();
  };

  const toggleDay = (day: number) => {
    if (daysOfWeek.includes(day)) {
      setDaysOfWeek(daysOfWeek.filter(d => d !== day));
    } else {
      setDaysOfWeek([...daysOfWeek, day].sort());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/20" onClick={onClose}>
      <div
        className="bg-cream rounded-xl shadow-xl p-5 w-full max-w-md border border-bark/10 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg text-bark">New Task</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-bark/10 text-bark/40">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className="text-xs text-bark/60 block mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs doing?"
            className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-white focus:outline-none focus:border-sage"
            autoFocus
          />
        </div>

        {/* Tier */}
        <div className="mb-4">
          <label className="text-xs text-bark/60 block mb-2">Type</label>
          <div className="grid grid-cols-3 gap-2">
            {(['anchor', 'rhythm', 'tending'] as TaskTier[]).map((t) => {
              const c = TIER_CONFIG[t];
              return (
                <button
                  key={t}
                  onClick={() => setTier(t)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                    tier === t
                      ? `${c.bg} ${c.color} ${c.border}`
                      : 'bg-bark/5 text-bark/60 border-transparent hover:bg-bark/10'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Child link */}
        {children.length > 0 && (
          <div className="mb-4">
            <label className="text-xs text-bark/60 block mb-2">For child (optional)</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setChildId(null)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  childId === null
                    ? 'bg-bark/20 text-bark'
                    : 'bg-bark/5 text-bark/50 hover:bg-bark/10'
                }`}
              >
                Everyone
              </button>
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => setChildId(child.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    childId === child.id
                      ? 'bg-lavender/30 text-lavender border border-lavender'
                      : 'bg-bark/5 text-bark/50 hover:bg-bark/10'
                  }`}
                >
                  {child.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Time (for anchors and rhythms) */}
        {tier !== 'tending' && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-bark/60 block mb-1">Time</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-white focus:outline-none focus:border-sage"
              />
            </div>
            <div>
              <label className="text-xs text-bark/60 block mb-1">Duration (min)</label>
              <input
                type="number"
                min="5"
                max="480"
                step="5"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-white focus:outline-none focus:border-sage"
              />
            </div>
          </div>
        )}

        {/* Recurrence */}
        <div className="mb-4">
          <label className="text-xs text-bark/60 block mb-2">Frequency</label>
          <div className="grid grid-cols-2 gap-2">
            {(['daily', 'weekdays', 'weekends', 'weekly'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRecurrence(r)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  recurrence === r
                    ? 'bg-sage text-cream'
                    : 'bg-bark/5 text-bark/60 hover:bg-bark/10'
                }`}
              >
                {r === 'daily' && '☀️ Daily'}
                {r === 'weekdays' && '💼 Weekdays'}
                {r === 'weekends' && '🌴 Weekends'}
                {r === 'weekly' && '🔁 Custom'}
              </button>
            ))}
          </div>
        </div>

        {/* Day picker for weekly */}
        {recurrence === 'weekly' && (
          <div className="mb-4">
            <label className="text-xs text-bark/60 block mb-2">Days</label>
            <div className="flex gap-1">
              {DAY_LABELS_FULL.map((label, idx) => (
                <button
                  key={idx}
                  onClick={() => toggleDay(idx)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                    daysOfWeek.includes(idx)
                      ? 'bg-terracotta text-cream'
                      : 'bg-bark/5 text-bark/40 hover:text-bark'
                  }`}
                >
                  {label.charAt(0)}
                </button>
              ))}
            </div>
          </div>
        )}

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
            onClick={handleAdd}
            disabled={!title.trim()}
            className="px-4 py-2 rounded-lg bg-sage text-white hover:bg-sage/90 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
}

export function Tasks() {
  const tasks = useTaskStore((state) => state.tasks);
  const taskInstances = useTaskStore((state) => state.taskInstances);
  const updateTask = useTaskStore((state) => state.updateTask);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const addTask = useTaskStore((state) => state.addTask);
  const children = useChildStore((state) => state.children);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTier, setNewTaskTier] = useState<TaskTier>('rhythm');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['anchors', 'rhythms']));

  // Helper to get child by ID
  const getChild = (id: string) => children.find(c => c.id === id);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Group active tasks by tier
  const { anchors, rhythms, tending } = useMemo(() => {
    const active = tasks.filter(t => t.isActive);
    return {
      anchors: active.filter(t => t.tier === 'anchor'),
      rhythms: active.filter(t => t.tier === 'rhythm'),
      tending: active.filter(t => t.tier === 'tending'),
    };
  }, [tasks]);

  // Count deferred seeds
  const seedCount = useMemo(() => {
    return taskInstances.filter(i => i.status === 'deferred').length;
  }, [taskInstances]);

  const handleAddTask = (taskData: TaskInput) => {
    addTask(taskData);
  };

  const openNewTaskModal = (tier: TaskTier) => {
    setNewTaskTier(tier);
    setShowNewTask(true);
  };

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-lg mx-auto p-4 pb-24">
        <header className="mb-6">
          <h1 className="font-display text-2xl text-bark">Tasks</h1>
          <p className="text-bark/60 text-sm">{format(new Date(), 'EEEE, MMMM d')}</p>
        </header>

        {/* Anchors */}
        <section className="mb-3">
          <button
            onClick={() => toggleSection('anchors')}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-terracotta/5 hover:bg-terracotta/10 transition-colors"
          >
            <h2 className="font-medium text-terracotta flex items-center gap-2">
              <span>⚓</span> Anchors
              <span className="text-xs text-bark/40 font-normal">({anchors.length})</span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); openNewTaskModal('anchor'); }}
                className="text-xs px-2 py-1 rounded-lg bg-terracotta/10 text-terracotta hover:bg-terracotta/20"
              >
                + Add
              </button>
              <svg
                className={`w-5 h-5 text-bark/40 transition-transform ${expandedSections.has('anchors') ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          {expandedSections.has('anchors') && (
            <div className="mt-2 space-y-2">
              {anchors.length === 0 ? (
                <p className="text-sm text-bark/40 italic py-2 px-3">No anchors yet</p>
              ) : (
                anchors.map(task => (
                  <TaskItem key={task.id} task={task} onClick={() => setEditingTask(task)} getChild={getChild} />
                ))
              )}
            </div>
          )}
        </section>

        {/* Rhythms */}
        <section className="mb-3">
          <button
            onClick={() => toggleSection('rhythms')}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-sage/5 hover:bg-sage/10 transition-colors"
          >
            <h2 className="font-medium text-sage flex items-center gap-2">
              <span>🌿</span> Rhythms
              <span className="text-xs text-bark/40 font-normal">({rhythms.length})</span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); openNewTaskModal('rhythm'); }}
                className="text-xs px-2 py-1 rounded-lg bg-sage/10 text-sage hover:bg-sage/20"
              >
                + Add
              </button>
              <svg
                className={`w-5 h-5 text-bark/40 transition-transform ${expandedSections.has('rhythms') ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          {expandedSections.has('rhythms') && (
            <div className="mt-2 space-y-2">
              {rhythms.length === 0 ? (
                <p className="text-sm text-bark/40 italic py-2 px-3">No rhythms yet</p>
              ) : (
                rhythms.map(task => (
                  <TaskItem key={task.id} task={task} onClick={() => setEditingTask(task)} getChild={getChild} />
                ))
              )}
            </div>
          )}
        </section>

        {/* Tending */}
        <section className="mb-3">
          <button
            onClick={() => toggleSection('tending')}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-skyblue/5 hover:bg-skyblue/10 transition-colors"
          >
            <h2 className="font-medium text-skyblue flex items-center gap-2">
              <span>🌱</span> Tending
              <span className="text-xs text-bark/40 font-normal">({tending.length})</span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); openNewTaskModal('tending'); }}
                className="text-xs px-2 py-1 rounded-lg bg-skyblue/10 text-skyblue hover:bg-skyblue/20"
              >
                + Add
              </button>
              <svg
                className={`w-5 h-5 text-bark/40 transition-transform ${expandedSections.has('tending') ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          {expandedSections.has('tending') && (
            <div className="mt-2 space-y-2">
              {tending.length === 0 ? (
                <p className="text-sm text-bark/40 italic py-2 px-3">No tending tasks yet</p>
              ) : (
                tending.map(task => (
                  <TaskItem key={task.id} task={task} onClick={() => setEditingTask(task)} getChild={getChild} />
                ))
              )}
              {seedCount > 0 && (
                <div className="p-3 rounded-lg bg-linen/50 border border-bark/10 mt-2">
                  <p className="text-sm text-bark/60">
                    <span className="font-medium">{seedCount} deferred</span> waiting to be replanted
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Challenges */}
        <section className="mb-3">
          <button
            onClick={() => toggleSection('challenges')}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-dustyrose/5 hover:bg-dustyrose/10 transition-colors"
          >
            <h2 className="font-medium text-dustyrose flex items-center gap-2">
              <span>⭐</span> Challenges
              <span className="text-xs text-bark/40 font-normal">Coming soon</span>
            </h2>
            <svg
              className={`w-5 h-5 text-bark/40 transition-transform ${expandedSections.has('challenges') ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedSections.has('challenges') && (
            <div className="mt-2 p-4 rounded-lg bg-parchment/50">
              <p className="text-sm text-bark/70 leading-relaxed mb-2">
                Challenges are curated habit stacks that teach rhythms that actually work for SAHM life.
              </p>
              <p className="text-sm text-bark/70 leading-relaxed">
                Completing a Challenge earns a special flower for your garden.
              </p>
              <p className="text-xs text-bark/40 italic mt-3">Coming soon...</p>
            </div>
          )}
        </section>
      </div>

      {/* Edit modal */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={(id, updates) => updateTask(id, updates)}
          onDelete={(id) => deleteTask(id)}
          children={children}
        />
      )}

      {/* New task modal */}
      {showNewTask && (
        <NewTaskModal
          onClose={() => setShowNewTask(false)}
          onAdd={handleAddTask}
          defaultTier={newTaskTier}
          children={children}
        />
      )}
    </div>
  );
}
