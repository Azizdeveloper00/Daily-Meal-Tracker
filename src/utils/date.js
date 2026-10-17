const pad = (value) => String(value).padStart(2, '0');
export const CALENDAR_FIRST_WEEKDAY = 0;

/** Local calendar date as "YYYY-MM-DD" (never UTC, so it matches the user's day). */
export function toDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function isValidDateKey(key) {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  return toDateKey(parseDateKey(key)) === key;
}

export function shiftDateKey(key, days) {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function getMonthDayCount(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function getMonthGrid(year, monthIndex, firstWeekday = CALENDAR_FIRST_WEEKDAY) {
  const dayCount = getMonthDayCount(year, monthIndex);
  const firstDayOffset = (new Date(year, monthIndex, 1).getDay() - firstWeekday + 7) % 7;
  return [
    ...Array(firstDayOffset).fill(null),
    ...Array.from({ length: dayCount }, (_, index) => new Date(year, monthIndex, index + 1)),
  ];
}

export function shiftMonth(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function formatMonthYear(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatCalendarDate(key) {
  return parseDateKey(key).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
  });
}

export function daysBetween(fromKey, toKey) {
  return Math.round((parseDateKey(toKey) - parseDateKey(fromKey)) / 86400000);
}

export function formatClockTime(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatTimestamp(isoString) {
  return formatClockTime(new Date(isoString));
}

export function formatScheduledTime(hhmm) {
  const [hours, minutes] = hhmm.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return formatClockTime(date);
}

export function formatLongDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatHistoryDate(key) {
  return formatLongDate(parseDateKey(key));
}

export function getGreeting(date) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
