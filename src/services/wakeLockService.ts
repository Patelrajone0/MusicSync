/**
 * Screen Wake Lock Service
 * Keeps mobile and desktop screens awake during synchronized music playback,
 * preventing iOS Safari, Android Chrome, and laptops from sleeping or throttling
 * background JavaScript timers and WebSockets.
 */

class WakeLockService {
  private sentinel: any = null;
  private isRequested: boolean = false;
  private isSupported: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      this.isSupported = true;
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  public getIsSupported(): boolean {
    return this.isSupported;
  }

  public getIsActive(): boolean {
    return Boolean(this.sentinel && !this.sentinel.released);
  }

  private handleVisibilityChange = async () => {
    // When returning to the tab from background or lock screen, re-acquire the lock if playback is active
    if (document.visibilityState === 'visible' && this.isRequested) {
      await this.requestLock();
    }
  };

  /**
   * Request a screen wake lock
   */
  public async requestLock(): Promise<boolean> {
    this.isRequested = true;
    if (!this.isSupported || typeof navigator === 'undefined' || !(navigator as any).wakeLock) {
      return false;
    }

    // If an active, unreleased sentinel already exists, reuse it
    if (this.sentinel && !this.sentinel.released) {
      return true;
    }

    try {
      this.sentinel = await (navigator as any).wakeLock.request('screen');
      this.sentinel.addEventListener('release', () => {
        this.sentinel = null;
        // If release happened while playback is still supposed to be active (and tab is visible), re-request
        if (this.isRequested && typeof document !== 'undefined' && document.visibilityState === 'visible') {
          this.requestLock().catch(() => {});
        }
      });
      return true;
    } catch (err: any) {
      // Common reasons: Low power mode, battery saver, document inactive or obscured
      this.sentinel = null;
      return false;
    }
  }

  /**
   * Release screen wake lock to allow normal system sleep
   */
  public async releaseLock(): Promise<void> {
    this.isRequested = false;
    if (this.sentinel) {
      try {
        await this.sentinel.release();
      } catch (e) {
        // Ignored if already released
      }
      this.sentinel = null;
    }
  }

  /**
   * Automatically synchronize wake lock status with room playback
   */
  public syncWithPlayback(status: 'playing' | 'paused' | 'stopped' | 'buffering' | string) {
    if (status === 'playing' || status === 'buffering') {
      this.requestLock().catch(() => {});
    } else {
      this.releaseLock().catch(() => {});
    }
  }
}

export const wakeLockService = new WakeLockService();
