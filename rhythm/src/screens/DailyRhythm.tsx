import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, addDays, isToday } from 'date-fns';
import { useTaskStore } from '../stores/useTaskStore';
import { shouldTaskOccurOnDate } from '../stores/useTaskStore';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function DailyRhythm() {
  const navigate = useNavigate();
  const tasks = useTaskStore((state) => state.tasks);

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
  const weekEnd = addDays(weekStart, 6);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getTaskCountForDay = (date: Date): number => {
    return tasks.filter((task) => task.isActive && shouldTaskOccurOnDate(task, date)).length;
  };

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-lg mx-auto p-4 pb-24">
        <header className="mb-6">
          <h1 className="font-display text-2xl text-bark">Weekly Rhythm</h1>
          <p className="text-bark/60 text-sm">
            {format(weekStart, 'MMM d')}–{format(weekEnd, 'MMM d')}
          </p>
        </header>

        {/* Week grid */}
        <div className="grid grid-cols-7 gap-2 mb-8">
          {weekDays.map((day, index) => {
            const taskCount = getTaskCountForDay(day);
            const dayIsToday = isToday(day);
            const dateStr = format(day, 'yyyy-MM-dd');

            return (
              <button
                key={index}
                onClick={() => navigate(`/rhythm/day/${dateStr}`)}
                className={`flex flex-col items-center py-3 px-1 rounded-xl transition-all ${
                  dayIsToday
                    ? 'bg-sage/20 border-2 border-sage'
                    : 'bg-parchment border-2 border-transparent hover:border-bark/10'
                }`}
              >
                <span className={`text-xs font-semibold mb-1 ${
                  dayIsToday ? 'text-sage' : 'text-bark/50'
                }`}>
                  {DAY_LABELS[index]}
                </span>
                <span className={`text-lg font-display ${
                  dayIsToday ? 'text-sage' : 'text-bark'
                }`}>
                  {format(day, 'd')}
                </span>
                {taskCount > 0 && (
                  <span className={`mt-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${
                    dayIsToday
                      ? 'bg-sage/30 text-sage'
                      : 'bg-bark/10 text-bark/60'
                  }`}>
                    {taskCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Edit button */}
        <button
          onClick={() => navigate('/rhythm/edit')}
          className="w-full py-3 rounded-xl bg-sage text-cream font-medium hover:bg-sage/90 transition-colors"
        >
          Edit Weekly Rhythm
        </button>
      </div>
    </div>
  );
}
