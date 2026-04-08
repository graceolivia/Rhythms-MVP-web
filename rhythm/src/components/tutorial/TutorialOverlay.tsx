import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useTutorialStore } from '../../stores/useTutorialStore';
import { useCharacterStore } from '../../stores/useCharacterStore';
import { useGardenStore } from '../../stores/useGardenStore';
import { useTaskStore } from '../../stores/useTaskStore';
import { markAsInstalled } from '../../utils/storageHelpers';
import { DialogueBox } from './DialogueBox';
import witchIdlePng from '../../assets/npcs/witch_idle.png';

// ─── Phase: INTRO ──────────────────────────────────────────────────────────────

function IntroPhase() {
  const setPhase = useTutorialStore((s) => s.setPhase);

  return (
    <DialogueBox
      speakerName="Sage"
      portrait={witchIdlePng}
      lines={[
        "It's the new neighbor! Oh, hi, sorry to startle you. I'm Sage, the garden witch.",
        "What's your name?",
      ]}
      onComplete={() => setPhase('name_input')}
    />
  );
}

// ─── Phase: NAME INPUT ─────────────────────────────────────────────────────────

function NameInputPhase() {
  const [name, setName] = useState('');
  const setPlayerName = useTutorialStore((s) => s.setPlayerName);
  const setCharPlayerName = useCharacterStore((s) => s.setPlayerName);
  const setPhase = useTutorialStore((s) => s.setPhase);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPlayerName(trimmed);
    setCharPlayerName(trimmed);
    setPhase('receive_seeds');
  };

  return (
    <DialogueBox
      speakerName="Sage"
      portrait={witchIdlePng}
      lines={["What's your name?"]}
      onComplete={() => {}}
      showInputSlot
      inputSlot={
        <div className="flex gap-2 items-center">
          <input
            autoFocus
            type="text"
            maxLength={20}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Your name..."
            className="flex-1 px-3 py-2 rounded-lg text-sm text-bark bg-cream/90 border-2 border-sage/40 focus:outline-none focus:border-sage"
          />
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="px-4 py-2 rounded-lg bg-sage text-cream text-sm font-semibold disabled:opacity-40 transition-opacity"
          >
            That's me!
          </button>
        </div>
      }
    />
  );
}

// ─── Phase: RECEIVE SEEDS ──────────────────────────────────────────────────────

function ReceiveSeedsPhase() {
  const playerName = useTutorialStore((s) => s.playerName);
  const setPhase = useTutorialStore((s) => s.setPhase);

  return (
    <DialogueBox
      speakerName="Sage"
      portrait={witchIdlePng}
      lines={[
        `Welcome, ${playerName}! I'm so glad you moved in. I hope you don't mind me saying so, but your yard looks a bit... bare.`,
        'Hey! Do you like gardening? I brought you a few seeds to get started. 🌱🌱🌱',
        'You can plant these anywhere in your garden. Want to try? Tap the button below to plant one!',
      ]}
      onComplete={() => setPhase('plant_prompt')}
    />
  );
}

// ─── Phase: PLANT PROMPT ───────────────────────────────────────────────────────

