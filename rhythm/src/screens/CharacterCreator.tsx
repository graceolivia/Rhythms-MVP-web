import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../stores/useCharacterStore';
import type { CharacterConfig, HairStyle } from '../stores/useCharacterStore';
import { CharacterSprite } from '../components/character/CharacterSprite';

// ── Skin tones ──────────────────────────────────────────────────────────────
const SKIN_TONES: { label: string; swatch: string }[] = [
  { label: 'Light',  swatch: '#C89070' },
  { label: 'Medium', swatch: '#9A6040' },
  { label: 'Deep',   swatch: '#4A2818' },
];

// ── Outfit colors (7 variants in ClothesRecolor.png) ────────────────────────
const OUTFIT_COLORS: { label: string; swatch: string }[] = [
  { label: 'Navy',    swatch: '#3A4E7A' },
  { label: 'Sage',    swatch: '#4E7A50' },
  { label: 'Olive',   swatch: '#8A7040' },
  { label: 'Teal',    swatch: '#407A6A' },
  { label: 'Brick',   swatch: '#8A3A3A' },
  { label: 'Purple',  swatch: '#6A4A8A' },
  { label: 'Stone',   swatch: '#7A7870' },
];

// ── Hair styles ──────────────────────────────────────────────────────────────
const HAIR_STYLES: { id: HairStyle; label: string }[] = [
  { id: 'braids',    label: 'Braids' },
  { id: 'buns',      label: 'Buns' },
  { id: 'ponytails', label: 'Ponytails' },
];

// ── Hair colors (6 variants in recolored hair sheets) ────────────────────────
const HAIR_COLORS: { label: string; swatch: string }[] = [
  { label: 'Auburn',     swatch: '#C06050' },
  { label: 'Strawberry', swatch: '#C45060' },
  { label: 'Brown',      swatch: '#9A6830' },
  { label: 'Black',      swatch: '#222222' },
  { label: 'Blonde',     swatch: '#C8A030' },
  { label: 'Silver',     swatch: '#C0C8D0' },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function SwatchPicker({
  options,
  selected,
  onSelect,
}: {
  options: { label: string; swatch: string }[];
  selected: number;
  onSelect: (idx: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          title={opt.label}
          className={`w-9 h-9 rounded-full border-4 transition-transform duration-150 hover:scale-110 active:scale-95 ${
            selected === i
              ? 'border-bark scale-110 shadow-md'
              : 'border-transparent shadow-sm'
          }`}
          style={{ backgroundColor: opt.swatch }}
        />
      ))}
    </div>
  );
}

function StylePicker({
  options,
  selected,
  onSelect,
}: {
  options: { id: HairStyle; label: string }[];
  selected: HairStyle;
  onSelect: (id: HairStyle) => void;
}) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt.id)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 border-2 ${
            selected === opt.id
              ? 'border-bark bg-bark text-cream'
              : 'border-bark/20 bg-parchment text-bark hover:bg-linen'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: CharacterConfig = {
  skinTone: 0,
  outfitColor: 0,
  hairStyle: 'braids',
  hairColor: 4,
};

interface CharacterCreatorProps {
  onComplete: () => void;
}

export function CharacterCreator({ onComplete }: CharacterCreatorProps) {
  const navigate = useNavigate();
  const setConfig = useCharacterStore((s) => s.setConfig);
  const existingConfig = useCharacterStore((s) => s.config);

  const [draft, setDraft] = useState<CharacterConfig>(
    existingConfig ?? DEFAULT_CONFIG
  );

  const update = (partial: Partial<CharacterConfig>) =>
    setDraft((prev) => ({ ...prev, ...partial }));

  const handleStart = () => {
    setConfig(draft);
    onComplete();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-skyblue/30 via-cream to-parchment flex flex-col">
      <div className="max-w-lg mx-auto w-full flex flex-col flex-1 px-4 pt-8 pb-8 gap-6">

        {/* Header */}
        <div className="text-center">
          <h1 className="font-display text-3xl text-bark">Meet Your Gardener</h1>
          <p className="text-bark/60 text-sm mt-1">Customize how you look in your garden</p>
        </div>

        {/* Character preview */}
        <div className="flex justify-center">
          <div
            className="bg-cream/80 rounded-2xl p-6 flex items-center justify-center"
            style={{ boxShadow: '0 4px 20px rgba(93,78,55,0.12)' }}
          >
            <CharacterSprite config={draft} scale={4} animate />
          </div>
        </div>

        {/* Options card */}
        <div
          className="bg-cream rounded-2xl p-5 flex flex-col gap-5"
          style={{ boxShadow: '0 4px 20px rgba(93,78,55,0.1)' }}
        >

          {/* Skin Tone */}
          <div>
            <p className="font-display text-bark text-sm mb-2">Skin Tone</p>
            <SwatchPicker
              options={SKIN_TONES}
              selected={draft.skinTone}
              onSelect={(i) => update({ skinTone: i })}
            />
          </div>

          {/* Outfit */}
          <div>
            <p className="font-display text-bark text-sm mb-2">Outfit</p>
            <SwatchPicker
              options={OUTFIT_COLORS}
              selected={draft.outfitColor}
              onSelect={(i) => update({ outfitColor: i })}
            />
          </div>

          {/* Hair Style */}
          <div>
            <p className="font-display text-bark text-sm mb-2">Hair Style</p>
            <StylePicker
              options={HAIR_STYLES}
              selected={draft.hairStyle}
              onSelect={(id) => update({ hairStyle: id })}
            />
          </div>

          {/* Hair Color */}
          <div>
            <p className="font-display text-bark text-sm mb-2">Hair Color</p>
            <SwatchPicker
              options={HAIR_COLORS}
              selected={draft.hairColor}
              onSelect={(i) => update({ hairColor: i })}
            />
          </div>

        </div>

        {/* CTA */}
        <button
          onClick={handleStart}
          className="w-full py-4 bg-bark text-cream font-display text-lg rounded-2xl shadow-md hover:bg-bark/90 active:scale-95 transition-all duration-150"
        >
          Let's Start! 🌱
        </button>

      </div>
    </div>
  );
}
