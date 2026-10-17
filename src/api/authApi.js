async function authRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}

export const getAuthSession = () => authRequest('/api/auth/session');

export const logIn = (password) =>
  authRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });

export const logOut = () => authRequest('/api/auth/logout', { method: 'POST' });
