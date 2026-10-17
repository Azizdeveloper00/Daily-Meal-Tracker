let deferredInstallPrompt = null;
const listeners = new Set();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    listeners.forEach((listener) => listener(true));
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    listeners.forEach((listener) => listener(false));
  });
}

export function hasInstallPrompt() {
  return Boolean(deferredInstallPrompt);
}

export function subscribeInstallPrompt(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function promptInstall() {
  if (!deferredInstallPrompt) return false;
  const promptEvent = deferredInstallPrompt;
  deferredInstallPrompt = null;
  listeners.forEach((listener) => listener(false));
  await promptEvent.prompt();
  return (await promptEvent.userChoice).outcome === 'accepted';
}
