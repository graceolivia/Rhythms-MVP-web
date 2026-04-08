import { useState, useEffect, useCallback } from 'react';

import sagePng from '../../assets/npcs/sage.png';

export function SagePortrait({ src }: { src?: string }) {
  return (
    <img
      src={src ?? sagePng}
      alt="Sage"
      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

interface DialogueBoxProps {
  speakerName: string;
  portrait?: string;
  lines: string[];
  onComplete: () => void;
  // If provided, replaces the last line's text area with custom content (e.g. an input)
  inputSlot?: React.ReactNode;
  // If true, shows inputSlot instead of text + advance hint
  showInputSlot?: boolean;
  // If true, hides the advance hint and prevents tapping past the current revealed line
  blocked?: boolean;
}

const DEV_MODE = import.meta.env.DEV;
const CHARS_PER_SEC = 30;

export function DialogueBox({
  speakerName,
  portrait,
  lines,
  onComplete,
  inputSlot,
  showInputSlot = false,
  blocked = false,
}: DialogueBoxProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [revealed, setRevealed] = useState(false);

  const currentLine = lines[lineIndex] ?? '';

  // Typewriter effect
  useEffect(() => {
    setDisplayed('');
    setRevealed(false);

    if (showInputSlot || DEV_MODE) {
      setDisplayed(currentLine);
      setRevealed(true);
      return;
    }

    let i = 0;
    const ms = 1000 / CHARS_PER_SEC;
    const id = setInterval(() => {
      i++;
      setDisplayed(currentLine.slice(0, i));
      if (i >= currentLine.length) {
        clearInterval(id);
        setRevealed(true);
      }
    }, ms);

    return () => clearInterval(id);
  }, [lineIndex, currentLine, showInputSlot]);

  const handleTap = useCallback(() => {
    if (showInputSlot) return; // input slot handles its own advance

    if (!revealed) {
      // Skip typewriter — show full line immediately
      setDisplayed(currentLine);
      setRevealed(true);
      return;
    }

    if (blocked) return; // waiting for external condition — don't advance

    // Advance to next line or complete
    if (lineIndex < lines.length - 1) {
      setLineIndex((i) => i + 1);
    } else {
      onComplete();
    }
  }, [revealed, lineIndex, lines.length, currentLine, onComplete, showInputSlot, blocked]);

  // Reset when lines change
  useEffect(() => {
    setLineIndex(0);
  }, [lines]);

  const isLastLine = lineIndex === lines.length - 1;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 select-none"
      onClick={handleTap}
    >
      {/* Pixel-style border top */}
      <div
        className="w-full"
        style={{
          boxShadow: 'inset 0 4px 0 0 rgba(93,78,55,0.6)',
          background: 'rgba(30, 22, 12, 0.93)',
          minHeight: '160px',
        }}
      >
        <div className="flex gap-3 p-4 pb-6 max-w-lg mx-auto">
          {/* Portrait */}
          <div className="flex-shrink-0 mt-1">
            <SagePortrait src={portrait} />
          </div>

          {/* Text area */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Speaker name */}
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: '#a8c5a0' }}
            >
              {speakerName}
            </p>

            {showInputSlot ? (
              <div onClick={(e) => e.stopPropagation()}>{inputSlot}</div>
            ) : (
              <>
                <p
                  className="text-sm leading-relaxed flex-1"
                  style={{ color: '#f0e8d8', fontFamily: 'inherit' }}
                >
                  {displayed}
                  {!revealed && (
                    <span className="animate-pulse opacity-60">▌</span>
                  )}
                </p>

                {/* Advance hint — hidden while blocked */}
                {revealed && !blocked && (
                  <div className="flex justify-end mt-2">
                    <span
                      className="text-xs animate-bounce"
                      style={{ color: 'rgba(168,197,160,0.7)' }}
                    >
                      {isLastLine ? '▶ continue' : '▼ next'}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
