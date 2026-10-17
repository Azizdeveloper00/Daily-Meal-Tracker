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

## Data and migration

Completion times are stored as ISO timestamps and displayed in the user's local time. The frontend sends local `YYYY-MM-DD` keys to the API, so the server does not decide which day is current.

On first connection, existing cached records are uploaded only if the database has no records. Existing cached schedule and theme settings are also initialized when the database has no settings document. The local cache remains in the browser as a backup.
