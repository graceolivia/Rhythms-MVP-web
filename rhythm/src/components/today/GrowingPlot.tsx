import { useNavigate } from 'react-router-dom';
import { useChallengeStore, CHALLENGE_TEMPLATES } from '../../stores/useChallengeStore';
import { GrowthSprite } from '../garden/GrowthSprite';
import type { ActiveChallenge } from '../../types';

interface GrowingPlotProps {
  isNight: boolean;
  justBloomedId?: string | null;
}

// ===========================================
// Challenge Plot Slot
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
        onClick={() => navigate('/challenges')}
        className="flex items-end justify-center w-16"
      >
        <GrowthSprite
          stage={challenge.growthStage}
          flowerType={template?.flowerReward}
          sprites={template?.sprites}
          spriteSheet={template?.spriteSheet}
          size="md"
          animate={animate}
        />
      </button>
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

  const effectiveTarget = template.type === 'daily-routine'
    ? (challenge.dailyRoutineTarget ?? template.targetCount)
    : template.targetCount;

  return (
    <div className="flex justify-center gap-0.5 w-16">
      {Array.from({ length: Math.min(effectiveTarget, 10) }).map((_, i) => (
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
// Main Growing Plot
// ===========================================

export function GrowingPlot({ isNight, justBloomedId }: GrowingPlotProps) {
  const activeChallenges = useChallengeStore(s => s.activeChallenges);
  const visible = activeChallenges.filter(
    c => c.status === 'growing' || (c.status === 'bloomed' && c.id === justBloomedId)
  );

  const getByPlot = (index: number) =>
    visible.find(c => c.plotIndex === index);

  return (
    <div className="relative mt-auto">
      {/* Plants */}
      <div className="flex justify-around items-end px-4">
        {[0, 1, 2, 3].map((plotIndex) => (
          <PlotSlot
            key={plotIndex}
            challenge={getByPlot(plotIndex)}
            isNight={isNight}
            justBloomedId={justBloomedId}
          />
        ))}
      </div>

      {/* Dirt strip */}
      <div
        className="-mx-4 relative"
        style={{
          height: '14px',
          background: isNight
            ? 'linear-gradient(180deg, #3d2e1a 0%, #2a1f10 100%)'
            : 'linear-gradient(180deg, #8B6914 0%, #6B4F12 40%, #5D4E37 100%)',
        }}
      >
        {/* Progress dots */}
        <div className="flex justify-around items-center px-8 pt-1">
          {[0, 1, 2, 3].map((plotIndex) => (
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
