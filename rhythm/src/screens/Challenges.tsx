import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChallengeStore, CHALLENGE_TEMPLATES } from '../stores/useChallengeStore';
import { useTaskStore } from '../stores/useTaskStore';
import { GrowthSprite } from '../components/garden/GrowthSprite';
import { SpriteSheet } from '../components/garden/SpriteSheet';
import { FLOWER_CATALOG } from '../stores/useGardenStore';
import type { ChallengeTemplate, ActiveChallenge } from '../types';

// ===========================================
// Difficulty badge colors
// ===========================================

const DIFFICULTY_STYLE: Record<string, { bg: string; text: string }> = {
  gentle: { bg: 'bg-sage/15', text: 'text-sage' },
  steady: { bg: 'bg-skyblue/15', text: 'text-skyblue' },
  ambitious: { bg: 'bg-lavender/15', text: 'text-lavender' },
};

// ===========================================
// Category labels
// ===========================================

const CATEGORY_LABEL: Record<string, string> = {
  'self-care': 'Self-Care',
  kitchen: 'Kitchen',
  tidying: 'Tidying',
  laundry: 'Laundry',
  kids: 'Kids',
};

// ===========================================
// Challenge Detail Modal
// ===========================================

function ChallengeDetailModal({
  template,
  onPlant,
  onClose,
  alreadyActive,
  noSlotsAvailable,
}: {
  template: ChallengeTemplate;
  onPlant: (customStepTitles?: string[]) => void;
  onClose: () => void;
  alreadyActive: boolean;
  noSlotsAvailable: boolean;
}) {
  const diff = DIFFICULTY_STYLE[template.difficulty];
  const flowerInfo = FLOWER_CATALOG[template.flowerReward];
  const hasSteps = template.seedTasks && template.seedTasks.length > 0;
  const [steps, setSteps] = useState<string[]>(
    () => template.seedTasks?.map(s => s.title) ?? []
  );

  const updateStep = (i: number, value: string) =>
    setSteps(prev => prev.map((s, idx) => idx === i ? value : s));

  const addStep = () => setSteps(prev => [...prev, '']);

  const removeStep = (i: number) =>
    setSteps(prev => prev.filter((_, idx) => idx !== i));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-bark/30" onClick={onClose} />
      <div className="relative bg-cream rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-6 animate-slide-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-bark/40 hover:text-bark/60">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="font-display text-xl text-bark mb-1">{template.title}</h2>

        <div className="flex items-center gap-2 mb-4">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${diff.bg} ${diff.text}`}>
            {template.difficulty}
          </span>
          <span className="text-xs text-bark/40">
            {template.type === 'streak'
              ? `${template.targetCount}-day streak`
              : `${template.targetCount} completions`}
          </span>
        </div>

        <p className="text-sm text-bark/70 leading-relaxed mb-4">{template.description}</p>

        {/* Editable steps */}
        {hasSteps && (
          <div className="bg-parchment/60 rounded-lg p-3 mb-4">
            <p className="text-xs text-bark/50 mb-2">Steps <span className="text-bark/30">(tap to edit)</span></p>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-bark/30 w-4 text-right shrink-0">{i + 1}</span>
                  <input
                    type="text"
                    value={step}
                    onChange={e => updateStep(i, e.target.value)}
                    placeholder={`Step ${i + 1}`}
                    className="flex-1 bg-cream border border-bark/10 rounded-lg px-3 py-1.5 text-sm text-bark placeholder-bark/30 focus:outline-none focus:border-sage/50"
                  />
                  {steps.length > 1 && (
                    <button
                      onClick={() => removeStep(i)}
                      className="shrink-0 text-bark/25 hover:text-terracotta/60 transition-colors"
                      aria-label="Remove step"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addStep}
              className="mt-2 w-full py-1.5 border border-dashed border-bark/20 rounded-lg text-xs text-bark/40 hover:text-bark/60 hover:border-bark/30 transition-colors"
            >
              + Add a step
            </button>
          </div>
        )}

        {/* Reward preview */}
        <div className="bg-parchment/60 rounded-lg p-3 mb-5 flex items-center gap-3">
          <SpriteSheet
            src={flowerInfo.sheet ?? flowerInfo.sprite}
            frame={flowerInfo.sheetBloomFrame ?? 0}
            frameSize={16}
            scale={2}
            shadow
          />
          <div>
            <p className="text-xs text-bark/50">Reward</p>
            <p className="text-sm font-medium text-bark">{flowerInfo.label}</p>
          </div>
        </div>

        {alreadyActive ? (
          <p className="text-center text-sm text-bark/50">This challenge is already growing</p>
        ) : noSlotsAvailable ? (
          <p className="text-center text-sm text-bark/50">All 4 plots are full — complete or abandon a challenge first</p>
        ) : (
          <button
            onClick={() => onPlant(hasSteps ? steps.filter(s => s.trim()) : undefined)}
            disabled={hasSteps && steps.filter(s => s.trim()).length === 0}
            className="w-full py-3 bg-sage text-cream rounded-xl font-medium text-sm hover:bg-sage/90 transition-colors disabled:opacity-40"
          >
            Plant this seed
          </button>
        )}
      </div>
    </div>
  );
}

// ===========================================
// Active Challenge Card
// ===========================================

function EditStepsModal({
  challenge,
  onClose,
}: {
  challenge: ActiveChallenge;
  onClose: () => void;
}) {
  const tasks = useTaskStore(s => s.tasks);
  const updateTask = useTaskStore(s => s.updateTask);

  const seededTasks = (challenge.seededTaskIds ?? [])
    .map(id => tasks.find(t => t.id === id))
    .filter((t): t is NonNullable<typeof t> => !!t);

  const [steps, setSteps] = useState<string[]>(() => seededTasks.map(t => t.title));

  const updateStep = (i: number, value: string) =>
    setSteps(prev => prev.map((s, idx) => idx === i ? value : s));

  const handleSave = () => {
    seededTasks.forEach((task, i) => {
      if (steps[i] !== undefined && steps[i].trim() && steps[i] !== task.title) {
        updateTask(task.id, { title: steps[i].trim() });
      }
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-bark/30" onClick={onClose} />
      <div className="relative bg-cream rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-6 animate-slide-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-bark/40 hover:text-bark/60">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="font-display text-lg text-bark mb-1">Edit steps</h2>
        <p className="text-xs text-bark/50 mb-4">Changes take effect on your Today list</p>

        <div className="space-y-2 mb-5">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-bark/30 w-4 text-right shrink-0">{i + 1}</span>
              <input
                type="text"
                value={step}
                onChange={e => updateStep(i, e.target.value)}
                placeholder={`Step ${i + 1}`}
                className="flex-1 bg-parchment/60 border border-bark/10 rounded-lg px-3 py-2 text-sm text-bark placeholder-bark/30 focus:outline-none focus:border-sage/50"
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3 bg-sage text-cream rounded-xl font-medium text-sm hover:bg-sage/90 transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function ActiveChallengeCard({ challenge }: { challenge: ActiveChallenge }) {
  const template = CHALLENGE_TEMPLATES.find(t => t.id === challenge.templateId);
  const abandonChallenge = useChallengeStore(s => s.abandonChallenge);
  const [showConfirm, setShowConfirm] = useState(false);
  const [editingSteps, setEditingSteps] = useState(false);

  if (!template) return null;

  const progressPct = Math.round((challenge.totalProgress / template.targetCount) * 100);
  const hasSteps = (challenge.seededTaskIds?.length ?? 0) > 0;

  return (
    <>
    <div className="bg-cream rounded-xl p-4 border border-bark/5">
      <div className="flex items-start gap-3">
        <GrowthSprite
          stage={challenge.growthStage}
          flowerType={template.flowerReward}
          sprites={template.sprites}
          spriteSheet={template.spriteSheet}
          size="lg"
          animate={challenge.status === 'bloomed' ? 'none' : 'idle'}
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-bark truncate">{template.title}</h3>
          <p className="text-xs text-bark/50">
            {challenge.totalProgress}/{template.targetCount}
            {template.type === 'streak' ? ' days' : ' done'}
            {' — '}
            {challenge.growthStage}
          </p>

          {/* Progress bar */}
          <div className="mt-2 h-1.5 bg-parchment rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                challenge.status === 'bloomed' ? 'bg-sage' : 'bg-terracotta/60'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {challenge.status === 'growing' && (
        <div className="mt-3 flex items-center justify-end gap-3">
          {hasSteps && !showConfirm && (
            <button
              onClick={() => setEditingSteps(true)}
              className="text-xs text-bark/30 hover:text-bark/50"
            >
              Edit steps
            </button>
          )}
          {showConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-bark/50">Give up?</span>
              <button
                onClick={() => abandonChallenge(challenge.id)}
                className="text-xs text-terracotta hover:text-terracotta/80"
              >
                Yes
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="text-xs text-bark/40 hover:text-bark/60"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="text-xs text-bark/30 hover:text-bark/50"
            >
              Abandon
            </button>
          )}
        </div>
      )}
    </div>

    {editingSteps && (
      <EditStepsModal
        challenge={challenge}
        onClose={() => setEditingSteps(false)}
      />
    )}
    </>
  );
}

// ===========================================
// Available Challenge Card
// ===========================================

function AvailableChallengeCard({
  template,
  onTap,
  timesCompleted = 0,
}: {
  template: ChallengeTemplate;
  onTap: () => void;
  timesCompleted?: number;
}) {
  const diff = DIFFICULTY_STYLE[template.difficulty];
  const flowerInfo = FLOWER_CATALOG[template.flowerReward];

  return (
    <button
      onClick={onTap}
      className="w-full bg-cream rounded-xl p-4 border border-bark/5 text-left hover:border-sage/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm text-bark">{template.title}</h3>
            {timesCompleted > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-sage/15 text-sage font-medium">
                ×{timesCompleted}
              </span>
            )}
          </div>
          <p className="text-xs text-bark/40 mt-0.5">
            {template.type === 'streak'
              ? `${template.targetCount}-day streak`
              : `${template.targetCount} completions`}
            {template.repeatable && ' · repeatable'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${diff.bg} ${diff.text}`}>
            {template.difficulty}
          </span>
          <SpriteSheet
            src={flowerInfo.sheet ?? flowerInfo.sprite}
            frame={flowerInfo.sheetBloomFrame ?? 0}
            frameSize={16}
            scale={1.5}
            shadow
          />
        </div>
      </div>
    </button>
  );
}

