import { useCareBlockStore } from '../stores/useCareBlockStore';
import { useChildStore } from '../stores/useChildStore';
import { useGardenStore } from '../stores/useGardenStore';
import { useTaskStore } from '../stores/useTaskStore';
import { useAwayStore } from '../stores/useAwayStore';
import { clearAllStorage, setSkipSeedDataOnce } from '../utils/storageHelpers';

export function useResetAppData() {
  const clearChildren = useChildStore((state) => state.clearChildren);
  const clearTasks = useTaskStore((state) => state.clearTasks);
  const clearGardenState = useGardenStore((state) => state.clearGardenState);
  const clearCareBlocks = useCareBlockStore((state) => state.clearBlocks);
  const clearAwayLogs = useAwayStore((state) => state.clearAwayLogs);

  return () => {
    clearChildren();
    clearTasks();
    clearCareBlocks();
    clearGardenState();
    clearAwayLogs();

    clearAllStorage();
    setSkipSeedDataOnce();
  };
}
