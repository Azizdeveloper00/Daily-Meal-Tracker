import { RotateCcw } from 'lucide-react';
import { MEALS } from '../data/meals';

export default function Settings({ schedule, onChangeTime, onReset }) {
  return (
    <section className="section" aria-labelledby="settings-title">
      <h2 id="settings-title" className="section__title">
        Settings
      </h2>

      <div className="panel">
        <p className="panel__intro">
          Scheduled times are reminders only. Changing them never alters a recorded completion time.
        </p>

        <div className="settings-list">
          {MEALS.map((meal) => (
            <label key={meal.id} className="settings-row">
              <span>{meal.name} time</span>
              <input
                type="time"
                value={schedule[meal.id]}
                onChange={(event) => onChangeTime(meal.id, event.target.value)}
              />
            </label>
          ))}
        </div>

        <button type="button" className="button button--small" onClick={onReset}>
          <RotateCcw size={14} aria-hidden="true" />
          Reset to default times
        </button>
      </div>
    </section>
  );
}
