import { useState } from 'react';
import { useHabitBlockStore } from '../../stores/useHabitBlockStore';
import { useChildStore } from '../../stores/useChildStore';
import { BlockEditor } from './BlockEditor';

export function HabitBlockSection() {
  const blocks = useHabitBlockStore((s) => s.blocks);
  const addBlock = useHabitBlockStore((s) => s.addBlock);
  const removeBlock = useHabitBlockStore((s) => s.removeBlock);
  const seedDefaultBlocks = useHabitBlockStore((s) => s.seedDefaultBlocks);
  const children = useChildStore((s) => s.children);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  const editingBlock = editingBlockId ? blocks.find((b) => b.id === editingBlockId) : null;

  const handleAddBlock = () => {
    const id = addBlock({
      name: 'New Block',
      emoji: '📋',
      anchor: { type: 'time', time: '08:00' },
      items: [],
      recurrence: 'daily',
      isActive: true,
    });
    setEditingBlockId(id);
  };

  const handleSeedDefaults = () => {
    if (blocks.length > 0) {
      const confirmed = window.confirm(
        'This will add suggested blocks alongside your existing ones. Continue?'
      );
      if (!confirmed) return;
    }
    seedDefaultBlocks(children.map((c) => c.id));
  };

  const handleRemoveBlock = (id: string, name: string) => {
    const confirmed = window.confirm(`Remove "${name}" block?`);
    if (!confirmed) return;
    removeBlock(id);
  };

  return (
    <section className="mb-8">
      <h2 className="font-display text-lg text-bark mb-2">Habit Blocks</h2>
      <p className="text-bark/60 text-sm mb-4">
        Group your tasks into time blocks. When a block is active, its tasks appear front and center.
      </p>

      <div className="space-y-3 mb-4">
        {blocks.length === 0 ? (
          <div className="text-center py-6 bg-parchment rounded-xl">
            <p className="text-bark/50 text-sm mb-3">No blocks yet.</p>
            <button
              onClick={handleSeedDefaults}
              className="text-sm text-sage hover:text-sage/80 underline"
            >
              Load suggested defaults
            </button>
          </div>
        ) : (
          blocks.map((block) => (
            <div
              key={block.id}
              className={`bg-parchment rounded-xl p-4 ${!block.isActive ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setEditingBlockId(block.id)}
                  className="flex items-center gap-2 text-left flex-1"
                >
                  <span className="text-lg">{block.emoji || '📋'}</span>
                  <div>
                    <h3 className="font-medium text-bark text-sm">{block.name}</h3>
                    <p className="text-xs text-bark/40">
                      {block.anchor.type === 'time' ? block.anchor.time : 'Event-triggered'}
                      {' · '}
                      {block.items.length} item{block.items.length !== 1 ? 's' : ''}
                      {!block.isActive && ' · Inactive'}
                    </p>
                  </div>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingBlockId(block.id)}
                    className="text-bark/30 hover:text-bark/60 p-1"
                    aria-label="Edit block"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleRemoveBlock(block.id, block.name)}
                    className="text-bark/30 hover:text-bark/60 p-1"
                    aria-label="Remove block"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleAddBlock}
          className="flex-1 py-2 border-2 border-dashed border-bark/20 rounded-xl text-bark/50 hover:border-bark/40 hover:text-bark/70 transition-colors text-sm"
        >
          + Add Block
        </button>
        {blocks.length > 0 && (
          <button
            onClick={handleSeedDefaults}
            className="py-2 px-3 text-xs text-sage hover:text-sage/80 transition-colors"
          >
            Load Defaults
          </button>
        )}
      </div>

      {editingBlock && (
        <BlockEditor
          block={editingBlock}
          onClose={() => setEditingBlockId(null)}
        />
      )}
    </section>
  );
}
