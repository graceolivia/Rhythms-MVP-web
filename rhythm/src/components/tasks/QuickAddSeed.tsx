import { useState } from 'react';
import { useTaskStore } from '../../stores/useTaskStore';
import type { AvailabilityState, NapContext } from '../../types';

type FocusLevel = 'flexible' | 'can-with-awake' | 'must-with-awake' | 'needs-focus';

const FOCUS_OPTIONS: { value: FocusLevel; label: string; description: string }[] = [
  {
    value: 'flexible',
    label: 'Flexible',
    description: 'Can be done anytime',
  },
  {
    value: 'can-with-awake',
    label: 'Can Be Done With Children Awake',
    description: 'Doesn\'t require nap time',
  },
  {
    value: 'must-with-awake',
    label: 'Must Be Done With Children Awake',
    description: 'Needs the kids involved or awake',
  },
  {
    value: 'needs-focus',
    label: 'Needs Focus Time',
    description: 'Must be done with children occupied or asleep',
  },
];

function focusLevelToNapContext(level: FocusLevel): NapContext {
  switch (level) {
    case 'must-with-awake':
      return 'both-awake';
    case 'needs-focus':
      return 'both-asleep';
    case 'can-with-awake':
      return 'any';
    case 'flexible':
    default:
      return 'any';
  }
}

interface QuickAddSeedProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickAddSeed({ isOpen, onClose }: QuickAddSeedProps) {
  const addSeed = useTaskStore((state) => state.addSeed);
  const updateTask = useTaskStore((state) => state.updateTask);
  const [title, setTitle] = useState('');
  const [focusLevel, setFocusLevel] = useState<FocusLevel>('flexible');
  const [goalTime, setGoalTime] = useState<string>('');
  const [showTime, setShowTime] = useState(false);
  const [isChoreQueue, setIsChoreQueue] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const napContext = focusLevelToNapContext(focusLevel);
    const bestWhen: AvailabilityState[] | undefined =
      focusLevel === 'needs-focus' ? ['free', 'quiet'] : undefined;
    const trimmedTitle = title.trim();
    addSeed(trimmedTitle, napContext, undefined, bestWhen, goalTime || null);

    // If marked as chore queue, find the just-created task and flag it
    if (isChoreQueue) {
      // addSeed creates a task synchronously, find it by title
      const newTask = useTaskStore.getState().tasks.find(
        (t) => t.title === trimmedTitle
      );
      if (newTask) {
        updateTask(newTask.id, { isChoreQueue: true });
      }
    }

    // Reset form
    setTitle('');
    setFocusLevel('flexible');
    setGoalTime('');
    setShowTime(false);
    setIsChoreQueue(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bark/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-cream rounded-t-2xl p-6 pb-8 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl text-bark">Add to Seeds</h2>
          <button
            onClick={onClose}
            className="text-bark/40 hover:text-bark p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Task title */}
          <div className="mb-4">
            <label className="block text-sm text-bark/70 mb-1">What needs doing?</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Clean out garage"
              className="w-full px-4 py-3 rounded-xl border border-bark/20 bg-white focus:outline-none focus:border-sage text-bark"
              autoFocus
            />
          </div>

          {/* Goal time (optional) */}
          <div className="mb-4">
            {!showTime ? (
              <button
                type="button"
                onClick={() => setShowTime(true)}
                className="text-sm text-sage hover:text-sage/80 transition-colors"
              >
                + Add a goal time
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <label className="text-sm text-bark/70 shrink-0">By</label>
                <input
                  type="time"
                  value={goalTime}
                  onChange={(e) => setGoalTime(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-xl border border-bark/20 bg-white focus:outline-none focus:border-sage text-bark text-sm"
                />
                <button
                  type="button"
                  onClick={() => { setShowTime(false); setGoalTime(''); }}
                  className="text-bark/40 hover:text-bark text-sm"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Focus level */}
          <div className="mb-6">
            <label className="block text-sm text-bark/70 mb-2">Focus level</label>
            <div className="space-y-2">
              {FOCUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFocusLevel(option.value)}
                  className={`w-full text-left p-3 rounded-xl transition-colors ${
                    focusLevel === option.value
                      ? 'bg-sage/20 border-2 border-sage'
                      : 'bg-parchment border-2 border-transparent'
                  }`}
                >
                  <p className="font-medium text-bark text-sm">{option.label}</p>
                  <p className="text-xs text-bark/50">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Chore Queue Toggle */}
          <div className="mb-6">
            <label className="flex items-center gap-3 p-3 rounded-xl bg-parchment cursor-pointer">
              <input
                type="checkbox"
                checked={isChoreQueue}
                onChange={(e) => setIsChoreQueue(e.target.checked)}
                className="rounded border-bark/20"
              />
              <div>
                <p className="font-medium text-bark text-sm">Add to chore queue</p>
                <p className="text-xs text-bark/50">
                  One random chore from the queue is picked daily
                </p>
              </div>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!title.trim()}
            className="w-full py-3 bg-sage text-cream rounded-xl font-medium hover:bg-sage/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Seed
          </button>
        </form>
      </div>
    </div>
  );
}
