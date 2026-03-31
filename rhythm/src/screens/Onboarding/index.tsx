import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useChildStore } from '../../stores/useChildStore';
import { useTaskStore } from '../../stores/useTaskStore';
import { useCareBlockStore } from '../../stores/useCareBlockStore';
import { useGardenStore } from '../../stores/useGardenStore';
import { useAwayStore } from '../../stores/useAwayStore';
import { markAsInstalled } from '../../utils/storageHelpers';
import type { TaskTier, TaskCategory, RecurrenceRule, AvailabilityState } from '../../types';

// ============================================
// TYPES
// ============================================

interface OnboardingChild {
  id: string;
  name: string;
  birthdate: string;
  bedtime: string;
  wakeTime: string;
}

interface OnboardingChildcare {
  id: string;
  childId: string;
  childName: string;
  name: string;
  daysOfWeek: number[];
  dropoffTime: string;
  pickupTime: string;
  travelTime?: number;
}

interface OnboardingTask {
  id: string;
  title: string;
  tier: TaskTier;
  scheduledTime: string | null;
  category: TaskCategory;
  selected: boolean;
  recurrence?: RecurrenceRule;
  bestWhen?: AvailabilityState[];
  routineGroup?: string;
}

interface OnboardingData {
  children: OnboardingChild[];
  childcare: OnboardingChildcare[];
  fixedSchedule: OnboardingTask[];
  routines: OnboardingTask[];
  todos: OnboardingTask[];
}

type Step = 'welcome' | 'children' | 'only-child' | 'childcare' | 'task-intro' | 'fixed-schedule' | 'routines' | 'todos' | 'complete';

const STEPS: Step[] = ['welcome', 'children', 'only-child', 'childcare', 'task-intro', 'fixed-schedule', 'routines', 'todos', 'complete'];

// Steps shown as progress dots (only-child and task-intro are not their own dots)
const INDICATOR_STEPS = STEPS.filter((s) => s !== 'only-child' && s !== 'task-intro');

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const CHILDCARE_PRESETS = [
  { name: 'Daycare', dropoffTime: '08:30', pickupTime: '16:00', daysOfWeek: [1, 2, 3, 4, 5] },
  { name: 'Preschool', dropoffTime: '09:00', pickupTime: '12:00', daysOfWeek: [1, 2, 3, 4, 5] },
  { name: 'School', dropoffTime: '08:00', pickupTime: '15:00', daysOfWeek: [1, 2, 3, 4, 5] },
  { name: "Grandparent's", dropoffTime: '09:00', pickupTime: '17:00', daysOfWeek: [] },
];

// ============================================
// PRESET TASKS
// ============================================

const PRESET_FIXED_SCHEDULE: Omit<OnboardingTask, 'id' | 'selected'>[] = [
  { title: 'Morning wake up', tier: 'fixed-schedule', scheduledTime: '07:00', category: 'kids', routineGroup: 'morning' },
  { title: 'Breakfast', tier: 'fixed-schedule', scheduledTime: '08:00', category: 'meals', routineGroup: 'morning' },
  { title: 'Daycare/school dropoff', tier: 'fixed-schedule', scheduledTime: '08:30', category: 'kids', routineGroup: 'morning' },
  { title: 'Daycare/school pickup', tier: 'fixed-schedule', scheduledTime: '15:00', category: 'kids' },
  { title: 'Lunch', tier: 'fixed-schedule', scheduledTime: '12:00', category: 'meals' },
  { title: 'Dinner', tier: 'fixed-schedule', scheduledTime: '18:00', category: 'meals' },
  { title: 'Bedtime routine', tier: 'fixed-schedule', scheduledTime: '19:30', category: 'kids', routineGroup: 'bedtime' },
];

const PRESET_ROUTINES: Omit<OnboardingTask, 'id' | 'selected'>[] = [
  { title: 'Get everyone dressed', tier: 'routine', scheduledTime: null, category: 'kids', bestWhen: ['parenting'], routineGroup: 'morning' },
  { title: 'Afternoon snack', tier: 'routine', scheduledTime: null, category: 'meals', bestWhen: ['parenting'] },
  { title: 'Evening tidy up', tier: 'routine', scheduledTime: null, category: 'tidying', bestWhen: ['quiet'], routineGroup: 'bedtime' },
  { title: 'Load dishwasher', tier: 'routine', scheduledTime: null, category: 'kitchen' },
];

