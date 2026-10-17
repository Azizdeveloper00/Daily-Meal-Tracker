import mongoose from 'mongoose';

const mealRecordSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    meal: {
      type: String,
      required: true,
      enum: ['breakfast', 'lunch', 'dinner'],
    },
    completedAt: { type: Date, required: true },
  },
  { timestamps: false },
);

mealRecordSchema.index({ date: 1, meal: 1 }, { unique: true });

export default mongoose.model('MealRecord', mealRecordSchema);
