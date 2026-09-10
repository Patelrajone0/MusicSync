const DEVICE_ID_KEY = 'musicsync_device_id';
const LEGACY_USER_ID_KEY = 'musicsync_user_id';

/**
 * Returns a persistent, unique identifier for this physical device/browser.
 * Stored in localStorage so it persists across page refreshes, tab reloads, and browser sessions.
 */
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id || !id.trim()) {
      // Check if favorites already created an ID to unify them
      const legacyId = localStorage.getItem(LEGACY_USER_ID_KEY);
      if (legacyId && legacyId.trim()) {
        id = legacyId;
      } else {
        id = `dev_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
      }
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch (e) {
    return 'fallback_device_id';
  }
}
