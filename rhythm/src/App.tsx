import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Today } from './screens/Today';
import { DailyRhythm } from './screens/DailyRhythm';
import { RhythmDayDetail } from './screens/RhythmDayDetail';
import { EditWeeklyRhythm } from './screens/EditWeeklyRhythm';
import { Seeds } from './screens/Seeds';
import { Garden } from './screens/Garden';
import { Challenges } from './screens/Challenges';
import { Settings } from './screens/Settings';
import { Onboarding } from './screens/Onboarding';
import { BottomNav } from './components/common/BottomNav';
import { shouldLoadSeedData, loadSeedData } from './utils/seedData';
import { isFreshInstall } from './utils/storageHelpers';
import { useChildStore } from './stores/useChildStore';
import { useNapStore } from './stores/useNapStore';
import { useTaskStore } from './stores/useTaskStore';
import { useGardenStore } from './stores/useGardenStore';
import { DEV_SKIP_ONBOARDING } from './config/devMode';

function AppContent() {
  return (
    <div className="pb-16">
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/rhythm" element={<DailyRhythm />} />
        <Route path="/rhythm/day/:date" element={<RhythmDayDetail />} />
        <Route path="/rhythm/edit" element={<EditWeeklyRhythm />} />
        <Route path="/seeds" element={<Seeds />} />
        <Route path="/garden" element={<Garden />} />
        <Route path="/challenges" element={<Challenges />} />
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
      if (DEV_SKIP_ONBOARDING) {
        loadSeedData({
          childStore: useChildStore,
          napStore: useNapStore,
          taskStore: useTaskStore,
          gardenStore: useGardenStore,
        });
      } else if (import.meta.env.DEV && shouldLoadSeedData()) {
        // In development, load seed data instead of showing onboarding
        loadSeedData({
          childStore: useChildStore,
          napStore: useNapStore,
          taskStore: useTaskStore,
          gardenStore: useGardenStore,
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

  const handleOnboardingComplete = () => {
    setNeedsOnboarding(false);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<Onboarding onComplete={handleOnboardingComplete} />} />
        <Route
          path="/*"
          element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <AppContent />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
