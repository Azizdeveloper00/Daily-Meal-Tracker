import { useEffect, useRef, useState } from 'react';

export default function PwaStatus({ children }) {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [updateReady, setUpdateReady] = useState(false);
  const registrationRef = useRef(null);
  const refreshRequestedRef = useRef(false);

  useEffect(() => {
    const updateOnlineStatus = () => setOffline(!navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          registrationRef.current = registration;

          const checkWaitingWorker = () => {
            if (registration.waiting && navigator.serviceWorker.controller) {
              setUpdateReady(true);
            }
          };
          checkWaitingWorker();
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            installingWorker?.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed') checkWaitingWorker();
            });
          });
          void registration.update();
        })
        .catch((error) => {
          console.error('Could not register the service worker:', error);
        });

      const handleControllerChange = () => {
        if (refreshRequestedRef.current) window.location.reload();
      };
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        window.removeEventListener('online', updateOnlineStatus);
        window.removeEventListener('offline', updateOnlineStatus);
      };
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const refresh = () => {
    refreshRequestedRef.current = true;
    registrationRef.current?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  };

  return (
    <>
      {offline && (
        <div className="pwa-status pwa-status--offline" role="status">
          Offline
        </div>
      )}
      {updateReady && (
        <div className="pwa-status pwa-status--update" role="status">
          <span>A new version is available.</span>
          <button type="button" className="button button--small" onClick={refresh}>
            Refresh
          </button>
        </div>
      )}
      {children}
    </>
  );
}
