import mongoose from 'mongoose';

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const settingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'default' },
    schedule: {
      breakfast: { type: String, required: true, match: timePattern },
      lunch: { type: String, required: true, match: timePattern },
      dinner: { type: String, required: true, match: timePattern },
    },
    theme: { type: String, enum: ['light', 'dark', null], default: null },
    name: { type: String, trim: true, maxlength: 30, default: '' },
    remindersEnabled: { type: Boolean, default: true },
    reminderMinutes: { type: Number, min: 5, max: 120, default: 30 },
  },
  { versionKey: false },
);

export default mongoose.model('Settings', settingsSchema);
