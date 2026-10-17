import { timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import MealRecord from './models/MealRecord.js';
import Settings from './models/Settings.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 5000;
const isProduction = process.env.NODE_ENV === 'production';
const sessionCookie = 'meal_tracker_session';
const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;
const distDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const meals = ['breakfast', 'lunch', 'dinner'];
const defaultSchedule = { breakfast: '09:00', lunch: '14:00', dinner: '21:00' };
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const defaultReminderMinutes = 30;
const isoDateTimePattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

if (isProduction) app.set('trust proxy', 1);
const {
  'style-src': _defaultStyleSrc,
  'font-src': _defaultFontSrc,
  ...defaultCspDirectives
} = helmet.contentSecurityPolicy.getDefaultDirectives();
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...defaultCspDirectives,
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
      },
    },
  }),
);
app.use((request, response, next) => {
  const origin = request.get('Origin');
  if (!origin) return next();

  const allowedOrigin = isProduction
    ? `${request.protocol}://${request.get('host')}`
    : 'http://localhost:5173';
  if (origin !== allowedOrigin) {
    response.status(403).json({ error: 'Origin not allowed.' });
    return;
  }

  cors({ origin: allowedOrigin, credentials: true })(request, response, next);
});
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

app.use('/api', apiLimiter);
app.use(express.json());
app.use(cookieParser());

function cookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
  };
}

function getSession(request) {
  const token = request.cookies[sessionCookie];
  if (!token || !process.env.SESSION_SECRET) return null;
  try {
    return jwt.verify(token, process.env.SESSION_SECRET, { issuer: 'daily-meal-tracker' });
  } catch {
    return null;
  }
}

function authenticate(request, response, next) {
  if (!getSession(request)) {
    response.status(401).json({ error: 'Please log in to use Daily Meal Tracker.' });
    return;
  }
  next();
}

app.get('/api/auth/session', (request, response) => {
  response.json({ authenticated: Boolean(getSession(request)) });
});

app.post('/api/auth/login', loginLimiter, (request, response) => {
  const suppliedPassword = request.body?.password;
  const configuredPassword = process.env.APP_PASSWORD;
  if (typeof suppliedPassword !== 'string' || !configuredPassword) {
    response.status(401).json({ error: 'Incorrect password.' });
    return;
  }

  const supplied = Buffer.from(suppliedPassword);
  const configured = Buffer.from(configuredPassword);
  const matches =
    supplied.length === configured.length && timingSafeEqual(supplied, configured);
  if (!matches) {
    response.status(401).json({ error: 'Incorrect password.' });
    return;
  }

  const token = jwt.sign({ sub: 'owner' }, process.env.SESSION_SECRET, {
    expiresIn: '7d',
    issuer: 'daily-meal-tracker',
  });
  response.cookie(sessionCookie, token, { ...cookieOptions(), maxAge: sessionDurationMs });
  response.json({ authenticated: true });
});

app.post('/api/auth/logout', (_request, response) => {
  response.clearCookie(sessionCookie, cookieOptions());
  response.json({ authenticated: false });
});

app.use('/api', authenticate);

function isValidDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function asyncHandler(handler) {
  return async (request, response) => {
    try {
      await handler(request, response);
    } catch (error) {
      console.error(error);
      response.status(500).json({ error: 'The server could not complete the request.' });
    }
  };
}

app.get(
  '/api/records',
  asyncHandler(async (_request, response) => {
    const documents = await MealRecord.find().lean();
    const records = {};
    for (const document of documents) {
      records[document.date] ??= {};
      records[document.date][document.meal] = document.completedAt.toISOString();
    }
    response.json(records);
  }),
);

app.put(
  '/api/records/:date/:meal',
  asyncHandler(async (request, response) => {
    const { date, meal } = request.params;
    const { completedAt } = request.body ?? {};
    if (!isValidDateKey(date)) {
      response.status(400).json({ error: 'date must be a real date in YYYY-MM-DD format.' });
      return;
    }
    if (!meals.includes(meal)) {
      response.status(400).json({ error: 'meal must be breakfast, lunch, or dinner.' });
      return;
    }
    if (
      typeof completedAt !== 'string' ||
      !isoDateTimePattern.test(completedAt) ||
      !isValidDateKey(completedAt.slice(0, 10)) ||
      Number.isNaN(Date.parse(completedAt))
    ) {
      response.status(400).json({ error: 'completedAt must be a valid ISO date-time.' });
      return;
    }

    const document = await MealRecord.findOneAndUpdate(
      { date, meal },
      { $set: { completedAt: new Date(completedAt) } },
      { upsert: true, new: true, runValidators: true },
    );
    response.json({ date: document.date, meal: document.meal, completedAt: document.completedAt });
  }),
);

