import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Today } from './screens/Today';
import { DailyRhythm } from './screens/DailyRhythm';
import { Seeds } from './screens/Seeds';
import { Garden } from './screens/Garden';
import { Settings } from './screens/Settings';
import { BottomNav } from './components/common/BottomNav';
import { shouldLoadSeedData, loadSeedData } from './utils/seedData';
import { useChildStore } from './stores/useChildStore';
import { useNapStore } from './stores/useNapStore';
import { useTaskStore } from './stores/useTaskStore';

function AppContent() {
  return (
    <div className="pb-16">
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/rhythm" element={<DailyRhythm />} />
        <Route path="/seeds" element={<Seeds />} />
        <Route path="/garden" element={<Garden />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

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

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
