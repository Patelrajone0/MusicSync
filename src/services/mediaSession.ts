import { Track } from '../types';
import { cleanTrackTitle } from './musicApi';

export interface MediaSessionHandlers {
  onPlay?: () => void;
  onPause?: () => void;
  onSkip?: () => void;
  onPrevious?: () => void;
  onSeek?: (seekTime: number) => void;
}

class MediaSessionService {
  private isSupported: boolean = false;
  private currentTrack: Track | null = null;
  private currentRoomCode: string = '';
  private handlers: MediaSessionHandlers = {};
  private currentPosition: number = 0;
  private currentDuration: number = 0;
  private lastPositionThrottle: number = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator && window.MediaMetadata) {
      this.isSupported = true;
      this.setupActionHandlers();
    }
  }

  public getIsSupported(): boolean {
    return this.isSupported;
  }

  public setHandlers(handlers: MediaSessionHandlers) {
    this.handlers = handlers;
  }

  public setRoomCode(roomCode: string) {
    this.currentRoomCode = roomCode;
    if (this.currentTrack) {
      this.updateMetadata(this.currentTrack);
    }
  }

  public updateMetadata(track: Track | null) {
    this.currentTrack = track;
    if (!this.isSupported) return;

    if (!track) {
      try {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';
      } catch (e) {}
      return;
    }

    try {
      const albumTitle = this.currentRoomCode
        ? `MusicSync • Room ${this.currentRoomCode}`
        : 'MusicSync Zero-Latency Audio';

      // Generate high-resolution artwork variants for Lock Screen, Apple Watch & Car Displays
      const artwork = this.generateArtworkList(track.artwork);

      navigator.mediaSession.metadata = new MediaMetadata({
        title: cleanTrackTitle(track.title, track.artist),
        artist: track.artist || 'MusicSync Room',
        album: track.album || albumTitle,
        artwork,
      });
    } catch (err) {
      console.warn('Failed to set MediaSession metadata:', err);
    }
  }

  public setPlaybackState(state: 'playing' | 'paused' | 'none') {
    if (!this.isSupported) return;
    try {
      navigator.mediaSession.playbackState = state;
    } catch (e) {}
  }

  public setPositionState(position: number, duration: number, playbackRate: number = 1.0) {
    this.currentPosition = position;
    this.currentDuration = duration;

    if (!this.isSupported) return;
    if (typeof navigator.mediaSession.setPositionState !== 'function') return;

    // Throttle updates to avoid CPU overhead and UI jitter on lock screens
    const now = performance.now();
    if (now - this.lastPositionThrottle < 900 && position > 0.5) {
      return;
    }
    this.lastPositionThrottle = now;

    if (
      Number.isFinite(duration) &&
      duration > 0 &&
      Number.isFinite(position) &&
      position >= 0 &&
      position <= duration + 2
    ) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(1, duration),
          playbackRate: Math.max(0.25, Math.min(2.0, playbackRate || 1.0)),
          position: Math.min(position, duration),
        });
      } catch (e) {
        // Safe to ignore intermittent position clamp errors
      }
    }
  }

  private generateArtworkList(artworkUrl?: string): MediaImage[] {
    if (!artworkUrl) {
      return [
        { src: '/favicon.svg', sizes: '96x96', type: 'image/svg+xml' },
        { src: '/favicon.svg', sizes: '512x512', type: 'image/svg+xml' },
      ];
    }

    // Enhance artwork resolution for retina displays and car navigation head units
    let highRes = artworkUrl;
    if (highRes.includes('100x100bb')) {
      highRes = highRes.replace('100x100bb', '600x600bb');
    } else if (highRes.includes('unsplash.com') && highRes.includes('w=100')) {
      highRes = highRes.replace('w=100', 'w=600');
    } else if (highRes.includes('unsplash.com') && !highRes.includes('w=')) {
      highRes = `${highRes}&w=600&auto=format&fit=crop&q=85`;
    }

    return [
      { src: artworkUrl, sizes: '96x96' },
      { src: artworkUrl, sizes: '128x128' },
      { src: artworkUrl, sizes: '192x192' },
      { src: highRes, sizes: '256x256' },
      { src: highRes, sizes: '384x384' },
      { src: highRes, sizes: '512x512' },
    ];
  }

  private setupActionHandlers() {
    const actionHandlers: [MediaSessionAction, (details: any) => void][] = [
      [
        'play',
        () => {
          this.setPlaybackState('playing');
          this.handlers.onPlay?.();
        },
      ],
      [
        'pause',
        () => {
          this.setPlaybackState('paused');
          this.handlers.onPause?.();
        },
      ],
      [
        'nexttrack',
        () => {
          this.handlers.onSkip?.();
        },
      ],
      [
        'previoustrack',
        () => {
          this.handlers.onPrevious?.();
        },
      ],
      [
        'seekto',
        (details: any) => {
          if (details && details.seekTime !== undefined && Number.isFinite(details.seekTime)) {
            this.setPositionState(details.seekTime, this.currentDuration);
            this.handlers.onSeek?.(details.seekTime);
          }
        },
      ],
      [
        'seekbackward',
        (details: any) => {
          const skipTime = details?.seekOffset || 10;
          const target = Math.max(0, this.currentPosition - skipTime);
          this.setPositionState(target, this.currentDuration);
          this.handlers.onSeek?.(target);
        },
      ],
      [
        'seekforward',
        (details: any) => {
          const skipTime = details?.seekOffset || 10;
          const target = Math.min(this.currentDuration, this.currentPosition + skipTime);
          this.setPositionState(target, this.currentDuration);
          this.handlers.onSeek?.(target);
        },
      ],
      [
        'stop',
        () => {
          this.setPlaybackState('none');
          this.handlers.onPause?.();
        },
      ],
    ];

    for (const [action, handler] of actionHandlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (err) {
        // Browser might not support certain optional actions
      }
    }
  }
}

export const mediaSessionService = new MediaSessionService();
