import type React from 'react';

/**
 * Renders a single frame from a horizontal sprite sheet.
 *
 * Frames are indexed left-to-right starting at 0.
 * Example: a 64×16 sheet with frameSize=16 has 4 frames (0–3).
 *
 * Usage:
 *   <SpriteSheet src={heliotropeSheet} frame={3} scale={2} />
 */
export function SpriteSheet({
  src,
  frame,
  frameSize = 16,
  scale = 2,
  className = '',
  shadow = false,
  style,
}: {
  src: string;
  frame: number;
  frameSize?: number;
  scale?: number;
  className?: string;
  shadow?: boolean;
  style?: React.CSSProperties;
}) {
  const displaySize = frameSize * scale;
  const shadowFilter = shadow ? 'drop-shadow(2px 3px 1px rgba(0,0,0,0.25))' : undefined;
  const extraFilter = style?.filter as string | undefined;
  const combinedFilter = [shadowFilter, extraFilter].filter(Boolean).join(' ') || undefined;

  return (
    <div
      className={className}
      style={{
        width: displaySize,
        height: displaySize,
        backgroundImage: `url(${src})`,
        backgroundPosition: `-${frame * displaySize}px 0px`,
        backgroundSize: `auto ${displaySize}px`,
        imageRendering: 'pixelated',
        flexShrink: 0,
        ...style,
        filter: combinedFilter,
      }}
    />
  );
}