// Chore chip presets for the todos step
interface ChoreChip {
  id: string;
  title: string;
  category: TaskCategory;
  recurrence: RecurrenceRule;
  selected: boolean;
  frequency: 'daily' | 'weekly' | 'as-needed';
}

interface SelfCareChip {
  id: string;
  title: string;
  category: TaskCategory;
  bestWhen: AvailabilityState[];
  selected: boolean;
}

const CHORE_CHIP_PRESETS: Omit<ChoreChip, 'id' | 'selected' | 'frequency'>[] = [
  { title: 'Start laundry', category: 'laundry', recurrence: { type: 'specific-days', days: [1, 4] } },
  { title: 'Vacuum', category: 'cleaning', recurrence: 'weekly' },
  { title: 'Wipe counters', category: 'kitchen', recurrence: 'daily' },
  { title: 'Sweep floors', category: 'cleaning', recurrence: 'weekly' },
  { title: 'Take out trash', category: 'tidying', recurrence: 'weekly' },
  { title: 'Meal prep', category: 'meals', recurrence: 'weekly' },
  { title: 'Water plants', category: 'other', recurrence: 'weekly' },
];

const SELF_CARE_CHIP_PRESETS: Omit<SelfCareChip, 'id' | 'selected'>[] = [
  { title: 'Exercise', category: 'self-care', bestWhen: ['free'] },
  { title: 'Read / rest', category: 'self-care', bestWhen: ['quiet'] },
  { title: 'Focused work time', category: 'focus-work', bestWhen: ['quiet', 'free'] },
  { title: 'Fresh air', category: 'self-care', bestWhen: ['free'] },
  { title: 'Journalling', category: 'self-care', bestWhen: ['quiet'] },
];

// ============================================
// STEP COMPONENTS
// ============================================

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const mappedStep: Step = currentStep === 'only-child' ? 'children' : currentStep === 'task-intro' ? 'fixed-schedule' : currentStep;
  const currentIndex = INDICATOR_STEPS.indexOf(mappedStep);
  return (
    <div className="flex justify-center gap-1 mb-6">
      {INDICATOR_STEPS.slice(0, -1).map((step, i) => (
        <div
          key={step}
          className={`w-2 h-2 rounded-full transition-colors ${
            i <= currentIndex ? 'bg-sage' : 'bg-bark/20'
          }`}
        />
      ))}
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <div className="text-6xl mb-6">🌱</div>
      <h1 className="font-display text-3xl text-bark mb-4">Welcome to Rhythm</h1>
      <p className="text-bark/70 mb-8 leading-relaxed">
        A gentle guide through your days at home.
        <br />
        Let's set up your family's rhythm together.
      </p>
      <button
        onClick={onNext}
        className="w-full py-3 bg-sage text-cream rounded-xl font-medium hover:bg-sage/90 transition-colors"
      >
        Let's Begin
      </button>
    </div>
  );
}

