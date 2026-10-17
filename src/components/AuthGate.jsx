import { cloneElement, isValidElement, useCallback, useEffect, useState } from 'react';
import { getAuthSession, logIn, logOut } from '../api/authApi';
import Login from './Login';

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
    } catch (requestError) {
      setError(`Could not connect to the app. ${requestError.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  const handleLogin = async (password) => {
    setBusy(true);
    setError('');
    try {
      await logIn(password);
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
