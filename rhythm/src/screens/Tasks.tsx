import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { useTaskStore, getTaskDisplayTitle } from '../stores/useTaskStore';
import { useChildStore } from '../stores/useChildStore';
import type { Task, TaskInput } from '../types';


function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const hour12 = h % 12 || 12;
  return m === 0 ? `${hour12}${ampm}` : `${hour12}:${String(m).padStart(2, '0')}${ampm}`;
}

interface TaskItemProps {
  task: Task;
  onClick: () => void;
  onDoToday: () => void;
  onDelete: () => void;
  isScheduledToday: boolean;
  getChild: (id: string) => { name: string } | undefined;
}

function TaskItem({ task, onClick, onDoToday, onDelete, isScheduledToday, getChild }: TaskItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const displayTitle = getTaskDisplayTitle(task, getChild);

  if (confirmDelete) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg border bg-skyblue/10 border-skyblue/30">
        <p className="flex-1 text-sm text-bark/70 truncate">Delete "{displayTitle}"?</p>
        <button onClick={() => setConfirmDelete(false)} className="text-xs px-2 py-1 rounded-lg bg-bark/10 text-bark">Cancel</button>
        <button onClick={onDelete} className="text-xs px-2 py-1 rounded-lg bg-red-500 text-white">Delete</button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg border bg-skyblue/10 border-skyblue/30">
      {/* Tappable title area */}
      <button onClick={onClick} className="flex-1 text-left min-w-0">
        <h3 className="font-medium text-skyblue truncate">{displayTitle}</h3>
        {task.scheduledTime && (
          <p className="text-xs text-bark/50 mt-0.5">{formatTime12(task.scheduledTime)}</p>
        )}
      </button>

      {/* Do today */}
      {isScheduledToday ? (
        <span className="text-xs text-sage/70 font-medium flex-shrink-0">✓ Today</span>
      ) : (
        <button
          onClick={onDoToday}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-sage text-cream font-semibold hover:bg-sage/90 transition-colors flex-shrink-0"
        >
          Do today
        </button>
      )}

      {/* Delete */}
      <button
        onClick={() => setConfirmDelete(true)}
        className="p-1 rounded-lg text-bark/25 hover:text-red-400 transition-colors flex-shrink-0"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

interface TaskEditModalProps {
  task: Task;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onScheduleDate: (id: string, date: string) => void;
  scheduledDate: string | null;
  children: { id: string; name: string }[];
}

function TaskEditModal({ task, onClose, onSave, onDelete, onScheduleDate, scheduledDate, children }: TaskEditModalProps) {
  const [title, setTitle] = useState(task.title);
  const [childId, setChildId] = useState<string | null>(task.childId || null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newDate, setNewDate] = useState(scheduledDate || '');

  const handleSave = () => {
    onSave(task.id, { title, childId: childId || null });
    if (newDate && newDate !== scheduledDate) {
      onScheduleDate(task.id, newDate);
    }
    onClose();
  };

  const handleDelete = () => {
    onDelete(task.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/20" onClick={onClose}>
      <div
        className="bg-cream rounded-xl shadow-xl p-5 w-full max-w-md border border-bark/10"
        onClick={(e) => e.stopPropagation()}
      >
        {showDeleteConfirm ? (
          <div className="text-center py-4">
            <p className="text-bark mb-4">Delete "{task.title}"?</p>
            <p className="text-sm text-bark/50 mb-6">This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 rounded-lg bg-bark/10 text-bark hover:bg-bark/20">Cancel</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600">Delete</button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-bark">Edit to-do</h2>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-bark/10 text-bark/40">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Title */}
            <div className="mb-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-white focus:outline-none focus:border-sage"
                autoFocus
              />
            </div>

            {/* Schedule for date */}
            <div className="mb-4">
              <label className="text-xs text-bark/60 block mb-1">Schedule for</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-white focus:outline-none focus:border-sage"
              />
            </div>

            {/* Child link */}
            {children.length > 0 && (
              <div className="mb-4">
                <label className="text-xs text-bark/60 block mb-2">For (optional)</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setChildId(null)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${childId === null ? 'bg-bark/20 text-bark' : 'bg-bark/5 text-bark/50 hover:bg-bark/10'}`}
                  >
                    Everyone
                  </button>
                  {children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => setChildId(child.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${childId === child.id ? 'bg-lavender/30 text-lavender border border-lavender' : 'bg-bark/5 text-bark/50 hover:bg-bark/10'}`}
                    >
                      {child.name}
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
  children: { id: string; name: string }[];
}

function NewTaskModal({ onClose, onAdd, children }: NewTaskModalProps) {
  const [title, setTitle] = useState('');
  const [childId, setChildId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!title.trim()) return;
    onAdd({
      type: 'standard',
      title: title.trim(),
      tier: 'todo',
      scheduledTime: null,
      duration: 30,
      recurrence: 'daily',
      napContext: null,
      isActive: true,
      category: 'other',
      childId: childId || null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/20" onClick={onClose}>
      <div
        className="bg-cream rounded-xl shadow-xl p-5 w-full max-w-md border border-bark/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg text-bark">New To-do</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-bark/10 text-bark/40">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Title */}
        <div className="mb-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="What needs doing?"
            className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-white focus:outline-none focus:border-sage"
            autoFocus
          />
        </div>

        {/* Child link */}
        {children.length > 0 && (
          <div className="mb-4">
            <label className="text-xs text-bark/60 block mb-2">For (optional)</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setChildId(null)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  childId === null ? 'bg-bark/20 text-bark' : 'bg-bark/5 text-bark/50 hover:bg-bark/10'
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

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-bark/10">
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-bark/10 text-bark hover:bg-bark/20 text-sm">
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!title.trim()}
            className="px-4 py-2 rounded-lg bg-sage text-white hover:bg-sage/90 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
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
  const scheduleForToday = useTaskStore((state) => state.scheduleForToday);
  const scheduleForDate = useTaskStore((state) => state.scheduleForDate);
  const children = useChildStore((state) => state.children);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['todos']));

  // Helper to get child by ID
  const getChild = (id: string) => children.find(c => c.id === id);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const todos = useMemo(() =>
    tasks.filter(t => t.isActive && t.tier === 'todo'),
  [tasks]);

  // Tasks that already have a pending instance for today
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayTaskIds = useMemo(() => {
    return new Set(
      taskInstances
        .filter(i => i.date === today && i.status === 'pending')
        .map(i => i.taskId)
    );
  }, [taskInstances, today]);

  // Map taskId → scheduled date for pending/deferred instances (for todos)
  const taskScheduledDates = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of taskInstances) {
      if (i.status === 'pending' || i.status === 'deferred') {
        map.set(i.taskId, i.date);
      }
    }
    return map;
  }, [taskInstances]);

  const handleAddTask = (taskData: TaskInput) => {
    addTask(taskData);
  };

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-lg mx-auto p-4 pb-24">
        <header className="mb-6">
          <h1 className="font-display text-2xl text-bark">Tasks</h1>
          <p className="text-bark/60 text-sm">{format(new Date(), 'EEEE, MMMM d')}</p>
        </header>

        {/* To-dos */}
        <section className="mb-3">
          <button
            onClick={() => toggleSection('todos')}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-skyblue/5 hover:bg-skyblue/10 transition-colors"
          >
            <h2 className="font-medium text-skyblue flex items-center gap-2">
              <span className="emoji-icon">🌱</span> To-dos
              <span className="text-xs text-bark/40 font-normal">({todos.length})</span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setShowNewTask(true); }}
                className="text-xs px-2 py-1 rounded-lg bg-skyblue/10 text-skyblue hover:bg-skyblue/20"
              >
                + Add
              </button>
              <svg
                className={`w-5 h-5 text-bark/40 transition-transform ${expandedSections.has('todos') ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          {expandedSections.has('todos') && (
            <div className="mt-2">
              {todos.length === 0 ? (
                <p className="text-sm text-bark/40 italic py-2 px-3">No to-dos yet</p>
              ) : (
                <>
                  {(() => {
                    const dueToday = todos.filter(t => todayTaskIds.has(t.id));
                    const upcoming = todos
                      .filter(t => !todayTaskIds.has(t.id) && (taskScheduledDates.get(t.id) ?? '') > today)
                      .sort((a, b) => (taskScheduledDates.get(a.id)! < taskScheduledDates.get(b.id)! ? -1 : 1));
                    const noDate = todos.filter(t => !todayTaskIds.has(t.id) && !((taskScheduledDates.get(t.id) ?? '') > today));

                    // Group upcoming by date
                    const upcomingByDate: { dateStr: string; tasks: typeof todos }[] = [];
                    for (const task of upcoming) {
                      const d = taskScheduledDates.get(task.id)!;
                      const last = upcomingByDate[upcomingByDate.length - 1];
                      if (last && last.dateStr === d) last.tasks.push(task);
                      else upcomingByDate.push({ dateStr: d, tasks: [task] });
                    }

                    return (
                      <>
                        {dueToday.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-bark/40 uppercase tracking-wide px-1 mb-1.5">Due today</p>
                            <div className="space-y-2">
                              {dueToday.map(task => (
                                <TaskItem key={task.id} task={task} onClick={() => setEditingTask(task)} onDoToday={() => scheduleForToday(task.id)} onDelete={() => deleteTask(task.id)} isScheduledToday={todayTaskIds.has(task.id)} getChild={getChild} />
                              ))}
                            </div>
                          </div>
                        )}
                        {upcomingByDate.map(({ dateStr, tasks }) => (
                          <div key={dateStr} className="mb-3">
                            <p className="text-xs font-semibold text-bark/40 uppercase tracking-wide px-1 mb-1.5">
                              {format(parseISO(dateStr), 'EEE, MMM d')}
                            </p>
                            <div className="space-y-2">
                              {tasks.map(task => (
                                <TaskItem key={task.id} task={task} onClick={() => setEditingTask(task)} onDoToday={() => scheduleForToday(task.id)} onDelete={() => deleteTask(task.id)} isScheduledToday={todayTaskIds.has(task.id)} getChild={getChild} />
                              ))}
                            </div>
                          </div>
                        ))}
                        {noDate.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs font-semibold text-bark/40 uppercase tracking-wide px-1 mb-1.5">No date</p>
                            <div className="space-y-2">
                              {noDate.map(task => (
                                <TaskItem key={task.id} task={task} onClick={() => setEditingTask(task)} onDoToday={() => scheduleForToday(task.id)} onDelete={() => deleteTask(task.id)} isScheduledToday={todayTaskIds.has(task.id)} getChild={getChild} />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </>
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
              <span className="emoji-icon">⭐</span> Challenges
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
          onScheduleDate={(id, date) => scheduleForDate(id, date)}
          scheduledDate={taskScheduledDates.get(editingTask.id) ?? null}
          children={children}
        />
      )}

      {/* New task modal */}
      {showNewTask && (
        <NewTaskModal
          onClose={() => setShowNewTask(false)}
          onAdd={handleAddTask}
          children={children}
        />
      )}
    </div>
  );
}
