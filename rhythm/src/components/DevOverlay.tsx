import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { getDevDayOffset, setDevDayOffset } from '../utils/devTime';

const STEPS = [
  { label: '−3d', delta: -3 },
  { label: '−1d', delta: -1 },
  { label: '+1d', delta: 1 },
  { label: '+2d', delta: 2 },
  { label: '+3d', delta: 3 },
  { label: '+7d', delta: 7 },
];

export function DevOverlay() {
  const [offset, setOffset] = useState(getDevDayOffset);

  const virtualNow = addDays(new Date(), 0); // already patched if offset != 0
  const realNow = new Date(Date.now()); // same as virtualNow when patched; used for display

  function apply(newOffset: number) {
    setOffset(newOffset); // optimistic — reload will replace this anyway
    setDevDayOffset(newOffset);
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        right: 12,
        zIndex: 9999,
        background: 'rgba(20,10,0,0.85)',
        color: '#e8dfc8',
        borderRadius: 10,
        padding: '8px 10px',
        fontSize: 11,
        fontFamily: 'monospace',
        backdropFilter: 'blur(6px)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
        minWidth: 180,
        userSelect: 'none',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 10, opacity: 0.6, letterSpacing: '0.05em' }}>
        DEV · TIME
      </div>

      <div style={{ marginBottom: 6 }}>
        <span style={{ opacity: 0.55 }}>virtual </span>
        <span style={{ fontWeight: 700 }}>{format(realNow, 'EEE MMM d')}</span>
        {offset !== 0 && (
          <span style={{ opacity: 0.55 }}>
            {' '}({offset > 0 ? '+' : ''}{offset}d)
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
        {STEPS.map(({ label, delta }) => {
          const target = offset + delta;
          return (
            <button
              key={label}
              onClick={() => apply(target)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#e8dfc8',
                borderRadius: 5,
                padding: '2px 6px',
                fontSize: 11,
                cursor: 'pointer',
                fontFamily: 'monospace',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {offset !== 0 && (
        <button
          onClick={() => apply(0)}
          style={{
            width: '100%',
            background: 'rgba(200,80,60,0.3)',
            border: '1px solid rgba(200,80,60,0.4)',
            color: '#e8dfc8',
            borderRadius: 5,
            padding: '2px 0',
            fontSize: 10,
            cursor: 'pointer',
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
          }}
        >
          RESET TO NOW
        </button>
      )}
    </div>
  );
}
