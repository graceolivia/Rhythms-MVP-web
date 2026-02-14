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

const STAGE_INDEX: Record<GrowthStage, number> = {
  seed: 0,
  sprout: 1,
  budding: 2,
  bloom: 3,
};

interface GrowthSpriteProps {
  stage: GrowthStage;
  flowerType?: FlowerType;
  /** Custom pixel art sprites [seed, sprout, budding, bloom] */
  sprites?: [string, string, string, string];
  size?: 'sm' | 'md' | 'lg';
  animate?: 'idle' | 'grow' | 'bloom' | 'none';
}

const SIZE_CLASSES = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
};

const IMG_SIZE_CLASSES = {
  sm: 'w-10 h-10',
  md: 'w-16 h-16',
  lg: 'w-20 h-20',
};

const ANIM_CLASSES = {
  idle: 'animate-gentle-sway',
  grow: 'animate-sprout-grow',
  bloom: 'animate-bloom-burst',
  none: '',
};

export function GrowthSprite({ stage, flowerType, sprites, size = 'md', animate = 'idle' }: GrowthSpriteProps) {
  // Use pixel art if custom sprites provided
  if (sprites) {
    const src = sprites[STAGE_INDEX[stage]];
    return (
      <img
        src={src}
        alt={`${stage} plant`}
        className={`${IMG_SIZE_CLASSES[size]} ${ANIM_CLASSES[animate]} select-none block`}
        style={{ imageRendering: 'pixelated', filter: 'drop-shadow(2px 3px 1px rgba(0,0,0,0.25))' }}
      />
    );
  }

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
