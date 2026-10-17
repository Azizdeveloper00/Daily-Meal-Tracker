import { Check, Clock } from 'lucide-react';
import { MEAL_ICONS } from './mealIcons';

/**
 * One meal. Scheduled time and actual completion time are separate fields:
 * the scheduled time never changes when the meal is ticked.
 */
export default function MealCard({
  meal,
  scheduledLabel,
  completedLabel,
  isCompleted,
  onToggle,
}) {
  const Icon = MEAL_ICONS[meal.id];

  return (
    <article className={`meal-card${isCompleted ? ' is-completed' : ''}`}>
      <div className="meal-card__top">
        <span className="meal-card__icon" aria-hidden="true">
          <Icon size={20} />
        </span>
        {isCompleted ? (
          <span className="badge badge--done">
            <Check size={13} aria-hidden="true" />
            Completed
          </span>
        ) : (
          <span className="badge">
            <Clock size={13} aria-hidden="true" />
            Pending
          </span>
        )}
      </div>

      <h3 className="meal-card__name">{meal.name}</h3>

      <dl className="meal-times">
        <div className="meal-times__row">
          <dt>Scheduled</dt>
          <dd>{scheduledLabel}</dd>
        </div>
        <div className="meal-times__row">
          <dt>Completed at</dt>
          <dd className={isCompleted ? 'meal-times__actual' : 'meal-times__empty'}>
            {isCompleted ? completedLabel : 'Not yet'}
          </dd>
        </div>
      </dl>

      <label className="check">
        <input
          type="checkbox"
          className="check__input"
          checked={isCompleted}
          onChange={(event) => onToggle(meal, event.target.checked)}
        />
        <span className="check__box" aria-hidden="true">
          <Check size={14} strokeWidth={3} />
        </span>
        <span className="check__label">Mark as completed</span>
      </label>
    </article>
  );
}
