import { socket } from './socket';
import { SyncStats, Track } from '../types';
import { mediaSessionService } from './mediaSession';

class SyncEngine {
  private audio: HTMLAudioElement | null = null;
  private preloadAudio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private masterVolume: number = 0.9;
  private crossfadeDuration: number = 2.5; // seconds

  // NTP Clock Sync State
  private clockOffset: number = 0; // serverTime - localClientTime
  private lastRtt: number = 0;
  private isNtpSynced: boolean = false;
  private ntpIntervalId: any = null;
  private hardwareDelayOffset: number = 0; // ms for Bluetooth/Soundbar calibration

  // Playback state
  private currentTrack: Track | null = null;
  private scheduledServerTime: number = 0;
  private startPosition: number = 0;
  private isPlaying: boolean = false;
  private scheduledTimerId: any = null;
  private driftCheckIntervalId: any = null;
  private lastDriftMs: number = 0;

  // Callbacks
  private onStatsChangeCallbacks: Set<(stats: SyncStats) => void> = new Set();
  private onPositionUpdateCallbacks: Set<(position: number, duration: number) => void> = new Set();
  private onTrackEndedCallback: (() => void) | null = null;

  constructor() {
    try {
      const savedDelay = localStorage.getItem('musicsync_hardware_delay');
      if (savedDelay !== null) {
        this.hardwareDelayOffset = parseInt(savedDelay, 10) || 0;
      }
      const savedCrossfade = localStorage.getItem('musicsync_crossfade_duration');
      if (savedCrossfade !== null) {
        this.crossfadeDuration = parseFloat(savedCrossfade) || 2.5;
      }
    } catch (e) {}

    this.initAudio();
    this.setupSocketListeners();
    if (socket.connected) {
      this.startNtpSync();
    }
  }

  // 1. Audio Initialization (Single Deterministic HTMLAudioElement)
  public initAudio() {
    if (typeof window === 'undefined') return;

    if (!this.audio) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.volume = this.masterVolume;

      audio.addEventListener('error', () => {
        console.error('[AudioEngine] Media error:', audio.error?.message || 'Media stream error', 'code:', audio.error?.code, 'src:', audio.src);
      });

      audio.addEventListener('ended', () => {
        if (this.onTrackEndedCallback) {
          this.onTrackEndedCallback();
        }
      });

      audio.addEventListener('timeupdate', () => {
        const current = audio.currentTime;
        const total = audio.duration || this.currentTrack?.duration || 0;
        this.notifyPositionUpdate(current, total);
      });

      this.audio = audio;
    }

