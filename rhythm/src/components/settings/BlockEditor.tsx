import { useState } from 'react';
import { useHabitBlockStore } from '../../stores/useHabitBlockStore';
import { useTaskStore } from '../../stores/useTaskStore';
import { TaskPickerModal } from './TaskPickerModal';
import type { HabitBlock, BlockAnchorType, RecurrenceRule } from '../../types';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const ANCHOR_TYPE_OPTIONS: { value: BlockAnchorType; label: string }[] = [
  { value: 'time', label: 'At a specific time' },
  { value: 'event', label: 'When an event fires' },
];

const RECURRENCE_OPTIONS: { value: RecurrenceRule; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekends', label: 'Weekends' },
];

interface BlockEditorProps {
  block: HabitBlock;
  onClose: () => void;
}

export function BlockEditor({ block, onClose }: BlockEditorProps) {
  const updateBlock = useHabitBlockStore((s) => s.updateBlock);
  const addItemToBlock = useHabitBlockStore((s) => s.addItemToBlock);
  const removeItemFromBlock = useHabitBlockStore((s) => s.removeItemFromBlock);
  const updateBlockItem = useHabitBlockStore((s) => s.updateBlockItem);
  const tasks = useTaskStore((s) => s.tasks);
  const [showPicker, setShowPicker] = useState(false);

  const sortedItems = [...block.items].sort((a, b) => a.order - b.order);
  const existingTaskIds = block.items.map((i) => i.taskId).filter(Boolean);

  const toggleDay = (day: number) => {
    const days = block.daysOfWeek ?? [];
    const newDays = days.includes(day)
      ? days.filter((d) => d !== day)
      : [...days, day].sort();
    updateBlock(block.id, { daysOfWeek: newDays });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-bark/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-cream rounded-t-2xl p-6 pb-8 max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl text-bark">Edit Block</h2>
          <button onClick={onClose} className="text-bark/40 hover:text-bark p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Name + Emoji */}
        <div className="flex gap-3 mb-4">
          <div className="w-16">
            <label className="text-xs text-bark/50 block mb-1">Emoji</label>
            <input
              type="text"
              value={block.emoji || ''}
              onChange={(e) => updateBlock(block.id, { emoji: e.target.value.slice(0, 4) })}
              className="w-full px-2 py-2 rounded-lg border border-bark/20 bg-parchment text-center text-lg focus:outline-none focus:border-sage"
              maxLength={4}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-bark/50 block mb-1">Name</label>
            <input
              type="text"
              value={block.name}
              onChange={(e) => updateBlock(block.id, { name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-parchment focus:outline-none focus:border-sage"
            />
          </div>
        </div>

        {/* Anchor */}
        <div className="mb-4">
          <label className="text-xs text-bark/50 block mb-1">Trigger</label>
          <select
            value={block.anchor.type}
            onChange={(e) => updateBlock(block.id, {
              anchor: { ...block.anchor, type: e.target.value as BlockAnchorType },
            })}
            className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-parchment text-sm focus:outline-none focus:border-sage mb-2"
          >
            {ANCHOR_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {block.anchor.type === 'time' && (
            <input
              type="time"
              value={block.anchor.time || ''}
              onChange={(e) => updateBlock(block.id, {
                anchor: { ...block.anchor, time: e.target.value },
              })}
              className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-parchment text-sm focus:outline-none focus:border-sage"
            />
          )}

          {block.anchor.type === 'event' && (
            <input
              type="text"
              value={block.anchor.eventKey || ''}
              onChange={(e) => updateBlock(block.id, {
                anchor: { ...block.anchor, eventKey: e.target.value },
              })}
              placeholder="e.g., nap-start:CHILD_ID"
              className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-parchment text-sm focus:outline-none focus:border-sage"
            />
          )}
        </div>

        {/* End time + Deadline */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="text-xs text-bark/50 block mb-1">Ends around</label>
            <input
              type="time"
              value={block.estimatedEndTime || ''}
              onChange={(e) => updateBlock(block.id, { estimatedEndTime: e.target.value || undefined })}
              className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-parchment text-sm focus:outline-none focus:border-sage"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-bark/50 block mb-1">Hard deadline</label>
            <input
              type="time"
              value={block.deadline || ''}
              onChange={(e) => updateBlock(block.id, { deadline: e.target.value || undefined })}
              className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-parchment text-sm focus:outline-none focus:border-sage"
            />
          </div>
        </div>

        {block.deadline && (
          <div className="mb-4">
            <label className="text-xs text-bark/50 block mb-1">Deadline label</label>
            <input
              type="text"
              value={block.deadlineLabel || ''}
              onChange={(e) => updateBlock(block.id, { deadlineLabel: e.target.value || undefined })}
              placeholder="e.g., Leave for pickup by"
              className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-parchment text-sm focus:outline-none focus:border-sage"
            />
          </div>
        )}

        {/* Recurrence */}
        <div className="mb-4">
          <label className="text-xs text-bark/50 block mb-1">Recurrence</label>
          <select
            value={typeof block.recurrence === 'string' ? block.recurrence : 'daily'}
            onChange={(e) => updateBlock(block.id, { recurrence: e.target.value as RecurrenceRule })}
            className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-parchment text-sm focus:outline-none focus:border-sage"
          >
            {RECURRENCE_OPTIONS.map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Days of week */}
        <div className="mb-4">
          <label className="text-xs text-bark/50 block mb-1">Days (optional)</label>
          <div className="flex items-center gap-1">
            {DAY_LABELS.map((label, dayIndex) => (
              <button
                key={dayIndex}
                onClick={() => toggleDay(dayIndex)}
                className={`w-7 h-7 rounded-full text-xs font-medium transition-all ${
                  block.daysOfWeek?.includes(dayIndex)
                    ? 'bg-sage text-cream'
                    : 'bg-parchment text-bark/40 hover:bg-parchment/80'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Items list */}
        <div className="mb-4">
          <label className="text-xs text-bark/50 block mb-2">Items in this block</label>
          <div className="space-y-2">
            {sortedItems.map((item) => {
              const task = tasks.find((t) => t.id === item.taskId);
              const title = item.choreQueueSlot ? '🎲 Chore Queue Slot' : (task?.title || 'Unknown task');

              return (
                <div key={item.choreQueueSlot ? `chore-${item.order}` : item.taskId} className="flex items-center gap-2 bg-parchment rounded-lg px-3 py-2">
                  <span className="text-xs text-bark/40 w-5">{item.order}</span>
                  <span className="flex-1 text-sm text-bark">{title}</span>
                  {!item.choreQueueSlot && (
                    <label className="flex items-center gap-1 text-xs text-bark/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.isTrackable}
                        onChange={(e) => updateBlockItem(block.id, item.taskId, { isTrackable: e.target.checked })}
                        className="rounded border-bark/20"
                      />
                      Track
                    </label>
                  )}
                  <button
                    onClick={() => {
                      if (item.choreQueueSlot) {
                        // Remove chore slot — find by order
                        const updated = block.items.filter((i) => !(i.choreQueueSlot && i.order === item.order));
                        const reordered = updated.map((i, idx) => ({ ...i, order: idx + 1 }));
                        useHabitBlockStore.getState().reorderBlockItems(block.id, reordered);
                      } else {
                        removeItemFromBlock(block.id, item.taskId);
                      }
                    }}
                    className="text-bark/30 hover:text-bark text-xs px-1"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setShowPicker(true)}
              className="flex-1 py-2 border border-dashed border-bark/20 rounded-lg text-bark/50 hover:border-bark/40 text-xs"
            >
              + Add Task
            </button>
            <button
              onClick={() => addItemToBlock(block.id, { taskId: '', isTrackable: true, choreQueueSlot: true })}
              className="py-2 px-3 border border-dashed border-lavender/30 rounded-lg text-lavender/60 hover:border-lavender/50 text-xs"
            >
              + Chore Slot
            </button>
          </div>
        </div>

        {/* Active toggle */}
        <label className="flex items-center gap-2 text-sm text-bark/70 cursor-pointer">
          <input
            type="checkbox"
            checked={block.isActive}
            onChange={(e) => updateBlock(block.id, { isActive: e.target.checked })}
            className="rounded border-bark/20"
          />
          Active
        </label>

        <TaskPickerModal
          isOpen={showPicker}
          onClose={() => setShowPicker(false)}
          onSelect={(taskId) => {
            addItemToBlock(block.id, { taskId, isTrackable: true });
          }}
          excludeTaskIds={existingTaskIds}
        />
      </div>
    </div>
  );
}
