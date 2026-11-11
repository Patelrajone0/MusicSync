const PERFORMANCE_MODE_KEY = 'musicsync_performance_mode';

/**
 * Checks if Performance Mode is enabled.
 * Defaults to true if the device prefers reduced motion, or if saved in localStorage.
 */
export function getPerformanceMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const saved = localStorage.getItem(PERFORMANCE_MODE_KEY);
    if (saved !== null) {
      return saved === 'true';
    }
    // Check OS preference
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return true;
    }
  } catch {}
  return false;
}

/**
 * Sets Performance Mode and applies it immediately to the document root.
 */
export function setPerformanceMode(enabled: boolean) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (enabled) {
    root.setAttribute('data-performance-mode', 'true');
  } else {
    root.removeAttribute('data-performance-mode');
  }

  try {
    localStorage.setItem(PERFORMANCE_MODE_KEY, String(enabled));
  } catch {}

  window.dispatchEvent(
    new CustomEvent('musicsync_performance_mode_changed', { detail: { enabled } })
  );
}

/**
 * Initializes Performance Mode on app load.
 */
export function initPerformanceMode(): boolean {
  const enabled = getPerformanceMode();
  setPerformanceMode(enabled);
  return enabled;
}
