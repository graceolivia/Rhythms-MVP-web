import { useCareBlockStore } from '../stores/useCareBlockStore';
import { useChildStore } from '../stores/useChildStore';
import { useChildcareStore } from '../stores/useChildcareStore';
import { useGardenStore } from '../stores/useGardenStore';
import { useNapStore } from '../stores/useNapStore';
import { useTaskStore } from '../stores/useTaskStore';
import { clearAllStorage, setSkipSeedDataOnce } from '../utils/storageHelpers';

export function useResetAppData() {
  const clearChildren = useChildStore((state) => state.clearChildren);
  const clearTasks = useTaskStore((state) => state.clearTasks);
  const clearNapSchedules = useNapStore((state) => state.clearNapSchedules);
  const clearNapLogs = useNapStore((state) => state.clearNapLogs);
  const clearGardenState = useGardenStore((state) => state.clearGardenState);
  const clearChildcareSchedules = useChildcareStore((state) => state.clearSchedules);
  const clearCareBlocks = useCareBlockStore((state) => state.clearBlocks);

  return () => {
    clearChildren();
    clearTasks();
    clearNapSchedules();
    clearNapLogs();
    clearChildcareSchedules();
    clearCareBlocks();
    clearGardenState();

    clearAllStorage();
    setSkipSeedDataOnce();
  };
}
