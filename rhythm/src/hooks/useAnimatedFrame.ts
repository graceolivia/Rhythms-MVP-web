import { useState, useEffect } from 'react';

export function useAnimatedFrame(frameCount: number, fps = 6): number {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (frameCount <= 1) return;
    const id = setInterval(() => setFrame(f => (f + 1) % frameCount), 1000 / fps);
    return () => clearInterval(id);
  }, [frameCount, fps]);
  return frame;
}
