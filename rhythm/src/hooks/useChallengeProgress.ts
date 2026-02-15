import { useEffect, useRef, useCallback, useState } from 'react';
import { format } from 'date-fns';
import { useTaskStore } from '../stores/useTaskStore';
import { useChallengeStore, CHALLENGE_TEMPLATES } from '../stores/useChallengeStore';

/**
 * Watches task completions and automatically records challenge progress.
 *
 * - Streak challenges: one progress per day when any task in the matching category is completed
 * - Cumulative challenges: one progress per task completion in the matching category
 *
 * Returns bloom state for the GrowingPlot animation and BloomModal.
 */
export function useChallengeProgress() {
  const taskInstances = useTaskStore(s => s.taskInstances);
  const activeChallenges = useChallengeStore(s => s.activeChallenges);
  const recordProgress = useChallengeStore(s => s.recordProgress);

  const [justBloomedId, setJustBloomedId] = useState<string | null>(null);
  const [bloomToast, setBloomToast] = useState<string | null>(null);
  const [bloomedTemplateId, setBloomedTemplateId] = useState<string | null>(null);

  // Track what we've already processed to avoid duplicate progress
  const processedRef = useRef<Set<string>>(new Set());

  const dismissBloom = useCallback(() => {
    setJustBloomedId(null);
    setBloomToast(null);
    setBloomedTemplateId(null);
  }, []);

  const checkProgress = useCallback(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const growing = activeChallenges.filter(c => c.status === 'growing');
    if (growing.length === 0) return;

    // Get today's completed task instances
    const todayCompleted = taskInstances.filter(
      i => i.date === today && i.status === 'completed' && i.completedAt
    );

    const tasks = useTaskStore.getState().tasks;

    for (const challenge of growing) {
      const template = CHALLENGE_TEMPLATES.find(t => t.id === challenge.templateId);
      if (!template) continue;

      // Find completed tasks in the matching category today
      const matchingCompleted = todayCompleted.filter(instance => {
        const task = tasks.find(t => t.id === instance.taskId);
        return task && task.category === template.category;
      });

      if (matchingCompleted.length === 0) continue;

      if (template.type === 'streak') {
        // Streak: record once per day
        if (challenge.lastProgressDate === today) continue;

        const key = `${challenge.id}:${today}:streak`;
        if (processedRef.current.has(key)) continue;
        processedRef.current.add(key);

        const result = recordProgress(challenge.id);
        if (result === 'bloomed') {
          setJustBloomedId(challenge.id);
          setBloomToast(template.title);
          setBloomedTemplateId(template.id);
        }
      } else {
        // Cumulative: record once per new completion
        for (const instance of matchingCompleted) {
          const key = `${challenge.id}:${instance.id}`;
          if (processedRef.current.has(key)) continue;
          processedRef.current.add(key);

          const result = recordProgress(challenge.id);
          if (result === 'bloomed') {
            setJustBloomedId(challenge.id);
            setBloomToast(template.title);
            setBloomedTemplateId(template.id);
            break; // Already bloomed, no more progress needed
          }
        }
      }
    }
  }, [taskInstances, activeChallenges, recordProgress]);

  // Run check whenever task instances change
  useEffect(() => {
    checkProgress();
  }, [checkProgress]);

  // Clean up processed keys on day change
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const staleKeys: string[] = [];
    processedRef.current.forEach(key => {
      // Streak keys contain the date — clean old ones
      if (key.includes(':streak') && !key.includes(today)) {
        staleKeys.push(key);
      }
    });
    staleKeys.forEach(k => processedRef.current.delete(k));
  }, []);

  return { justBloomedId, bloomToast, bloomedTemplateId, dismissBloom };
}
