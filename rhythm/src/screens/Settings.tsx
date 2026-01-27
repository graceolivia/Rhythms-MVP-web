import { useChildStore } from '../stores/useChildStore';
import { useNapStore } from '../stores/useNapStore';
import { useTaskStore, getTaskDisplayTitle } from '../stores/useTaskStore';
import { useResetSeedData } from '../hooks/useResetSeedData';
import { DEV_MODE } from '../config/devMode';
import type { ChildColor, CareStatus } from '../types';

const COLOR_OPTIONS: { value: ChildColor; label: string; bgClass: string; borderClass: string }[] = [
  { value: 'lavender', label: 'Lavender', bgClass: 'bg-lavender', borderClass: 'border-lavender' },
  { value: 'sage', label: 'Sage', bgClass: 'bg-sage', borderClass: 'border-sage' },
  { value: 'skyblue', label: 'Sky Blue', bgClass: 'bg-skyblue', borderClass: 'border-skyblue' },
  { value: 'dustyrose', label: 'Dusty Rose', bgClass: 'bg-dustyrose', borderClass: 'border-dustyrose' },
  { value: 'terracotta', label: 'Terracotta', bgClass: 'bg-terracotta', borderClass: 'border-terracotta' },
  { value: 'clay', label: 'Clay', bgClass: 'bg-clay', borderClass: 'border-clay' },
];

const CARE_STATUS_OPTIONS: { value: CareStatus; label: string; icon: string }[] = [
  { value: 'home', label: 'Home', icon: '🏠' },
  { value: 'away', label: 'Away', icon: '🚗' },
  { value: 'asleep', label: 'Asleep', icon: '😴' },
];

export function Settings() {
  const children = useChildStore((state) => state.children);
  const addChild = useChildStore((state) => state.addChild);
  const updateChild = useChildStore((state) => state.updateChild);
  const removeChild = useChildStore((state) => state.removeChild);
  const updateCareStatus = useChildStore((state) => state.updateCareStatus);
  const getChild = useChildStore((state) => state.getChild);
  const napSchedules = useNapStore((state) => state.napSchedules);
  const addNapSchedule = useNapStore((state) => state.addNapSchedule);
  const updateNapSchedule = useNapStore((state) => state.updateNapSchedule);
  const removeNapSchedule = useNapStore((state) => state.removeNapSchedule);
  const tasks = useTaskStore((state) => state.tasks);
  const resetSeedData = useResetSeedData();

  // Get linked tasks for a child
  const getLinkedTasks = (childId: string) => {
    return tasks.filter((task) => task.childId === childId);
  };

  const handleAddChild = () => {
    addChild({
      name: '',
      birthdate: '',
      isNappingAge: true,
      color: 'lavender',
      bedtime: '19:30',
      wakeTime: '07:00',
    });
  };

  const handleAddNap = (childId: string) => {
    const existingNaps = napSchedules.filter((n) => n.childId === childId);
    addNapSchedule({
      childId,
      napNumber: existingNaps.length + 1,
      typicalStart: '13:00',
      typicalEnd: '15:00',
    });
  };

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-lg mx-auto p-4 pb-24">
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

                <label className="flex items-center gap-2 text-sm text-bark/70 mb-3">
                  <input
                    type="checkbox"
                    checked={child.isNappingAge}
                    onChange={(e) => updateChild(child.id, { isNappingAge: e.target.checked })}
                    className="rounded border-bark/20"
                  />
                  Still naps
                </label>

                {/* Bedtime and Wake time */}
                <div className="flex gap-3 mb-3">
                  <div className="flex-1">
                    <label className="text-xs text-bark/50 block mb-1">Bedtime</label>
                    <input
                      type="time"
                      value={child.bedtime || '19:30'}
                      onChange={(e) => updateChild(child.id, { bedtime: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-bark/50 block mb-1">Wake time</label>
                    <input
                      type="time"
                      value={child.wakeTime || '07:00'}
                      onChange={(e) => updateChild(child.id, { wakeTime: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage"
                    />
                  </div>
                </div>

                {/* Care Status */}
                <div className="border-t border-bark/10 pt-3 mt-3">
                  <label className="text-xs text-bark/50 block mb-2">Care Status</label>
                  <div className="flex gap-2">
                    {CARE_STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => updateCareStatus(child.id, option.value)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm transition-all ${
                          (child.careStatus ?? 'home') === option.value
                            ? 'bg-sage/20 border border-sage text-sage font-medium'
                            : 'bg-cream border border-bark/10 text-bark/60 hover:border-bark/30'
                        }`}
                      >
                        <span className="mr-1">{option.icon}</span>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nap Schedules (only for napping-age children) */}
                {child.isNappingAge && (
                  <div className="border-t border-bark/10 pt-3 mt-3">
                    <label className="text-xs text-bark/50 block mb-2">Nap Schedule</label>
                    {napSchedules
                      .filter((nap) => nap.childId === child.id)
                      .sort((a, b) => a.napNumber - b.napNumber)
                      .map((nap) => (
                        <div key={nap.id} className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-bark/40 w-12">Nap {nap.napNumber}</span>
                          <input
                            type="time"
                            value={nap.typicalStart}
                            onChange={(e) => updateNapSchedule(nap.id, { typicalStart: e.target.value })}
                            className="flex-1 px-2 py-1 text-sm rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage"
                          />
                          <span className="text-bark/40 text-xs">to</span>
                          <input
                            type="time"
                            value={nap.typicalEnd}
                            onChange={(e) => updateNapSchedule(nap.id, { typicalEnd: e.target.value })}
                            className="flex-1 px-2 py-1 text-sm rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage"
                          />
                          <button
                            onClick={() => removeNapSchedule(nap.id)}
                            className="text-bark/40 hover:text-bark text-xs px-1"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    <button
                      onClick={() => handleAddNap(child.id)}
                      className="w-full py-1 border border-dashed border-bark/20 rounded-lg text-bark/50 hover:border-bark/40 text-xs"
                    >
                      + Add Nap
                    </button>
                  </div>
                )}

                {/* Linked Tasks */}
                {getLinkedTasks(child.id).length > 0 && (
                  <div className="border-t border-bark/10 pt-3 mt-3">
                    <label className="text-xs text-bark/50 block mb-2">Linked Tasks</label>
                    <div className="space-y-1">
                      {getLinkedTasks(child.id).map((task) => (
                        <div key={task.id} className="flex items-center gap-2 text-sm text-bark/70">
                          <span className="text-bark/40">•</span>
                          <span>{getTaskDisplayTitle(task, getChild)}</span>
                          {task.scheduledTime && (
                            <span className="text-xs text-bark/40 ml-auto">({task.scheduledTime})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

      {DEV_MODE && (
        <section className="mb-8">
          <h2 className="font-display text-lg text-bark mb-4">Dev Tools</h2>
          <button
            onClick={resetSeedData}
            className="w-full py-2 rounded-xl bg-terracotta text-cream hover:bg-terracotta/90 transition-colors"
          >
            Reset Seed Data
          </button>
          <p className="text-xs text-bark/50 mt-2">
            Clears local data and reloads seed content.
          </p>
        </section>
      )}
      </div>
    </div>
  );
}
