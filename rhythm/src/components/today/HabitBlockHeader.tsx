import { useBlockDeadline } from '../../hooks/useBlockDeadline';
import type { HabitBlock } from '../../types';

const URGENCY_STYLES = {
  none: '',
  gentle: 'text-bark/70',
  nudge: 'text-terracotta/80 font-medium',
  urgent: 'text-terracotta font-bold animate-pulse',
} as const;

interface HabitBlockHeaderProps {
  block: HabitBlock;
  completed: number;
  total: number;
}

export function HabitBlockHeader({ block, completed, total }: HabitBlockHeaderProps) {
  const { minutesRemaining, urgencyLevel } = useBlockDeadline(block);

  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {block.emoji && <span className="text-lg">{block.emoji}</span>}
        <h2 className="font-display text-base text-bark">{block.name}</h2>
        <span className="text-xs text-bark/40">{completed}/{total}</span>
      </div>

      {block.deadline && minutesRemaining !== null && urgencyLevel !== 'none' && (
        <div className={`text-xs ${URGENCY_STYLES[urgencyLevel]}`}>
          {block.deadlineLabel || 'Deadline'}: {minutesRemaining} min
        </div>
      )}
    </div>
  );
}
