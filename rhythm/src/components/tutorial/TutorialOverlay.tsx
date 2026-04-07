import { useState } from 'react';
import { useTutorialStore } from '../../stores/useTutorialStore';
import { useCharacterStore } from '../../stores/useCharacterStore';
import { useGardenStore } from '../../stores/useGardenStore';
import { useTaskStore } from '../../stores/useTaskStore';
import { markAsInstalled } from '../../utils/storageHelpers';
import { DialogueBox } from './DialogueBox';

// ─── Phase: INTRO ──────────────────────────────────────────────────────────────

function IntroPhase() {
  const setPhase = useTutorialStore((s) => s.setPhase);

  return (
    <DialogueBox
      speakerName="Sage"
      lines={[
        "Hey there! I don't think we've met — I'm Sage. I help tend the gardens around here.",
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
      lines={[
        `Welcome, ${playerName}! I love it here — it's quiet, there's good dirt, and things just... grow.`,
        'Here — I brought you a few seeds to get started. 🌱🌱🌱',
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
  const setPhase = useTutorialStore((s) => s.setPhase);

  return (
    <DialogueBox
      speakerName="Sage"
      lines={[
        "Look at that little sprout! It'll grow bigger every time you get things done.",
        "Speaking of which — what's one thing on your plate today? Laundry, dishes, a phone call... anything counts.",
      ]}
      onComplete={() => setPhase('add_task_prompt')}
    />
  );
}

// ─── Phase: ADD TASK PROMPT ────────────────────────────────────────────────────

function AddTaskPromptPhase() {
  const [taskText, setTaskText] = useState('');
  const setPhase = useTutorialStore((s) => s.setPhase);
  const markTaskAdded = useTutorialStore((s) => s.markTaskAdded);

  const handleSubmit = () => {
    const trimmed = taskText.trim();
    if (!trimmed) return;
    const taskId = useTaskStore.getState().addTask({
      type: 'standard',
      title: trimmed,
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
      lines={[
        "What's one thing on your plate today?",
      ]}
      onComplete={() => {}}
      showInputSlot
      inputSlot={
        <div className="flex gap-2 items-center">
          <input
            autoFocus
            type="text"
            maxLength={80}
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Laundry, a phone call..."
            className="flex-1 px-3 py-2 rounded-lg text-sm text-bark bg-cream/90 border-2 border-sage/40 focus:outline-none focus:border-sage"
          />
          <button
            onClick={handleSubmit}
            disabled={!taskText.trim()}
            className="px-4 py-2 rounded-lg bg-sage text-cream text-sm font-semibold disabled:opacity-40 transition-opacity"
          >
            Add it!
          </button>
        </div>
      }
    />
  );
}

// ─── Phase: WRAP UP ────────────────────────────────────────────────────────────

function WrapUpPhase() {
  const playerName = useTutorialStore((s) => s.playerName);
  const completeTutorial = useTutorialStore((s) => s.completeTutorial);

  const handleComplete = () => {
    completeTutorial();
    markAsInstalled();
  };

  return (
    <DialogueBox
      speakerName="Sage"
      lines={[
        'Perfect! Check it off when you\'re done and your garden will thank you.',
        `I'll be around if you need me. Happy growing, ${playerName}! 🌿`,
      ]}
      onComplete={handleComplete}
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
      {phase === 'add_task_prompt' && <AddTaskPromptPhase />}
      {phase === 'wrap_up' && <WrapUpPhase />}
    </>
  );
}
