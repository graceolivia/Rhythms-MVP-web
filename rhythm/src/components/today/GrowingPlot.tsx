import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChallengeStore, CHALLENGE_TEMPLATES } from '../../stores/useChallengeStore';
import { useGardenStore } from '../../stores/useGardenStore';
import { useDailyFlower } from '../../hooks/useDailyFlower';
import { GrowthSprite } from '../garden/GrowthSprite';
import type { ActiveChallenge } from '../../types';

// Daily flower pixel art imports
import seed049 from '../../assets/flowers/049.png';
import sprout039 from '../../assets/flowers/039.png';
import bloom042 from '../../assets/flowers/042.png';

const DAILY_FLOWER_SPRITES = [seed049, sprout039, bloom042, bloom042] as const;

interface GrowingPlotProps {
  isNight: boolean;
  justBloomedId?: string | null;
}

// ===========================================
// Daily Flower Slot (leftmost, auto-planted)
// ===========================================

function DailyFlowerSlot({ isNight }: { isNight: boolean }) {
  const { stage, mealsCompleted, isBloomed, alreadyEarned } = useDailyFlower();
  const earnFlower = useGardenStore(s => s.earnFlower);
  const [showTooltip, setShowTooltip] = useState(false);
  const [justBloomed, setJustBloomed] = useState(false);
  const prevStageRef = useRef(stage);

  // Detect stage change for grow animation
  const [animating, setAnimating] = useState(false);
  useEffect(() => {
    if (stage > prevStageRef.current) {
      setAnimating(true);
      const timer = setTimeout(() => setAnimating(false), 600);
      prevStageRef.current = stage;
      return () => clearTimeout(timer);
    }
    prevStageRef.current = stage;
  }, [stage]);

  // Auto-earn flower when all 3 meals done
  useEffect(() => {
    if (isBloomed && !alreadyEarned) {
      earnFlower('daily-daisy');
      setJustBloomed(true);
      const timer = setTimeout(() => setJustBloomed(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isBloomed, alreadyEarned, earnFlower]);

  const sprite = DAILY_FLOWER_SPRITES[stage];
  const mealLabels = ['breakfast', 'lunch', 'dinner'];

  return (
    <div className="relative flex flex-col items-center">
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        className={`flex flex-col items-center justify-end w-20 h-14 rounded-lg transition-colors ${
          isNight ? 'hover:bg-white/10' : 'hover:bg-bark/5'
        }`}
      >
        <img
          src={sprite}
          alt="Daily flower"
          className={`w-8 h-8 image-rendering-pixelated ${
            justBloomed ? 'animate-bloom-burst' :
            animating ? 'animate-sprout-grow' :
            stage > 0 ? 'animate-gentle-sway' : ''
          }`}
          style={{ imageRendering: 'pixelated' }}
        />
        <div className="w-12 mt-0.5">
          {/* 3 dots for 3 meals */}
          <div className="flex justify-center gap-1">
            {mealLabels.map((meal, i) => (
              <div
                key={meal}
                className={`w-1.5 h-1.5 rounded-full ${
                  i < mealsCompleted
                    ? 'bg-sage'
                    : isNight ? 'bg-white/20' : 'bg-bark/15'
                }`}
              />
            ))}
          </div>
        </div>
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowTooltip(false)} />
          <div className={`absolute bottom-full mb-2 z-50 px-3 py-2 rounded-lg shadow-lg whitespace-nowrap text-xs ${
            isNight ? 'bg-bark text-cream' : 'bg-cream text-bark border border-bark/10'
          }`}>
            <p className="font-medium">Daily Flower</p>
            <p className={isNight ? 'text-cream/60' : 'text-bark/50'}>
              {mealsCompleted}/3 meals
              {isBloomed && ' — bloomed!'}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ===========================================
// Challenge Plot Slot (slots 1-3)
// ===========================================

function PlotSlot({
  challenge,
  isNight,
  justBloomedId,
}: {
  challenge: ActiveChallenge | undefined;
  isNight: boolean;
  justBloomedId?: string | null;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const navigate = useNavigate();

  if (!challenge) {
    return (
      <button
        onClick={() => navigate('/challenges')}
        className={`flex flex-col items-center justify-end w-20 h-14 rounded-lg transition-colors ${
          isNight ? 'hover:bg-white/10' : 'hover:bg-bark/5'
        }`}
        aria-label="Plant a challenge seed"
      >
        <span className={`text-xl mb-1 ${isNight ? 'opacity-40' : 'opacity-30'}`}>+</span>
        <div className={`w-12 h-1.5 rounded-full ${isNight ? 'bg-bark/30' : 'bg-bark/15'}`} />
      </button>
    );
  }

  const template = CHALLENGE_TEMPLATES.find(t => t.id === challenge.templateId);
  const isBlooming = justBloomedId === challenge.id;
  const animate = isBlooming ? 'bloom' : challenge.status === 'bloomed' ? 'none' : 'idle';

  return (
    <div className="relative flex flex-col items-center">
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        className={`flex flex-col items-center justify-end w-20 h-14 rounded-lg transition-colors ${
          isNight ? 'hover:bg-white/10' : 'hover:bg-bark/5'
        }`}
      >
        <GrowthSprite
          stage={challenge.growthStage}
          flowerType={template?.flowerReward}
          size="md"
          animate={animate}
        />
        <div className="w-12 mt-0.5">
          {/* Mini progress dots */}
          <div className="flex justify-center gap-0.5">
            {Array.from({ length: Math.min(template?.targetCount ?? 7, 10) }).map((_, i) => (
              <div
                key={i}
                className={`w-1 h-1 rounded-full ${
                  i < challenge.totalProgress
                    ? 'bg-sage'
                    : isNight ? 'bg-white/20' : 'bg-bark/15'
                }`}
              />
            ))}
          </div>
        </div>
      </button>

      {/* Tooltip */}
      {showTooltip && template && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowTooltip(false)} />
          <div className={`absolute bottom-full mb-2 z-50 px-3 py-2 rounded-lg shadow-lg whitespace-nowrap text-xs ${
            isNight ? 'bg-bark text-cream' : 'bg-cream text-bark border border-bark/10'
          }`}>
            <p className="font-medium">{template.title}</p>
            <p className={isNight ? 'text-cream/60' : 'text-bark/50'}>
              {challenge.totalProgress}/{template.targetCount}
              {template.type === 'streak' ? ' days' : ' done'}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ===========================================
// Main Growing Plot (4 slots)
// ===========================================

export function GrowingPlot({ isNight, justBloomedId }: GrowingPlotProps) {
  const activeChallenges = useChallengeStore(s => s.activeChallenges);
  const growing = activeChallenges.filter(c => c.status === 'growing' || c.status === 'bloomed');

  const getByPlot = (index: number) => growing.find(c => c.plotIndex === index);

  return (
    <div className="relative mt-auto pt-2">
      {/* Grass border */}
      <div className={`h-1 rounded-full mx-2 ${isNight ? 'bg-fern/40' : 'bg-sage/40'}`} />

      {/* Planting spots: daily flower + 3 challenge slots */}
      <div className={`flex justify-around items-end px-2 py-1 ${
        isNight ? 'bg-fern/10' : 'bg-sage/10'
      } rounded-b-lg`}>
        {/* Slot 0: Daily flower (auto-planted) */}
        <DailyFlowerSlot isNight={isNight} />

        {/* Slots 1-3: Challenge plots */}
        {[0, 1, 2].map((plotIndex) => (
          <PlotSlot
            key={plotIndex}
            challenge={getByPlot(plotIndex)}
            isNight={isNight}
            justBloomedId={justBloomedId}
          />
        ))}
      </div>

      {/* Soil strip */}
      <div className={`h-1.5 rounded-full mx-2 ${isNight ? 'bg-bark/40' : 'bg-bark/20'}`} />
    </div>
  );
}
