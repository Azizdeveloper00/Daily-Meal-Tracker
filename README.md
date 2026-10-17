# Daily Meal Tracker

React + Vite + Express + MongoDB Atlas. The browser keeps a LocalStorage cache for offline startup and backup; MongoDB is the source of truth when the API is available.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set the required variables described below. Keep `.env` private and do not commit it.
3. Run both services:

   ```bash
   npm run dev:all
   ```

Vite serves the frontend and proxies `/api` requests to the Express server on port `5000` by default. Set `PORT` in `.env` to change the API port.

You can also run the services separately with `npm run server` and `npm run dev`, or create a production frontend build with `npm run build`.

## Deploy as one service (Render)

Create one Render **Web Service** for this repository:

1. Set the build command to `npm install && npm run build`.
2. Set the start command to `npm start`.
3. Add the environment variables listed below in Render's Environment settings.
4. Deploy. Express serves the Vite build from `dist` and handles `/api` on the same domain. Set `NODE_ENV` to `production`; Render supplies `PORT`.

Required environment variables:

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | MongoDB Atlas connection string, including the database name. Ensure the deployment host is allowed in Atlas Network Access. |
| `APP_PASSWORD` | A strong, private password used to sign in to the app. |
| `SESSION_SECRET` | A long random secret of at least 32 characters used to sign the httpOnly login cookie. Keep it private and stable between deploys. |
| `NODE_ENV` | `production` for deployment; use `development` locally. |

`PORT` is optional locally (defaults to `5000`) and is assigned by Render in production. The login session cookie is httpOnly, secure in production, and expires after seven days. API endpoints require a valid login session.

## App features

- Meal reminders are enabled by default and trigger 30 minutes before a meal and again when its scheduled time arrives, unless that meal is already completed. Change the lead time from 5 to 120 minutes or disable reminders in Settings. Browser notifications are optional; the app also shows in-app reminder banners. Notifications require browser permission, and reminders run while the app is open in a tab or installed PWA.
- Set a name in Settings to personalize the greeting, reminders, and meal appreciation messages. The name, reminder toggle, and lead time are saved with schedule and theme in MongoDB and the browser cache.
- The Calendar shows completion counts, month totals, perfect days, and selected-day completion times. Its monthly completion percentage counts elapsed days only for the current month, excluding future dates.
- The app can be installed as a PWA on supported browsers. Its app shell and static resources are cached for basic offline opening; tracker data remains in the existing LocalStorage cache. API requests are never cached. An offline session can display cached data after a successful login on that device; edits still need the server and retain the app's normal rollback behavior when requests fail.

## Install and test the PWA

1. Deploy the app over HTTPS (or use `localhost` for local testing) and open it in a supported browser.
2. Use the browser's **Install app** prompt from Settings, or its install option in the address bar/menu. On iOS Safari, tap **Share**, then **Add to Home Screen**.
3. To test offline use, sign in while online, open the app once to allow its service worker to cache the shell, then use browser developer tools to set the network to **Offline** and reload. The app shell and LocalStorage data should open; API changes cannot sync until the connection returns.
4. For a Lighthouse PWA check, open Chrome DevTools → **Lighthouse**, select **Progressive Web App**, and run the report against the deployed HTTPS URL (or localhost).

The service worker caches the current HTML network-first and pre-caches the generated JavaScript, CSS, icons, and available Google Font assets. It never caches `/api`, authentication endpoints, or responses carrying `Set-Cookie`. When an updated worker is ready, use its **Refresh** button at a convenient time; the app does not reload automatically. Change the `CACHE_NAME` version in `public/sw.js` when intentionally starting a fresh app-shell cache. The icon PNG files are generated from `public/icons/meal-tracker-icon.svg`.

## Data and migration

Completion times are stored as ISO timestamps and displayed in the user's local time. The frontend sends local `YYYY-MM-DD` keys to the API, so the server does not decide which day is current.

On first connection, existing cached records are uploaded only if the database has no records. Existing cached schedule and theme settings are also initialized when the database has no settings document. The local cache remains in the browser as a backup.
