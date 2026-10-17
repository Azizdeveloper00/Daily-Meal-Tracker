import { useState } from 'react';
import { Utensils } from 'lucide-react';

export default function Login({ onSubmit, onRetry, error, busy }) {
  const [password, setPassword] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit(password);
    setPassword('');
  };

  return (
    <main className="app login-screen">
      <section className="hero login-card" aria-labelledby="login-title">
        <h1 className="brand" id="login-title">
          <Utensils size={18} aria-hidden="true" />
          Daily Meal Tracker
        </h1>
        <p className="panel__intro">Enter your password to continue.</p>
        <form className="login-form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="app-password">
            Password
          </label>
          <input
            id="app-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoFocus
          />
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="button" disabled={busy || !password}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          {onRetry && (
            <button type="button" className="button button--small" onClick={onRetry}>
              Retry connection
            </button>
          )}
        </form>
      </section>
    </main>
  );
}
