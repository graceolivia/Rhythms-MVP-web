import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Today } from './screens/Today';
import { RhythmDayDetail } from './screens/RhythmDayDetail';
import { EditWeeklyRhythm } from './screens/EditWeeklyRhythm';
import { Tasks } from './screens/Tasks';
import { Garden } from './screens/Garden';
import { Collections } from './screens/Collections';
import { Challenges } from './screens/Challenges';
import { Settings } from './screens/Settings';
import { Onboarding } from './screens/Onboarding';
import { CharacterCreator } from './screens/CharacterCreator';
import { BottomNav } from './components/common/BottomNav';
import { AuthProvider } from './contexts/AuthContext';
import { shouldLoadSeedData, loadSeedData } from './utils/seedData';
import { isFreshInstall, consumeSkipSeedDataOnce } from './utils/storageHelpers';
import { useChildStore } from './stores/useChildStore';
import { useNapStore } from './stores/useNapStore';
import { useTaskStore } from './stores/useTaskStore';
import { useGardenStore } from './stores/useGardenStore';
import { useCharacterStore } from './stores/useCharacterStore';
import { DEV_SKIP_ONBOARDING } from './config/devMode';

const SEASON_LABELS: Record<string, string> = {
  spring: 'Spring',
  summer: 'Summer',
  fall:   'Fall',
  winter: 'Winter',
};

function SeasonResetModal() {
  const seasonResetPending = useGardenStore(s => s.seasonResetPending);
  const dismissSeasonReset = useGardenStore(s => s.dismissSeasonReset);
  const currentSeason      = useGardenStore(s => s.currentSeason);

  if (!seasonResetPending) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(93,78,55,0.35)', backdropFilter: 'blur(2px)' }}
      onClick={dismissSeasonReset}
    >
      <div
        className="bg-cream rounded-2xl px-8 py-8 mx-6 max-w-xs text-center shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-4xl mb-3">🌱</div>
        <h2 className="font-display text-xl text-bark mb-2">
          {SEASON_LABELS[currentSeason]} is here!
        </h2>
        <p className="text-bark/60 text-sm leading-relaxed mb-6">
          A new season begins. Your garden is fresh and ready for new flowers to bloom.
        </p>
        <button
          onClick={dismissSeasonReset}
          className="bg-sage text-cream font-semibold px-6 py-2.5 rounded-full text-sm hover:bg-sage/90 transition-colors"
        >
          Start planting
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  return (
    <div className="pb-16">
      <SeasonResetModal />
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/rhythm/day/:date" element={<RhythmDayDetail />} />
        <Route path="/rhythm/edit" element={<EditWeeklyRhythm />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/garden" element={<Garden />} />
        <Route path="/collections" element={<Collections />} />
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
  const [needsCharacter, setNeedsCharacter] = useState(false);

  useEffect(() => {
    // Check character creator
    if (!useCharacterStore.getState().config) {
      setNeedsCharacter(true);
    }

    // Check if user needs onboarding
    if (isFreshInstall()) {
      const skipSeedData = consumeSkipSeedDataOnce();
      if (skipSeedData) {
        setNeedsOnboarding(true);
      } else if (DEV_SKIP_ONBOARDING) {
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

  const handleCharacterComplete = () => {
    setNeedsCharacter(false);
  };

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/onboarding" element={<Onboarding onComplete={handleOnboardingComplete} />} />
          <Route
            path="/character"
            element={<CharacterCreator onComplete={handleCharacterComplete} />}
          />
          <Route
            path="/*"
            element={
              needsOnboarding ? (
                <Navigate to="/onboarding" replace />
              ) : needsCharacter ? (
                <Navigate to="/character" replace />
              ) : (
                <AppContent />
              )
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
