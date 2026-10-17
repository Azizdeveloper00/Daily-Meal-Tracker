import { useCallback, useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import Header from './components/Header';
import MealCard from './components/MealCard';
import History from './components/History';
import Calendar from './components/Calendar';
import Settings from './components/Settings';
import ConfirmDialog from './components/ConfirmDialog';
import { MEALS } from './data/meals';
import {
  ALL_MEALS_APPRECIATION,
  APPRECIATION_MESSAGES,
} from './data/appreciationMessages';
import { useClock } from './hooks/useClock';
import { useMealTracker } from './hooks/useMealTracker';
import { loadReminderHistory, saveReminderHistory } from './storage/mealStorage';
import {
  formatScheduledTime,
  formatTimestamp,
  toDateKey,
} from './utils/date';

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App({ onLogout }) {
  const now = useClock();
  const todayKey = toDateKey(now);

  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef(null);
  const [appreciationMessage, setAppreciationMessage] = useState('');
  const appreciationTimerRef = useRef(null);
  const lastAppreciationRef = useRef({});
  const [reminderMessages, setReminderMessages] = useState([]);
  const showToast = useCallback((message) => {
    setToastMessage(message);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(''), 2800);
  }, []);

  const {
    state,
    isReady,
    completeMeal,
    undoMeal,
    clearToday,
    setScheduleTime,
    resetSchedule,
    setTheme,
    setName,
    setRemindersEnabled,
    setReminderMinutes,
  } = useMealTracker(showToast);

  const [pendingAction, setPendingAction] = useState(null); // { type, meal? }

  const theme = state.theme ?? getSystemTheme();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(
    () => () => {
      clearTimeout(toastTimerRef.current);
      clearTimeout(appreciationTimerRef.current);
    },
    [],
  );

  const todayRecord = state.records[todayKey] ?? {};
  const completedCount = MEALS.filter((meal) => todayRecord[meal.id]).length;

  useEffect(() => {
    setReminderMessages([]);
  }, [todayKey]);

  const showAppreciation = (mealId, allMealsDone) => {
    let message;
    if (allMealsDone) {
      message = `${state.name ? `Amazing work, ${state.name}!` : 'Amazing work!'} ${ALL_MEALS_APPRECIATION}`;
    } else {
      const messages = APPRECIATION_MESSAGES[mealId];
      const previousIndex = lastAppreciationRef.current[mealId];
      let index = Math.floor(Math.random() * messages.length);
      if (index === previousIndex) {
        index = (index + 1 + Math.floor(Math.random() * (messages.length - 1))) % messages.length;
      }
      lastAppreciationRef.current[mealId] = index;
      const mealName = MEALS.find((meal) => meal.id === mealId).name;
      const greeting = state.name ? `Great job, ${state.name}!` : 'Great job!';
      message = `${greeting} ${mealName} done. ${messages[index]}`;
    }

    setAppreciationMessage(message);
    clearTimeout(appreciationTimerRef.current);
    appreciationTimerRef.current = setTimeout(() => setAppreciationMessage(''), 4000);
  };

  useEffect(() => {
    if (!isReady || !state.remindersEnabled) return;
    const history = loadReminderHistory();
    const dayHistory = { ...(history[todayKey] ?? {}) };
    const newMessages = [];

    for (const meal of MEALS) {
      if (todayRecord[meal.id]) continue;
      const [hours, minutes] = state.schedule[meal.id].split(':').map(Number);
      const scheduledAt = new Date(now);
      scheduledAt.setHours(hours, minutes, 0, 0);
      const remainingMs = scheduledAt.getTime() - now.getTime();
      const mealHistory = { ...(dayHistory[meal.id] ?? {}) };
      let type = null;

      if (remainingMs > 0 && remainingMs <= state.reminderMinutes * 60_000 && !mealHistory.before) {
        type = 'before';
      } else if (remainingMs <= 0 && !mealHistory.due) {
        type = 'due';
      }
      if (!type) continue;

      mealHistory[type] = true;
      dayHistory[meal.id] = mealHistory;
      const minutesUntilMeal = Math.max(1, Math.ceil(remainingMs / 60_000));
      const message =
        type === 'before'
          ? `${state.name ? `${state.name}, ` : ''}${meal.name} is at ${formatScheduledTime(
              state.schedule[meal.id],
            )}, ${minutesUntilMeal} minutes from now. Time to get ready!`
          : `${state.name ? `${state.name}, ` : ''}it's time for ${meal.name.toLowerCase()}.`;
      const id = `${todayKey}:${meal.id}:${type}`;
      newMessages.push({ id, message });

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification('Daily Meal Tracker', { body: message });
        } catch {
          // The in-app reminder remains visible when a browser blocks notifications.
        }
      }
    }

    if (newMessages.length) {
      saveReminderHistory({ ...history, [todayKey]: dayHistory });
      setReminderMessages((current) => [...current, ...newMessages]);
    }
  }, [
    now,
    isReady,
    state.name,
    state.reminderMinutes,
    state.remindersEnabled,
    state.schedule,
    todayKey,
    todayRecord,
  ]);

  const handleToggleMeal = (meal, isChecked) => {
    if (isChecked) {
      completeMeal(meal.id);
      setReminderMessages((current) =>
        current.filter((item) => !item.id.startsWith(`${todayKey}:${meal.id}:`)),
      );
      showAppreciation(meal.id, completedCount + 1 === MEALS.length);
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
        name={state.name}
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

        <Calendar records={state.records} now={now} todayKey={todayKey} />

        <History records={state.records} todayKey={todayKey} />

        <Settings
          schedule={state.schedule}
          onChangeTime={setScheduleTime}
          onReset={resetSchedule}
          name={state.name}
          onSaveName={setName}
          remindersEnabled={state.remindersEnabled}
          onToggleReminders={setRemindersEnabled}
          reminderMinutes={state.reminderMinutes}
          onChangeReminderMinutes={setReminderMinutes}
        />
      </main>

      <div className="reminder-region" aria-live="polite">
        {reminderMessages.map(({ id, message }) => (
          <div key={id} className="reminder-banner" role="status">
            <span>{message}</span>
            <button
              type="button"
              className="reminder-banner__close"
              aria-label="Dismiss reminder"
              onClick={() =>
                setReminderMessages((current) => current.filter((item) => item.id !== id))
              }
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {appreciationMessage && (
        <div className="appreciation-region" role="status" aria-live="polite">
          <div className="appreciation-card">
            <span>{appreciationMessage}</span>
            <button
              type="button"
              aria-label="Close appreciation message"
              onClick={() => {
                clearTimeout(appreciationTimerRef.current);
                setAppreciationMessage('');
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

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
