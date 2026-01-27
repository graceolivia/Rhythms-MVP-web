import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useChildStore } from '../../stores/useChildStore';
import { useNapStore } from '../../stores/useNapStore';
import { useTaskStore } from '../../stores/useTaskStore';
import { markAsInstalled } from '../../utils/storageHelpers';
import type { SeasonOfLife, TaskTier, TaskCategory } from '../../types';

// ============================================
// TYPES
// ============================================

interface OnboardingChild {
  id: string;
  name: string;
  birthdate: string;
  isNappingAge: boolean;
  bedtime: string;   // HH:mm format (e.g., "19:30")
  wakeTime: string;  // HH:mm format (e.g., "07:00")
}

interface OnboardingNapSchedule {
  id: string;
  childId: string;
  childName: string;
  napNumber: number;
  typicalStart: string;
  typicalEnd: string;
}

interface OnboardingTask {
  id: string;
  title: string;
  tier: TaskTier;
  scheduledTime: string | null;
  category: TaskCategory;
  selected: boolean;
}

interface OnboardingData {
  children: OnboardingChild[];
  napSchedules: OnboardingNapSchedule[];
  anchors: OnboardingTask[];
  rhythms: OnboardingTask[];
  tending: OnboardingTask[];
  seasonOfLife: SeasonOfLife;
}

type Step = 'welcome' | 'children' | 'naps' | 'anchors' | 'rhythms' | 'tending' | 'season' | 'complete';

const STEPS: Step[] = ['welcome', 'children', 'naps', 'anchors', 'rhythms', 'tending', 'season', 'complete'];

// ============================================
// PRESET TASKS
// ============================================

const PRESET_ANCHORS: Omit<OnboardingTask, 'id' | 'selected'>[] = [
  { title: 'Morning wake up', tier: 'anchor', scheduledTime: '07:00', category: 'kids' },
  { title: 'Breakfast', tier: 'anchor', scheduledTime: '08:00', category: 'meals' },
  { title: 'Daycare/school dropoff', tier: 'anchor', scheduledTime: '08:30', category: 'kids' },
  { title: 'Daycare/school pickup', tier: 'anchor', scheduledTime: '15:00', category: 'kids' },
  { title: 'Dinner', tier: 'anchor', scheduledTime: '18:00', category: 'meals' },
  { title: 'Bedtime routine', tier: 'anchor', scheduledTime: '19:30', category: 'kids' },
];

const PRESET_RHYTHMS: Omit<OnboardingTask, 'id' | 'selected'>[] = [
  { title: 'Get everyone dressed', tier: 'rhythm', scheduledTime: null, category: 'kids' },
  { title: 'Lunch for kids', tier: 'rhythm', scheduledTime: null, category: 'meals' },
  { title: 'Lunch for me', tier: 'rhythm', scheduledTime: null, category: 'self-care' },
  { title: 'Afternoon snack', tier: 'rhythm', scheduledTime: null, category: 'meals' },
  { title: 'Evening tidy up', tier: 'rhythm', scheduledTime: null, category: 'tidying' },
  { title: 'Load dishwasher', tier: 'rhythm', scheduledTime: null, category: 'kitchen' },
];

const PRESET_TENDING: Omit<OnboardingTask, 'id' | 'selected'>[] = [
  { title: 'Start laundry', tier: 'tending', scheduledTime: null, category: 'laundry' },
  { title: 'Fold laundry', tier: 'tending', scheduledTime: null, category: 'laundry' },
  { title: 'Wipe kitchen counters', tier: 'tending', scheduledTime: null, category: 'kitchen' },
  { title: 'Sweep floors', tier: 'tending', scheduledTime: null, category: 'cleaning' },
  { title: 'Vacuum', tier: 'tending', scheduledTime: null, category: 'cleaning' },
  { title: 'Take out trash', tier: 'tending', scheduledTime: null, category: 'tidying' },
  { title: 'Water plants', tier: 'tending', scheduledTime: null, category: 'other' },
  { title: 'Meal prep', tier: 'tending', scheduledTime: null, category: 'meals' },
  { title: 'Focused work time', tier: 'tending', scheduledTime: null, category: 'focus-work' },
  { title: 'Exercise / movement', tier: 'tending', scheduledTime: null, category: 'self-care' },
  { title: 'Read / rest', tier: 'tending', scheduledTime: null, category: 'self-care' },
];

