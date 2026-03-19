import { useState } from 'react';
import { format } from 'date-fns';
import { useTaskStore } from '../../stores/useTaskStore';
import type { AvailabilityState, NapContext, TimeBlock } from '../../types';

type FocusLevel = 'flexible' | 'can-with-awake' | 'must-with-awake' | 'needs-focus';
type ActivePicker = 'focus' | 'timeblock' | 'overflow' | null;

const FOCUS_OPTIONS: { value: FocusLevel; label: string; shortLabel: string }[] = [
  { value: 'flexible', label: 'Flexible', shortLabel: 'Flexible' },
  { value: 'can-with-awake', label: 'Can Be Done With Children Awake', shortLabel: 'Can w/ kids' },
  { value: 'must-with-awake', label: 'Must Be Done With Children Awake', shortLabel: 'Must w/ kids' },
  { value: 'needs-focus', label: 'Needs Focus Time', shortLabel: 'Needs focus' },
];

const TIME_BLOCK_OPTIONS: { value: TimeBlock; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'midday', label: 'Midday' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
];

function focusLevelToNapContext(level: FocusLevel | null): NapContext {
  if (level === 'must-with-awake') return 'both-awake';
  if (level === 'needs-focus') return 'both-asleep';
  return 'any';
}

interface QuickAddSeedProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickAddSeed({ isOpen, onClose }: QuickAddSeedProps) {
  const addSeed = useTaskStore((s) => s.addSeed);
  const updateTask = useTaskStore((s) => s.updateTask);

  const [title, setTitle] = useState('');
  const [forToday, setForToday] = useState(false);
  const [focusLevel, setFocusLevel] = useState<FocusLevel | null>(null);
  const [timeBlock, setTimeBlock] = useState<TimeBlock | null>(null);
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  // Overflow fields
  const [customDate, setCustomDate] = useState('');
  const [goalTime, setGoalTime] = useState('');
  const [isChoreQueue, setIsChoreQueue] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  const handleSubmit = () => {
    if (!title.trim()) return;

    const napContext = focusLevelToNapContext(focusLevel);
    const bestWhen: AvailabilityState[] | undefined =
      focusLevel === 'needs-focus' ? ['free', 'quiet'] : undefined;
    const trimmedTitle = title.trim();
    const dueDate = forToday ? today : customDate || null;

    addSeed(trimmedTitle, napContext, undefined, bestWhen, goalTime || null, dueDate);

    if (timeBlock || isChoreQueue) {
      const newTask = useTaskStore.getState().tasks.find((t) => t.title === trimmedTitle);
      if (newTask) {
        updateTask(newTask.id, {
          ...(timeBlock ? { preferredTimeBlock: timeBlock } : {}),
          ...(isChoreQueue ? { isChoreQueue: true } : {}),
        });
      }
    }

    setTitle('');
    setForToday(false);
    setFocusLevel(null);
    setTimeBlock(null);
    setActivePicker(null);
    setCustomDate('');
    setGoalTime('');
    setIsChoreQueue(false);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const togglePicker = (picker: ActivePicker) => {
    setActivePicker((prev) => (prev === picker ? null : picker));
  };

  if (!isOpen) return null;

  const chip = (active: boolean) =>
    `inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
      active
        ? 'bg-sage text-cream'
        : 'bg-parchment text-bark/60 border border-bark/15'
    }`;

  const overflowActive = activePicker === 'overflow' || !!customDate || !!goalTime || isChoreQueue;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-bark/40" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-cream rounded-t-2xl px-5 pt-5 pb-8 animate-slide-up">
        {/* Zone 1: Text input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What needs doing?"
          className="w-full text-lg text-bark placeholder-bark/30 bg-transparent border-none outline-none mb-4"
          autoFocus
        />

        {/* Zone 2: Chip row */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
          <button type="button" onClick={() => setForToday(!forToday)} className={chip(forToday)}>
            today
          </button>

          <button
            type="button"
            onClick={() => togglePicker('focus')}
            className={chip(focusLevel !== null || activePicker === 'focus')}
          >
            {focusLevel ? FOCUS_OPTIONS.find((o) => o.value === focusLevel)!.shortLabel : 'focus level'}
            <span className="opacity-50 text-xs">▾</span>
          </button>

          <button
            type="button"
            onClick={() => togglePicker('timeblock')}
            className={chip(timeBlock !== null || activePicker === 'timeblock')}
          >
            {timeBlock ? TIME_BLOCK_OPTIONS.find((o) => o.value === timeBlock)!.label : 'time block'}
            <span className="opacity-50 text-xs">▾</span>
          </button>

          <button type="button" onClick={() => togglePicker('overflow')} className={chip(overflowActive)}>
            ···
          </button>
        </div>

        {/* Focus picker */}
        {activePicker === 'focus' && (
          <div className="flex flex-wrap gap-2 mb-3 p-3 bg-parchment rounded-xl">
            {FOCUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setFocusLevel(focusLevel === opt.value ? null : opt.value);
                  setActivePicker(null);
                }}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  focusLevel === opt.value
                    ? 'bg-sage text-cream'
                    : 'bg-cream text-bark/70 border border-bark/15'
                }`}
              >
                {opt.shortLabel}
              </button>
            ))}
          </div>
        )}

        {/* Time block picker */}
        {activePicker === 'timeblock' && (
          <div className="flex flex-wrap gap-2 mb-3 p-3 bg-parchment rounded-xl">
            {TIME_BLOCK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setTimeBlock(timeBlock === opt.value ? null : opt.value);
                  setActivePicker(null);
                }}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  timeBlock === opt.value
                    ? 'bg-sage text-cream'
                    : 'bg-cream text-bark/70 border border-bark/15'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Overflow panel */}
        {activePicker === 'overflow' && (
          <div className="mb-3 p-3 bg-parchment rounded-xl space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-bark/60 w-20 shrink-0">Due date</span>
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  if (e.target.value) setForToday(false);
                }}
                className="flex-1 text-sm bg-cream px-3 py-1.5 rounded-lg border border-bark/15 text-bark focus:outline-none focus:border-sage"
              />
              {customDate && (
                <button
                  type="button"
                  onClick={() => setCustomDate('')}
                  className="text-bark/40 hover:text-bark text-sm"
                >
                  ×
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-bark/60 w-20 shrink-0">Goal time</span>
              <input
                type="time"
                value={goalTime}
                onChange={(e) => setGoalTime(e.target.value)}
                className="flex-1 text-sm bg-cream px-3 py-1.5 rounded-lg border border-bark/15 text-bark focus:outline-none focus:border-sage"
              />
              {goalTime && (
                <button
                  type="button"
                  onClick={() => setGoalTime('')}
                  className="text-bark/40 hover:text-bark text-sm"
                >
                  ×
                </button>
              )}
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isChoreQueue}
                onChange={(e) => setIsChoreQueue(e.target.checked)}
                className="rounded border-bark/20"
              />
              <span className="text-sm text-bark/70">Add to chore queue</span>
            </label>
          </div>
        )}

        {/* Zone 3: Action button */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="px-5 py-2.5 bg-sage text-cream rounded-xl font-medium text-sm hover:bg-sage/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {forToday ? 'Plant for today' : 'Save to tray'}
          </button>
        </div>
      </div>
    </div>
  );
}
