import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Minus, UtensilsCrossed } from 'lucide-react';
import { MEALS } from '../data/meals';
import {
  daysBetween,
  formatHistoryDate,
  formatTimestamp,
  isValidDateKey,
  shiftDateKey,
} from '../utils/date';

function getDayLabel(offset) {
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Yesterday';
  return `${offset} days ago`;
}

export default function History({ records, todayKey }) {
  // Days back from today. Tracking an offset keeps "Today" correct after midnight.
  const [offset, setOffset] = useState(0);

  const viewKey = shiftDateKey(todayKey, -offset);
  const recordedDates = Object.keys(records).sort();
  const earliestKey =
    recordedDates.length > 0 && recordedDates[0] < todayKey ? recordedDates[0] : todayKey;

  const canGoBack = viewKey > earliestKey;
  const canGoForward = offset > 0;

  const day = records[viewKey] ?? {};
  const completedCount = MEALS.filter((meal) => day[meal.id]).length;
  const percent = Math.round((completedCount / MEALS.length) * 100);

  const handleDatePick = (event) => {
    const picked = event.target.value;
    if (!isValidDateKey(picked) || picked > todayKey) return;
    setOffset(daysBetween(picked, todayKey));
  };

  return (
    <section className="section" aria-labelledby="history-title">
      <h2 id="history-title" className="section__title">
        History
      </h2>

      <div className="panel">
        <div className="history-nav">
          <button
            type="button"
            className="icon-button"
            onClick={() => setOffset((value) => value + 1)}
            disabled={!canGoBack}
            aria-label="Previous day"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="history-nav__current">
            <strong>{getDayLabel(offset)}</strong>
            <span>{formatHistoryDate(viewKey)}</span>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={() => setOffset((value) => Math.max(0, value - 1))}
            disabled={!canGoForward}
            aria-label="Next day"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="history-tools">
          <label className="history-tools__date">
            <span>Jump to date</span>
            <input
              type="date"
              value={viewKey}
              min={earliestKey}
              max={todayKey}
              onChange={handleDatePick}
            />
          </label>
          {offset > 0 && (
            <button type="button" className="button button--small" onClick={() => setOffset(0)}>
              Back to today
            </button>
          )}
        </div>

        <div className="history-summary">
          <span>
            {completedCount} of {MEALS.length} meals completed
          </span>
          <span className="history-summary__percent">{percent}%</span>
        </div>

        {completedCount === 0 ? (
          <div className="empty">
            <UtensilsCrossed size={22} aria-hidden="true" />
            <p className="empty__title">No meals logged on this day</p>
            <p className="empty__text">
              {offset === 0
                ? 'Tick a meal above and it will appear here.'
                : 'Nothing was recorded for this date.'}
            </p>
          </div>
        ) : null}

        <ul className="history-list">
          {MEALS.map((meal) => {
            const completedAt = day[meal.id];
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
    </section>
  );
}