// ============================================
// STEP COMPONENTS
// ============================================

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const currentIndex = STEPS.indexOf(currentStep);
  return (
    <div className="flex justify-center gap-1 mb-6">
      {STEPS.slice(0, -1).map((step, i) => (
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
}: {
  children: OnboardingChild[];
  onChange: (children: OnboardingChild[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const addChild = () => {
    onChange([
      ...children,
      { id: uuidv4(), name: '', birthdate: '', isNappingAge: true, bedtime: '19:30', wakeTime: '07:00' },
    ]);
  };

  const updateChild = (id: string, updates: Partial<OnboardingChild>) => {
    onChange(children.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const removeChild = (id: string) => {
    onChange(children.filter((c) => c.id !== id));
  };

  return (
    <div>
      <h2 className="font-display text-2xl text-bark mb-2">Your Children</h2>
      <p className="text-bark/60 text-sm mb-6">
        Who are you caring for at home?
      </p>

      <div className="space-y-4 mb-6">
        {children.map((child, index) => (
          <div key={child.id} className="bg-parchment rounded-xl p-4">
            <div className="flex justify-between items-start mb-3">
              <span className="text-sm text-bark/50">Child {index + 1}</span>
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
            <label className="flex items-center gap-2 text-sm text-bark/70 mb-3">
              <input
                type="checkbox"
                checked={child.isNappingAge}
                onChange={(e) => updateChild(child.id, { isNappingAge: e.target.checked })}
                className="rounded border-bark/20"
              />
              Still naps
            </label>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-bark/50 block mb-1">Bedtime</label>
                <input
                  type="time"
                  value={child.bedtime}
                  onChange={(e) => updateChild(child.id, { bedtime: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-bark/50 block mb-1">Wake time</label>
                <input
                  type="time"
                  value={child.wakeTime}
                  onChange={(e) => updateChild(child.id, { wakeTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addChild}
        className="w-full py-2 border-2 border-dashed border-bark/20 rounded-xl text-bark/50 hover:border-bark/40 hover:text-bark/70 transition-colors mb-6"
      >
        + Add Another Child
      </button>

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

function NapSchedulesStep({
  children,
  napSchedules,
  onChange,
  onNext,
  onBack,
}: {
  children: OnboardingChild[];
  napSchedules: OnboardingNapSchedule[];
  onChange: (schedules: OnboardingNapSchedule[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const nappingChildren = children.filter((c) => c.isNappingAge);

  const addNapForChild = (child: OnboardingChild) => {
    const existingNaps = napSchedules.filter((n) => n.childId === child.id);
    onChange([
      ...napSchedules,
      {
        id: uuidv4(),
        childId: child.id,
        childName: child.name,
        napNumber: existingNaps.length + 1,
        typicalStart: '13:00',
        typicalEnd: '15:00',
      },
    ]);
  };

  const updateNap = (id: string, updates: Partial<OnboardingNapSchedule>) => {
    onChange(napSchedules.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  };

  const removeNap = (id: string) => {
    onChange(napSchedules.filter((n) => n.id !== id));
  };

  if (nappingChildren.length === 0) {
    return (
      <div>
        <h2 className="font-display text-2xl text-bark mb-2">Nap Schedules</h2>
        <p className="text-bark/60 mb-6">
          No napping-age children. You can skip this step.
        </p>
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
            Skip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-2xl text-bark mb-2">Nap Schedules</h2>
      <p className="text-bark/60 text-sm mb-6">
        When do your little ones typically nap?
      </p>

      {nappingChildren.map((child) => {
        const childNaps = napSchedules.filter((n) => n.childId === child.id);
        return (
          <div key={child.id} className="mb-6">
            <h3 className="font-medium text-bark mb-3">{child.name}'s Naps</h3>
            {childNaps.map((nap) => (
              <div key={nap.id} className="bg-parchment rounded-xl p-4 mb-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-bark/60">Nap {nap.napNumber}</span>
                  <button
                    onClick={() => removeNap(nap.id)}
                    className="text-bark/40 hover:text-bark text-sm"
                  >
                    Remove
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={nap.typicalStart}
                    onChange={(e) => updateNap(nap.id, { typicalStart: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage"
                  />
                  <span className="self-center text-bark/40">to</span>
                  <input
                    type="time"
                    value={nap.typicalEnd}
                    onChange={(e) => updateNap(nap.id, { typicalEnd: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage"
                  />
                </div>
              </div>
            ))}
            <button
              onClick={() => addNapForChild(child)}
              className="w-full py-2 border border-dashed border-bark/20 rounded-lg text-bark/50 hover:border-bark/40 text-sm"
            >
              + Add Nap
            </button>
          </div>
        );
      })}

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

  const toggleTask = (id: string) => {
    onChange(tasks.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t)));
  };

  const addCustomTask = () => {
    if (!customTitle.trim()) return;
    onChange([
      ...tasks,
      {
        id: uuidv4(),
        title: customTitle.trim(),
        tier: tasks[0]?.tier || 'tending',
        scheduledTime: null,
        category: 'other',
        selected: true,
      },
    ]);
    setCustomTitle('');
  };

  return (
    <div>
      <h2 className="font-display text-2xl text-bark mb-2">{title}</h2>
      <p className="text-bark/60 text-sm mb-6">{description}</p>

      <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => toggleTask(task.id)}
            className={`w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3 ${
              task.selected
                ? 'bg-sage/20 border border-sage/30'
                : 'bg-parchment border border-transparent'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                task.selected ? 'border-sage bg-sage text-cream' : 'border-bark/30'
              }`}
            >
              {task.selected && (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            <span className="text-bark">{task.title}</span>
            {task.scheduledTime && (
              <span className="ml-auto text-sm text-bark/40">{task.scheduledTime}</span>
            )}
          </button>
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
            className="flex-1 px-3 py-2 rounded-lg border border-bark/20 bg-cream focus:outline-none focus:border-sage"
          />
          <button
            onClick={addCustomTask}
            disabled={!customTitle.trim()}
            className="px-4 py-2 bg-parchment text-bark rounded-lg hover:bg-linen disabled:opacity-50"
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

function SeasonOfLifeStep({
  season,
  onChange,
  onNext,
  onBack,
}: {
  season: SeasonOfLife;
  onChange: (season: SeasonOfLife) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const options: { value: SeasonOfLife; title: string; description: string }[] = [
    {
      value: 'survival',
      title: 'Survival Mode',
      description: 'Bare minimum. Just getting through the day.',
    },
    {
      value: 'finding-footing',
      title: 'Finding My Footing',
      description: 'Building routines, some good days.',
    },
    {
      value: 'steady-rhythm',
      title: 'Steady Rhythm',
      description: 'Established patterns, ready for more.',
    },
  ];

  return (
    <div>
      <h2 className="font-display text-2xl text-bark mb-2">Season of Life</h2>
      <p className="text-bark/60 text-sm mb-6">
        Where are you right now? This helps us set realistic expectations.
      </p>

      <div className="space-y-3 mb-6">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`w-full text-left p-4 rounded-xl transition-colors ${
              season === option.value
                ? 'bg-sage/20 border-2 border-sage'
                : 'bg-parchment border-2 border-transparent'
            }`}
          >
            <p className="font-medium text-bark">{option.title}</p>
            <p className="text-sm text-bark/60">{option.description}</p>
          </button>
        ))}
      </div>

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

function CompleteStep({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="text-center">
      <div className="text-6xl mb-6">🌸</div>
      <h2 className="font-display text-2xl text-bark mb-4">You're All Set!</h2>
      <p className="text-bark/70 mb-8 leading-relaxed">
        Your rhythm is ready to begin.
        <br />
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
  const addNapSchedule = useNapStore((state) => state.addNapSchedule);
  const clearNapSchedules = useNapStore((state) => state.clearNapSchedules);
  const addTask = useTaskStore((state) => state.addTask);
  const clearTasks = useTaskStore((state) => state.clearTasks);

  const [step, setStep] = useState<Step>('welcome');
  const [data, setData] = useState<OnboardingData>({
    children: [{ id: uuidv4(), name: '', birthdate: '', isNappingAge: true, bedtime: '19:30', wakeTime: '07:00' }],
    napSchedules: [],
    anchors: PRESET_ANCHORS.map((t) => ({ ...t, id: uuidv4(), selected: false })),
    rhythms: PRESET_RHYTHMS.map((t) => ({ ...t, id: uuidv4(), selected: false })),
    tending: PRESET_TENDING.map((t) => ({ ...t, id: uuidv4(), selected: false })),
    seasonOfLife: 'finding-footing',
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

  const handleFinish = () => {
    // Clear any existing data (e.g., seed data from development)
    clearChildren();
    clearNapSchedules();
    clearTasks();

    // Save children and create ID mapping
    const childIdMap = new Map<string, string>();
    data.children.forEach((child) => {
      if (child.name) {
        const newId = addChild({
          name: child.name,
          birthdate: child.birthdate,
          isNappingAge: child.isNappingAge,
          bedtime: child.bedtime,
          wakeTime: child.wakeTime,
        });
        childIdMap.set(child.id, newId);
      }
    });

    // Auto-create bedtime and wake time anchor tasks for each child
    data.children.forEach((child) => {
      if (child.name) {
        // Create bedtime anchor
        addTask({
          type: 'standard',
          title: `${child.name} bedtime`,
          tier: 'anchor',
          scheduledTime: child.bedtime,
          recurrence: 'daily',
          napContext: null,
          isActive: true,
          category: 'kids',
          preferredTimeBlock: 'evening',
        });

        // Create wake time anchor
        addTask({
          type: 'standard',
          title: `${child.name} wake up`,
          tier: 'anchor',
          scheduledTime: child.wakeTime,
          recurrence: 'daily',
          napContext: null,
          isActive: true,
          category: 'kids',
          preferredTimeBlock: 'morning',
        });
      }
    });

    // Save nap schedules with new child IDs
    data.napSchedules.forEach((nap) => {
      const newChildId = childIdMap.get(nap.childId);
      if (newChildId) {
        addNapSchedule({
          childId: newChildId,
          napNumber: nap.napNumber,
          typicalStart: nap.typicalStart,
          typicalEnd: nap.typicalEnd,
        });
      }
    });

    // Save selected tasks
    [...data.anchors, ...data.rhythms, ...data.tending]
      .filter((t) => t.selected)
      .forEach((task) => {
        addTask({
          type: 'standard',
          title: task.title,
          tier: task.tier,
          scheduledTime: task.scheduledTime,
          recurrence: 'daily',
          napContext: task.tier === 'tending' ? 'any' : null,
          isActive: true,
          category: task.category,
        });
      });

    // Mark as installed
    markAsInstalled();

    // Notify parent that onboarding is complete
    onComplete?.();

    // Navigate to main app
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
            onChange={(children) => setData({ ...data, children })}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {step === 'naps' && (
          <NapSchedulesStep
            children={data.children}
            napSchedules={data.napSchedules}
            onChange={(napSchedules) => setData({ ...data, napSchedules })}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {step === 'anchors' && (
          <TaskSelectionStep
            title="Anchors"
            description="Fixed-time events that structure your day."
            tasks={data.anchors}
            onChange={(anchors) => setData({ ...data, anchors })}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {step === 'rhythms' && (
          <TaskSelectionStep
            title="Daily Rhythms"
            description="The non-negotiables that make a 'good enough' day."
            tasks={data.rhythms}
            onChange={(rhythms) => setData({ ...data, rhythms })}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {step === 'tending' && (
          <TaskSelectionStep
            title="Tending Tasks"
            description="Nice-to-haves. If they don't happen, tomorrow is another day."
            tasks={data.tending}
            onChange={(tending) => setData({ ...data, tending })}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {step === 'season' && (
          <SeasonOfLifeStep
            season={data.seasonOfLife}
            onChange={(seasonOfLife) => setData({ ...data, seasonOfLife })}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {step === 'complete' && <CompleteStep onFinish={handleFinish} />}
      </div>
    </div>
  );
}
