import { useState, useMemo } from 'react';
import { useTaskStore, getTaskDisplayTitle } from '../../stores/useTaskStore';
import { useChildStore } from '../../stores/useChildStore';
import { useChallengeStore, CHALLENGE_TEMPLATES } from '../../stores/useChallengeStore';
import { GrowthSprite } from '../garden/GrowthSprite';
import type { Task, TaskInstance, TaskTier } from '../../types';

const TIER_CONFIG: Record<TaskTier, { label: string; color: string; bg: string }> = {
  anchor: { label: 'Anchor', color: 'text-terracotta', bg: 'bg-terracotta/10' },
  rhythm: { label: 'Rhythm', color: 'text-sage', bg: 'bg-sage/10' },
  tending: { label: 'Tending', color: 'text-lavender', bg: 'bg-lavender/10' },
};

export function TaskCard({
  task,
  instance,
  today,
  suggested,
  onTap,
  onDefer,
}: {
  task: Task;
  instance: TaskInstance;
  today: string;
  suggested?: boolean;
  onTap: () => void;
  onDefer?: () => void;
}) {
  const updateMealPlan = useTaskStore((state) => state.updateMealPlan);
  const getChild = useChildStore((state) => state.getChild);
  const activeChallenges = useChallengeStore((s) => s.activeChallenges);
  const config = TIER_CONFIG[task.tier];
  const isCompleted = instance.status === 'completed';
  const isMeal = task.type === 'meal';
  const savedMeal = isMeal ? (task.plannedMeals?.[today] ?? '') : '';
  const [mealInput, setMealInput] = useState(savedMeal);
  const displayTitle = getTaskDisplayTitle(task, getChild);

  // Check if this task was seeded by an active challenge
  const challengeInfo = useMemo(() => {
    const challenge = activeChallenges.find(
      (c) => c.seededTaskIds?.includes(task.id) && (c.status === 'growing' || c.status === 'bloomed')
    );
    if (!challenge) return null;
    const template = CHALLENGE_TEMPLATES.find((t) => t.id === challenge.templateId);
    if (!template) return null;
    return { challenge, template };
  }, [activeChallenges, task.id]);

  const handleMealBlur = () => {
    if (isMeal && mealInput !== savedMeal) {
      updateMealPlan(task.id, today, mealInput);
    }
  };

  return (
    <div
      onClick={onTap}
      className={`w-full text-left p-4 rounded-xl transition-all cursor-pointer ${
        isCompleted
          ? 'bg-sage/10 border border-sage/20'
          : suggested
            ? 'bg-cream border border-sage/40 shadow-sm ring-1 ring-sage/20'
            : 'bg-cream border border-bark/5 shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <span
          className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            isCompleted
              ? 'border-sage bg-sage text-cream'
              : 'border-bark/20'
          }`}
        >
          {isCompleted && (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
              {config.label}
            </span>
            {challengeInfo && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-terracotta/10 text-terracotta/80">
                <GrowthSprite
                  stage={challengeInfo.challenge.growthStage}
                  flowerType={challengeInfo.template.flowerReward}
                  sprites={challengeInfo.template.sprites}
                  size="sm"
                  animate="none"
                />
                <span className="truncate max-w-[80px]">{challengeInfo.template.title}</span>
              </span>
            )}
            {suggested && !isCompleted && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-sage/15 text-sage font-medium">
                Suggested Now
              </span>
            )}
            {task.scheduledTime && (
              <span className="text-xs text-bark/40">{task.scheduledTime}</span>
            )}
          </div>
          <p className={`font-medium ${isCompleted ? 'text-bark/50 line-through' : 'text-bark'}`}>
            {displayTitle}
          </p>
          {isMeal && (
            <input
              type="text"
              placeholder={`What's for ${task.mealType}?`}
              value={mealInput}
              onChange={(e) => setMealInput(e.target.value)}
              onBlur={handleMealBlur}
              onClick={(e) => e.stopPropagation()}
              className={`mt-2 w-full text-sm px-2 py-1.5 rounded-lg border bg-parchment/50 focus:outline-none focus:border-sage transition-colors ${
                isCompleted
                  ? 'border-sage/20 text-bark/50'
                  : 'border-bark/10 text-bark'
              }`}
            />
          )}
        </div>

        {/* Defer button for tending tasks */}
        {onDefer && !isCompleted && (
          <button
            onClick={(e) => { e.stopPropagation(); onDefer(); }}
            className="ml-auto text-bark/30 hover:text-lavender text-xs flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-lavender/10 transition-colors flex-shrink-0"
            title="Put back in seed tray"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span>Tray</span>
          </button>
        )}
      </div>
    </div>
  );
}
