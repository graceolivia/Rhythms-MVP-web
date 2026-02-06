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

  useEffect(() => {
    if (isBloomed && !alreadyEarned) {
      earnFlower('daily-daisy');
      setJustBloomed(true);
      const timer = setTimeout(() => setJustBloomed(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isBloomed, alreadyEarned, earnFlower]);

  const sprite = DAILY_FLOWER_SPRITES[stage];

  return (
    <div className="relative flex flex-col items-center">
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        className="flex items-end justify-center w-16"
      >
        <img
          src={sprite}
          alt="Daily flower"
          className={`w-8 h-8 block ${
            justBloomed ? 'animate-bloom-burst' :
            animating ? 'animate-sprout-grow' :
            stage > 0 ? 'animate-gentle-sway' : ''
          }`}
          style={{ imageRendering: 'pixelated' }}
        />
      </button>

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

/** Progress dots rendered inside the dirt for the daily flower */
function DailyFlowerDots({ isNight }: { isNight: boolean }) {
  const { mealsCompleted } = useDailyFlower();
  const mealLabels = ['breakfast', 'lunch', 'dinner'];

  return (
    <div className="flex justify-center gap-1 w-16">
      {mealLabels.map((meal, i) => (
        <div
          key={meal}
          className={`w-1.5 h-1.5 rounded-full ${
            i < mealsCompleted
              ? 'bg-sage'
              : isNight ? 'bg-cream/20' : 'bg-cream/30'
          }`}
        />
      ))}
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
        className="flex items-end justify-center w-16"
        aria-label="Plant a challenge seed"
      >
        <span className={`text-sm ${isNight ? 'text-white/25' : 'text-bark/20'}`}>+</span>
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
        className="flex items-end justify-center w-16"
      >
        <GrowthSprite
          stage={challenge.growthStage}
          flowerType={template?.flowerReward}
          size="md"
          animate={animate}
        />
      </button>

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

/** Progress dots rendered inside the dirt for a challenge */
function ChallengeDots({
  challenge,
  isNight,
}: {
  challenge: ActiveChallenge | undefined;
  isNight: boolean;
}) {
  if (!challenge) return <div className="w-16" />;

  const template = CHALLENGE_TEMPLATES.find(t => t.id === challenge.templateId);
  if (!template) return <div className="w-16" />;

  return (
    <div className="flex justify-center gap-0.5 w-16">
      {Array.from({ length: Math.min(template.targetCount, 10) }).map((_, i) => (
        <div
          key={i}
          className={`w-1 h-1 rounded-full ${
            i < challenge.totalProgress
              ? 'bg-sage'
              : isNight ? 'bg-cream/20' : 'bg-cream/30'
          }`}
        />
      ))}
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
    <div className="relative mt-auto">
      {/* Plants — flush against the dirt below */}
      <div className="flex justify-around items-end px-4">
        <DailyFlowerSlot isNight={isNight} />
        {[0, 1, 2].map((plotIndex) => (
          <PlotSlot
            key={plotIndex}
            challenge={getByPlot(plotIndex)}
            isNight={isNight}
            justBloomedId={justBloomedId}
          />
        ))}
      </div>

      {/* Dirt strip — plants grow right out of this */}
      <div
        className="-mx-4 relative"
        style={{
          height: '14px',
          background: isNight
            ? 'linear-gradient(180deg, #3d2e1a 0%, #2a1f10 100%)'
            : 'linear-gradient(180deg, #8B6914 0%, #6B4F12 40%, #5D4E37 100%)',
        }}
      >
        {/* Progress dots — centered under each plant */}
        <div className="flex justify-around items-center px-8 pt-1">
          <DailyFlowerDots isNight={isNight} />
          {[0, 1, 2].map((plotIndex) => (
            <ChallengeDots
              key={plotIndex}
              challenge={getByPlot(plotIndex)}
              isNight={isNight}
            />
          ))}
        </div>

        {/* Texture specks */}
        <div className={`absolute w-1 h-1 rounded-full ${isNight ? 'bg-white/5' : 'bg-cream/8'}`} style={{ left: '8%', top: '8px' }} />
        <div className={`absolute w-1.5 h-1 rounded-full ${isNight ? 'bg-white/5' : 'bg-cream/8'}`} style={{ left: '22%', top: '10px' }} />
        <div className={`absolute w-1 h-1 rounded-full ${isNight ? 'bg-white/5' : 'bg-cream/8'}`} style={{ left: '50%', top: '9px' }} />
        <div className={`absolute w-1 h-1 rounded-full ${isNight ? 'bg-white/5' : 'bg-cream/8'}`} style={{ left: '72%', top: '11px' }} />
        <div className={`absolute w-1.5 h-1 rounded-full ${isNight ? 'bg-white/5' : 'bg-cream/8'}`} style={{ left: '88%', top: '8px' }} />
      </div>
    </div>
  );
}
