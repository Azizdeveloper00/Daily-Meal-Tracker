import { useCallback, useEffect, useRef, useState } from 'react';
import {
  hasCompletedMigration,
  isValidTime,
  loadState,
  markMigrationComplete,
  saveState,
  STORAGE_KEY,
} from '../storage/mealStorage';
import { DEFAULT_SCHEDULE, MEAL_IDS } from '../data/meals';
import { toDateKey } from '../utils/date';
import {
  deleteDay,
  deleteMeal,
  getRecords,
  getSettings,
  saveMeal,
  saveSettings,
} from '../api/mealApi';

function withMeal(records, dateKey, mealId, timestamp) {
  return { ...records, [dateKey]: { ...(records[dateKey] ?? {}), [mealId]: timestamp } };
}

function withoutMeal(records, dateKey, mealId) {
  const day = records[dateKey];
  if (!day || !day[mealId]) return records;
  const { [mealId]: _removed, ...remaining } = day;
  const next = { ...records };
  if (Object.keys(remaining).length) next[dateKey] = remaining;
  else delete next[dateKey];
  return next;
}

function settingsPayload(state) {
  return { schedule: state.schedule, theme: state.theme };
}

function mergeLocalEdits(serverState, cachedState, currentState) {
  const records = { ...serverState.records };
  const dates = new Set([...Object.keys(cachedState.records), ...Object.keys(currentState.records)]);
  for (const date of dates) {
    for (const meal of MEAL_IDS) {
      const cachedValue = cachedState.records[date]?.[meal];
      const currentValue = currentState.records[date]?.[meal];
      if (cachedValue === currentValue) continue;
      if (currentValue) {
        records[date] = { ...(records[date] ?? {}), [meal]: currentValue };
      } else if (records[date]?.[meal]) {
        const { [meal]: _removed, ...remaining } = records[date];
        if (Object.keys(remaining).length) records[date] = remaining;
        else delete records[date];
      }
    }
  }

  const schedule = { ...serverState.schedule };
  for (const meal of MEAL_IDS) {
    if (currentState.schedule[meal] !== cachedState.schedule[meal]) {
      schedule[meal] = currentState.schedule[meal];
    }
  }

  return {
    records,
    schedule,
    theme:
      currentState.theme === cachedState.theme ? serverState.theme : currentState.theme,
  };
}

