/**
 * MusicSync Dynamic Ad Scheduler
 * - 30 seconds delay on Login page (Lobby)
 * - At least 5 minutes (300 seconds) delay on Main page (Inside Room)
 */

declare global {
  interface Window {
    __MS_TRIGGER_MONETAG__?: () => void;
  }
}

export function triggerMonetagAds() {
  try {
    if (typeof window !== 'undefined') {
      if (typeof window.__MS_TRIGGER_MONETAG__ === 'function') {
        window.__MS_TRIGGER_MONETAG__();
      } else {
        // Fallback if index.html helper is unavailable
        if (!document.querySelector('script[data-zone="11822158"]')) {
          const s1 = document.createElement('script');
          s1.dataset.zone = '11822158';
          s1.src = 'https://nap5k.com/tag.min.js';
          document.body.appendChild(s1);
        }
        if (!document.querySelector('script[src*="5gvci.com"]')) {
          const s2 = document.createElement('script');
          s2.src = 'https://5gvci.com/act/files/tag.min.js?z=11821878';
          s2.setAttribute('data-cfasync', 'false');
          s2.async = true;
          document.body.appendChild(s2);
        }
      }
    }
  } catch (err) {
    console.warn('[AdManager] Ad trigger notice:', err);
  }
}
