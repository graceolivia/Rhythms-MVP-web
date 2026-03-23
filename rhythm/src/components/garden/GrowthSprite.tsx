import { SpriteSheet } from './SpriteSheet';
import type { GrowthStage, FlowerType } from '../../types';

// Emoji placeholders — swap for <img src={pngPath}> when pixel art is ready
const STAGE_EMOJI: Record<GrowthStage, string> = {
  planted: '🌱',
  seed: '🌰',
  sprout: '🌱',
  budding: '🌿',
  bloom: '🌸',
};

const BLOOM_EMOJI: Record<FlowerType, string> = {
  'daily-daisy': '🌼',
  'rhythm-rose': '🌹',
  'heliotrope': '💜',
};

// Sprite sheet frames 0–4 map to: planted, seed, sprout, budding, bloom
const STAGE_INDEX: Record<GrowthStage, number> = {
  planted: 0,
  seed: 1,
  sprout: 2,
  budding: 3,
  bloom: 4,
};

interface GrowthSpriteProps {
  stage: GrowthStage;
  flowerType?: FlowerType;
  /** Custom pixel art sprites [planted, seed, sprout, budding, bloom] */
  sprites?: [string, string, string, string, string];
  /** Horizontal sprite sheet — frames 0-4 map to planted/seed/sprout/budding/bloom */
  spriteSheet?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  animate?: 'idle' | 'grow' | 'bloom' | 'none';
}

const SIZE_CLASSES = {
  xs: 'text-base',
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
};

const IMG_SIZE_CLASSES = {
  xs: 'w-8 h-8',
  sm: 'w-10 h-10',
  md: 'w-16 h-16',
  lg: 'w-20 h-20',
};

const SHEET_SCALE: Record<'xs' | 'sm' | 'md' | 'lg', number> = {
  xs: 2,    // 16 × 2   = 32px
  sm: 2.5,  // 16 × 2.5 = 40px
  md: 4,    // 16 × 4   = 64px
  lg: 5,    // 16 × 5   = 80px
};

const ANIM_CLASSES = {
  idle: 'animate-gentle-sway',
  grow: 'animate-sprout-grow',
  bloom: 'animate-bloom-burst',
  none: '',
};

export function GrowthSprite({ stage, flowerType, sprites, spriteSheet, size = 'md', animate = 'idle' }: GrowthSpriteProps) {
  const frameIndex = STAGE_INDEX[stage];

  // Sprite sheet: frames 0–4 map to planted/seed/sprout/budding/bloom
  if (spriteSheet) {
    return (
      <SpriteSheet
        src={spriteSheet}
        frame={frameIndex}
        frameSize={16}
        scale={SHEET_SCALE[size]}
        className={ANIM_CLASSES[animate]}
        shadow
      />
    );
  }

  // Individual sprites [seed, sprout, budding, bloom]
  if (sprites) {
    return (
      <img
        src={sprites[frameIndex]}
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