function PlantPromptPhase() {
  return (
    <>
      {/* Hint banner — garden interaction happens via TutorialPlotOverlay in GardenPreview */}
      <div
        className="fixed top-4 left-4 right-4 z-50 rounded-xl px-4 py-3 flex items-center gap-3"
        style={{ background: 'rgba(30,22,12,0.88)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}
      >
        <span className="text-xl">🌱</span>
        <p className="text-sm flex-1" style={{ color: '#f0e8d8' }}>
          Tap a glowing spot in your garden to plant a seed!
        </p>
      </div>
    </>
  );
}

// ─── Phase: FIRST PLANT RESPONSE ──────────────────────────────────────────────

function FirstPlantResponsePhase() {
  const setPhase      = useTutorialStore((s) => s.setPhase);
  const markTaskAdded = useTutorialStore((s) => s.markTaskAdded);

  const handleComplete = () => {
    const taskId = useTaskStore.getState().addTask({
      type: 'standard',
      title: 'Check off your first task!',
      tier: 'todo',
      scheduledTime: null,
      duration: 30,
      recurrence: 'daily',
      napContext: null,
      isActive: true,
      category: 'other',
      childId: null,
    });
    useTaskStore.getState().scheduleForToday(taskId);
    markTaskAdded();
    setPhase('wrap_up');
  };

  return (
    <DialogueBox
      speakerName="Sage"
      portrait={witchIdlePng}
      lines={[
        "Look at those little seeds! Here, our plants grow when they are watered with PRODUCTIVITY! Let me show you.",
        "Here's your first task. It's just: 'check off your first task!'",
      ]}
      onComplete={handleComplete}
    />
  );
}

// ─── Phase: WRAP UP ────────────────────────────────────────────────────────────

function WrapUpPhase() {
  const playerName = useTutorialStore((s) => s.playerName);
  const [taskDone, setTaskDone] = useState(false);

  useEffect(() => {
    const check = (state: ReturnType<typeof useTaskStore.getState>) => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const task  = state.tasks.find((t) => t.title === 'Check off your first task!');
      if (!task) return false;
      return state.taskInstances.some(
        (i) => i.taskId === task.id && i.date === today && i.status === 'completed'
      );
    };
    // Check current state immediately (task may already be done)
    if (check(useTaskStore.getState())) { setTaskDone(true); return; }
    // Subscribe to future changes
    return useTaskStore.subscribe((state) => { if (check(state)) setTaskDone(true); });
  }, []);

  return (
    <DialogueBox
      speakerName="Sage"
      portrait={witchIdlePng}
      lines={[
        'Perfect! Check it off right now and see what happens!',
        `Look, it already grew a bit! Each day that you complete even one task, all your plants grow. You can buy more seeds from the store. I can't wait to see what you grow, ${playerName}! 🌿`,
      ]}
      blocked={!taskDone}
      onComplete={() => {
        useTutorialStore.getState().completeTutorial();
        useGardenStore.getState().dismissSeasonReset();
        markAsInstalled();
      }}
    />
  );
}

// ─── Main overlay ──────────────────────────────────────────────────────────────

export function TutorialOverlay() {
  const phase = useTutorialStore((s) => s.phase);
  const tutorialComplete = useTutorialStore((s) => s.tutorialComplete);
  const startTutorial = useTutorialStore((s) => s.startTutorial);
  const earnFlower = useGardenStore((s) => s.earnFlower);
  const markSeedsReceived = useTutorialStore((s) => s.markSeedsReceived);
  const hasReceivedStarterSeeds = useTutorialStore((s) => s.hasReceivedStarterSeeds);

  if (tutorialComplete) return null;

  // Kick off the tutorial if it hasn't started yet
  if (phase === 'not_started') {
    startTutorial();
    return null;
  }

  // Entrance animation plays inside GardenPreview — nothing to render here
  if (phase === 'entrance') return null;

  // Award seeds when entering receive_seeds phase (idempotent)
  if (phase === 'receive_seeds' && !hasReceivedStarterSeeds) {
    earnFlower('forget-me-not');
    earnFlower('forget-me-not');
    earnFlower('forget-me-not');
    markSeedsReceived();
  }

  return (
    <>
      {/* Background dim during dialogue phases */}
      {phase !== 'plant_prompt' && (
        <div
          className="fixed inset-0 z-40 pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.1)' }}
        />
      )}

      {phase === 'intro' && <IntroPhase />}
      {phase === 'name_input' && <NameInputPhase />}
      {phase === 'receive_seeds' && <ReceiveSeedsPhase />}
      {phase === 'plant_prompt' && <PlantPromptPhase />}
      {phase === 'first_plant_response' && <FirstPlantResponsePhase />}
      {(phase === 'wrap_up' || phase === 'awaiting_first_task') && <WrapUpPhase />}
    </>
  );
}
