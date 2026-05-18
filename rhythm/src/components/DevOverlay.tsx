import { useState } from 'react';
import { format } from 'date-fns';
import { getDevDayOffset, setDevDayOffset } from '../utils/devTime';
import { useCoinStore } from '../stores/useCoinStore';
import { useGardenStore } from '../stores/useGardenStore';

const STEPS = [
  { label: '−3d', delta: -3 },
  { label: '−1d', delta: -1 },
  { label: '+1d', delta: 1 },
  { label: '+2d', delta: 2 },
  { label: '+3d', delta: 3 },
  { label: '+7d', delta: 7 },
];

const btn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.15)',
  color: '#e8dfc8',
  borderRadius: 5,
  padding: '2px 6px',
  fontSize: 11,
  cursor: 'pointer',
  fontFamily: 'monospace',
};

const divider: React.CSSProperties = {
  fontWeight: 700,
  marginTop: 8,
  marginBottom: 4,
  fontSize: 10,
  opacity: 0.6,
  letterSpacing: '0.05em',
  borderTop: '1px solid rgba(255,255,255,0.1)',
  paddingTop: 6,
};

export function DevOverlay() {
  const [offset, setOffset] = useState(getDevDayOffset);
  const [coinInput, setCoinInput] = useState('100');

  const coins = useCoinStore((s) => s.coins);
  const addCoins = useCoinStore((s) => s.addCoins);
  const bloomAllFlowers = useGardenStore((s) => s.bloomAllFlowers);

  const realNow = new Date(Date.now());

  function apply(newOffset: number) {
    setOffset(newOffset);
    setDevDayOffset(newOffset);
  }

  function handleAddCoins() {
    const amount = parseInt(coinInput, 10);
    if (!isNaN(amount) && amount > 0) addCoins(amount);
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
      {/* ── TIME ── */}
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
        {STEPS.map(({ label, delta }) => (
          <button key={label} onClick={() => apply(offset + delta)} style={btn}>{label}</button>
        ))}
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

      {/* ── COINS ── */}
      <div style={divider}>DEV · COINS</div>

      <div style={{ marginBottom: 4, opacity: 0.7 }}>
        balance: <span style={{ fontWeight: 700, opacity: 1 }}>{coins}</span>
      </div>

      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <input
          type="number"
          value={coinInput}
          onChange={(e) => setCoinInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddCoins()}
          style={{
            width: 64,
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#e8dfc8',
            borderRadius: 5,
            padding: '2px 5px',
            fontSize: 11,
            fontFamily: 'monospace',
          }}
        />
        <button onClick={handleAddCoins} style={{ ...btn, padding: '2px 8px' }}>
          + add
        </button>
      </div>

      {/* ── GARDEN ── */}
      <div style={divider}>DEV · GARDEN</div>

      <button
        onClick={() => bloomAllFlowers()}
        style={{ ...btn, width: '100%', padding: '3px 0', textAlign: 'center' }}
      >
        🌸 bloom all flowers
      </button>
    </div>
  );
}
