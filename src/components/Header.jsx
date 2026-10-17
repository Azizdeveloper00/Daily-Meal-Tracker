import { Moon, Sun, Utensils } from 'lucide-react';
import { formatLongDate, getGreeting } from '../utils/date';

function getEncouragement(completedCount, total) {
  if (completedCount === total) return 'All meals done today. Well looked after.';
  if (completedCount === 0) return 'Nothing logged yet. Tick each meal as you eat it.';
  return 'Good progress. Keep going.';
}

export default function Header({
  now,
  completedCount,
  totalMeals,
  theme,
  onToggleTheme,
  onLogout,
  name,
}) {
  const percent = Math.round((completedCount / totalMeals) * 100);

  return (
    <header className="hero">
      <div className="hero__bar">
        <h1 className="brand">
          <Utensils size={18} aria-hidden="true" />
          Daily Meal Tracker
        </h1>
        <div className="hero__actions">
          <button type="button" className="button button--small" onClick={onLogout}>
            Sign out
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      <p className="hero__date">{formatLongDate(now)}</p>
      <p className="hero__greeting">
        {getGreeting(now)}
        {name ? `, ${name}` : ''}
      </p>
      <p className="hero__note">{getEncouragement(completedCount, totalMeals)}</p>

      <div className="progress" aria-live="polite">
        <div className="progress__text">
          <span className="progress__count">
            {completedCount} of {totalMeals} meals completed
          </span>
          <span className="progress__percent">{percent}%</span>
        </div>
        <div
          className="progress__track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label="Daily meal progress"
        >
          <div className="progress__fill" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </header>
  );
}
