export const MEALS = [
  { id: 'breakfast', name: 'Breakfast' },
  { id: 'lunch', name: 'Lunch' },
  { id: 'dinner', name: 'Dinner' },
];

export const MEAL_IDS = MEALS.map((meal) => meal.id);

// 24-hour "HH:MM" strings, so they work directly with <input type="time">.
export const DEFAULT_SCHEDULE = {
  breakfast: '09:00',
  lunch: '14:00',
  dinner: '21:00',
};
