import { CHALLENGE_TEMPLATES } from '../../stores/useChallengeStore';
import { GrowthSprite } from '../garden/GrowthSprite';

interface BloomModalProps {
  challengeTitle: string;
  templateId: string;
  onDismiss: () => void;
  onViewGarden: () => void;
}

export function BloomModal({ challengeTitle, templateId, onDismiss, onViewGarden }: BloomModalProps) {
  const template = CHALLENGE_TEMPLATES.find(t => t.id === templateId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-bark/40 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-cream rounded-2xl p-8 max-w-sm w-full shadow-xl text-center">
        {/* Bloomed flower */}
        <div className="flex justify-center mb-4">
          <GrowthSprite
            stage="bloom"
            flowerType={template?.flowerReward}
            sprites={template?.sprites}
            size="lg"
            animate="bloom"
          />
        </div>

        <h2 className="font-display text-2xl text-bark mb-2">
          Your {challengeTitle} bloomed!
        </h2>

        <p className="text-bark/60 text-sm leading-relaxed mb-6">
          All that steady effort paid off. A new flower for your garden.
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={onViewGarden}
            className="px-5 py-3 bg-sage text-cream rounded-lg font-medium hover:bg-sage/90 transition-colors"
          >
            View garden
          </button>
          <button
            onClick={onDismiss}
            className="px-5 py-3 bg-cream border border-bark/15 text-bark/70 rounded-lg font-medium hover:bg-parchment transition-colors"
          >
            Keep going
          </button>
        </div>
      </div>
    </div>
  );
}
