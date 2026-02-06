import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChallengeStore, CHALLENGE_TEMPLATES } from '../../stores/useChallengeStore';
import { GrowthSprite } from '../garden/GrowthSprite';
import type { ActiveChallenge } from '../../types';

interface GrowingPlotProps {
  isNight: boolean;
  justBloomedId?: string | null;
}

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

export function GrowingPlot({ isNight, justBloomedId }: GrowingPlotProps) {
  const activeChallenges = useChallengeStore(s => s.activeChallenges);
  const growing = activeChallenges.filter(c => c.status === 'growing' || c.status === 'bloomed');

  const getByPlot = (index: number) => growing.find(c => c.plotIndex === index);

  return (
    <div className="relative mt-auto pt-2">
      {/* Grass border */}
      <div className={`h-1 rounded-full mx-2 ${isNight ? 'bg-fern/40' : 'bg-sage/40'}`} />

      {/* Planting spots */}
      <div className={`flex justify-around items-end px-2 py-1 ${
        isNight ? 'bg-fern/10' : 'bg-sage/10'
      } rounded-b-lg`}>
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
