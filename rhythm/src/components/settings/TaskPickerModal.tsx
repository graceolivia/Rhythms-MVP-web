import { useState } from 'react';
import { useTaskStore } from '../../stores/useTaskStore';

interface TaskPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (taskId: string) => void;
  excludeTaskIds?: string[];
}

export function TaskPickerModal({ isOpen, onClose, onSelect, excludeTaskIds = [] }: TaskPickerModalProps) {
  const tasks = useTaskStore((s) => s.tasks);
  const addTask = useTaskStore((s) => s.addTask);
  const [search, setSearch] = useState('');
  const [newTitle, setNewTitle] = useState('');

  if (!isOpen) return null;

  const excludeSet = new Set(excludeTaskIds);
  const filtered = tasks
    .filter((t) => t.isActive && !excludeSet.has(t.id))
    .filter((t) => !search || t.title.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 20);

  const handleCreateAndSelect = () => {
    if (!newTitle.trim()) return;
    const id = addTask({
      type: 'standard',
      title: newTitle.trim(),
      tier: 'tending',
      scheduledTime: null,
      recurrence: 'daily',
      napContext: null,
      isActive: true,
      category: 'other',
    });
    onSelect(id);
    setNewTitle('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-bark/40" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 bg-cream rounded-2xl p-5 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg text-bark">Add Task to Block</h3>
          <button onClick={onClose} className="text-bark/40 hover:text-bark p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search existing */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search existing tasks..."
          className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-parchment focus:outline-none focus:border-sage text-sm mb-3"
          autoFocus
        />

        {/* Existing tasks */}
        <div className="flex-1 overflow-y-auto space-y-1 mb-4">
          {filtered.map((task) => (
            <button
              key={task.id}
              onClick={() => { onSelect(task.id); onClose(); }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-sage/10 transition-colors text-sm text-bark"
            >
              {task.title}
              <span className="text-xs text-bark/40 ml-2">{task.category}</span>
            </button>
          ))}
          {filtered.length === 0 && search && (
            <p className="text-xs text-bark/40 text-center py-2">No matching tasks</p>
          )}
        </div>

        {/* Create new */}
        <div className="border-t border-bark/10 pt-3">
          <label className="text-xs text-bark/50 mb-1 block">Or create new:</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="New task name"
              className="flex-1 px-3 py-2 rounded-lg border border-bark/20 bg-parchment focus:outline-none focus:border-sage text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateAndSelect()}
            />
            <button
              onClick={handleCreateAndSelect}
              disabled={!newTitle.trim()}
              className="px-3 py-2 rounded-lg bg-sage text-cream text-sm hover:bg-sage/90 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
