import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Today } from './screens/Today';
import { DailyRhythm } from './screens/DailyRhythm';
import { Seeds } from './screens/Seeds';
import { Garden } from './screens/Garden';
import { Settings } from './screens/Settings';
import { Onboarding } from './screens/Onboarding';
import { BottomNav } from './components/common/BottomNav';
import { shouldLoadSeedData, loadSeedData } from './utils/seedData';
import { isFreshInstall } from './utils/storageHelpers';
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
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    // Check if user needs onboarding
    if (isFreshInstall()) {
      // In development, load seed data instead of showing onboarding
      if (import.meta.env.DEV && shouldLoadSeedData()) {
        loadSeedData({
          childStore: useChildStore,
          napStore: useNapStore,
          taskStore: useTaskStore,
        });
      } else {
        setNeedsOnboarding(true);
      }
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
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route
          path="/*"
          element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <AppContent />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
