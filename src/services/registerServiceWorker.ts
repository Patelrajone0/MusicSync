// Service Worker Registration for MusicSync PWA

export function registerServiceWorker() {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          // Check for background updates
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (!installingWorker) return;
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.info('[PWA] New version available! Reload to update.');
              }
            };
          };
        })
        .catch((error) => {
          console.debug('[PWA] Service worker registration deferred or failed:', error);
        });
    });
  }
}
