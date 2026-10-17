async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }
  return payload;
}

export const getRecords = () => request('/api/records');

export const saveMeal = (date, meal, completedAt) =>
  request(`/api/records/${encodeURIComponent(date)}/${encodeURIComponent(meal)}`, {
    method: 'PUT',
    body: JSON.stringify({ completedAt }),
  });

export const deleteMeal = (date, meal) =>
  request(`/api/records/${encodeURIComponent(date)}/${encodeURIComponent(meal)}`, {
    method: 'DELETE',
  });

export const deleteDay = (date) =>
  request(`/api/records/${encodeURIComponent(date)}`, { method: 'DELETE' });

export const getSettings = () => request('/api/settings');

export const saveSettings = (settings) =>
  request('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
