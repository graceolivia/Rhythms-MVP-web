import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { useChildStore } from '../stores/useChildStore';
import { useNapStore } from '../stores/useNapStore';
import { useCareBlockStore } from '../stores/useCareBlockStore';
import { useTaskStore, getTaskDisplayTitle } from '../stores/useTaskStore';
import { useResetSeedData } from '../hooks/useResetSeedData';
import { useResetAppData } from '../hooks/useResetAppData';
import { useAuth } from '../contexts/AuthContext';
import { useSync } from '../hooks/useSync';
import { HabitBlockSection } from '../components/settings/HabitBlockSection';
import { DEV_MODE } from '../config/devMode';
import type { ChildColor, CareStatus, CareBlockType, RecurrenceRule } from '../types';

const COLOR_OPTIONS: { value: ChildColor; label: string; bgClass: string; borderClass: string }[] = [
  { value: 'lavender', label: 'Lavender', bgClass: 'bg-lavender', borderClass: 'border-lavender' },
  { value: 'sage', label: 'Sage', bgClass: 'bg-sage', borderClass: 'border-sage' },
  { value: 'skyblue', label: 'Sky Blue', bgClass: 'bg-skyblue', borderClass: 'border-skyblue' },
  { value: 'dustyrose', label: 'Dusty Rose', bgClass: 'bg-dustyrose', borderClass: 'border-dustyrose' },
  { value: 'terracotta', label: 'Terracotta', bgClass: 'bg-terracotta', borderClass: 'border-terracotta' },
  { value: 'clay', label: 'Clay', bgClass: 'bg-clay', borderClass: 'border-clay' },
];

const CARE_STATUS_DISPLAY: Record<CareStatus, { label: string; icon: string }> = {
  home: { label: 'Home', icon: '🏠' },
  away: { label: 'Away', icon: '🚗' },
  asleep: { label: 'Asleep', icon: '😴' },
};

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const BLOCK_TYPE_OPTIONS: { value: CareBlockType; label: string; icon: string; description: string }[] = [
  { value: 'childcare', label: 'Childcare', icon: '🏫', description: 'Daycare, school, etc. (I\'m free)' },
  { value: 'babysitter', label: 'Babysitter', icon: '👤', description: 'Sitter at home (I\'m free)' },
  { value: 'appointment', label: 'Appointment', icon: '📅', description: 'Doctor, etc. with kid (I\'m busy)' },
  { value: 'activity', label: 'Activity', icon: '⚽', description: 'Class, sports, etc. (I\'m busy)' },
  { value: 'sleep', label: 'Sleep', icon: '😴', description: 'Nap or nighttime (I have quiet time)' },
];

const RECURRENCE_OPTIONS: { value: 'one-off' | RecurrenceRule; label: string }[] = [
  { value: 'one-off', label: 'One-time event' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'weekly', label: 'Weekly' },
];

