declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

export const GA_MEASUREMENT_ID = 'G-9VSKEHNW6R';

export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
};

export const analytics = {
  trackRoomCreated: (roomCode: string, networkMode?: string) => {
    trackEvent('room_created', {
      room_code: roomCode,
      network_mode: networkMode || 'local',
    });
  },

  trackRoomJoined: (roomCode: string, role?: string) => {
    trackEvent('room_joined', {
      room_code: roomCode,
      user_role: role || 'listener',
    });
  },

  trackPlay: (title?: string, artist?: string) => {
    trackEvent('play_track', {
      track_title: title || 'Unknown',
      track_artist: artist || 'Unknown',
    });
  },

  trackPause: (title?: string) => {
    trackEvent('pause_track', {
      track_title: title || 'Unknown',
    });
  },

  trackSearch: (query: string) => {
    trackEvent('search_music', {
      search_term: query,
    });
  },

  trackPwaInstall: () => {
    trackEvent('pwa_installed');
  },
};