function ChildrenStep({
  children,
  onChange,
  onNext,
  onBack,
  editingChildId,
}: {
  children: OnboardingChild[];
  onChange: (children: OnboardingChild[]) => void;
  onNext: () => void;
  onBack: () => void;
  editingChildId: string | null;
}) {
  const updateChild = (id: string, updates: Partial<OnboardingChild>) => {
    onChange(children.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const removeChild = (id: string) => {
    onChange(children.filter((c) => c.id !== id));
  };

  // Show only the editing child when adding another, or all children on first entry
  const visibleChildren = editingChildId
    ? children.filter((c) => c.id === editingChildId)
    : children;

  return (
    <div>
      <h2 className="font-display text-2xl text-bark mb-2">Your Children</h2>
      <p className="text-bark/60 text-sm mb-6">
        Who are you caring for at home?
      </p>

      <div className="space-y-4 mb-6">
        {visibleChildren.map((child) => {
          const childIndex = children.findIndex((c) => c.id === child.id);
          return (
            <div key={child.id} className="bg-parchment rounded-xl p-4">
              <div className="flex justify-between items-start mb-3">
                <span className="text-sm text-bark/50">Child {childIndex + 1}</span>
                {children.length > 1 && (
                  <button
                    onClick={() => removeChild(child.id)}
                    className="text-bark/40 hover:text-bark text-sm"
                  >
                    Remove
                  </button>
                )}
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

              {/* Night sleep */}
              <div className="flex gap-3 mb-3">
                <div className="flex-1">
                  <label className="text-xs text-bark/50 block mb-1">Wake time</label>
                  <input
                    type="time"
                    value={child.wakeTime}
                    onChange={(e) => updateChild(child.id, { wakeTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-bark/50 block mb-1">Bedtime</label>
                  <input
                    type="time"
                    value={child.bedtime}
                    onChange={(e) => updateChild(child.id, { bedtime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage"
                  />
                </div>
              </div>

            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-bark/20 text-bark rounded-xl font-medium hover:bg-parchment transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={children.length === 0 || children.some((c) => !c.name)}
          className="flex-1 py-3 bg-sage text-cream rounded-xl font-medium hover:bg-sage/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function OnlyChildStep({
  children,
  onNext,
  onAddAnother,
  onBack,
}: {
  children: OnboardingChild[];
  onNext: () => void;
  onAddAnother: () => void;
  onBack: () => void;
}) {
  const names = children.map((c) => c.name).filter(Boolean);
  const isMultiple = children.length > 1;

  return (
    <div>
      <h2 className="font-display text-2xl text-bark mb-4">
        {isMultiple ? 'Anyone else?' : `Is ${names[0] || 'your child'} your only child?`}
      </h2>

      {/* Prominent name chips */}
      <div className="flex flex-wrap gap-2 mb-8">
        {names.map((name, i) => (
          <span
            key={i}
            className="bg-parchment rounded-full px-4 py-2 font-medium text-bark text-base"
          >
            {name}
          </span>
        ))}
      </div>

      <div className="space-y-3 mb-6">
        <button
          onClick={onNext}
          className="w-full py-4 bg-sage text-cream rounded-xl font-medium hover:bg-sage/90 transition-colors"
        >
          {isMultiple ? "That's everyone" : 'Yes, just the one'}
        </button>
        <button
          onClick={onAddAnother}
          className="w-full py-4 border border-bark/20 text-bark rounded-xl font-medium hover:bg-parchment transition-colors"
        >
          + Add another child
        </button>
      </div>

      <button
        onClick={onBack}
        className="w-full text-center text-sm text-bark/40 hover:text-bark/60 transition-colors"
      >
        Back
      </button>
    </div>
  );
}


function ChildcareStep({
  children,
  childcare,
  onChange,
  onNext,
  onBack,
}: {
  children: OnboardingChild[];
  childcare: OnboardingChildcare[];
  onChange: (childcare: OnboardingChildcare[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const addChildcareForChild = (child: OnboardingChild, preset?: typeof CHILDCARE_PRESETS[0]) => {
    const template = preset || CHILDCARE_PRESETS[0];
    onChange([
      ...childcare,
      {
        id: uuidv4(),
        childId: child.id,
        childName: child.name,
        name: template.name,
        daysOfWeek: [...template.daysOfWeek],
        dropoffTime: template.dropoffTime,
        pickupTime: template.pickupTime,
      },
    ]);
  };

  const updateChildcare = (id: string, updates: Partial<OnboardingChildcare>) => {
    onChange(childcare.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const removeChildcare = (id: string) => {
    onChange(childcare.filter((c) => c.id !== id));
  };

  const toggleDay = (id: string, currentDays: number[], day: number) => {
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day].sort();
    updateChildcare(id, { daysOfWeek: newDays });
  };

  const getChildcareForChild = (childId: string) => {
    return childcare.filter((c) => c.childId === childId);
  };

  return (
    <div>
      <h2 className="font-display text-2xl text-bark mb-2">Childcare</h2>
      <p className="text-bark/60 text-sm mb-6">
        Does anyone go to daycare, school, or have regular care?
        This helps us suggest the right tasks at the right time.
      </p>

      {children.map((child) => {
        const childSchedules = getChildcareForChild(child.id);
        return (
          <div key={child.id} className="mb-6">
            <h3 className="font-medium text-bark mb-3">{child.name}</h3>

            {childSchedules.length === 0 ? (
              <div className="bg-parchment rounded-xl p-4">
                <p className="text-sm text-bark/60 mb-3">Add regular care for {child.name}:</p>
                <div className="flex flex-wrap gap-2">
                  {CHILDCARE_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => addChildcareForChild(child, preset)}
                      className="px-3 py-2 bg-cream rounded-lg text-sm text-bark hover:bg-linen transition-colors border border-bark/10"
                    >
                      + {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {childSchedules.map((schedule) => (
                  <div key={schedule.id} className="bg-parchment rounded-xl p-4">
                    <div className="flex justify-between items-start mb-3">
                      <input
                        type="text"
                        value={schedule.name}
                        onChange={(e) => updateChildcare(schedule.id, { name: e.target.value })}
                        placeholder="Name (e.g., Daycare)"
                        className="font-medium text-bark bg-transparent border-b border-transparent focus:border-bark/20 focus:outline-none"
                      />
                      <button
                        onClick={() => removeChildcare(schedule.id)}
                        className="text-bark/40 hover:text-bark text-sm"
                      >
                        Remove
                      </button>
                    </div>

                    {/* Days of week */}
                    <div className="mb-3">
                      <label className="text-xs text-bark/50 block mb-2">Days</label>
                      <div className="flex items-center gap-1">
                        {DAY_LABELS.map((label, dayIndex) => (
                          <button
                            key={dayIndex}
                            onClick={() => toggleDay(schedule.id, schedule.daysOfWeek, dayIndex)}
                            className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                              schedule.daysOfWeek.includes(dayIndex)
                                ? 'bg-sage text-cream'
                                : 'bg-cream text-bark/40 hover:bg-cream/80'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Times */}
                    <div className="flex gap-3 mb-3">
                      <div className="flex-1">
                        <label className="text-xs text-bark/50 block mb-1">Dropoff</label>
                        <input
                          type="time"
                          value={schedule.dropoffTime}
                          onChange={(e) => updateChildcare(schedule.id, { dropoffTime: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-bark/50 block mb-1">Pickup</label>
                        <input
                          type="time"
                          value={schedule.pickupTime}
                          onChange={(e) => updateChildcare(schedule.id, { pickupTime: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage"
                        />
                      </div>
                    </div>

                    {/* Travel time */}
                    <div>
                      <label className="text-xs text-bark/50 block mb-1">Travel time (optional)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="60"
                          value={schedule.travelTime || ''}
                          onChange={(e) => updateChildcare(schedule.id, {
                            travelTime: e.target.value ? parseInt(e.target.value) : undefined
                          })}
                          placeholder="0"
                          className="w-20 px-3 py-2 rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage"
                        />
                        <span className="text-sm text-bark/50">minutes</span>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => addChildcareForChild(child)}
                  className="w-full py-2 border border-dashed border-bark/20 rounded-lg text-bark/50 hover:border-bark/40 text-sm"
                >
                  + Add another care arrangement
                </button>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-bark/20 text-bark rounded-xl font-medium"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 bg-sage text-cream rounded-xl font-medium"
        >
          {childcare.length === 0 ? 'Skip' : 'Continue'}
        </button>
      </div>
    </div>
  );
}

function TaskIntroStep({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <h2 className="font-display text-2xl text-bark mb-2">How Rhythms works</h2>
      <p className="text-bark/60 text-sm mb-6">
        Your day is organized into three layers — each one feels different.
      </p>

      <div className="space-y-4 mb-8">
        <div className="bg-terracotta/10 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl">⏰</span>
            <h3 className="font-semibold text-terracotta">Fixed Schedule</h3>
          </div>
          <p className="text-bark/70 text-sm">Things with set times. Dropoff, dinner, bedtime.</p>
        </div>

        <div className="bg-sage/10 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl">🌿</span>
            <h3 className="font-semibold text-sage">Routines</h3>
          </div>
          <p className="text-bark/70 text-sm">Daily habits that don't need a clock. Getting dressed, tidying up.</p>
        </div>

        <div className="bg-lavender/10 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl">🌱</span>
            <h3 className="font-semibold text-lavender">To-dos</h3>
          </div>
          <p className="text-bark/70 text-sm">Worth doing when you can. Laundry, a walk, a quiet moment.</p>
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full py-3 bg-sage text-cream rounded-xl font-medium hover:bg-sage/90 transition-colors"
      >
        Got it
      </button>
    </div>
  );
}

function TaskSelectionStep({
  title,
  description,
  tasks,
  onChange,
  onNext,
  onBack,
  allowCustom = true,
}: {
  title: string;
  description: string;
  tasks: OnboardingTask[];
  onChange: (tasks: OnboardingTask[]) => void;
  onNext: () => void;
  onBack: () => void;
  allowCustom?: boolean;
}) {
  const [customTitle, setCustomTitle] = useState('');
  const [customTime, setCustomTime] = useState('');

  const toggleTask = (id: string) => {
    onChange(tasks.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t)));
  };

  const updateTaskTime = (id: string, time: string) => {
    onChange(tasks.map((t) => (t.id === id ? { ...t, scheduledTime: time || null } : t)));
  };

  const addCustomTask = () => {
    if (!customTitle.trim()) return;
    onChange([
      ...tasks,
      {
        id: uuidv4(),
        title: customTitle.trim(),
        tier: tasks[0]?.tier || 'fixed-schedule',
        scheduledTime: customTime || null,
        category: 'other',
        selected: true,
      },
    ]);
    setCustomTitle('');
    setCustomTime('');
  };

  return (
    <div>
      <h2 className="font-display text-2xl text-bark mb-2">{title}</h2>
      <p className="text-bark/60 text-sm mb-6">{description}</p>

      <div className="space-y-2 mb-4 max-h-72 overflow-y-auto">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`rounded-lg transition-colors border ${
              task.selected
                ? 'bg-sage/20 border-sage/30'
                : 'bg-parchment border-transparent'
            }`}
          >
            <div className="flex items-center gap-3 p-3">
              <button
                onClick={() => toggleTask(task.id)}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  task.selected ? 'border-sage bg-sage text-cream' : 'border-bark/30'
                }`}
              >
                {task.selected && (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => toggleTask(task.id)}
                className="flex-1 text-left text-bark text-sm"
              >
                {task.title}
              </button>
              {task.selected && (
                <input
                  type="time"
                  value={task.scheduledTime || ''}
                  onChange={(e) => updateTaskTime(task.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="time"
                  className="w-28 px-2 py-1 rounded-lg border border-bark/20 bg-cream/80 focus:outline-none focus:border-sage text-sm text-bark/70"
                />
              )}
              {!task.selected && task.scheduledTime && (
                <span className="text-xs text-bark/30">{task.scheduledTime}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {allowCustom && (
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="Add your own..."
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomTask()}
            onBlur={(e) => {
              // Auto-add if focus is leaving the custom row entirely (not moving to the time input)
              const next = e.relatedTarget as HTMLElement | null;
              if (customTitle.trim() && !(next instanceof HTMLInputElement && next.type === 'time')) {
                addCustomTask();
              }
            }}
            className="flex-1 px-3 py-2 rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage text-sm"
          />
          <input
            type="time"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            onBlur={() => customTitle.trim() && addCustomTask()}
            className="w-28 px-2 py-2 rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage text-sm"
          />
          <button
            onClick={addCustomTask}
            disabled={!customTitle.trim()}
            className="px-4 py-2 bg-parchment text-bark rounded-lg hover:bg-linen disabled:opacity-50 text-sm"
          >
            Add
          </button>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-bark/20 text-bark rounded-xl font-medium"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 bg-sage text-cream rounded-xl font-medium"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function TodosStep({
  onChange,
  onNext,
  onBack,
}: {
  todos?: OnboardingTask[];
  onChange: (todos: OnboardingTask[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [chores, setChores] = useState<ChoreChip[]>(() =>
    CHORE_CHIP_PRESETS.map((c) => ({ ...c, id: uuidv4(), selected: false, frequency: 'weekly' as const }))
  );
  const [selfCare, setSelfCare] = useState<SelfCareChip[]>(() =>
    SELF_CARE_CHIP_PRESETS.map((c) => ({ ...c, id: uuidv4(), selected: false }))
  );
  const [customTodo, setCustomTodo] = useState('');
  const [customTodos, setCustomTodos] = useState<string[]>([]);

  const toggleChore = (id: string) => {
    setChores(chores.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c)));
  };

  const setChoreFrequency = (id: string, frequency: ChoreChip['frequency']) => {
    setChores(chores.map((c) => (c.id === id ? { ...c, frequency } : c)));
  };

  // Multi-select for self-care
  const toggleSelfCare = (id: string) => {
    setSelfCare(selfCare.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c)));
  };

  const addCustomTodo = () => {
    const trimmed = customTodo.trim();
    if (!trimmed) return;
    setCustomTodos([...customTodos, trimmed]);
    setCustomTodo('');
  };

  const removeCustomTodo = (index: number) => {
    setCustomTodos(customTodos.filter((_, i) => i !== index));
  };

  const handleContinue = () => {
    const newTodos: OnboardingTask[] = [];

    for (const chore of chores.filter((c) => c.selected)) {
      const recurrence: RecurrenceRule =
        chore.frequency === 'daily' ? 'daily' :
        chore.frequency === 'weekly' ? 'weekly' :
        chore.recurrence; // as-needed uses the preset recurrence
      newTodos.push({
        id: uuidv4(),
        title: chore.title,
        tier: 'todo',
        scheduledTime: null,
        category: chore.category,
        selected: true,
        recurrence,
      });
    }

    for (const sc of selfCare.filter((c) => c.selected)) {
      newTodos.push({
        id: uuidv4(),
        title: sc.title,
        tier: 'todo',
        scheduledTime: null,
        category: sc.category,
        selected: true,
        bestWhen: sc.bestWhen,
        recurrence: 'daily',
      });
    }

    for (const title of customTodos) {
      newTodos.push({
        id: uuidv4(),
        title,
        tier: 'todo',
        scheduledTime: null,
        category: 'other',
        selected: true,
      });
    }

    onChange(newTodos);
    onNext();
  };

  return (
    <div>
      <h2 className="font-display text-2xl text-bark mb-6">To-dos</h2>

      {/* Section A: Chores */}
      <div className="mb-8">
        <h3 className="font-medium text-bark mb-1">What chores make the biggest difference when they actually happen?</h3>
        <p className="text-xs text-bark/50 mb-4">Pick as many as you like — you can always adjust later</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {chores.map((chore) => (
            <button
              key={chore.id}
              onClick={() => toggleChore(chore.id)}
              className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                chore.selected
                  ? 'bg-bark text-cream'
                  : 'bg-parchment text-bark hover:bg-bark/10'
              }`}
            >
              {chore.title}
            </button>
          ))}
        </div>

        {/* Frequency selectors for selected chores */}
        {chores.filter((c) => c.selected).length > 0 && (
          <div className="space-y-2">
            {chores.filter((c) => c.selected).map((chore) => (
              <div key={chore.id} className="flex items-center gap-3 bg-parchment/50 rounded-lg px-3 py-2">
                <span className="text-sm text-bark flex-1">{chore.title}</span>
                <div className="flex gap-1">
                  {(['daily', 'weekly', 'as-needed'] as const).map((freq) => (
                    <button
                      key={freq}
                      onClick={() => setChoreFrequency(chore.id, freq)}
                      className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                        chore.frequency === freq
                          ? 'bg-sage text-cream'
                          : 'bg-cream text-bark/50 hover:bg-bark/5'
                      }`}
                    >
                      {freq === 'as-needed' ? 'As needed' : freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section B: Self-care */}
      <div className="mb-8">
        <h3 className="font-medium text-bark mb-1">What self-care things are you trying to make space for?</h3>
        <p className="text-xs text-bark/50 mb-4">Pick any that apply (optional)</p>
        <div className="flex flex-wrap gap-2">
          {selfCare.map((item) => (
            <button
              key={item.id}
              onClick={() => toggleSelfCare(item.id)}
              className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                item.selected
                  ? 'bg-lavender text-cream'
                  : 'bg-parchment text-bark hover:bg-lavender/10'
              }`}
            >
              {item.title}
            </button>
          ))}
        </div>
      </div>

      {/* Section C: Custom to-dos */}
      <div className="mb-8">
        <h3 className="font-medium text-bark mb-3">Anything else on your list?</h3>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Add a to-do..."
            value={customTodo}
            onChange={(e) => setCustomTodo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomTodo()}
            className="flex-1 px-3 py-2 rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage text-sm"
          />
          <button
            onClick={addCustomTodo}
            disabled={!customTodo.trim()}
            className="px-4 py-2 bg-parchment text-bark rounded-lg hover:bg-linen disabled:opacity-50 text-sm"
          >
            Add
          </button>
        </div>
        {customTodos.length > 0 && (
          <div className="space-y-1">
            {customTodos.map((title, i) => (
              <div key={i} className="flex items-center gap-2 bg-parchment/50 rounded-lg px-3 py-2">
                <span className="text-sm text-bark flex-1">{title}</span>
                <button
                  onClick={() => removeCustomTodo(i)}
                  className="text-bark/30 hover:text-bark/60 text-xs"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-bark/20 text-bark rounded-xl font-medium"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          className="flex-1 py-3 bg-sage text-cream rounded-xl font-medium"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function CompleteStep({
  data,
  onFinish,
}: {
  data: OnboardingData;
  onFinish: () => void;
}) {
  const childNames = data.children.map((c) => c.name).filter(Boolean);
  const fixedCount = data.fixedSchedule.filter((t) => t.selected).length;
  const routinesCount = data.routines.filter((t) => t.selected).length;
  const todosCount = data.todos.filter((t) => t.selected).length;

  return (
    <div className="text-center">
      <div className="text-6xl mb-6">🌸</div>
      <h2 className="font-display text-2xl text-bark mb-4">You're All Set!</h2>
      <p className="text-bark/60 text-sm mb-8">Here's what we've set up for you:</p>

      <div className="bg-parchment rounded-xl p-5 mb-8 text-left space-y-3">
        {childNames.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xl">👶</span>
            <span className="text-bark text-sm">
              {childNames.length === 1
                ? childNames[0]
                : childNames.slice(0, -1).join(', ') + ' & ' + childNames[childNames.length - 1]}
            </span>
          </div>
        )}
        {fixedCount > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xl">⏰</span>
            <span className="text-bark text-sm">{fixedCount} fixed schedule {fixedCount === 1 ? 'item' : 'items'}</span>
          </div>
        )}
        {routinesCount > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xl">🌿</span>
            <span className="text-bark text-sm">{routinesCount} {routinesCount === 1 ? 'routine' : 'routines'}</span>
          </div>
        )}
        {todosCount > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xl">🌱</span>
            <span className="text-bark text-sm">{todosCount} to-{todosCount === 1 ? 'do' : 'dos'}</span>
          </div>
        )}
      </div>

      <p className="text-bark/50 text-sm mb-8">
        Remember: good enough is good enough.
      </p>

      <button
        onClick={onFinish}
        className="w-full py-3 bg-sage text-cream rounded-xl font-medium hover:bg-sage/90 transition-colors"
      >
        Start My Day
      </button>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

interface OnboardingProps {
  onComplete?: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const navigate = useNavigate();
  const addChild = useChildStore((state) => state.addChild);
  const clearChildren = useChildStore((state) => state.clearChildren);
  const addTask = useTaskStore((state) => state.addTask);
  const clearTasks = useTaskStore((state) => state.clearTasks);
  const addCareBlock = useCareBlockStore((state) => state.addBlock);
  const clearCareBlocks = useCareBlockStore((state) => state.clearBlocks);
  const clearGardenState = useGardenStore((state) => state.clearGardenState);
  const clearAwayLogs = useAwayStore((state) => state.clearAwayLogs);

  const [step, setStep] = useState<Step>('welcome');
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [data, setData] = useState<OnboardingData>({
    children: [{ id: uuidv4(), name: '', birthdate: '', bedtime: '19:30', wakeTime: '07:00' }],
    childcare: [],
    fixedSchedule: PRESET_FIXED_SCHEDULE.map((t) => ({ ...t, id: uuidv4(), selected: false })),
    routines: PRESET_ROUTINES.map((t) => ({ ...t, id: uuidv4(), selected: false })),
    todos: [],
  });

  const goNext = () => {
    const currentIndex = STEPS.indexOf(step);
    if (currentIndex < STEPS.length - 1) {
      setStep(STEPS[currentIndex + 1]);
    }
  };

  const goBack = () => {
    const currentIndex = STEPS.indexOf(step);
    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1]);
    }
  };

  const handleAddAnother = () => {
    const newChild = { id: uuidv4(), name: '', birthdate: '', bedtime: '19:30', wakeTime: '07:00' };
    setData({
      ...data,
      children: [...data.children, newChild],
    });
    setEditingChildId(newChild.id);
    setStep('children');
  };

  // Always filter dropoff/pickup from preset list — they're auto-created from the Childcare step
  const getFilteredFixedSchedule = () => {
    return data.fixedSchedule.filter((t) => {
      const lowerTitle = t.title.toLowerCase();
      return !(t.category === 'kids' && (lowerTitle.includes('dropoff') || lowerTitle.includes('pickup')));
    });
  };

  const handleFinish = () => {
    // Clear any existing data
    clearChildren();
    clearTasks();
    clearCareBlocks();
    clearGardenState();
    clearAwayLogs();

    // Save children and create ID mapping
    const childIdMap = new Map<string, string>();
    data.children.forEach((child) => {
      if (child.name) {
        const newId = addChild({
          name: child.name,
          birthdate: child.birthdate,
          bedtime: child.bedtime,
          wakeTime: child.wakeTime,
        });
        childIdMap.set(child.id, newId);
      }
    });

    // Auto-create bedtime and wake time fixed-schedule tasks for each child
    data.children.forEach((child) => {
      if (child.name) {
        const newChildId = childIdMap.get(child.id);
        if (newChildId) {
          addTask({
            type: 'standard',
            title: 'bedtime',
            tier: 'fixed-schedule',
            scheduledTime: child.bedtime,
            recurrence: 'daily',
            napContext: null,
            isActive: true,
            category: 'kids',
            preferredTimeBlock: 'evening',
            childId: newChildId,
            childTaskType: 'bedtime',
          });

          addTask({
            type: 'standard',
            title: 'wake up',
            tier: 'fixed-schedule',
            scheduledTime: child.wakeTime,
            recurrence: 'daily',
            napContext: null,
            isActive: true,
            category: 'kids',
            preferredTimeBlock: 'morning',
            childId: newChildId,
            childTaskType: 'wake-up',
          });
        }
      }
    });

    // Save childcare as CareBlocks and create dropoff/pickup tasks
    data.childcare.forEach((care) => {
      const newChildId = childIdMap.get(care.childId);
      if (newChildId && care.daysOfWeek.length > 0) {
        addCareBlock({
          childIds: [newChildId],
          name: care.name,
          blockType: 'childcare',
          recurrence: 'weekdays',
          daysOfWeek: care.daysOfWeek,
          startTime: care.dropoffTime,
          endTime: care.pickupTime,
          travelTimeBefore: care.travelTime,
          travelTimeAfter: care.travelTime,
          isActive: true,
        });

        addTask({
          type: 'standard',
          title: `dropoff (${care.name})`,
          tier: 'fixed-schedule',
          scheduledTime: care.dropoffTime,
          recurrence: 'daily',
          daysOfWeek: care.daysOfWeek,
          napContext: null,
          isActive: true,
          category: 'kids',
          preferredTimeBlock: 'morning',
          childId: newChildId,
          childTaskType: 'dropoff',
          travelTime: care.travelTime,
        });

        addTask({
          type: 'standard',
          title: `pickup (${care.name})`,
          tier: 'fixed-schedule',
          scheduledTime: care.pickupTime,
          recurrence: 'daily',
          daysOfWeek: care.daysOfWeek,
          napContext: null,
          isActive: true,
          category: 'kids',
          preferredTimeBlock: 'afternoon',
          childId: newChildId,
          childTaskType: 'pickup',
          travelTime: care.travelTime,
        });
      }
    });

    // Save selected tasks
    [...data.fixedSchedule, ...data.routines, ...data.todos]
      .filter((t) => t.selected)
      .forEach((task) => {
        addTask({
          type: 'standard',
          title: task.title,
          tier: task.tier,
          scheduledTime: task.scheduledTime,
          recurrence: task.recurrence || 'daily',
          napContext: task.tier === 'todo' ? 'any' : null,
          isActive: true,
          category: task.category,
          bestWhen: task.bestWhen,
          routineGroup: task.routineGroup,
        });
      });

    markAsInstalled();
    onComplete?.();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-cream p-6 flex flex-col">
      <div className="flex-1 max-w-md mx-auto w-full flex flex-col justify-center">
        {step !== 'welcome' && step !== 'complete' && <StepIndicator currentStep={step} />}

        {step === 'welcome' && <WelcomeStep onNext={goNext} />}

        {step === 'children' && (
          <ChildrenStep
            children={data.children}
            onChange={(children) => setData((d) => ({ ...d, children }))}
            onNext={() => { setEditingChildId(null); goNext(); }}
            onBack={goBack}
            editingChildId={editingChildId}
          />
        )}

        {step === 'only-child' && (
          <OnlyChildStep
            children={data.children}
            onNext={goNext}
            onAddAnother={handleAddAnother}
            onBack={goBack}
          />
        )}

        {step === 'childcare' && (
          <ChildcareStep
            children={data.children}
            childcare={data.childcare}
            onChange={(childcare) => setData({ ...data, childcare })}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {step === 'task-intro' && (
          <TaskIntroStep onNext={goNext} />
        )}

        {step === 'fixed-schedule' && (
          <TaskSelectionStep
            title="Fixed Schedule"
            description="Things with set times that anchor your day."
            tasks={getFilteredFixedSchedule()}
            onChange={(fixedSchedule) => setData({ ...data, fixedSchedule })}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {step === 'routines' && (
          <TaskSelectionStep
            title="Routines"
            description="Daily habits that don't need a clock."
            tasks={data.routines}
            onChange={(routines) => setData({ ...data, routines })}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {step === 'todos' && (
          <TodosStep
            todos={data.todos}
            onChange={(todos) => setData({ ...data, todos })}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {step === 'complete' && (
          <CompleteStep data={data} onFinish={handleFinish} />
        )}
      </div>
    </div>
  );
}
