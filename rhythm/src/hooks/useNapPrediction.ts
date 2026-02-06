import { useMemo } from 'react';
import { format, parseISO, differenceInMinutes, addMinutes } from 'date-fns';
import { useChildStore } from '../stores/useChildStore';
import { useNapStore } from '../stores/useNapStore';

interface NapPrediction {
  childId: string;
  childName: string;
  /** Next predicted nap time as HH:mm */
  nextNapTime: string | null;
  /** Minutes until predicted nap */
  minutesUntilNap: number | null;
  /** Probable wake time as HH:mm (for currently sleeping child) */
  probableWakeTime: string | null;
  /** Minutes since last wake */
  wakeWindowElapsed: number | null;
  /** Warning text when wake window is getting long */
  wakeWindowWarning: string | null;
  /** Formatted wake window text for TransitionPrompts */
  wakeWindowText: string | null;
}

export function useNapPrediction(): Record<string, NapPrediction> {
  const children = useChildStore((state) => state.children);
  const napSchedules = useNapStore((state) => state.napSchedules);
  const napLogs = useNapStore((state) => state.napLogs);
  const getActiveSleepForChild = useNapStore((state) => state.getActiveSleepForChild);
  const getLastWakeTime = useNapStore((state) => state.getLastWakeTime);

  return useMemo(() => {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const predictions: Record<string, NapPrediction> = {};

    for (const child of children) {
      if (!child.isNappingAge) continue;

      const childSchedules = napSchedules
        .filter((s) => s.childId === child.id)
        .sort((a, b) => a.napNumber - b.napNumber);

      const todayNaps = napLogs.filter(
        (l) => l.childId === child.id && l.date === today
      );
      const activeSleep = getActiveSleepForChild(child.id);
      const lastWakeTimeStr = getLastWakeTime(child.id);

      // Calculate wake window
      let wakeWindowElapsed: number | null = null;
      if (!activeSleep && lastWakeTimeStr) {
        wakeWindowElapsed = differenceInMinutes(now, parseISO(lastWakeTimeStr));
      }

      // Determine which nap is next based on completed naps today
      const completedNapsToday = todayNaps.filter((l) => l.endedAt !== null).length;
      const nextSchedule = childSchedules.find((s) => s.napNumber > completedNapsToday);

      // Calculate next nap time
      let nextNapTime: string | null = null;
      let minutesUntilNap: number | null = null;
      if (nextSchedule && !activeSleep) {
        nextNapTime = nextSchedule.typicalStart;
        const [h, m] = nextSchedule.typicalStart.split(':').map(Number);
        const napDate = new Date(now);
        napDate.setHours(h, m, 0, 0);
        minutesUntilNap = differenceInMinutes(napDate, now);
        if (minutesUntilNap < 0) minutesUntilNap = 0;
      }

      // Calculate probable wake time for sleeping child
      let probableWakeTime: string | null = null;
      if (activeSleep) {
        // Find the matching schedule for this nap
        const currentNapNumber = completedNapsToday + 1; // currently sleeping counts
        const currentSchedule = childSchedules.find((s) => s.napNumber === currentNapNumber);
        if (currentSchedule) {
          // Calculate typical duration from schedule
          const [startH, startM] = currentSchedule.typicalStart.split(':').map(Number);
          const [endH, endM] = currentSchedule.typicalEnd.split(':').map(Number);
          const typicalDuration = (endH * 60 + endM) - (startH * 60 + startM);
          const wakeAt = addMinutes(parseISO(activeSleep.startedAt), typicalDuration);
          probableWakeTime = format(wakeAt, 'h:mm');
        }
      }

      // Generate warnings
      let wakeWindowWarning: string | null = null;
      let wakeWindowText: string | null = null;
      if (wakeWindowElapsed !== null && wakeWindowElapsed > 0) {
        const hours = Math.floor(wakeWindowElapsed / 60);
        const mins = wakeWindowElapsed % 60;
        const formattedWindow = hours > 0
          ? mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
          : `${mins}m`;

        // Warn if awake for more than 2.5 hours (typical wake window for babies/toddlers)
        if (wakeWindowElapsed >= 150) {
          wakeWindowWarning = `${child.name}'s been up ${formattedWindow} — nap time approaching`;
        }
        wakeWindowText = `Been up ${formattedWindow}`;
      }

      predictions[child.id] = {
        childId: child.id,
        childName: child.name,
        nextNapTime,
        minutesUntilNap,
        probableWakeTime,
        wakeWindowElapsed,
        wakeWindowWarning,
        wakeWindowText,
      };
    }

    return predictions;
  }, [children, napSchedules, napLogs, getActiveSleepForChild, getLastWakeTime]);
}
