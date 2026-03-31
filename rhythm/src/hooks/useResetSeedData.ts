import { loadSeedData } from '../utils/seedData';
import { useChildStore } from '../stores/useChildStore';
import { useTaskStore } from '../stores/useTaskStore';
import { useGardenStore } from '../stores/useGardenStore';

export function useResetSeedData() {
  const clearChildren = useChildStore((state) => state.clearChildren);
  const clearTasks = useTaskStore((state) => state.clearTasks);
  const clearGardenState = useGardenStore((state) => state.clearGardenState);

  return () => {
    clearChildren();
    clearTasks();
    clearGardenState();
    loadSeedData({
      childStore: useChildStore,
      taskStore: useTaskStore,
      gardenStore: useGardenStore,
    });
  };
}