// ===========================================
// Main Challenges Screen
// ===========================================

export function Challenges() {
  const navigate = useNavigate();
  const activeChallenges = useChallengeStore(s => s.activeChallenges);
  const plantChallenge = useChallengeStore(s => s.plantChallenge);

  const [selectedTemplate, setSelectedTemplate] = useState<ChallengeTemplate | null>(null);
  const [tab, setTab] = useState<'growing' | 'completed'>('growing');

  const growing = activeChallenges.filter(c => c.status === 'growing');
  const usedPlots = [...new Set(growing.map(c => c.plotIndex))];
  const activeTemplateIds = new Set(growing.map(c => c.templateId));

  // Available = not currently growing, and either never bloomed or repeatable
  const available = CHALLENGE_TEMPLATES.filter(
    t => !activeTemplateIds.has(t.id)
      && (t.repeatable || !activeChallenges.some(c => c.templateId === t.id && c.status === 'bloomed'))
  );

  // Times completed per template (for repeatable badge)
  const completionCount = (templateId: string) =>
    activeChallenges.filter(c => c.templateId === templateId && c.status === 'bloomed').length;

  // Completed challenges with their templates
  const completed = activeChallenges
    .filter(c => c.status === 'bloomed')
    .map(c => ({
      challenge: c,
      template: CHALLENGE_TEMPLATES.find(t => t.id === c.templateId),
    }))
    .filter((x): x is { challenge: ActiveChallenge; template: ChallengeTemplate } => !!x.template);

  // Group available by category
  const categories = Array.from(new Set(available.map(t => t.category)));

  const handlePlant = (template: ChallengeTemplate, customStepTitles?: string[]) => {
    // Find first available plot
    const nextPlot = [0, 1, 2, 3].find(i => !usedPlots.includes(i));
    if (nextPlot === undefined) return;

    plantChallenge(template.id, nextPlot, customStepTitles);
    setSelectedTemplate(null);
    navigate('/');
  };

  const noSlotsAvailable = usedPlots.length >= 4;

  return (
    <div className="min-h-screen bg-parchment/30">
      <div className="max-w-lg mx-auto p-4">
        <header className="mb-4">
          <h1 className="font-display text-2xl text-bark">Challenges</h1>
          <p className="text-xs text-bark/50 mt-1">Plant a seed, grow a habit, bloom a flower</p>
        </header>

        {/* Tab bar */}
        <div className="flex gap-1 bg-cream rounded-lg p-1 mb-6">
          <button
            onClick={() => setTab('growing')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === 'growing'
                ? 'bg-parchment text-bark shadow-sm'
                : 'text-bark/40 hover:text-bark/60'
            }`}
          >
            Growing{growing.length > 0 ? ` (${growing.length})` : ''}
          </button>
          <button
            onClick={() => setTab('completed')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === 'completed'
                ? 'bg-parchment text-bark shadow-sm'
                : 'text-bark/40 hover:text-bark/60'
            }`}
          >
            Completed{completed.length > 0 ? ` (${completed.length})` : ''}
          </button>
        </div>

        {tab === 'growing' ? (
          <>
            {/* Active Growing Challenges */}
            {growing.length > 0 && (
              <section className="mb-6">
                <h2 className="text-xs font-medium text-bark/50 uppercase tracking-wide mb-3">
                  Growing ({growing.length}/4)
                </h2>
                <div className="space-y-3">
                  {growing.map(c => (
                    <ActiveChallengeCard key={c.id} challenge={c} />
                  ))}
                </div>
              </section>
            )}

            {/* Available Challenges */}
            <section className="mb-6">
              <h2 className="text-xs font-medium text-bark/50 uppercase tracking-wide mb-3">
                Available
              </h2>
              {categories.length === 0 ? (
                <p className="text-sm text-bark/40 text-center py-4">You've tried them all!</p>
              ) : (
                <div className="space-y-4">
                  {categories.map(category => (
                    <div key={category}>
                      <h3 className="text-xs font-medium text-bark/40 mb-2">
                        {CATEGORY_LABEL[category] ?? category}
                      </h3>
                      <div className="space-y-2">
                        {available
                          .filter(t => t.category === category)
                          .map(template => (
                            <AvailableChallengeCard
                              key={template.id}
                              template={template}
                              onTap={() => setSelectedTemplate(template)}
                              timesCompleted={completionCount(template.id)}
                            />
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          /* Completed tab */
          <section className="mb-6">
            {completed.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-bark/40">No bloomed challenges yet.</p>
                <p className="text-xs text-bark/30 mt-1">Complete a challenge to see it here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {completed.map(({ challenge, template }) => (
                  <div
                    key={challenge.id}
                    className="bg-cream rounded-xl p-4 flex items-center gap-3 border border-bark/5"
                  >
                    {(() => {
                      const info = FLOWER_CATALOG[template.flowerReward];
                      return (
                        <SpriteSheet
                          src={info.sheet ?? info.sprite}
                          frame={info.sheetBloomFrame ?? 0}
                          frameSize={16}
                          scale={2.5}
                          shadow
                        />
                      );
                    })()}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-bark truncate">{template.title}</p>
                      <p className="text-xs text-bark/40">
                        Bloomed {challenge.bloomedDate ?? ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <div className="h-20" />
      </div>

      {/* Challenge Detail Modal */}
      {selectedTemplate && (
        <ChallengeDetailModal
          template={selectedTemplate}
          onPlant={(customStepTitles) => handlePlant(selectedTemplate, customStepTitles)}
          onClose={() => setSelectedTemplate(null)}
          alreadyActive={activeTemplateIds.has(selectedTemplate.id)}
          noSlotsAvailable={noSlotsAvailable}
        />
      )}
    </div>
  );
}
