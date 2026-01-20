import { useMemo } from 'react';
import { parseISO, differenceInMonths } from 'date-fns';
import { useChildStore } from '../stores/useChildStore';
import { useNapStore } from '../stores/useNapStore';
import type { Child, NapContext, NapLog } from '../types';

interface NapStateResult {
  napState: NapContext;
  sleepingChildren: Child[];
  awakeChildren: Child[];
  currentNaps: NapLog[];
  baby: Child | null;
  toddler: Child | null;
}

/**
 * Determines which child is the "baby" (youngest) and which is the "toddler" (older)
 * based on birthdate. Only considers children who are napping age.
 */
function classifyChildren(children: Child[]): { baby: Child | null; toddler: Child | null } {
  const nappingChildren = children.filter((child) => child.isNappingAge);

  if (nappingChildren.length === 0) {
    return { baby: null, toddler: null };
  }

  if (nappingChildren.length === 1) {
    const child = nappingChildren[0];
    const ageInMonths = differenceInMonths(new Date(), parseISO(child.birthdate));
    // Under 18 months is typically "baby", over is "toddler"
    if (ageInMonths < 18) {
      return { baby: child, toddler: null };
    }
    return { baby: null, toddler: child };
  }

  // Sort by birthdate descending (youngest first)
  const sorted = [...nappingChildren].sort(
    (a, b) => parseISO(b.birthdate).getTime() - parseISO(a.birthdate).getTime()
  );

  return {
    baby: sorted[0], // youngest
    toddler: sorted[1], // second youngest (or older)
  };
}

/**
 * Computes the current nap state based on active nap logs
 */
export function useNapState(): NapStateResult {
  const children = useChildStore((state) => state.children);
  const napLogs = useNapStore((state) => state.napLogs);

  return useMemo(() => {
    // Get active naps (no end time)
    const currentNaps = napLogs.filter((log) => log.endedAt === null);
    const sleepingChildIds = new Set(currentNaps.map((nap) => nap.childId));

    // Classify children
    const { baby, toddler } = classifyChildren(children);

    // Determine sleeping vs awake children (only napping-age children)
    const nappingAgeChildren = children.filter((child) => child.isNappingAge);
    const sleepingChildren = nappingAgeChildren.filter((child) =>
      sleepingChildIds.has(child.id)
    );
    const awakeChildren = nappingAgeChildren.filter(
      (child) => !sleepingChildIds.has(child.id)
    );

    // Compute nap state
    let napState: NapContext = 'any';

    if (nappingAgeChildren.length === 0) {
      // No napping-age children
      napState = 'any';
    } else if (baby && toddler) {
      // Two napping-age children
      const babyAsleep = sleepingChildIds.has(baby.id);
      const toddlerAsleep = sleepingChildIds.has(toddler.id);

      if (babyAsleep && toddlerAsleep) {
        napState = 'both-asleep';
      } else if (babyAsleep && !toddlerAsleep) {
        napState = 'baby-asleep';
      } else if (!babyAsleep && toddlerAsleep) {
        napState = 'toddler-asleep';
      } else {
        napState = 'both-awake';
      }
    } else if (baby) {
      // Only a baby
      napState = sleepingChildIds.has(baby.id) ? 'baby-asleep' : 'both-awake';
    } else if (toddler) {
      // Only a toddler
      napState = sleepingChildIds.has(toddler.id) ? 'toddler-asleep' : 'both-awake';
    }

    return {
      napState,
      sleepingChildren,
      awakeChildren,
      currentNaps,
      baby,
      toddler,
    };
  }, [children, napLogs]);
}
