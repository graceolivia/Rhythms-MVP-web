import { useEffect, useState } from 'react';
import { Today } from './screens/Today';
import { shouldLoadSeedData, loadSeedData } from './utils/seedData';
import { useChildStore } from './stores/useChildStore';
import { useNapStore } from './stores/useNapStore';
import { useTaskStore } from './stores/useTaskStore';

function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Load seed data in development if no data exists
    if (shouldLoadSeedData()) {
      loadSeedData({
        childStore: useChildStore,
        napStore: useNapStore,
        taskStore: useTaskStore,
      });
    }
    setIsReady(true);
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-bark/60">Loading...</p>
      </div>
    );
  }

  return <Today />;
}

export default App;
