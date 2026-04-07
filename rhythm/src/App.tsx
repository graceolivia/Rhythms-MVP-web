import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Today } from './screens/Today';
import { RhythmDayDetail } from './screens/RhythmDayDetail';
import { EditWeeklyRhythm } from './screens/EditWeeklyRhythm';
import { Tasks } from './screens/Tasks';
import { Garden } from './screens/Garden';
import { Collections } from './screens/Collections';
import { Shop } from './screens/Shop';
import { Challenges } from './screens/Challenges';
import { Settings } from './screens/Settings';
import { CharacterCreator } from './screens/CharacterCreator';
import { TutorialOverlay } from './components/tutorial/TutorialOverlay';
import { useTutorialStore } from './stores/useTutorialStore';
import { BottomNav } from './components/common/BottomNav';
import { AuthProvider } from './contexts/AuthContext';
import { shouldLoadSeedData, loadSeedData } from './utils/seedData';
import { isFreshInstall, consumeSkipSeedDataOnce, markAsInstalled } from './utils/storageHelpers';
import { useChildStore } from './stores/useChildStore';
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
  const tutorialComplete = useTutorialStore((s) => s.tutorialComplete);

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
        <Route path="/shop" element={<Shop />} />
        <Route path="/challenges" element={<Challenges />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      <BottomNav dimmed={!tutorialComplete} />
      {!tutorialComplete && <TutorialOverlay />}
    </div>
  );
}

function App() {
  const [isReady, setIsReady] = useState(false);
  const [needsCharacter, setNeedsCharacter] = useState(false);

  useEffect(() => {
    if (!useCharacterStore.getState().config) {
      setNeedsCharacter(true);
    }

    if (isFreshInstall()) {
      const skipSeedData = consumeSkipSeedDataOnce();
      if (DEV_SKIP_ONBOARDING || (import.meta.env.DEV && shouldLoadSeedData() && !skipSeedData)) {
        loadSeedData({
          childStore: useChildStore,
          taskStore: useTaskStore,
          gardenStore: useGardenStore,
        });
        // Mark installed so seed data doesn't reload; tutorial store handles fresh-user flow
        markAsInstalled();
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

  const handleCharacterComplete = () => {
    setNeedsCharacter(false);
  };

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/character"
            element={<CharacterCreator onComplete={handleCharacterComplete} />}
          />
          <Route
            path="/*"
            element={
              needsCharacter ? (
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
