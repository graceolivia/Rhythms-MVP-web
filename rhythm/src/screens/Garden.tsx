import { useState, useCallback, useMemo } from 'react';
import {
  useGardenStore,
  GRID_COLS,
  GRID_ROWS,
  BLOCKED_CELLS,
  FLOWER_CATALOG,
  getCurrentSeason,
} from '../stores/useGardenStore';
import { SpriteSheet } from '../components/garden/SpriteSheet';
import type { FlowerType } from '../types';
import cottageSprite from '../assets/cottage_scene/cottage3_resize.png';
import dirtTile from '../assets/cottage_scene/dirt-tile.png';
import steppingStonePath from '../assets/cottage_scene/stepping-stone-path.png';
import fenceSprite from '../assets/cottage_scene/fence.png';

// ===========================================
// COTTAGE COMPONENT
// ===========================================

function Cottage() {
  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
      <img
        src={cottageSprite}
        alt="Cottage"
        width={120}
        height={120}
        style={{
          imageRendering: 'pixelated',
          filter: 'drop-shadow(2px 3px 1px rgba(0,0,0,0.25))',
          display: 'block',
        }}
      />
    </div>
  );
}

// ===========================================
// FLOWER PALETTE COMPONENT
// ===========================================

/** Render a flower sprite by type (uses catalog default) */
function FlowerSpriteByType({ type }: { type: FlowerType }) {
  const entry = FLOWER_CATALOG[type];
  if (entry.sheet) {
    return (
      <SpriteSheet
        src={entry.sheet}
        frame={entry.sheetBloomFrame ?? 0}
        frameSize={16}
        scale={2}
        shadow
      />
    );
  }
  return (
    <img
      src={entry.sprite}
      alt={entry.label}
      className="w-8 h-8 block select-none"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

function FlowerPalette({ onFlowerDragStart }: { onFlowerDragStart?: (type: FlowerType) => void }) {
  const flowers = useGardenStore((s) => s.flowers);
  const placedFlowers = useGardenStore((s) => s.placedFlowers);
  const selectedFlowerType = useGardenStore((s) => s.selectedFlowerType);
  const selectFlowerType = useGardenStore((s) => s.selectFlowerType);
  const setMode = useGardenStore((s) => s.setMode);
  const placedFlowerIds = useMemo(
    () => new Set(placedFlowers.map((p) => p.flowerId)),
    [placedFlowers]
  );

  const activeSeason = getCurrentSeason();

  const seedsByType = useMemo(() => {
    const counts: Partial<Record<FlowerType, number>> = {};
    flowers.forEach((f) => {
      if (!placedFlowerIds.has(f.id) && f.challengeId === null && FLOWER_CATALOG[f.type].season === activeSeason)
        counts[f.type] = (counts[f.type] || 0) + 1;
    });
    return counts;
  }, [flowers, placedFlowerIds, activeSeason]);

  const bloomsByType = useMemo(() => {
    const counts: Partial<Record<FlowerType, number>> = {};
    flowers.forEach((f) => {
      if (!placedFlowerIds.has(f.id) && f.challengeId !== null && FLOWER_CATALOG[f.type].season === activeSeason)
        counts[f.type] = (counts[f.type] || 0) + 1;
    });
    return counts;
  }, [flowers, placedFlowerIds, activeSeason]);

  const availableByType = useMemo(() => {
    const counts: Partial<Record<FlowerType, number>> = { ...seedsByType };
    (Object.entries(bloomsByType) as [FlowerType, number][]).forEach(([type, count]) => {
      counts[type] = (counts[type] || 0) + count;
    });
    return counts;
  }, [seedsByType, bloomsByType]);

  const totalAvailable = Object.values(availableByType).reduce((a, b) => a + b, 0);

  const handleSelect = (type: FlowerType) => {
    selectFlowerType(type);
    setMode('place');
  };

  return (
    <div className="fixed bottom-16 left-0 right-0 z-20 flex justify-center">
      <div
        className="w-full max-w-lg bg-cream rounded-t-2xl"
        style={{ boxShadow: '0 -4px 20px rgba(93,78,55,0.15)' }}
      >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex justify-between items-center border-b border-bark/10">
        <div>
          <h2 className="font-display text-lg text-bark">Flower Palette</h2>
          <p className="text-xs text-bark/50">{totalAvailable} flowers to place</p>
        </div>
        {selectedFlowerType && availableByType[selectedFlowerType] && (
          <div className="flex items-center gap-1 text-sm">
            <FlowerSpriteByType type={selectedFlowerType} />
            <span className="text-sage font-semibold">×{availableByType[selectedFlowerType]}</span>
          </div>
        )}
      </div>

      {/* Flower Grid */}
      <div className="px-4 py-4 max-h-[200px] overflow-y-auto pb-20">
        {totalAvailable === 0 ? (
          <p className="text-center text-bark/50 text-sm py-4">
            No {activeSeason} flowers yet — visit the Shop!
          </p>
        ) : (
          <>
            {Object.values(seedsByType).some(c => c > 0) && (
              <>
                <p className="text-[10px] font-semibold text-bark/40 uppercase tracking-wide mb-2">🌱 Seeds</p>
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {(Object.keys(FLOWER_CATALOG) as FlowerType[]).map((type) => {
                    const count = seedsByType[type] || 0;
                    if (count === 0) return null;
                    const isSelected = selectedFlowerType === type;
                    return (
                      <button
                        key={`seed-${type}`}
                        draggable
                        onDragStart={(e) => { e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', `palette:${type}`); handleSelect(type); onFlowerDragStart?.(type); }}
                        onClick={() => handleSelect(type)}
                        className={`flex flex-col items-center justify-center rounded-xl transition-all duration-200 border-2 p-2 ${isSelected ? 'border-sage bg-sage/20 scale-105' : 'border-transparent bg-parchment hover:bg-linen hover:scale-105'}`}
                      >
                        <SpriteSheet src={FLOWER_CATALOG[type].sheet ?? FLOWER_CATALOG[type].sprite} frame={1} frameSize={16} scale={2} shadow />
                        <span className="text-[10px] text-bark/60 font-semibold mt-1">×{count}</span>
                        <span className="text-[9px] text-bark/40 mt-0.5 leading-tight text-center">{FLOWER_CATALOG[type].label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {Object.values(bloomsByType).some(c => c > 0) && (
              <>
                <p className="text-[10px] font-semibold text-bark/40 uppercase tracking-wide mb-2">🌸 Bloomed</p>
                <div className="grid grid-cols-5 gap-2">
                  {(Object.keys(FLOWER_CATALOG) as FlowerType[]).map((type) => {
                    const count = bloomsByType[type] || 0;
                    if (count === 0) return null;
                    const isSelected = selectedFlowerType === type;
                    return (
                      <button
                        key={`bloom-${type}`}
                        draggable
                        onDragStart={(e) => { e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', `palette:${type}`); handleSelect(type); onFlowerDragStart?.(type); }}
                        onClick={() => handleSelect(type)}
                        className={`flex flex-col items-center justify-center rounded-xl transition-all duration-200 border-2 p-2 ${isSelected ? 'border-sage bg-sage/20 scale-105' : 'border-transparent bg-parchment hover:bg-linen hover:scale-105'}`}
                      >
                        <FlowerSpriteByType type={type} />
                        <span className="text-[10px] text-bark/60 font-semibold mt-1">×{count}</span>
                        <span className="text-[9px] text-bark/40 mt-0.5 leading-tight text-center">{FLOWER_CATALOG[type].label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  );
}

// ===========================================
// TOAST COMPONENT
// ===========================================

function Toast({ message }: { message: string }) {
  return (
    <div className="absolute bottom-36 left-1/2 -translate-x-1/2 bg-bark text-cream px-4 py-2 rounded-xl text-sm font-medium shadow-lg z-30 whitespace-nowrap animate-slide-up">
      {message}
    </div>
  );
}

// ===========================================
// GARDEN SCREEN
// ===========================================

export function Garden() {
  const [toast, setToast] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingFromCell, setDraggingFromCell] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

  const placedFlowers = useGardenStore((s) => s.placedFlowers);
  const selectedFlowerType = useGardenStore((s) => s.selectedFlowerType);
  const mode = useGardenStore((s) => s.mode);
  const flowers = useGardenStore((s) => s.flowers);

  const placeFlower = useGardenStore((s) => s.placeFlower);
  const removeFlowerFromGrid = useGardenStore((s) => s.removeFlowerFromGrid);
  const moveFlower = useGardenStore((s) => s.moveFlower);
  const setMode = useGardenStore((s) => s.setMode);
  const clearGarden = useGardenStore((s) => s.clearGarden);
  const getFlowerAt = useGardenStore((s) => s.getFlowerAt);
  const getUnplacedByType = useGardenStore((s) => s.getUnplacedByType);

  const seedFlowerIds = useMemo(
    () => new Set(flowers.filter((f) => f.challengeId === null).map((f) => f.id)),
    [flowers]
  );

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  }, []);

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, placedId: string, col: number, row: number) => {
    setDraggingId(placedId);
    setDraggingFromCell(`${col},${row}`);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', placedId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDraggingFromCell(null);
    setDragOverCell(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, col: number, row: number) => {
    e.preventDefault();
    const key = `${col},${row}`;
    if (!BLOCKED_CELLS.has(key)) {
      e.dataTransfer.dropEffect = 'move';
      setDragOverCell(key);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, col: number, row: number) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    const key = `${col},${row}`;

    if (BLOCKED_CELLS.has(key)) {
      showToast("Can't plant there! 🏠");
      setDraggingId(null);
      setDraggingFromCell(null);
      setDragOverCell(null);
      return;
    }

    // Drag from palette: data is "palette:<flowerType>"
    if (data.startsWith('palette:')) {
      const flowerType = data.slice('palette:'.length) as FlowerType;
      const existingFlower = getFlowerAt(col, row);
      if (existingFlower) {
        showToast('Spot occupied!');
      } else {
        // Select type and place using store directly (Zustand mutations are synchronous)
        useGardenStore.getState().selectFlowerType(flowerType);
        useGardenStore.getState().setMode('place');
        if (useGardenStore.getState().placeFlower(col, row)) {
          showToast(`Planted ${FLOWER_CATALOG[flowerType].label}! 🌸`);
        }
      }
      setDragOverCell(null);
      return;
    }

    // Drag to move an already-placed flower
    const existingFlower = getFlowerAt(col, row);
    if (existingFlower && existingFlower.id !== data) {
      showToast('Spot occupied!');
      setDraggingId(null);
      setDraggingFromCell(null);
      setDragOverCell(null);
      return;
    }

    if (moveFlower(data, col, row)) {
      showToast('Moved! ✨');
    }

    setDraggingId(null);
    setDraggingFromCell(null);
    setDragOverCell(null);
  }, [moveFlower, getFlowerAt, showToast]);

  const handleCellClick = useCallback(
    (col: number, row: number) => {
      // If dragging, don't handle click
      if (draggingId) return;

      const key = `${col},${row}`;

      if (BLOCKED_CELLS.has(key)) {
        showToast("Can't plant there! 🏠");
        return;
      }

      const existingFlower = getFlowerAt(col, row);

      switch (mode) {
        case 'place':
          if (existingFlower) {
            showToast('Already planted there!');
            return;
          }
          if (!selectedFlowerType) {
            showToast('Select a flower first! 🌸');
            return;
          }
          if (getUnplacedByType(selectedFlowerType).length === 0) {
            showToast('No more of that type!');
            return;
          }
          if (placeFlower(col, row)) {
            showToast(`Planted ${FLOWER_CATALOG[selectedFlowerType].label}!`);
          }
          break;

        case 'remove':
          if (!existingFlower) {
            showToast('No flower there!');
            return;
          }
          removeFlowerFromGrid(existingFlower.id);
          showToast(`${FLOWER_CATALOG[existingFlower.flowerType].label} removed`);
          break;

        default:
          // In place mode, clicking on empty spots places flowers
          if (!existingFlower && selectedFlowerType) {
            if (getUnplacedByType(selectedFlowerType).length > 0) {
              if (placeFlower(col, row)) {
                showToast(`Planted ${FLOWER_CATALOG[selectedFlowerType].label}!`);
              }
            }
          }
      }
    },
    [
      draggingId,
      mode,
      selectedFlowerType,
      placeFlower,
      removeFlowerFromGrid,
      getFlowerAt,
      getUnplacedByType,
      showToast,
    ]
  );

  const handleClear = useCallback(() => {
    if (placedFlowers.length === 0) {
      showToast('Garden is already empty!');
      return;
    }
    clearGarden();
    showToast('Garden cleared! 🔄');
  }, [placedFlowers.length, clearGarden, showToast]);

  const modeLabels: Record<string, string> = {
    place: 'Tap to place · Drag to move',
    remove: 'Tap flower to remove',
  };

  // Generate grid cells
  const gridCells = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const key = `${col},${row}`;
      const isBlocked = BLOCKED_CELLS.has(key);
      const placedFlower = getFlowerAt(col, row);
      const isDragging = placedFlower?.id === draggingId;
      const isDraggingFrom = draggingFromCell === key;
      const isDragOver = dragOverCell === key && !isBlocked && !isDraggingFrom;

      gridCells.push(
        <div
          key={key}
          onClick={() => handleCellClick(col, row)}
          onDragOver={(e) => handleDragOver(e, col, row)}
          onDrop={(e) => handleDrop(e, col, row)}
          className={`
            w-8 h-8 rounded transition-all duration-150
            ${isBlocked ? 'cursor-not-allowed' : 'cursor-pointer ring-1 ring-inset ring-white/20'}
            ${!isBlocked && !placedFlower && !isDraggingFrom ? 'active:bg-sage/40' : ''}
            ${isDragOver ? 'bg-sage/40 ring-2 ring-sage ring-inset' : ''}
          `}
        >
          {placedFlower && (
            <span
              draggable
              onDragStart={(e) => handleDragStart(e, placedFlower.id, col, row)}
              onDragEnd={handleDragEnd}
              className={`
                w-full h-full flex items-center justify-center
                drop-shadow-md transition-transform duration-200
                cursor-grab active:cursor-grabbing select-none
                ${isDragging ? 'opacity-50 animate-wiggle' : 'hover:scale-110'}
                ${!isDragging ? 'animate-plant-grow' : ''}
              `}
            >
              {(() => {
                const entry = FLOWER_CATALOG[placedFlower.flowerType];
                const isSeed = seedFlowerIds.has(placedFlower.flowerId);
                return (
                  <SpriteSheet
                    src={entry.sheet ?? entry.sprite}
                    frame={isSeed ? 1 : (entry.sheetBloomFrame ?? 0)}
                    frameSize={16}
                    scale={2}
                    shadow
                  />
                );
              })()}
            </span>
          )}
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-skyblue/30 via-sage/20 to-sage/40 relative overflow-hidden pb-64">
      <div className="max-w-lg mx-auto">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-display text-2xl text-bark">Your Garden</h1>
            <p className="text-bark/60 text-sm">{flowers.length} flowers earned</p>
          </div>
          <div className="flex items-center gap-1.5 bg-cream/80 px-3 py-1.5 rounded-full text-sm font-semibold text-sage">
            <span>🌸</span>
            <span>{placedFlowers.length} planted</span>
          </div>
        </div>
      </header>

      {/* Mode Indicator + Action Buttons */}
      <div className="px-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sage animate-pulse" />
          <span className="text-xs font-semibold text-sage">{modeLabels[mode] || modeLabels.place}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('remove')}
            className={`w-8 h-8 rounded-full shadow-sm flex items-center justify-center text-base transition-all duration-200 hover:scale-110 ${
              mode === 'remove' ? 'bg-terracotta text-cream' : 'bg-cream/80'
            }`}
            title="Remove flower"
          >
            🗑️
          </button>
          <button
            onClick={handleClear}
            className="w-8 h-8 rounded-full bg-cream/80 shadow-sm flex items-center justify-center text-base transition-all duration-200 hover:scale-110"
            title="Clear all"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Garden Area */}
      <div className="relative mx-4">
        {/* Garden bed background — tiled pixel art dirt */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            backgroundImage: `url(${dirtTile})`,
            backgroundSize: '32px 32px',
            imageRendering: 'pixelated',
          }}
        />

        {/* Garden bed border/frame */}
        <div className="relative rounded-2xl pt-24 px-4 pb-8">
          <Cottage />

          {/* Grid */}
          <div
            className="mx-auto"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${GRID_COLS}, 32px)`,
              gridTemplateRows: `repeat(${GRID_ROWS}, 32px)`,
              width: 'fit-content',
              position: 'relative',
            }}
          >
            {gridCells}

            {/* Stepping stone path — exactly col 4, rows 0–7 */}
            <div
              style={{
                position: 'absolute',
                top: '0px',
                left: '224px',
                width: '32px',
                height: '256px',
                backgroundImage: `url(${steppingStonePath})`,
                backgroundRepeat: 'repeat-y',
                backgroundSize: '32px 32px',
                backgroundPosition: 'center top',
                zIndex: 1,
                pointerEvents: 'none',
              }}
            />

            {/* Fence sprite frames at 2× scale (original 128×16 → 256×32):
                frame 0: bottom-left corner    frame 4: top horizontal
                frame 1: bottom horizontal     frame 5: top-right corner
                frame 2: bottom-right corner   frame 6: right vertical
                frame 3: top-left corner       frame 7: left vertical */}
            {(() => {
              const fenceTile = (frame: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7, key: string | number) => (
                <div
                  key={key}
                  style={{
                    width: 32, height: 32, flexShrink: 0,
                    backgroundImage: `url(${fenceSprite})`,
                    backgroundSize: '256px 32px',
                    backgroundPosition: `${-frame * 32}px 0px`,
                    imageRendering: 'pixelated',
                  }}
                />
              );
              return (
                <>
                  {/* Top edge: top-left corner, top horizontal × GRID_COLS, top-right corner */}
                  <div style={{ position: 'absolute', top: '-32px', left: '-32px', display: 'flex', zIndex: 2, pointerEvents: 'none' }}>
                    {fenceTile(3, 'tl')}
                    {Array.from({ length: GRID_COLS }, (_, i) => fenceTile(4, i))}
                    {fenceTile(5, 'tr')}
                  </div>
                  {/* Bottom edge: bottom-left corner, bottom horizontal × GRID_COLS, bottom-right corner */}
                  <div style={{ position: 'absolute', top: `${GRID_ROWS * 32}px`, left: '-32px', display: 'flex', zIndex: 2, pointerEvents: 'none' }}>
                    {fenceTile(0, 'bl')}
                    {Array.from({ length: GRID_COLS }, (_, i) => fenceTile(1, i))}
                    {fenceTile(2, 'br')}
                  </div>
                  {/* Left edge: left vertical */}
                  <div style={{ position: 'absolute', top: '0px', left: '-32px', display: 'flex', flexDirection: 'column', zIndex: 2, pointerEvents: 'none' }}>
                    {Array.from({ length: GRID_ROWS }, (_, i) => fenceTile(7, i))}
                  </div>
                  {/* Right edge: right vertical */}
                  <div style={{ position: 'absolute', top: '0px', left: `${GRID_COLS * 32}px`, display: 'flex', flexDirection: 'column', zIndex: 2, pointerEvents: 'none' }}>
                    {Array.from({ length: GRID_ROWS }, (_, i) => fenceTile(6, i))}
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Help Bubble */}
        {placedFlowers.length === 0 && flowers.length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-cream px-4 py-3 rounded-xl shadow-lg text-sm text-bark text-center max-w-[260px] z-10">
            Select a flower below, then tap a spot to plant it! 🌱
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-cream" />
          </div>
        )}
      </div>

      </div>

      {/* Flower Palette */}
      <FlowerPalette onFlowerDragStart={() => setDragOverCell(null)} />

      {/* Toast */}
      {toast && <Toast message={toast} />}
    </div>
  );
}