app.delete(
  '/api/records/:date/:meal',
  asyncHandler(async (request, response) => {
    const { date, meal } = request.params;
    if (!isValidDateKey(date)) {
      response.status(400).json({ error: 'date must be a real date in YYYY-MM-DD format.' });
      return;
    }
    if (!meals.includes(meal)) {
      response.status(400).json({ error: 'meal must be breakfast, lunch, or dinner.' });
      return;
    }
    await MealRecord.deleteOne({ date, meal });
    response.json({ success: true });
  }),
);

app.delete(
  '/api/records/:date',
  asyncHandler(async (request, response) => {
    const { date } = request.params;
    if (!isValidDateKey(date)) {
      response.status(400).json({ error: 'date must be a real date in YYYY-MM-DD format.' });
      return;
    }
    await MealRecord.deleteMany({ date });
    response.json({ success: true });
  }),
);

app.get(
  '/api/settings',
  asyncHandler(async (_request, response) => {
    const settings = await Settings.findById('default').lean();
    response.json({
      schedule: settings?.schedule ?? defaultSchedule,
      theme: settings?.theme ?? null,
      name: settings?.name ?? '',
      remindersEnabled: settings?.remindersEnabled ?? true,
      reminderMinutes: settings?.reminderMinutes ?? defaultReminderMinutes,
      configured: Boolean(settings),
    });
  }),
);

app.put(
  '/api/settings',
  asyncHandler(async (request, response) => {
    const {
      schedule,
      theme,
      name = '',
      remindersEnabled = true,
      reminderMinutes = defaultReminderMinutes,
    } = request.body ?? {};
    if (
      !schedule ||
      typeof schedule !== 'object' ||
      Array.isArray(schedule) ||
      meals.some((meal) => !timePattern.test(schedule[meal] ?? ''))
    ) {
      response.status(400).json({
        error: 'schedule must include breakfast, lunch, and dinner times in HH:MM format.',
      });
      return;
    }
    if (theme !== null && theme !== 'light' && theme !== 'dark') {
      response.status(400).json({ error: 'theme must be light, dark, or null.' });
      return;
    }
    if (typeof name !== 'string' || name.trim().length > 30) {
      response.status(400).json({ error: 'name must be a string of 0 to 30 characters.' });
      return;
    }
    if (typeof remindersEnabled !== 'boolean') {
      response.status(400).json({ error: 'remindersEnabled must be true or false.' });
      return;
    }
    if (
      !Number.isInteger(reminderMinutes) ||
      reminderMinutes < 5 ||
      reminderMinutes > 120
    ) {
      response.status(400).json({ error: 'reminderMinutes must be an integer from 5 to 120.' });
      return;
    }

    const settings = await Settings.findByIdAndUpdate(
      'default',
      { $set: { schedule, theme, name: name.trim(), remindersEnabled, reminderMinutes } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    ).lean();
    response.json({
      schedule: settings.schedule,
      theme: settings.theme,
      name: settings.name,
      remindersEnabled: settings.remindersEnabled,
      reminderMinutes: settings.reminderMinutes,
      configured: true,
    });
  }),
);

async function startServer() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required. Set it in your deployment environment or .env file.');
  }
  if (!process.env.APP_PASSWORD) {
    throw new Error('APP_PASSWORD is required. Set a private login password in the environment.');
  }
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET is required and must contain at least 32 characters.');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  await MealRecord.init();
  if (isProduction) {
    app.get('/manifest.webmanifest', (_request, response, next) => {
      response.type('application/manifest+json');
      response.sendFile(path.join(distDirectory, 'manifest.webmanifest'), (error) => {
        if (error) next(error);
      });
    });
    app.get('/sw.js', (_request, response, next) => {
      response.type('application/javascript');
      response.set('Cache-Control', 'no-cache');
      response.sendFile(path.join(distDirectory, 'sw.js'), (error) => {
        if (error) next(error);
      });
    });
    app.use(express.static(distDirectory));
    app.get('*', (request, response, next) => {
      if (request.path === '/api' || request.path.startsWith('/api/')) {
        next();
        return;
      }
      response.sendFile(path.join(distDirectory, 'index.html'), (error) => {
        if (error) next(error);
      });
    });
  }
  app.use((_request, response) => {
    response.status(404).json({ error: 'Endpoint not found.' });
  });
  app.use((error, _request, response, _next) => {
    const isMalformedJson = error.type === 'entity.parse.failed';
    response
      .status(isMalformedJson ? 400 : 500)
      .json({
        error: isMalformedJson
          ? 'Request body must contain valid JSON.'
          : 'Unexpected server error.',
      });
  });
  app.listen(port, () => {
    console.log(`Daily Meal Tracker API listening on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error(`Could not start API server: ${error.message}`);
  process.exitCode = 1;
});
