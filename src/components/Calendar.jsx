import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Minus } from 'lucide-react';
import { MEALS } from '../data/meals';
import {
  CALENDAR_FIRST_WEEKDAY,
  formatCalendarDate,
  formatHistoryDate,
  formatMonthYear,
  formatTimestamp,
  getMonthDayCount,
  getMonthGrid,
  shiftMonth,
  toDateKey,
} from '../utils/date';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const weekdayLabels = [
  ...WEEKDAYS.slice(CALENDAR_FIRST_WEEKDAY),
  ...WEEKDAYS.slice(0, CALENDAR_FIRST_WEEKDAY),
];

function monthMatches(first, second) {
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth();
}

export default function Calendar({ records, now, todayKey }) {
  const [displayedMonth, setDisplayedMonth] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const isCurrentMonth = monthMatches(displayedMonth, now);
  const canGoNext = !isCurrentMonth && displayedMonth < new Date(now.getFullYear(), now.getMonth(), 1);
  const dayCount = getMonthDayCount(displayedMonth.getFullYear(), displayedMonth.getMonth());
  const datesToCount = isCurrentMonth ? now.getDate() : dayCount;
  const grid = getMonthGrid(
    displayedMonth.getFullYear(),
    displayedMonth.getMonth(),
    CALENDAR_FIRST_WEEKDAY,
  );

  const monthSummary = useMemo(() => {
    let totalMeals = 0;
    let perfectDays = 0;
    for (let dayNumber = 1; dayNumber <= datesToCount; dayNumber += 1) {
      const key = toDateKey(
        new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), dayNumber),
      );
      const count = MEALS.filter((meal) => records[key]?.[meal.id]).length;
      totalMeals += count;
      if (count === MEALS.length) perfectDays += 1;
    }
    const percent = datesToCount
      ? Math.round((totalMeals / (datesToCount * MEALS.length)) * 100)
      : 0;
    return { totalMeals, perfectDays, percent };
  }, [datesToCount, displayedMonth, records]);

  const selectedDay = records[selectedDate] ?? {};
  const selectedCount = MEALS.filter((meal) => selectedDay[meal.id]).length;

  return (
    <section className="section" aria-labelledby="calendar-title">
      <h2 id="calendar-title" className="section__title">
        Calendar
      </h2>
      <div className="panel">
        <div className="calendar-nav">
          <button
            type="button"
            className="icon-button"
            onClick={() => setDisplayedMonth((month) => shiftMonth(month, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <h3 className="calendar-nav__month">{formatMonthYear(displayedMonth)}</h3>
          <button
            type="button"
            className="icon-button"
            onClick={() => setDisplayedMonth((month) => shiftMonth(month, 1))}
            disabled={!canGoNext}
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            className="button button--small"
            disabled={isCurrentMonth}
            onClick={() => {
              setDisplayedMonth(new Date(now.getFullYear(), now.getMonth(), 1));
              setSelectedDate(todayKey);
            }}
          >
            Today
          </button>
        </div>

        <div className="calendar-grid" role="group" aria-label={formatMonthYear(displayedMonth)}>
          {weekdayLabels.map((weekday) => (
            <div key={weekday} className="calendar-weekday">
              {weekday.slice(0, 2)}
            </div>
          ))}
          {grid.map((date, index) => {
            if (!date) {
              return <span key={`blank-${index}`} className="calendar-blank" aria-hidden="true" />;
            }
            const dateKey = toDateKey(date);
            const count = MEALS.filter((meal) => records[dateKey]?.[meal.id]).length;
            const isFuture = dateKey > todayKey;
            const isToday = dateKey === todayKey;
            const isSelected = selectedDate === dateKey;
            const className = [
              'calendar-day',
              `calendar-day--${count}`,
              isToday ? 'is-today' : '',
              isSelected ? 'is-selected' : '',
              isFuture ? 'is-future' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <button
                key={dateKey}
                type="button"
                className={className}
                disabled={isFuture}
                aria-label={`${formatCalendarDate(dateKey)}, ${count} of 3 meals completed`}
                aria-pressed={isSelected}
                onClick={() => setSelectedDate(dateKey)}
              >
                <span className="calendar-day__number">{date.getDate()}</span>
                <span className="calendar-day__count" aria-hidden="true">
                  {count}/3
                </span>
              </button>
            );
          })}
        </div>

        <p className="calendar-summary">
          {monthSummary.totalMeals} meals completed · {monthSummary.perfectDays} perfect days ·{' '}
          {monthSummary.percent}% completion
        </p>

        <div className="calendar-detail">
          <div className="history-summary">
            <span>{formatHistoryDate(selectedDate)}</span>
            <span className="history-summary__percent">
              {selectedCount} of {MEALS.length} meals
            </span>
          </div>
          <ul className="history-list">
            {MEALS.map((meal) => {
              const completedAt = selectedDay[meal.id];
              return (
                <li key={meal.id} className={`history-item${completedAt ? ' is-completed' : ''}`}>
                  <span className="history-item__mark" aria-hidden="true">
                    {completedAt ? <Check size={14} strokeWidth={3} /> : <Minus size={14} />}
                  </span>
                  <span className="history-item__name">{meal.name}</span>
                  <span className="history-item__time">
                    {completedAt ? `Completed at ${formatTimestamp(completedAt)}` : 'Not completed'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
