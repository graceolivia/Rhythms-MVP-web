import { useState, useEffect } from 'react';
import type { HabitBlock } from '../types';

export type UrgencyLevel = 'none' | 'gentle' | 'nudge' | 'urgent';

interface BlockDeadlineResult {
  minutesRemaining: number | null;
  urgencyLevel: UrgencyLevel;
}

function getUrgency(minutes: number | null): UrgencyLevel {
  if (minutes === null || minutes > 30) return 'none';
  if (minutes > 15) return 'gentle';
  if (minutes > 5) return 'nudge';
  return 'urgent';
}

export function useBlockDeadline(block: HabitBlock | null): BlockDeadlineResult {
  const [, setTick] = useState(0);

  // Re-evaluate every 30 seconds for deadline countdown
  useEffect(() => {
    if (!block?.deadline) return;
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, [block?.deadline]);

  if (!block?.deadline) {
    return { minutesRemaining: null, urgencyLevel: 'none' };
  }

  const now = new Date();
  const [dh, dm] = block.deadline.split(':').map(Number);
  const deadlineDate = new Date();
  deadlineDate.setHours(dh, dm, 0, 0);

  const minutesRemaining = Math.round((deadlineDate.getTime() - now.getTime()) / 60000);
  const urgencyLevel = getUrgency(minutesRemaining);

  return { minutesRemaining, urgencyLevel };
}
