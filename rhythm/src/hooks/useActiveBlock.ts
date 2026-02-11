import { useState, useEffect, useMemo } from 'react';
import { useHabitBlockStore } from '../stores/useHabitBlockStore';
import type { HabitBlock } from '../types';

interface ActiveBlockResult {
  activeBlock: HabitBlock | null;
  nextBlock: HabitBlock | null;
  blockProgress: { completed: number; total: number } | null;
}

export function useActiveBlock(): ActiveBlockResult {
  const [, setTick] = useState(0);
  const getActiveBlockNow = useHabitBlockStore((s) => s.getActiveBlockNow);
  const getNextBlock = useHabitBlockStore((s) => s.getNextBlock);
  const blocks = useHabitBlockStore((s) => s.blocks);

  // Re-evaluate every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const activeBlock = useMemo(() => getActiveBlockNow(), [getActiveBlockNow, blocks]);
  const nextBlock = useMemo(() => getNextBlock(), [getNextBlock, blocks]);

  // blockProgress is computed by the component using task instances
  return { activeBlock, nextBlock, blockProgress: null };
}
