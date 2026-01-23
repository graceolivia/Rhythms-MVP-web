import { loadSeedData } from '../utils/seedData';
import { useChildStore } from '../stores/useChildStore';
import { useNapStore } from '../stores/useNapStore';
import { useTaskStore } from '../stores/useTaskStore';
import { useGardenStore } from '../stores/useGardenStore';

export function useResetSeedData() {
  const clearChildren = useChildStore((state) => state.clearChildren);
  const clearTasks = useTaskStore((state) => state.clearTasks);
  const clearNapSchedules = useNapStore((state) => state.clearNapSchedules);
  const clearNapLogs = useNapStore((state) => state.clearNapLogs);
  const clearGardenState = useGardenStore((state) => state.clearGardenState);

  return () => {
    clearChildren();
    clearTasks();
    clearNapSchedules();
    clearNapLogs();
    clearGardenState();
    loadSeedData({
      childStore: useChildStore,
      napStore: useNapStore,
      taskStore: useTaskStore,
      gardenStore: useGardenStore,
    });
  };
}
