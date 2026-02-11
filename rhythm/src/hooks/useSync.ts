import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { pushAllDataToSupabase, pullAllDataFromSupabase } from '../lib/sync';
import { useChildStore } from '../stores/useChildStore';
import { useTaskStore } from '../stores/useTaskStore';
import { useNapStore } from '../stores/useNapStore';
import { useAwayStore } from '../stores/useAwayStore';
import { useCareBlockStore } from '../stores/useCareBlockStore';
import { useGardenStore } from '../stores/useGardenStore';
import { useHabitBlockStore } from '../stores/useHabitBlockStore';

export function useSync() {
  const { user, isConfigured } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const pushToCloud = useCallback(async () => {
    if (!user || !isConfigured) {
      setSyncError('Not logged in or Supabase not configured');
      return false;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const childStore = useChildStore.getState();
      const taskStore = useTaskStore.getState();
      const napStore = useNapStore.getState();
      const awayStore = useAwayStore.getState();
      const careBlockStore = useCareBlockStore.getState();
      const gardenStore = useGardenStore.getState();
      const habitBlockStore = useHabitBlockStore.getState();

      const { error } = await pushAllDataToSupabase(user, {
        children: childStore.children,
        tasks: taskStore.tasks,
        taskInstances: taskStore.taskInstances,
        napSchedules: napStore.napSchedules,
        napLogs: napStore.napLogs,
        awayLogs: awayStore.awayLogs,
        careBlocks: careBlockStore.blocks,
        flowers: gardenStore.flowers,
        placedFlowers: gardenStore.placedFlowers,
        habitBlocks: habitBlockStore.blocks,
      });

      if (error) {
        setSyncError(error.message);
        return false;
      }

      setLastSyncTime(new Date());
      return true;
    } catch (err) {
      setSyncError((err as Error).message);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [user, isConfigured]);

  const pullFromCloud = useCallback(async () => {
    if (!user || !isConfigured) {
      setSyncError('Not logged in or Supabase not configured');
      return false;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const { data, error } = await pullAllDataFromSupabase(user);

      if (error || !data) {
        setSyncError(error?.message || 'Failed to fetch data');
        return false;
      }

      // Update all stores with fetched data
      const childStore = useChildStore.getState();
      const taskStore = useTaskStore.getState();
      const napStore = useNapStore.getState();
      const awayStore = useAwayStore.getState();
      const careBlockStore = useCareBlockStore.getState();
      const gardenStore = useGardenStore.getState();
      const habitBlockStore = useHabitBlockStore.getState();

      // Replace local data with cloud data
      if (data.children.length > 0 || data.tasks.length > 0) {
        // Only replace if cloud has data
        childStore.replaceChildren(data.children as Parameters<typeof childStore.replaceChildren>[0]);
        taskStore.replaceTasks(
          data.tasks as Parameters<typeof taskStore.replaceTasks>[0],
          data.taskInstances as Parameters<typeof taskStore.replaceTasks>[1]
        );
        napStore.replaceNapData(
          data.napSchedules as Parameters<typeof napStore.replaceNapData>[0],
          data.napLogs as Parameters<typeof napStore.replaceNapData>[1]
        );
        awayStore.replaceAwayLogs(data.awayLogs as Parameters<typeof awayStore.replaceAwayLogs>[0]);
        careBlockStore.replaceBlocks(data.careBlocks as Parameters<typeof careBlockStore.replaceBlocks>[0]);
        gardenStore.replaceGardenData(
          data.flowers as Parameters<typeof gardenStore.replaceGardenData>[0],
          data.placedFlowers as Parameters<typeof gardenStore.replaceGardenData>[1]
        );
        if (data.habitBlocks) {
          habitBlockStore.replaceBlocks(data.habitBlocks as Parameters<typeof habitBlockStore.replaceBlocks>[0]);
        }
      }

      setLastSyncTime(new Date());
      return true;
    } catch (err) {
      setSyncError((err as Error).message);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [user, isConfigured]);

  return {
    pushToCloud,
    pullFromCloud,
    isSyncing,
    lastSyncTime,
    syncError,
    canSync: !!user && isConfigured,
  };
}
