import { useEffect, useRef, useCallback } from 'react';
import type { CharacterConfig, HairStyle } from '../../stores/useCharacterStore';

import bodySrc from '../../assets/character/body.png';
import armsSrc from '../../assets/character/arms.png';
import clothesSrc from '../../assets/character/clothes.png';
import braidsSrc from '../../assets/character/hair-braids.png';
import bunsSrc from '../../assets/character/hair-buns.png';
import ponytailsSrc from '../../assets/character/hair-ponytails.png';

// Sprite sheet constants
// Each variant occupies a 160px wide block = 2 frames × 80px each.
// Idle still uses only frame 0; idle bounce uses frames 0 and 1.
const FRAME_W = 80;
const FRAME_H = 64;
const FRAMES_PER_VARIANT = 2;

// Row indices (0-based): rows 0-2 idle still, 3-5 idle bounce (front/side/back)
export const ROW_IDLE_STILL_FRONT  = 0;
export const ROW_IDLE_STILL_SIDE   = 1;
export const ROW_IDLE_STILL_BACK   = 2;
export const ROW_IDLE_BOUNCE_FRONT = 3;
export const ROW_IDLE_BOUNCE_SIDE  = 4;
export const ROW_IDLE_BOUNCE_BACK  = 5;

const IDLE_BOUNCE_FRAMES = 2;
const FRAME_DURATION_MS = 400;

const HAIR_SRCS: Record<HairStyle, string> = {
  braids: braidsSrc,
  buns: bunsSrc,
  ponytails: ponytailsSrc,
};

interface CharacterSpriteProps {
  config: CharacterConfig;
  scale?: number;
  animate?: boolean;
  row?: number;  // sprite sheet row (0-based); defaults to ROW_IDLE_BOUNCE_FRONT
  className?: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function CharacterSprite({
  config,
  scale = 4,
  animate = true,
  row = ROW_IDLE_BOUNCE_FRONT,
  className = '',
}: CharacterSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const animFrameRef = useRef(0);
  const rafRef = useRef<ReturnType<typeof requestAnimationFrame>>(0);
  const loadedRef = useRef(false);

  const draw = useCallback((animFrame: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !loadedRef.current) return;
    const [body, clothes, hair, arms] = imagesRef.current;
    if (!body || !clothes || !hair || !arms) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    const sy = row * FRAME_H;
    const dw = FRAME_W * scale;
    const dh = FRAME_H * scale;

    const layers: [HTMLImageElement, number][] = [
      [body, config.skinTone],
      [clothes, config.outfitColor],
      [hair, config.hairColor],
      [arms, config.skinTone],
    ];

    for (const [img, variantIdx] of layers) {
      const sx = (variantIdx * FRAMES_PER_VARIANT + animFrame) * FRAME_W;
      ctx.drawImage(img, sx, sy, FRAME_W, FRAME_H, 0, 0, dw, dh);
    }
  }, [config, scale, row]);

  // Load images when hair style changes
  useEffect(() => {
    loadedRef.current = false;
    const hairSrc = HAIR_SRCS[config.hairStyle];
    Promise.all([
      loadImage(bodySrc),
      loadImage(clothesSrc),
      loadImage(hairSrc),
      loadImage(armsSrc),
    ]).then((imgs) => {
      imagesRef.current = imgs;
      loadedRef.current = true;
      draw(0);
    });
  }, [config.hairStyle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Redraw when non-hair config changes (images already loaded)
  useEffect(() => {
    if (loadedRef.current) draw(animFrameRef.current);
  }, [draw]);

  // Animation loop
  useEffect(() => {
    if (!animate) {
      animFrameRef.current = 0;
      if (loadedRef.current) draw(0);
      return;
    }

    let lastTime = 0;
    const loop = (time: number) => {
      if (time - lastTime > FRAME_DURATION_MS) {
        animFrameRef.current = (animFrameRef.current + 1) % IDLE_BOUNCE_FRAMES;
        lastTime = time;
        draw(animFrameRef.current);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animate, draw]);

  return (
    <canvas
      ref={canvasRef}
      width={FRAME_W * scale}
      height={FRAME_H * scale}
      className={className}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
