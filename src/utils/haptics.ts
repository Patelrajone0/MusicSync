/**
 * Mobile Haptic Feedback Utility
 * Provides subtle tactile feedback on mobile devices (Android Chrome, PWA/standalone WebApps)
 * to deliver an authentic, native app feel. Fails gracefully and silently on unsupported platforms.
 */

export const haptics = {
  /**
   * Subtle tick (10ms)
   * Ideal for queue reordering, micro-interactions, tab switches, and light touches.
   */
  light: () => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(10);
      }
    } catch (e) {
      // Graceful fallback
    }
  },

  /**
   * Crisp tactile click (18ms)
   * Ideal for Play/Pause, Skip Next, and Previous Track buttons.
   */
  medium: () => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(18);
      }
    } catch (e) {
      // Graceful fallback
    }
  },

  /**
   * Rewarding dual-pulse ([12ms, 35ms pause, 18ms])
   * Ideal for Favoriting a song, adding a track to the queue, or copying a room code.
   */
  success: () => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate([12, 35, 18]);
      }
    } catch (e) {
      // Graceful fallback
    }
  },

  /**
   * Micro-pulse (8ms)
   * Ideal for scrubber seeking, slider adjustment, and drag boundary tracking.
   */
  selection: () => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(8);
      }
    } catch (e) {
      // Graceful fallback
    }
  },

  /**
   * Double warning bump ([25ms, 50ms pause, 25ms])
   * Ideal for destructive actions like removing a song from queue or leaving a room.
   */
  warning: () => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate([25, 50, 25]);
      }
    } catch (e) {
      // Graceful fallback
    }
  },
};
