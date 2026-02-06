import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChallengeStore, CHALLENGE_TEMPLATES } from '../stores/useChallengeStore';
import { GrowthSprite } from '../components/garden/GrowthSprite';
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
  onPlant: () => void;
  onClose: () => void;
  alreadyActive: boolean;
  noSlotsAvailable: boolean;
}) {
  const diff = DIFFICULTY_STYLE[template.difficulty];
  const flowerInfo = FLOWER_CATALOG[template.flowerReward];

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

        {/* Reward preview */}
        <div className="bg-parchment/60 rounded-lg p-3 mb-5 flex items-center gap-3">
          <span className="text-2xl">{flowerInfo.emoji}</span>
          <div>
            <p className="text-xs text-bark/50">Reward</p>
            <p className="text-sm font-medium text-bark">{flowerInfo.label}</p>
          </div>
        </div>

        {alreadyActive ? (
          <p className="text-center text-sm text-bark/50">This challenge is already growing</p>
        ) : noSlotsAvailable ? (
          <p className="text-center text-sm text-bark/50">All 3 plots are full — complete or abandon a challenge first</p>
        ) : (
          <button
            onClick={onPlant}
            className="w-full py-3 bg-sage text-cream rounded-xl font-medium text-sm hover:bg-sage/90 transition-colors"
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

function ActiveChallengeCard({ challenge }: { challenge: ActiveChallenge }) {
  const template = CHALLENGE_TEMPLATES.find(t => t.id === challenge.templateId);
  const abandonChallenge = useChallengeStore(s => s.abandonChallenge);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!template) return null;

  const progressPct = Math.round((challenge.totalProgress / template.targetCount) * 100);

  return (
    <div className="bg-cream rounded-xl p-4 border border-bark/5">
      <div className="flex items-start gap-3">
        <GrowthSprite
          stage={challenge.growthStage}
          flowerType={template.flowerReward}
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
        <div className="mt-3 text-right">
          {showConfirm ? (
            <div className="flex items-center justify-end gap-2">
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
  );
}

// ===========================================
// Available Challenge Card
// ===========================================

function AvailableChallengeCard({
  template,
  onTap,
}: {
  template: ChallengeTemplate;
  onTap: () => void;
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
          <h3 className="font-medium text-sm text-bark">{template.title}</h3>
          <p className="text-xs text-bark/40 mt-0.5">
            {template.type === 'streak'
              ? `${template.targetCount}-day streak`
              : `${template.targetCount} completions`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${diff.bg} ${diff.text}`}>
            {template.difficulty}
          </span>
          <span className="text-lg" title={flowerInfo.label}>{flowerInfo.emoji}</span>
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

  const growing = activeChallenges.filter(c => c.status === 'growing');
  const bloomed = activeChallenges.filter(c => c.status === 'bloomed');
  const active = [...growing, ...bloomed];
  const usedPlots = growing.map(c => c.plotIndex);
  const activeTemplateIds = new Set(growing.map(c => c.templateId));

  // Available = not currently active and not completed
  const available = CHALLENGE_TEMPLATES.filter(
    t => !activeTemplateIds.has(t.id)
      && !activeChallenges.some(c => c.templateId === t.id && c.status === 'bloomed')
  );

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

  const handlePlant = (template: ChallengeTemplate) => {
    // Find first available plot
    const nextPlot = [0, 1, 2].find(i => !usedPlots.includes(i));
    if (nextPlot === undefined) return;

    plantChallenge(template.id, nextPlot);
    setSelectedTemplate(null);
    navigate('/');
  };

  const noSlotsAvailable = usedPlots.length >= 3;

  return (
    <div className="min-h-screen bg-parchment/30">
      <div className="max-w-lg mx-auto p-4">
        <header className="mb-6">
          <h1 className="font-display text-2xl text-bark">Challenges</h1>
          <p className="text-xs text-bark/50 mt-1">Plant a seed, grow a habit, bloom a flower</p>
        </header>

        {/* Active Challenges */}
        {active.length > 0 && (
          <section className="mb-6">
            <h2 className="text-xs font-medium text-bark/50 uppercase tracking-wide mb-3">
              Growing ({active.length}/3)
            </h2>
            <div className="space-y-3">
              {active.map(c => (
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
                        />
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Completed Challenges */}
        {completed.length > 0 && (
          <section className="mb-6">
            <h2 className="text-xs font-medium text-bark/50 uppercase tracking-wide mb-3">
              Bloomed
            </h2>
            <div className="space-y-2">
              {completed.map(({ challenge, template }) => (
                <div
                  key={challenge.id}
                  className="bg-cream/60 rounded-xl p-3 flex items-center gap-3 border border-bark/5"
                >
                  <span className="text-xl">{FLOWER_CATALOG[template.flowerReward].emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-bark truncate">{template.title}</p>
                    <p className="text-xs text-bark/40">
                      Bloomed {challenge.bloomedDate ?? ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="h-20" />
      </div>

      {/* Challenge Detail Modal */}
      {selectedTemplate && (
        <ChallengeDetailModal
          template={selectedTemplate}
          onPlant={() => handlePlant(selectedTemplate)}
          onClose={() => setSelectedTemplate(null)}
          alreadyActive={activeTemplateIds.has(selectedTemplate.id)}
          noSlotsAvailable={noSlotsAvailable}
        />
      )}
    </div>
  );
}