/** Owns all persisted data: meal records by date, schedule, and theme. */
export function useMealTracker(onError = () => {}) {
  const [state, setState] = useState(loadState);
  const stateRef = useRef(state);
  const revisionRef = useRef(0);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const requestQueueRef = useRef(Promise.resolve());

  const updateState = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(stateRef.current) : updater;
    if (next === stateRef.current) return false;
    stateRef.current = next;
    revisionRef.current += 1;
    setState(next);
    return true;
  }, []);

  const runRequest = useCallback((operation, rollback, action) => {
    const request = requestQueueRef.current.then(operation).catch((error) => {
      rollback();
      onErrorRef.current(`${action}: ${error.message}`);
    });
    requestQueueRef.current = request.then(() => undefined);
  }, []);

  const initializationRef = useRef(null);

  useEffect(() => {
    if (initializationRef.current) return;
    const cachedState = loadState();
    initializationRef.current = (async () => {
      try {
        let records = await getRecords();

        if (!hasCompletedMigration()) {
          const cachedDates = Object.keys(cachedState.records);
          if (Object.keys(records).length === 0 && cachedDates.length > 0) {
            await Promise.all(
              cachedDates.flatMap((date) =>
                Object.entries(cachedState.records[date]).map(([meal, completedAt]) =>
                  saveMeal(date, meal, completedAt),
                ),
              ),
            );
            records = cachedState.records;
          }
          if (Object.keys(records).length > 0 || cachedDates.length > 0) {
            markMigrationComplete();
          }
        }

        let settings = await getSettings();
        if (!settings.configured) {
          settings = {
            schedule: cachedState.schedule,
            theme: cachedState.theme,
          };
          await saveSettings(settings);
        }
        const serverState = {
          records,
          schedule: settings.schedule,
          theme: settings.theme,
        };
        if (revisionRef.current === 0) {
          updateState(serverState);
        } else {
          updateState(
            mergeLocalEdits(serverState, cachedState, stateRef.current),
          );
        }
      } catch (error) {
        onErrorRef.current(`Could not reach the server. Using saved data offline. ${error.message}`);
      }
    })();
  }, [updateState]);

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Keep several open tabs in sync.
  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === STORAGE_KEY || event.key === null) updateState(loadState());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [updateState]);

  const completeMeal = useCallback((mealId) => {
    // Capture the moment of the click once, outside the state updater.
    const now = new Date();
    const dateKey = toDateKey(now);
    const timestamp = now.toISOString();
    const previous = stateRef.current;
    const day = previous.records[dateKey] ?? {};
    if (day[mealId]) return now;

    const next = {
      ...previous,
      records: withMeal(previous.records, dateKey, mealId, timestamp),
    };
    updateState(next);
    void runRequest(
      async () => {
        await initializationRef.current;
        await saveMeal(dateKey, mealId, timestamp);
      },
      () => {
        const current = stateRef.current;
        if (current.records[dateKey]?.[mealId] === timestamp) {
          updateState({ ...current, records: withoutMeal(current.records, dateKey, mealId) });
        }
      },
      `Could not save ${mealId}`,
    );
    return now;
  }, [runRequest, updateState]);

  const undoMeal = useCallback((mealId) => {
    const dateKey = toDateKey();
    const previous = stateRef.current;
    const previousTimestamp = previous.records[dateKey]?.[mealId];
    if (!previousTimestamp) return;

    updateState({ ...previous, records: withoutMeal(previous.records, dateKey, mealId) });
    void runRequest(
      async () => {
        await initializationRef.current;
        await deleteMeal(dateKey, mealId);
      },
      () => {
        const current = stateRef.current;
        if (!current.records[dateKey]?.[mealId]) {
          updateState({
            ...current,
            records: withMeal(current.records, dateKey, mealId, previousTimestamp),
          });
        }
      },
      `Could not clear ${mealId}`,
    );
  }, [runRequest, updateState]);

  const clearToday = useCallback(() => {
    const dateKey = toDateKey();
    const previous = stateRef.current;
    const previousDay = previous.records[dateKey];
    if (!previousDay) return;

    const records = { ...previous.records };
    delete records[dateKey];
    updateState({ ...previous, records });
    void runRequest(
      async () => {
        await initializationRef.current;
        await deleteDay(dateKey);
      },
      () => {
        const current = stateRef.current;
        const restoredDay = { ...(current.records[dateKey] ?? {}) };
        for (const [meal, timestamp] of Object.entries(previousDay)) {
          if (!restoredDay[meal]) restoredDay[meal] = timestamp;
        }
        updateState({
          ...current,
          records: { ...current.records, [dateKey]: restoredDay },
        });
      },
      "Could not clear today's meals",
    );
  }, [runRequest, updateState]);

  const setScheduleTime = useCallback((mealId, time) => {
    if (!isValidTime(time)) return;
    const previous = stateRef.current;
    const next = {
      ...previous,
      schedule: { ...previous.schedule, [mealId]: time },
    };
    if (previous.schedule[mealId] === time) return;
    updateState(next);
    void runRequest(
      async () => {
        await initializationRef.current;
        await saveSettings(settingsPayload(stateRef.current));
      },
      () => {
        const current = stateRef.current;
        if (current.schedule[mealId] === time) {
          updateState({
            ...current,
            schedule: { ...current.schedule, [mealId]: previous.schedule[mealId] },
          });
        }
      },
      'Could not save schedule',
    );
  }, [runRequest, updateState]);

  const resetSchedule = useCallback(() => {
    const previous = stateRef.current;
    const next = { ...previous, schedule: { ...DEFAULT_SCHEDULE } };
    updateState(next);
    void runRequest(
      async () => {
        await initializationRef.current;
        await saveSettings(settingsPayload(stateRef.current));
      },
      () => {
        const current = stateRef.current;
        const schedule = { ...current.schedule };
        for (const meal of MEAL_IDS) {
          if (schedule[meal] === DEFAULT_SCHEDULE[meal]) schedule[meal] = previous.schedule[meal];
        }
        updateState({ ...current, schedule });
      },
      'Could not reset schedule',
    );
  }, [runRequest, updateState]);

  const setTheme = useCallback((theme) => {
    const previous = stateRef.current;
    const next = { ...previous, theme };
    if (previous.theme === theme) return;
    updateState(next);
    void runRequest(
      async () => {
        await initializationRef.current;
        await saveSettings(settingsPayload(stateRef.current));
      },
      () => {
        const current = stateRef.current;
        if (current.theme === theme) updateState({ ...current, theme: previous.theme });
      },
      'Could not save theme',
    );
  }, [runRequest, updateState]);

  return {
    state,
    completeMeal,
    undoMeal,
    clearToday,
    setScheduleTime,
    resetSchedule,
    setTheme,
  };
}