export function Settings() {
  const children = useChildStore((state) => state.children);
  const userWakeTime = useChildStore((state) => state.userWakeTime);
  const userBedtime = useChildStore((state) => state.userBedtime);
  const setUserSleepTimes = useChildStore((state) => state.setUserSleepTimes);
  const addChild = useChildStore((state) => state.addChild);
  const updateChild = useChildStore((state) => state.updateChild);
  const removeChild = useChildStore((state) => state.removeChild);
  const getChild = useChildStore((state) => state.getChild);
  const napSchedules = useNapStore((state) => state.napSchedules);
  const addNapSchedule = useNapStore((state) => state.addNapSchedule);
  const updateNapSchedule = useNapStore((state) => state.updateNapSchedule);
  const removeNapSchedule = useNapStore((state) => state.removeNapSchedule);
  const careBlocks = useCareBlockStore((state) => state.blocks);
  const addCareBlock = useCareBlockStore((state) => state.addBlock);
  const updateCareBlock = useCareBlockStore((state) => state.updateBlock);
  const removeCareBlock = useCareBlockStore((state) => state.removeBlock);
  const getLeaveByTime = useCareBlockStore((state) => state.getLeaveByTime);
  const tasks = useTaskStore((state) => state.tasks);
  const ensureChildcareTasksExist = useTaskStore((state) => state.ensureChildcareTasksExist);
  const resetSeedData = useResetSeedData();
  const resetAppData = useResetAppData();

  // Auth and sync
  const { user, isLoading: authLoading, isConfigured, signInWithEmail, signOut } = useAuth();
  const { pushToCloud, pullFromCloud, isSyncing, lastSyncTime, syncError } = useSync();
  const [loginEmail, setLoginEmail] = useState('');
  const [loginStatus, setLoginStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleLogin = async () => {
    if (!loginEmail.trim()) return;
    setLoginStatus('sending');
    const { error } = await signInWithEmail(loginEmail.trim());
    setLoginStatus(error ? 'error' : 'sent');
  };

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

  const syncCareBlockTasks = (block: Pick<typeof careBlocks[number], 'childIds' | 'name' | 'blockType' | 'startTime' | 'endTime' | 'daysOfWeek' | 'recurrence' | 'isActive'>) => {
    if (block.blockType !== 'childcare' && block.blockType !== 'babysitter') return;

    let days = block.daysOfWeek ?? [];
    if (days.length === 0) {
      switch (block.recurrence) {
        case 'daily': days = [0,1,2,3,4,5,6]; break;
        case 'weekdays': days = [1,2,3,4,5]; break;
        case 'weekends': days = [0,6]; break;
        default:
          if (typeof block.recurrence === 'object' && block.recurrence.type === 'specific-days') {
            days = block.recurrence.days;
          }
      }
    }
    if (days.length === 0) return; // one-off blocks don't get recurring tasks

    for (const childId of block.childIds) {
      ensureChildcareTasksExist({
        id: `careblock-${childId}`,
        childId,
        name: block.name,
        daysOfWeek: days,
        dropoffTime: block.startTime,
        pickupTime: block.endTime,
        isActive: block.isActive,
      });
    }
  };

  const handleAddCareBlock = (childId: string) => {
    const blockData = {
      childIds: [childId],
      name: 'New Care Block',
      blockType: 'childcare' as CareBlockType,
      recurrence: 'weekdays' as const,
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: '08:30',
      endTime: '16:00',
      isActive: true,
    };
    addCareBlock(blockData);
    syncCareBlockTasks(blockData);
  };

  const handleUpdateCareBlock = (block: typeof careBlocks[number], updates: Parameters<typeof updateCareBlock>[1]) => {
    updateCareBlock(block.id, updates);
    syncCareBlockTasks({ ...block, ...updates });
  };

  const toggleCareBlockDay = (block: typeof careBlocks[number], day: number) => {
    const days = block.daysOfWeek ?? [];
    const newDays = days.includes(day)
      ? days.filter((d) => d !== day)
      : [...days, day].sort();
    handleUpdateCareBlock(block, { daysOfWeek: newDays });
  };

  const toggleCareBlockChild = (block: typeof careBlocks[number], childId: string) => {
    const newChildIds = block.childIds.includes(childId)
      ? block.childIds.filter((id) => id !== childId)
      : [...block.childIds, childId];
    if (newChildIds.length > 0) {
      handleUpdateCareBlock(block, { childIds: newChildIds });
    }
  };

  const handleResetApp = () => {
    const confirmed = window.confirm(
      'This will clear all local data and restart onboarding. This cannot be undone. Continue?'
    );
    if (!confirmed) return;
    resetAppData();
    window.location.assign('/onboarding');
  };

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-lg mx-auto p-4 pb-24">
      <header className="mb-6">
        <h1 className="font-display text-2xl text-bark">Settings</h1>
        <p className="text-bark/60 text-sm">Customize your rhythm</p>
      </header>

      {/* Your Schedule Section */}
      <section className="mb-8">
        <h2 className="font-display text-lg text-bark mb-4">Your Schedule</h2>
        <div className="bg-parchment rounded-xl p-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-bark/50 block mb-1">Wake time</label>
              <input
                type="time"
                value={userWakeTime}
                onChange={(e) => setUserSleepTimes(e.target.value, userBedtime)}
                className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-bark/50 block mb-1">Bedtime</label>
              <input
                type="time"
                value={userBedtime}
                onChange={(e) => setUserSleepTimes(userWakeTime, e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage"
              />
            </div>
          </div>
        </div>
      </section>

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

                {/* Care Status (display only - updated by completing tasks) */}
                <div className="border-t border-bark/10 pt-3 mt-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-bark/50">Current Status</label>
                    <span className="text-sm font-medium text-bark">
                      {CARE_STATUS_DISPLAY[child.careStatus ?? 'home'].icon}{' '}
                      {CARE_STATUS_DISPLAY[child.careStatus ?? 'home'].label}
                    </span>
                  </div>
                  <p className="text-xs text-bark/40 mt-1">
                    Updated when you complete dropoff/pickup tasks
                  </p>
                </div>

                {/* Nap Schedules (only for napping-age children) */}
                {child.isNappingAge && (
                  <div className="border-t border-bark/10 pt-3 mt-3">
                    <label className="text-xs text-bark/50 block mb-2">Nap Schedule</label>
                    {napSchedules
                      .filter((nap) => nap.childId === child.id)
                      .sort((a, b) => a.napNumber - b.napNumber)
                      .map((nap) => (
                        <div key={nap.id} className="mb-3">
                          <div className="flex items-center gap-2 mb-1">
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
                          <label className="flex items-center gap-1.5 ml-12 text-xs text-bark/60 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={nap.autoTrack !== false}
                              onChange={(e) => updateNapSchedule(nap.id, { autoTrack: e.target.checked })}
                              className="rounded border-bark/20"
                            />
                            Auto-track this nap
                          </label>
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

      {/* Care Blocks Section */}
      <section className="mb-8">
        <h2 className="font-display text-lg text-bark mb-2">Care Blocks</h2>
        <p className="text-bark/60 text-sm mb-4">
          Schedule when children are away, at activities, or asleep. This helps suggest the right tasks at the right time.
        </p>

        <div className="space-y-4">
          {careBlocks.length === 0 ? (
            <p className="text-bark/50 text-sm py-4 text-center bg-parchment rounded-xl">
              No care blocks yet. Add one to get started.
            </p>
          ) : (
            careBlocks.map((block) => (
              <div key={block.id} className="bg-parchment rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {BLOCK_TYPE_OPTIONS.find((t) => t.value === block.blockType)?.icon ?? '📅'}
                    </span>
                    <input
                      type="text"
                      value={block.name}
                      onChange={(e) => handleUpdateCareBlock(block, { name: e.target.value })}
                      className="font-medium text-bark bg-transparent border-b border-transparent focus:border-bark/20 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => removeCareBlock(block.id)}
                    className="text-bark/40 hover:text-bark text-sm"
                  >
                    Remove
                  </button>
                </div>

                {/* Block type selector */}
                <div className="mb-3">
                  <label className="text-xs text-bark/50 block mb-1">Type</label>
                  <select
                    value={block.blockType}
                    onChange={(e) => handleUpdateCareBlock(block, { blockType: e.target.value as CareBlockType })}
                    className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage text-sm"
                  >
                    {BLOCK_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.icon} {opt.label} - {opt.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Children affected */}
                {children.length > 1 && (
                  <div className="mb-3">
                    <label className="text-xs text-bark/50 block mb-1">Children</label>
                    <div className="flex flex-wrap gap-2">
                      {children.map((child) => {
                        const isSelected = block.childIds.includes(child.id);
                        return (
                          <button
                            key={child.id}
                            onClick={() => toggleCareBlockChild(block, child.id)}
                            className={`px-3 py-1 rounded-full text-sm transition-all ${
                              isSelected
                                ? 'bg-sage text-cream'
                                : 'bg-cream text-bark/50 border border-bark/20'
                            }`}
                          >
                            {child.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recurrence */}
                <div className="mb-3">
                  <label className="text-xs text-bark/50 block mb-1">Recurrence</label>
                  <select
                    value={block.recurrence === 'one-off' ? 'one-off' : (typeof block.recurrence === 'string' ? block.recurrence : 'daily')}
                    onChange={(e) => {
                      const value = e.target.value as 'one-off' | RecurrenceRule;
                      handleUpdateCareBlock(block, {
                        recurrence: value,
                        oneOffDate: value === 'one-off' ? format(addDays(new Date(), 1), 'yyyy-MM-dd') : undefined,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage text-sm"
                  >
                    {RECURRENCE_OPTIONS.map((opt) => (
                      <option key={String(opt.value)} value={String(opt.value)}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* One-off date picker */}
                {block.recurrence === 'one-off' && (
                  <div className="mb-3">
                    <label className="text-xs text-bark/50 block mb-1">Date</label>
                    <input
                      type="date"
                      value={block.oneOffDate || ''}
                      onChange={(e) => handleUpdateCareBlock(block, { oneOffDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage text-sm"
                    />
                  </div>
                )}

                {/* Days of week (for recurring) */}
                {block.recurrence !== 'one-off' && (
                  <div className="mb-3">
                    <label className="text-xs text-bark/50 block mb-1">Days</label>
                    <div className="flex items-center gap-1">
                      {DAY_LABELS.map((label, dayIndex) => (
                        <button
                          key={dayIndex}
                          onClick={() => toggleCareBlockDay(block, dayIndex)}
                          className={`w-7 h-7 rounded-full text-xs font-medium transition-all ${
                            block.daysOfWeek?.includes(dayIndex)
                              ? 'bg-sage text-cream'
                              : 'bg-cream text-bark/40 hover:bg-cream/80'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Time range */}
                <div className="flex gap-3 mb-3">
                  <div className="flex-1">
                    <label className="text-xs text-bark/50 block mb-1">Start</label>
                    <input
                      type="time"
                      value={block.startTime}
                      onChange={(e) => handleUpdateCareBlock(block, { startTime: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-bark/50 block mb-1">End</label>
                    <input
                      type="time"
                      value={block.endTime}
                      onChange={(e) => handleUpdateCareBlock(block, { endTime: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage text-sm"
                    />
                  </div>
                </div>

                {/* Travel time (optional) */}
                <div className="border-t border-bark/10 pt-3">
                  <label className="text-xs text-bark/50 block mb-2">Travel time (optional)</label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-bark/40 block mb-1">Before (mins)</label>
                      <input
                        type="number"
                        min="0"
                        max="120"
                        value={block.travelTimeBefore || ''}
                        onChange={(e) => handleUpdateCareBlock(block, {
                          travelTimeBefore: e.target.value ? parseInt(e.target.value) : undefined
                        })}
                        placeholder="0"
                        className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-bark/40 block mb-1">After (mins)</label>
                      <input
                        type="number"
                        min="0"
                        max="120"
                        value={block.travelTimeAfter || ''}
                        onChange={(e) => handleUpdateCareBlock(block, {
                          travelTimeAfter: e.target.value ? parseInt(e.target.value) : undefined
                        })}
                        placeholder="0"
                        className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage text-sm"
                      />
                    </div>
                  </div>
                  {block.travelTimeBefore && (
                    <p className="text-xs text-sage mt-2">
                      Leave by: {getLeaveByTime(block)}
                    </p>
                  )}
                </div>

                {/* Active toggle */}
                <div className="border-t border-bark/10 pt-3 mt-3">
                  <label className="flex items-center gap-2 text-sm text-bark/70 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={block.isActive}
                      onChange={(e) => handleUpdateCareBlock(block, { isActive: e.target.checked })}
                      className="rounded border-bark/20"
                    />
                    Active
                  </label>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          onClick={() => handleAddCareBlock(children[0]?.id || '')}
          disabled={children.length === 0}
          className="w-full mt-4 py-2 border-2 border-dashed border-bark/20 rounded-xl text-bark/50 hover:border-bark/40 hover:text-bark/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Add Care Block
        </button>
        {children.length === 0 && (
          <p className="text-xs text-bark/40 text-center mt-2">Add a child first to create care blocks</p>
        )}
      </section>

      {/* Habit Blocks Section */}
      <HabitBlockSection />

      {/* Cloud Sync Section */}
      <section className="mb-8">
        <h2 className="font-display text-lg text-bark mb-4">Cloud Sync</h2>

        {!isConfigured ? (
          <div className="bg-parchment rounded-xl p-4">
            <p className="text-sm text-bark/70 mb-2">
              Cloud sync is not configured. Add Supabase credentials to your .env file to enable.
            </p>
            <code className="text-xs text-bark/50 block bg-cream p-2 rounded">
              VITE_SUPABASE_URL=...<br />
              VITE_SUPABASE_ANON_KEY=...
            </code>
          </div>
        ) : authLoading ? (
          <div className="bg-parchment rounded-xl p-4 text-center">
            <p className="text-bark/60">Loading...</p>
          </div>
        ) : !user ? (
          <div className="bg-parchment rounded-xl p-4">
            <p className="text-sm text-bark/70 mb-3">
              Sign in to sync your data across devices.
            </p>
            <div className="flex gap-2 mb-2">
              <input
                type="email"
                placeholder="Enter your email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="flex-1 px-3 py-2 rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage text-sm"
                disabled={loginStatus === 'sending'}
              />
              <button
                onClick={handleLogin}
                disabled={loginStatus === 'sending' || !loginEmail.trim()}
                className="px-4 py-2 rounded-lg bg-sage text-cream hover:bg-sage/90 transition-colors text-sm disabled:opacity-50"
              >
                {loginStatus === 'sending' ? '...' : 'Sign In'}
              </button>
            </div>
            {loginStatus === 'sent' && (
              <p className="text-sm text-sage">Check your email for a magic link!</p>
            )}
            {loginStatus === 'error' && (
              <p className="text-sm text-terracotta">Something went wrong. Try again?</p>
            )}
          </div>
        ) : (
          <div className="bg-parchment rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-bark font-medium">{user.email}</p>
                <p className="text-xs text-bark/50">Signed in</p>
              </div>
              <button
                onClick={signOut}
                className="text-xs text-bark/50 hover:text-bark underline"
              >
                Sign out
              </button>
            </div>

            <div className="flex gap-2 mb-3">
              <button
                onClick={pushToCloud}
                disabled={isSyncing}
                className="flex-1 py-2 rounded-lg bg-sage text-cream hover:bg-sage/90 transition-colors text-sm disabled:opacity-50"
              >
                {isSyncing ? 'Syncing...' : 'Push to Cloud'}
              </button>
              <button
                onClick={pullFromCloud}
                disabled={isSyncing}
                className="flex-1 py-2 rounded-lg bg-skyblue text-cream hover:bg-skyblue/90 transition-colors text-sm disabled:opacity-50"
              >
                {isSyncing ? 'Syncing...' : 'Pull from Cloud'}
              </button>
            </div>

            {syncError && (
              <p className="text-sm text-terracotta mb-2">{syncError}</p>
            )}

            {lastSyncTime && (
              <p className="text-xs text-bark/50">
                Last synced: {format(lastSyncTime, 'h:mm a')}
              </p>
            )}
          </div>
        )}
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

      <section className="mb-8">
        <h2 className="font-display text-lg text-bark mb-4">Reset App</h2>
        <button
          onClick={handleResetApp}
          className="w-full py-2 rounded-xl bg-bark text-cream hover:bg-bark/90 transition-colors"
        >
          Clear Local Data &amp; Restart Onboarding
        </button>
        <p className="text-xs text-bark/50 mt-2">
          Removes all stored data and restarts onboarding without seed data.
        </p>
      </section>
      </div>
    </div>
  );
}
