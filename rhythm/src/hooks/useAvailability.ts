import { useMemo } from 'react';
import { format } from 'date-fns';
import { useCareBlockStore } from '../stores/useCareBlockStore';
import { useChildStore } from '../stores/useChildStore';
import { useNapStore } from '../stores/useNapStore';
import type { AvailabilityState, CareBlock, Task } from '../types';

interface AvailabilityInfo {
  // Current state
  currentState: AvailabilityState;

  // Active blocks right now
  activeBlocks: CareBlock[];

  // Children status
  childrenAway: string[];      // Child IDs currently away
  childrenAsleep: string[];    // Child IDs currently asleep
  childrenHome: string[];      // Child IDs currently home and awake

  // Helpers
  isChildAway: (childId: string) => boolean;
  isChildAsleep: (childId: string) => boolean;
  isAllChildrenAway: boolean;
  isAnyChildAway: boolean;
  isAllChildrenAsleep: boolean;
  isAnyChildAsleep: boolean;

  // Task suggestion helper
  isTaskSuggested: (task: Task) => boolean;

  // Display helpers
  stateLabel: string;
  stateIcon: string;
  stateColor: string;
  stateDescription: string;
}

const STATE_DISPLAY: Record<AvailabilityState, { label: string; icon: string; color: string; description: string }> = {
  unavailable: {
    label: 'Busy',
    icon: '🚗',
    color: 'text-terracotta',
    description: 'You\'re occupied (driving, at appointment)'
  },
  free: {
    label: 'Free time',
    icon: '✨',
    color: 'text-sage',
    description: 'Kids are away - great for focused work or errands'
  },
  quiet: {
    label: 'Quiet time',
    icon: '🤫',
    color: 'text-lavender',
    description: 'Kids are asleep - perfect for quiet tasks at home'
  },
  parenting: {
    label: 'Parenting',
    icon: '👶',
    color: 'text-bark/70',
    description: 'Kids are home and awake'
  },
};

/**
 * Hook that provides current availability state and related information.
 * This is the primary way components should access availability data.
 */
export function useAvailability(): AvailabilityInfo {
  const currentState = useCareBlockStore((state) => state.getCurrentAvailabilityState());
  const getActiveBlocksNow = useCareBlockStore((state) => state.getActiveBlocksNow);
  const children = useChildStore((state) => state.children);
  const napLogs = useNapStore((state) => state.napLogs);

  const activeBlocks = useMemo(() => getActiveBlocksNow(), [getActiveBlocksNow]);

  // Compute which children are in which state
  const { childrenAway, childrenAsleep, childrenHome } = useMemo(() => {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');

    const away: string[] = [];
    const asleep: string[] = [];
    const home: string[] = [];

    for (const child of children) {
      // Check if child has active nap
      const hasActiveNap = napLogs.some(
        (log) =>
          log.childId === child.id &&
          log.endedAt === null &&
          format(new Date(log.startedAt), 'yyyy-MM-dd') === today
      );

      if (hasActiveNap) {
        asleep.push(child.id);
        continue;
      }

      // Check if child is covered by a "free" block (childcare, babysitter)
      const isAway = activeBlocks.some(
        (block) =>
          block.childIds.includes(child.id) &&
          (block.blockType === 'childcare' || block.blockType === 'babysitter')
      );

      if (isAway) {
        away.push(child.id);
        continue;
      }

      // Check if child is covered by a sleep block
      const isSleepBlock = activeBlocks.some(
        (block) =>
          block.childIds.includes(child.id) &&
          block.blockType === 'sleep'
      );

      if (isSleepBlock) {
        asleep.push(child.id);
        continue;
      }

      // Default: child is home
      home.push(child.id);
    }

    return { childrenAway: away, childrenAsleep: asleep, childrenHome: home };
  }, [children, napLogs, activeBlocks]);

  // Helper functions
  const isChildAway = (childId: string) => childrenAway.includes(childId);
  const isChildAsleep = (childId: string) => childrenAsleep.includes(childId);

  const isAllChildrenAway = children.length > 0 && childrenAway.length === children.length;
  const isAnyChildAway = childrenAway.length > 0;
  const isAllChildrenAsleep = children.length > 0 && childrenAsleep.length === children.length;
  const isAnyChildAsleep = childrenAsleep.length > 0;

  // Task suggestion helper
  const isTaskSuggested = (task: Task): boolean => {
    // If task has bestWhen set, use it
    if (task.bestWhen && task.bestWhen.length > 0) {
      return task.bestWhen.includes(currentState);
    }

    // Fall back to legacy logic
    if (task.napContext && task.napContext !== 'any') {
      switch (task.napContext) {
        case 'both-asleep':
        case 'baby-asleep':
        case 'toddler-asleep':
          return currentState === 'quiet';
        case 'both-awake':
          return currentState === 'parenting';
      }
    }

    if (task.careContext && task.careContext !== 'any') {
      switch (task.careContext) {
        case 'all-away':
        case 'any-away':
          return currentState === 'free' || currentState === 'quiet';
        case 'all-home':
          return currentState === 'parenting';
      }
    }

    return false;
  };

  // Display info
  const display = STATE_DISPLAY[currentState];

  return {
    currentState,
    activeBlocks,
    childrenAway,
    childrenAsleep,
    childrenHome,
    isChildAway,
    isChildAsleep,
    isAllChildrenAway,
    isAnyChildAway,
    isAllChildrenAsleep,
    isAnyChildAsleep,
    isTaskSuggested,
    stateLabel: display.label,
    stateIcon: display.icon,
    stateColor: display.color,
    stateDescription: display.description,
  };
}

/**
 * Get suggested tasks from a list based on current availability.
 * Returns tasks sorted with suggested tasks first.
 */
export function useSuggestedTasks<T extends { task: Task }>(
  tasksWithData: T[]
): { suggested: T[]; other: T[] } {
  const { isTaskSuggested } = useAvailability();

  return useMemo(() => {
    const suggested: T[] = [];
    const other: T[] = [];

    for (const item of tasksWithData) {
      if (isTaskSuggested(item.task)) {
        suggested.push(item);
      } else {
        other.push(item);
      }
    }

    return { suggested, other };
  }, [tasksWithData, isTaskSuggested]);
}
