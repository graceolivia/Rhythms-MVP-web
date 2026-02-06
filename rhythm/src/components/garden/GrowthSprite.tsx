import type { GrowthStage, FlowerType } from '../../types';

// Emoji placeholders — swap for <img src={pngPath}> when pixel art is ready
const STAGE_EMOJI: Record<GrowthStage, string> = {
  seed: '🌰',
  sprout: '🌱',
  budding: '🌿',
  bloom: '🌸',
};

const BLOOM_EMOJI: Record<FlowerType, string> = {
  'daily-daisy': '🌼',
  'rhythm-rose': '🌹',
  'self-care-sunflower': '🌻',
  'golden-hour-lily': '🌷',
  'challenge-bloom': '🌺',
};

interface GrowthSpriteProps {
  stage: GrowthStage;
  flowerType?: FlowerType;
  size?: 'sm' | 'md' | 'lg';
  animate?: 'idle' | 'grow' | 'bloom' | 'none';
}

const SIZE_CLASSES = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
};

const ANIM_CLASSES = {
  idle: 'animate-gentle-sway',
  grow: 'animate-sprout-grow',
  bloom: 'animate-bloom-burst',
  none: '',
};

export function GrowthSprite({ stage, flowerType, size = 'md', animate = 'idle' }: GrowthSpriteProps) {
  const emoji = stage === 'bloom' && flowerType
    ? BLOOM_EMOJI[flowerType]
    : STAGE_EMOJI[stage];

  return (
    <span
      className={`inline-block ${SIZE_CLASSES[size]} ${ANIM_CLASSES[animate]} select-none`}
      role="img"
      aria-label={`${stage} plant`}
    >
      {emoji}
    </span>
  );
}
