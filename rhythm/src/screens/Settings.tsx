import { useChildStore } from '../stores/useChildStore';
import type { ChildColor } from '../types';

const COLOR_OPTIONS: { value: ChildColor; label: string; bgClass: string; borderClass: string }[] = [
  { value: 'lavender', label: 'Lavender', bgClass: 'bg-lavender', borderClass: 'border-lavender' },
  { value: 'sage', label: 'Sage', bgClass: 'bg-sage', borderClass: 'border-sage' },
  { value: 'skyblue', label: 'Sky Blue', bgClass: 'bg-skyblue', borderClass: 'border-skyblue' },
  { value: 'dustyrose', label: 'Dusty Rose', bgClass: 'bg-dustyrose', borderClass: 'border-dustyrose' },
  { value: 'terracotta', label: 'Terracotta', bgClass: 'bg-terracotta', borderClass: 'border-terracotta' },
  { value: 'clay', label: 'Clay', bgClass: 'bg-clay', borderClass: 'border-clay' },
];

export function Settings() {
  const children = useChildStore((state) => state.children);
  const addChild = useChildStore((state) => state.addChild);
  const updateChild = useChildStore((state) => state.updateChild);
  const removeChild = useChildStore((state) => state.removeChild);

  const handleAddChild = () => {
    addChild({
      name: '',
      birthdate: '',
      isNappingAge: true,
      color: 'lavender',
    });
  };

  return (
    <div className="min-h-screen bg-cream p-4 pb-24">
      <header className="mb-6">
        <h1 className="font-display text-2xl text-bark">Settings</h1>
        <p className="text-bark/60 text-sm">Customize your rhythm</p>
      </header>

      {/* Children Section */}
      <section className="mb-8">
        <h2 className="font-display text-lg text-bark mb-4">Your Children</h2>

        <div className="space-y-4 mb-4">
          {children.length === 0 ? (
            <p className="text-bark/50 text-sm py-4 text-center">
              No children added yet.
            </p>
          ) : (
            children.map((child, index) => (
              <div key={child.id} className="bg-parchment rounded-xl p-4">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-sm text-bark/50">Child {index + 1}</span>
                  <button
                    onClick={() => removeChild(child.id)}
                    className="text-bark/40 hover:text-bark text-sm"
                  >
                    Remove
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Name"
                  value={child.name}
                  onChange={(e) => updateChild(child.id, { name: e.target.value })}
                  className="w-full mb-3 px-3 py-2 rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage"
                />
                <input
                  type="date"
                  value={child.birthdate}
                  onChange={(e) => updateChild(child.id, { birthdate: e.target.value })}
                  className="w-full mb-3 px-3 py-2 rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage"
                />

                {/* Color picker */}
                <div className="mb-3">
                  <label className="block text-sm text-bark/70 mb-2">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => updateChild(child.id, { color: color.value })}
                        className={`w-8 h-8 rounded-full ${color.bgClass} border-2 transition-all ${
                          child.color === color.value
                            ? 'border-bark scale-110 shadow-md'
                            : 'border-transparent hover:scale-105'
                        }`}
                        title={color.label}
                        aria-label={color.label}
                      />
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-bark/70">
                  <input
                    type="checkbox"
                    checked={child.isNappingAge}
                    onChange={(e) => updateChild(child.id, { isNappingAge: e.target.checked })}
                    className="rounded border-bark/20"
                  />
                  Still naps
                </label>
              </div>
            ))
          )}
        </div>

        <button
          onClick={handleAddChild}
          className="w-full py-2 border-2 border-dashed border-bark/20 rounded-xl text-bark/50 hover:border-bark/40 hover:text-bark/70 transition-colors"
        >
          + Add Child
        </button>
      </section>
    </div>
  );
}
