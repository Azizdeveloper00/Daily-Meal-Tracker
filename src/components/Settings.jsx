import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { MEALS } from '../data/meals';

function currentNotificationPermission() {
  return typeof Notification === 'undefined' ? 'unavailable' : Notification.permission;
}

export default function Settings({
  schedule,
  onChangeTime,
  onReset,
  name,
  onSaveName,
  remindersEnabled,
  onToggleReminders,
  reminderMinutes,
  onChangeReminderMinutes,
}) {
  const [nameDraft, setNameDraft] = useState(name);
  const [minutesDraft, setMinutesDraft] = useState(String(reminderMinutes));
  const [permission, setPermission] = useState(currentNotificationPermission);

  useEffect(() => setNameDraft(name), [name]);
  useEffect(() => setMinutesDraft(String(reminderMinutes)), [reminderMinutes]);

  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      setPermission('unavailable');
      return;
    }
    try {
      setPermission(await Notification.requestPermission());
    } catch {
      setPermission(Notification.permission);
    }
  };

  const commitReminderMinutes = () => {
    const minutes = Number(minutesDraft);
    if (Number.isInteger(minutes) && minutes >= 5 && minutes <= 120) {
      onChangeReminderMinutes(minutes);
    } else {
      setMinutesDraft(String(reminderMinutes));
    }
  };

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

        <div className="settings-subsection">
          <h3 className="settings-subsection__title">Meal reminders</h3>
          <label className="settings-row">
            <span>Meal reminders</span>
            <input
              type="checkbox"
              checked={remindersEnabled}
              onChange={(event) => onToggleReminders(event.target.checked)}
            />
          </label>
          <label className="settings-row settings-row--reminder">
            <span>Remind me</span>
            <input
              className="settings-number"
              type="number"
              min="5"
              max="120"
              step="1"
              value={minutesDraft}
              disabled={!remindersEnabled}
              onChange={(event) => setMinutesDraft(event.target.value)}
              onBlur={commitReminderMinutes}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur();
                }
              }}
              aria-label="Minutes before scheduled meal"
            />
            <span>minutes before</span>
          </label>
          <div className="settings-notification">
            <button
              type="button"
              className="button button--small"
              onClick={requestNotificationPermission}
              disabled={permission === 'unavailable'}
            >
              Enable notifications
            </button>
            <span>Permission: {permission}</span>
          </div>
          <p className="panel__intro settings-note">Reminders work while the app is open.</p>
        </div>

        <div className="settings-subsection">
          <h3 className="settings-subsection__title">Your name</h3>
          <form
            className="settings-name"
            onSubmit={(event) => {
              event.preventDefault();
              onSaveName(nameDraft.trim().slice(0, 30));
            }}
          >
            <input
              type="text"
              maxLength={30}
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value.slice(0, 30))}
              aria-label="Your name"
            />
            <button
              type="submit"
              className="button button--small"
              disabled={nameDraft.trim() === name}
            >
              Save
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
