import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useGoodEnoughDay } from '../../hooks/useGoodEnoughDay';
import { useGardenStore } from '../../stores/useGardenStore';

const STORAGE_KEY = 'rhythm_good_enough_shown';

function getShownDate(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

function markAsShown(): void {
  localStorage.setItem(STORAGE_KEY, format(new Date(), 'yyyy-MM-dd'));
}

export function GoodEnoughModal() {
  const { isGoodEnough } = useGoodEnoughDay();
  const earnDailyFlowerIfEligible = useGardenStore((state) => state.earnDailyFlowerIfEligible);
  const [isVisible, setIsVisible] = useState(false);
  const [earnedFlower, setEarnedFlower] = useState(false);

  useEffect(() => {
    if (!isGoodEnough) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const shownDate = getShownDate();

    // Only show if not already shown today
    if (shownDate !== today) {
      // Earn daily flower
      const didEarn = earnDailyFlowerIfEligible();
      setEarnedFlower(didEarn);

      setIsVisible(true);
      markAsShown();
    }
  }, [isGoodEnough, earnDailyFlowerIfEligible]);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bark/40 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div className="relative bg-cream rounded-2xl p-8 max-w-sm w-full shadow-xl">
        {/* Decorative flower */}
        <div className="text-center text-5xl mb-4">🌼</div>

        <h2 className="font-display text-2xl text-bark text-center mb-4">
          Good Enough
        </h2>

        <p className="text-bark/80 text-center leading-relaxed mb-4">
          You did it.
          <br />
          Everyone's fed, everyone's loved,
          <br />
          the day is complete.
        </p>

        {earnedFlower && (
          <p className="text-sage text-sm text-center mb-4">
            A daisy blooms in your garden 🌼
          </p>
        )}

        <div className="text-center">
          <button
            onClick={handleDismiss}
            className="px-6 py-3 bg-sage text-cream rounded-lg font-medium hover:bg-sage/90 transition-colors"
          >
            Thank you
          </button>
        </div>

        {/* Subtle encouragement */}
        <p className="text-bark/40 text-xs text-center mt-4 italic">
          Anything else is a gift, not an obligation.
        </p>
      </div>
    </div>
  );
}