    if (!this.preloadAudio) {
      const preload = new Audio();
      preload.preload = 'auto';
      preload.volume = 0;
      this.preloadAudio = preload;
    }
  }

  // 2. Unlock Audio on User Gesture
  public async unlockAudio(): Promise<boolean> {
    try {
      this.initAudio();

      if (this.audio) {
        this.audio.volume = this.masterVolume;

        // If a track is already loaded, start or un-pause it
        if (this.currentTrack && this.audio.src) {
          if (this.isPlaying) {
            await this.audio.play().catch(() => {});
          }
        } else {
          // Prime audio element with brief silent buffer so browser marks element as user-activated
          if (!this.audio.src) {
            this.audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
            const p = this.audio.play();
            if (p !== undefined) {
              await p.catch(() => {});
              this.audio.pause();
            }
          }
        }
      }

      socket.emit('set_audio_ready', { isReady: true });
      return true;
    } catch (err) {
      console.warn('[AudioEngine] Audio unlock warning:', err);
      return false;
    }
  }

  public setVolume(val: number) {
    const clamped = Math.max(0, Math.min(1, val));
    this.masterVolume = clamped;
    if (this.audio) {
      this.audio.volume = clamped;
    }
  }

  public getVolume(): number {
    return this.masterVolume;
  }

  public setCrossfadeDuration(seconds: number) {
    this.crossfadeDuration = Math.max(0, Math.min(8, seconds));
    try {
      localStorage.setItem('musicsync_crossfade_duration', this.crossfadeDuration.toString());
    } catch (e) {}
  }

  public getCrossfadeDuration(): number {
    return this.crossfadeDuration;
  }

  // 3. Preload Upcoming Song in background for Instant Playback
  public preloadNextTrack(track: Track | null) {
    if (!track || !track.audioUrl) return;
    this.initAudio();
    if (this.preloadAudio && this.preloadAudio.src !== track.audioUrl) {
      this.preloadAudio.src = track.audioUrl;
      this.preloadAudio.preload = 'auto';
      this.preloadAudio.load();
    }
  }

  // 4. NTP Clock Synchronization
  public startNtpSync() {
    if (this.ntpIntervalId) clearInterval(this.ntpIntervalId);

    let burstCount = 0;
    const burstInterval = setInterval(() => {
      this.pingServer();
      burstCount++;
      if (burstCount >= 5) {
        clearInterval(burstInterval);
        this.ntpIntervalId = setInterval(() => {
          this.pingServer();
        }, 3500);
      }
    }, 250);
  }

  public pingServer() {
    if (!socket.connected) return;
    const t0 = performance.now();
    socket.emit('ntp_ping', { t0 });
  }

  public async recalibrate(): Promise<SyncStats> {
    return new Promise((resolve) => {
      let pingsDone = 0;
      const samples: { rtt: number; offset: number }[] = [];

      const tempListener = ({ t0, serverTime }: { t0: number; serverTime: number }) => {
        const t1 = performance.now();
        const rtt = t1 - t0;
        const estimatedServerNow = serverTime + rtt / 2;
        const measuredOffset = estimatedServerNow - Date.now();
        samples.push({ rtt, offset: measuredOffset });
        pingsDone++;

        if (pingsDone >= 4) {
          socket.off('ntp_pong', tempListener);
          samples.sort((a, b) => a.rtt - b.rtt);
          const best = samples[0];
          this.lastRtt = best.rtt;
          this.clockOffset = best.offset;
          this.isNtpSynced = true;
          this.notifyStats();
          resolve(this.getStats());
        }
      };

      socket.on('ntp_pong', tempListener);

      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          this.pingServer();
        }, i * 100);
      }

      setTimeout(() => {
        socket.off('ntp_pong', tempListener);
        this.notifyStats();
        resolve(this.getStats());
      }, 1200);
    });
  }

  public setHardwareDelayOffset(ms: number) {
    this.hardwareDelayOffset = ms;
    try {
      localStorage.setItem('musicsync_hardware_delay', ms.toString());
    } catch (e) {}

    if (this.isPlaying && this.audio) {
      const serverNow = this.getServerTime();
      const elapsedSec = (serverNow - this.scheduledServerTime - this.hardwareDelayOffset) / 1000;
      const expectedPos = Math.max(0, this.startPosition + elapsedSec);
      this.audio.currentTime = expectedPos;
    }
    this.notifyStats();
  }

  public getHardwareDelayOffset(): number {
    return this.hardwareDelayOffset;
  }

  private setupSocketListeners() {
    socket.on('connect', () => {
      this.startNtpSync();
    });

    socket.on('reconnect', () => {
      this.startNtpSync();
    });

    socket.on('ntp_pong', ({ t0, serverTime }: { t0: number; serverTime: number }) => {
      const t1 = performance.now();
      const rtt = t1 - t0;
      this.lastRtt = rtt;

      const estimatedServerNow = serverTime + (rtt / 2);
      const measuredOffset = estimatedServerNow - Date.now();

      if (!this.isNtpSynced) {
        this.clockOffset = measuredOffset;
        this.isNtpSynced = true;
      } else {
        this.clockOffset = this.clockOffset * 0.75 + measuredOffset * 0.25;
      }

      this.notifyStats();
    });
  }

  public getServerTime(): number {
    return Date.now() + this.clockOffset;
  }

  // 5. Playback Scheduling with Exact NTP Millisecond Synchronization
  public schedulePlayback(track: Track, scheduledServerTime: number, startPosition: number = 0) {
    this.clearScheduledTimers();
    this.scheduledServerTime = scheduledServerTime;
    this.startPosition = startPosition;
    this.isPlaying = true;
    this.currentTrack = track;
    mediaSessionService.updateMetadata(track);
    mediaSessionService.setPlaybackState('playing');

    this.initAudio();
    if (!this.audio) return;

    // Load track into audio element if changed
    if (this.audio.src !== track.audioUrl) {
      this.audio.src = track.audioUrl;
      this.audio.load();
    }

    const currentServerTime = this.getServerTime();
    const delayMs = scheduledServerTime - currentServerTime - this.hardwareDelayOffset;

    if (delayMs > 0) {
      try {
        this.audio.currentTime = startPosition;
      } catch (e) {}
      this.scheduledTimerId = setTimeout(() => {
        this.executePlay(startPosition);
      }, delayMs);
    } else {
      const catchUpSec = Math.max(0, Math.abs(delayMs) / 1000);
      this.executePlay(startPosition + catchUpSec);
    }

    this.startDriftCorrectionLoop();
  }

  private executePlay(startSec: number) {
    if (!this.audio) return;

    if (Math.abs(this.audio.currentTime - startSec) > 0.05) {
      try {
        this.audio.currentTime = Math.max(0, startSec);
      } catch (e) {}
    }

    this.audio.volume = this.masterVolume;

    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('[AudioEngine] Playback promise error:', err);
      });
    }
  }

  public pausePlayback(atPosition?: number) {
    this.clearScheduledTimers();
    this.isPlaying = false;
    mediaSessionService.setPlaybackState('paused');

    if (this.audio) {
      this.audio.pause();
      if (typeof atPosition === 'number') {
        this.audio.currentTime = atPosition;
      }
      this.audio.playbackRate = 1.0;
    }

    this.lastDriftMs = 0;
    this.notifyStats();
  }

  public seekPlayback(position: number) {
    if (this.audio) {
      this.audio.currentTime = Math.max(0, position);
    }
  }

  // 6. Continuous Drift Correction Loop
  private startDriftCorrectionLoop() {
    if (this.driftCheckIntervalId) clearInterval(this.driftCheckIntervalId);

    this.driftCheckIntervalId = setInterval(() => {
      if (!this.isPlaying || !this.audio || this.audio.paused) return;

      const serverNow = this.getServerTime();
      const elapsedSec = (serverNow - this.scheduledServerTime - this.hardwareDelayOffset) / 1000;
      const expectedPos = this.startPosition + elapsedSec;
      const actualPos = this.audio.currentTime;

      // Drift in ms: positive = ahead, negative = behind
      const driftMs = (actualPos - expectedPos) * 1000;
      this.lastDriftMs = Math.round(driftMs);

      // Micro-Rate Adjustment to keep all devices tightly locked within <25ms
      if (Math.abs(driftMs) < 25) {
        if (this.audio.playbackRate !== 1.0) {
          this.audio.playbackRate = 1.0;
        }
      } else if (driftMs > 25 && driftMs < 250) {
        this.audio.playbackRate = 0.98;
      } else if (driftMs < -25 && driftMs > -250) {
        this.audio.playbackRate = 1.02;
      } else if (Math.abs(driftMs) >= 250) {
        this.audio.currentTime = Math.max(0, expectedPos);
        this.audio.playbackRate = 1.0;
      }

      this.notifyStats();
    }, 400);
  }

  private clearScheduledTimers() {
    if (this.scheduledTimerId) {
      clearTimeout(this.scheduledTimerId);
      this.scheduledTimerId = null;
    }
    if (this.driftCheckIntervalId) {
      clearInterval(this.driftCheckIntervalId);
      this.driftCheckIntervalId = null;
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return null;
  }

  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  public onStatsChange(cb: (stats: SyncStats) => void) {
    this.onStatsChangeCallbacks.add(cb);
    return () => {
      this.onStatsChangeCallbacks.delete(cb);
    };
  }

  public onPositionUpdate(cb: (pos: number, duration: number) => void) {
    this.onPositionUpdateCallbacks.add(cb);
    return () => {
      this.onPositionUpdateCallbacks.delete(cb);
    };
  }

  public setOnTrackEnded(cb: () => void) {
    this.onTrackEndedCallback = cb;
  }

  public getStats(): SyncStats {
    const absDrift = Math.abs(this.lastDriftMs);
    let quality: SyncStats['syncQuality'] = 'excellent';
    if (absDrift > 80 || this.lastRtt > 120) quality = 'good';
    if (absDrift > 180 || this.lastRtt > 250) quality = 'fair';
    if (absDrift > 350 || this.lastRtt > 500) quality = 'poor';

    const isLocked = this.isNtpSynced && (this.isPlaying ? absDrift < 45 : (this.lastRtt > 0 && this.lastRtt < 350));

    return {
      rtt: Math.round(this.lastRtt),
      clockOffset: Math.round(this.clockOffset),
      drift: this.lastDriftMs,
      isLocked,
      syncQuality: quality,
    };
  }

  private notifyStats() {
    const stats = this.getStats();
    this.onStatsChangeCallbacks.forEach((cb) => cb(stats));
  }

  private notifyPositionUpdate(pos: number, dur: number) {
    mediaSessionService.setPositionState(pos, dur, this.audio?.playbackRate || 1.0);
    this.onPositionUpdateCallbacks.forEach((cb) => cb(pos, dur));
  }

  public getCurrentPosition(): number {
    return this.audio ? this.audio.currentTime : 0;
  }

  public getCurrentTrack(): Track | null {
    return this.currentTrack;
  }

  public resumeLocalAudio() {
    this.initAudio();
    if (!this.audio) return;

    if (this.currentTrack && (!this.audio.src || this.audio.src === '' || this.audio.src.endsWith('/'))) {
      this.audio.src = this.currentTrack.audioUrl;
      this.audio.load();
    }

    let pos = this.audio.currentTime;
    if (this.audio.duration && pos >= this.audio.duration - 0.5) {
      pos = 0;
    }

    this.isPlaying = true;
    this.executePlay(pos);
    mediaSessionService.setPlaybackState('playing');
  }

  public cleanup() {
    this.clearScheduledTimers();
    if (this.ntpIntervalId) clearInterval(this.ntpIntervalId);
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
    }
    if (this.preloadAudio) {
      this.preloadAudio.pause();
      this.preloadAudio.src = '';
    }
  }
}

export const syncEngine = new SyncEngine();
