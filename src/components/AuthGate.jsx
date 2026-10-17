import { cloneElement, isValidElement, useCallback, useEffect, useState } from 'react';
import { getAuthSession, logIn, logOut } from '../api/authApi';
import Login from './Login';

const OFFLINE_SESSION_KEY = 'daily-meal-tracker:offline-session';

function hasOfflineSession() {
  try {
    return localStorage.getItem(OFFLINE_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveOfflineSession(authenticated) {
  try {
    if (authenticated) localStorage.setItem(OFFLINE_SESSION_KEY, 'true');
    else localStorage.removeItem(OFFLINE_SESSION_KEY);
  } catch {
    // Offline access is optional when browser storage is unavailable.
  }
}

export default function AuthGate({ children }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const checkSession = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const session = await getAuthSession();
      setAuthenticated(session.authenticated);
      saveOfflineSession(session.authenticated);
    } catch (requestError) {
      const canOpenOffline =
        !navigator.onLine && hasOfflineSession();
      setAuthenticated(canOpenOffline);
      if (!canOpenOffline) setError(`Could not connect to the app. ${requestError.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  useEffect(() => {
    const handleOnline = async () => {
      try {
        const session = await getAuthSession();
        setAuthenticated(session.authenticated);
        if (!session.authenticated) saveOfflineSession(false);
      } catch {
        // Keep an already-open offline session until the API can be reached.
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const handleLogin = async (password) => {
    setBusy(true);
    setError('');
    try {
      await logIn(password);
      saveOfflineSession(true);
      setAuthenticated(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logOut();
      saveOfflineSession(false);
      setAuthenticated(false);
      return '';
    } catch (requestError) {
      return `Could not sign out. ${requestError.message}`;
    }
  };

  if (loading) {
    return (
      <main className="app login-screen" aria-live="polite">
        <section className="hero login-card">Loading Daily Meal Tracker…</section>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <Login
        onSubmit={handleLogin}
        onRetry={error.startsWith('Could not connect') ? checkSession : null}
        error={error}
        busy={busy}
      />
    );
  }

  return isValidElement(children) ? cloneElement(children, { onLogout: handleLogout }) : children;
}
