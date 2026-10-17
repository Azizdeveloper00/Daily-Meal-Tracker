import { DEFAULT_SCHEDULE, MEAL_IDS } from '../data/meals';
import { isValidDateKey } from '../utils/date';

export const STORAGE_KEY = 'daily-meal-tracker:v1';
export const MIGRATION_KEY = 'daily-meal-tracker:migrated-to-api:v1';
export const REMINDER_STORAGE_KEY = 'daily-meal-tracker:reminders:v1';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isValidTime = (value) => typeof value === 'string' && TIME_PATTERN.test(value);

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isValidTimestamp = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value));

/** Keeps only valid dates, known meals, and parseable timestamps. */
function sanitizeRecords(raw) {
  const records = {};
  if (!isPlainObject(raw)) return records;

  for (const [dateKey, day] of Object.entries(raw)) {
    if (!isValidDateKey(dateKey) || !isPlainObject(day)) continue;

    const cleanDay = {};
    for (const mealId of MEAL_IDS) {
      if (isValidTimestamp(day[mealId])) cleanDay[mealId] = day[mealId];
    }
    if (Object.keys(cleanDay).length > 0) records[dateKey] = cleanDay;
  }
  return records;
}

function sanitizeSchedule(raw) {
  const schedule = { ...DEFAULT_SCHEDULE };
  if (!isPlainObject(raw)) return schedule;

  for (const mealId of MEAL_IDS) {
    if (isValidTime(raw[mealId])) schedule[mealId] = raw[mealId];
  }
  return schedule;
}

function sanitizeReminderHistory(raw) {
  const history = {};
  if (!isPlainObject(raw)) return history;

  for (const [dateKey, dateHistory] of Object.entries(raw)) {
    if (!isValidDateKey(dateKey) || !isPlainObject(dateHistory)) continue;
    const cleanDate = {};
    for (const mealId of MEAL_IDS) {
      const mealHistory = dateHistory[mealId];
      if (!isPlainObject(mealHistory)) continue;
      const cleanMeal = {};
      if (mealHistory.before === true) cleanMeal.before = true;
      if (mealHistory.due === true) cleanMeal.due = true;
      if (Object.keys(cleanMeal).length) cleanDate[mealId] = cleanMeal;
    }
    if (Object.keys(cleanDate).length) history[dateKey] = cleanDate;
  }
  return history;
}

export function getDefaultState() {
  return {
    records: {},
    schedule: { ...DEFAULT_SCHEDULE },
    theme: null,
    name: '',
    remindersEnabled: true,
    reminderMinutes: 30,
  };
}

export function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!isPlainObject(raw)) return getDefaultState();

    return {
      records: sanitizeRecords(raw.records),
      schedule: sanitizeSchedule(raw.schedule),
      theme: raw.theme === 'dark' || raw.theme === 'light' ? raw.theme : null,
      name: typeof raw.name === 'string' ? raw.name.trim().slice(0, 30) : '',
      remindersEnabled: typeof raw.remindersEnabled === 'boolean' ? raw.remindersEnabled : true,
      reminderMinutes:
        Number.isInteger(raw.reminderMinutes) && raw.reminderMinutes >= 5 && raw.reminderMinutes <= 120
          ? raw.reminderMinutes
          : 30,
    };
  } catch {
    // Corrupt JSON or storage unavailable (private mode): start fresh.
    return getDefaultState();
  }
}

export function loadReminderHistory() {
  try {
    return sanitizeReminderHistory(JSON.parse(localStorage.getItem(REMINDER_STORAGE_KEY)));
  } catch {
    return {};
  }
}

export function saveReminderHistory(history) {
  try {
    localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Reminder history is best-effort when browser storage is unavailable.
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked; the app keeps working in memory.
  }
}

export function hasCompletedMigration() {
  try {
    return localStorage.getItem(MIGRATION_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markMigrationComplete() {
  try {
    localStorage.setItem(MIGRATION_KEY, 'true');
  } catch {
    // The local state remains available as a backup even if this marker cannot be saved.
  }
}
