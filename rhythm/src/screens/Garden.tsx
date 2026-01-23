import { useState, useCallback, useMemo } from 'react';
import {
  useGardenStore,
  GRID_COLS,
  GRID_ROWS,
  BLOCKED_CELLS,
  FLOWER_CATALOG,
} from '../stores/useGardenStore';
import type { FlowerType } from '../types';

// ===========================================
// COTTAGE COMPONENT
// ===========================================

function Cottage() {
  return (
    <div
      className="absolute top-2 left-1/2 -translate-x-1/2 z-10"
      style={{ width: '100px', height: '85px', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.15))' }}
    >
      {/* Chimney */}
      <div
        className="absolute top-[4px] right-[20px] w-3 h-5 rounded-sm"
        style={{ background: 'linear-gradient(180deg, #8B7355 0%, #6B5344 100%)' }}
      />
      {/* Roof */}
      <div
        className="absolute top-0 left-0 right-0 h-10"
        style={{
          background: 'linear-gradient(180deg, #C67B5C 0%, #A66B4F 100%)',
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
        }}
      />
      {/* Body */}
      <div
        className="absolute bottom-0 left-2 right-2 h-11 rounded border-2 border-bark/30"
        style={{ background: 'linear-gradient(180deg, #F5E6D3 0%, #E8D4B8 100%)' }}
      >
        {/* Windows */}
        <div
          className="absolute left-2 bottom-3 w-4 h-4 rounded-sm border border-bark/30"
          style={{ background: 'linear-gradient(135deg, #A5C4D4 0%, #7BA3B8 100%)' }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute w-full h-px bg-bark/30" />
            <div className="absolute w-px h-full bg-bark/30" />
          </div>
        </div>
        <div
          className="absolute right-2 bottom-3 w-4 h-4 rounded-sm border border-bark/30"
          style={{ background: 'linear-gradient(135deg, #A5C4D4 0%, #7BA3B8 100%)' }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute w-full h-px bg-bark/30" />
            <div className="absolute w-px h-full bg-bark/30" />
          </div>
        </div>
        {/* Door */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-6 rounded-t-lg"
          style={{ background: 'linear-gradient(180deg, #5D4E37 0%, #4A3F2D 100%)' }}
        >
          <div className="absolute right-1 top-1/2 w-1 h-1 rounded-full bg-clay" />
        </div>
      </div>
    </div>
  );
}

// ===========================================
// FLOWER PALETTE COMPONENT
// ===========================================

function FlowerPalette() {
  const flowers = useGardenStore((s) => s.flowers);
  const placedFlowers = useGardenStore((s) => s.placedFlowers);
  const selectedFlowerType = useGardenStore((s) => s.selectedFlowerType);
  const selectFlowerType = useGardenStore((s) => s.selectFlowerType);
  const setMode = useGardenStore((s) => s.setMode);

  const placedFlowerIds = useMemo(
    () => new Set(placedFlowers.map((p) => p.flowerId)),
    [placedFlowers]
  );

  const availableByType = useMemo(() => {
    const counts: Partial<Record<FlowerType, number>> = {};
    flowers.forEach((f) => {
      if (!placedFlowerIds.has(f.id)) {
        counts[f.type] = (counts[f.type] || 0) + 1;
      }
    });
    return counts;
  }, [flowers, placedFlowerIds]);

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
            <span className="text-2xl">{FLOWER_CATALOG[selectedFlowerType].emoji}</span>
            <span className="text-sage font-semibold">×{availableByType[selectedFlowerType]}</span>
          </div>
        )}
      </div>

      {/* Flower Grid */}
      <div className="px-4 py-4 max-h-[200px] overflow-y-auto pb-20">
        {totalAvailable === 0 ? (
          <p className="text-center text-bark/50 text-sm py-4">
            Complete rhythms to earn flowers!
          </p>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {(Object.keys(FLOWER_CATALOG) as FlowerType[]).map((type) => {
              const count = availableByType[type] || 0;
              if (count === 0) return null;

              const isSelected = selectedFlowerType === type;

              return (
                <button
                  key={type}
                  onClick={() => handleSelect(type)}
                  className={`flex flex-col items-center justify-center rounded-xl transition-all duration-200 border-2 p-2 ${
                    isSelected
                      ? 'border-sage bg-sage/20 scale-105'
                      : 'border-transparent bg-parchment hover:bg-linen hover:scale-105'
                  }`}
                >
                  <span className="text-2xl leading-none">{FLOWER_CATALOG[type].emoji}</span>
                  <span className="text-[10px] text-bark/60 font-semibold mt-1">×{count}</span>
                  <span className="text-[9px] text-bark/40 mt-0.5 leading-tight text-center">{FLOWER_CATALOG[type].label}</span>
                </button>
              );
            })}
          </div>
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
    const placedId = e.dataTransfer.getData('text/plain');
    const key = `${col},${row}`;

    if (BLOCKED_CELLS.has(key)) {
      showToast("Can't plant there! 🏠");
      return;
    }

    const existingFlower = getFlowerAt(col, row);
    if (existingFlower && existingFlower.id !== placedId) {
      showToast('Spot occupied!');
      return;
    }

    if (moveFlower(placedId, col, row)) {
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
            const emoji = FLOWER_CATALOG[selectedFlowerType].emoji;
            showToast(`Planted ${emoji}!`);
          }
          break;

        case 'remove':
          if (!existingFlower) {
            showToast('No flower there!');
            return;
          }
          const emoji = FLOWER_CATALOG[existingFlower.flowerType].emoji;
          removeFlowerFromGrid(existingFlower.id);
          showToast(`${emoji} removed`);
          break;

        default:
          // In place mode, clicking on empty spots places flowers
          if (!existingFlower && selectedFlowerType) {
            if (getUnplacedByType(selectedFlowerType).length > 0) {
              if (placeFlower(col, row)) {
                const emoji = FLOWER_CATALOG[selectedFlowerType].emoji;
                showToast(`Planted ${emoji}!`);
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
            w-10 h-10 rounded transition-all duration-150
            ${isBlocked ? 'cursor-not-allowed' : 'cursor-pointer'}
            ${!isBlocked && !placedFlower && !isDraggingFrom ? 'hover:bg-sage/30 active:bg-sage/40' : ''}
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
                text-[26px] drop-shadow-md transition-transform duration-200
                cursor-grab active:cursor-grabbing select-none
                ${isDragging ? 'opacity-50 animate-wiggle' : 'hover:scale-110'}
                ${!isDragging ? 'animate-plant-grow' : ''}
              `}
            >
              {FLOWER_CATALOG[placedFlower.flowerType].emoji}
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

      {/* Garden Area */}
      <div className="relative mx-4">
        {/* Garden bed background */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background:
              'linear-gradient(180deg, #C8D9A0 0%, #A8C978 50%, #8BB858 100%)',
          }}
        />

        {/* Garden bed border/frame */}
        <div
          className="relative rounded-2xl p-4 pt-24"
          style={{
            background:
              'repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(107, 83, 68, 0.06) 39px, rgba(107, 83, 68, 0.06) 40px), repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(107, 83, 68, 0.06) 39px, rgba(107, 83, 68, 0.06) 40px)',
          }}
        >
          <Cottage />

          {/* Grid */}
          <div
            className="mx-auto"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${GRID_COLS}, 40px)`,
              gridTemplateRows: `repeat(${GRID_ROWS}, 40px)`,
              width: 'fit-content',
            }}
          >
            {gridCells}
          </div>
        </div>

        {/* Mode Indicator */}
        <div className="absolute top-28 left-6 bg-cream/90 px-3 py-1.5 rounded-full text-xs font-semibold text-sage shadow-sm flex items-center gap-1.5 z-10">
          <span className="w-2 h-2 rounded-full bg-sage animate-pulse" />
          <span>{modeLabels[mode] || modeLabels.place}</span>
        </div>

        {/* Action Buttons */}
        <div className="absolute top-28 right-6 flex flex-col gap-2 z-10">
          <button
            onClick={() => setMode('remove')}
            className={`w-10 h-10 rounded-full shadow-md flex items-center justify-center text-lg transition-all duration-200 hover:scale-110 ${
              mode === 'remove' ? 'bg-terracotta text-cream' : 'bg-cream/90'
            }`}
            title="Remove"
          >
            🗑️
          </button>
          <button
            onClick={handleClear}
            className="w-10 h-10 rounded-full bg-cream/90 shadow-md flex items-center justify-center text-lg transition-all duration-200 hover:scale-110"
            title="Clear all"
          >
            🔄
          </button>
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
      <FlowerPalette />

      {/* Toast */}
      {toast && <Toast message={toast} />}
    </div>
  );
}
