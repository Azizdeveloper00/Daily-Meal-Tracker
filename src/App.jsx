import { useCallback, useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import Header from './components/Header';
import MealCard from './components/MealCard';
import History from './components/History';
import Settings from './components/Settings';
import ConfirmDialog from './components/ConfirmDialog';
import { MEALS } from './data/meals';
import { useClock } from './hooks/useClock';
import { useMealTracker } from './hooks/useMealTracker';
import { formatClockTime, formatScheduledTime, formatTimestamp, toDateKey } from './utils/date';

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App({ onLogout }) {
  const now = useClock();
  const todayKey = toDateKey(now);

  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef(null);
  const showToast = useCallback((message) => {
    setToastMessage(message);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(''), 2800);
  }, []);

  const { state, completeMeal, undoMeal, clearToday, setScheduleTime, resetSchedule, setTheme } =
    useMealTracker(showToast);

  const [pendingAction, setPendingAction] = useState(null); // { type, meal? }

  const theme = state.theme ?? getSystemTheme();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  const todayRecord = state.records[todayKey] ?? {};
  const completedCount = MEALS.filter((meal) => todayRecord[meal.id]).length;

  const handleToggleMeal = (meal, isChecked) => {
    if (isChecked) {
      const completedAt = completeMeal(meal.id);
      showToast(`${meal.name} completed at ${formatClockTime(completedAt)}`);
    } else {
      // Unticking asks first; the checkbox stays ticked until confirmed.
      setPendingAction({ type: 'untick', meal });
    }
  };

  const handleConfirm = () => {
    if (pendingAction?.type === 'untick') {
      undoMeal(pendingAction.meal.id);
      showToast(`${pendingAction.meal.name} record cleared`);
    } else if (pendingAction?.type === 'clear') {
      clearToday();
      showToast("Today's checklist cleared");
    }
    setPendingAction(null);
  };

  const dialogProps = (() => {
    if (pendingAction?.type === 'untick') {
      const { meal } = pendingAction;
      const recorded = todayRecord[meal.id];
      return {
        title: `Clear ${meal.name.toLowerCase()} record?`,
        message: `This removes the recorded time${
          recorded ? ` (${formatTimestamp(recorded)})` : ''
        }. If you tick it again, a new time is recorded.`,
        confirmLabel: 'Clear record',
        cancelLabel: 'Keep it',
      };
    }
    if (pendingAction?.type === 'clear') {
      return {
        title: "Clear today's checklist?",
        message: 'All completed meals and their times for today will be removed. Past days are not affected.',
        confirmLabel: 'Clear today',
        cancelLabel: 'Keep it',
      };
    }
    return null;
  })();

  return (
    <div className="app">
      <Header
        now={now}
        completedCount={completedCount}
        totalMeals={MEALS.length}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onLogout={async () => {
          const error = await onLogout();
          if (error) showToast(error);
        }}
      />

      <main>
        <section className="section" aria-labelledby="today-title">
          <div className="section__head">
            <h2 id="today-title" className="section__title">
              Today's meals
            </h2>
            <button
              type="button"
              className="button button--small"
              onClick={() => setPendingAction({ type: 'clear' })}
              disabled={completedCount === 0}
            >
              <Trash2 size={14} aria-hidden="true" />
              Clear today
            </button>
          </div>

          <div className="meal-grid">
            {MEALS.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                scheduledLabel={formatScheduledTime(state.schedule[meal.id])}
                completedLabel={todayRecord[meal.id] ? formatTimestamp(todayRecord[meal.id]) : ''}
                isCompleted={Boolean(todayRecord[meal.id])}
                onToggle={handleToggleMeal}
              />
            ))}
          </div>
        </section>

        <History records={state.records} todayKey={todayKey} />

        <Settings
          schedule={state.schedule}
          onChangeTime={setScheduleTime}
          onReset={resetSchedule}
        />
      </main>

      <div className="toast-region" role="status" aria-live="polite">
        {toastMessage && <div className="toast">{toastMessage}</div>}
      </div>

      {dialogProps && (
        <ConfirmDialog
          {...dialogProps}
          onConfirm={handleConfirm}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  );
}
