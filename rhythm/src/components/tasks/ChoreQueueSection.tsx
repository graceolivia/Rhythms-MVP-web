import { useState } from 'react';
import { useTaskStore } from '../../stores/useTaskStore';

export function ChoreQueueSection() {
  const tasks = useTaskStore((s) => s.tasks);
  const updateTask = useTaskStore((s) => s.updateTask);
  const choreQueueTasks = tasks.filter((t) => t.isChoreQueue && t.isActive);
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="mb-6">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 w-full text-left mb-2"
      >
        <svg
          className={`w-3 h-3 text-bark/50 transition-transform ${collapsed ? '' : 'rotate-180'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        <h3 className="font-display text-base text-bark">Chore Queue</h3>
        <span className="text-xs text-bark/40">
          {choreQueueTasks.length} chore{choreQueueTasks.length !== 1 ? 's' : ''}
        </span>
      </button>

      {!collapsed && (
        <>
          <p className="text-xs text-bark/50 mb-3">
            One random chore from this pool is picked each day. Manage which tasks are in the queue.
          </p>

          {choreQueueTasks.length === 0 ? (
            <div className="bg-parchment rounded-xl p-4 text-center">
              <p className="text-sm text-bark/50 mb-1">No chores in the queue yet.</p>
              <p className="text-xs text-bark/40">
                Toggle "Chore queue" when adding seeds, or mark existing tasks below.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {choreQueueTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 bg-parchment rounded-lg px-3 py-2">
                  <span className="text-sm text-bark flex-1">{task.title}</span>
                  <span className="text-xs text-bark/40">{task.category}</span>
                  <button
                    onClick={() => updateTask(task.id, { isChoreQueue: false })}
                    className="text-xs text-bark/30 hover:text-bark/60 px-1"
                    title="Remove from chore queue"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
