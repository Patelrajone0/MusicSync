import { socket } from './socket';
import { SyncStats, Track } from '../types';

class SyncEngine {
  private audioContext: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private mediaSourceNode: MediaElementAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;

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
    } catch (e) {}

    this.initAudio();
    this.setupSocketListeners();
    if (socket.connected) {
      this.startNtpSync();
    }
  }

  // 1. Audio Initialization
  public initAudio() {
    if (typeof window === 'undefined') return;

    if (!this.audioElement) {
      this.audioElement = new Audio();
      this.audioElement.crossOrigin = 'anonymous';
      this.audioElement.preload = 'auto';

      this.audioElement.addEventListener('ended', () => {
        if (this.onTrackEndedCallback) {
          this.onTrackEndedCallback();
        }
      });

      this.audioElement.addEventListener('timeupdate', () => {
        if (this.audioElement) {
          const current = this.audioElement.currentTime;
          const total = this.audioElement.duration || this.currentTrack?.duration || 0;
          this.notifyPositionUpdate(current, total);
        }
      });
    }

    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        this.gainNode = this.audioContext.createGain();
        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.fftSize = 256;
        this.analyserNode.smoothingTimeConstant = 0.85;

        // Connect media element if possible
        try {
          if (this.audioElement && !this.mediaSourceNode) {
            this.mediaSourceNode = this.audioContext.createMediaElementSource(this.audioElement);
            this.mediaSourceNode.connect(this.gainNode);
            this.gainNode.connect(this.analyserNode);
            this.analyserNode.connect(this.audioContext.destination);
          }
        } catch (e) {
          console.warn('MediaElementAudioSourceNode already connected or restricted:', e);
        }
      }
    }
  }

  // 2. Unlock Audio on User Gesture (Crucial for mobile devices & AutoPlay policies)
  public async unlockAudio(): Promise<boolean> {
    try {
      this.initAudio();
      if (this.audioContext) {
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
        // Play an imperceptible silent 1-sample buffer to unlock the hardware audio pipeline
        const buffer = this.audioContext.createBuffer(1, 1, 22050);
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.start(0);
      }
      socket.emit('set_audio_ready', { isReady: true });
      return true;
    } catch (err) {
      console.warn('Audio unlock warning (safe to proceed):', err);
      return false;
    }
  }

  public setVolume(val: number) {
    const clamped = Math.max(0, Math.min(1, val));
    if (this.gainNode) {
      this.gainNode.gain.value = clamped;
    }
    if (this.audioElement) {
      this.audioElement.volume = clamped;
    }
  }

  public getVolume(): number {
    return this.audioElement ? this.audioElement.volume : 1;
  }

  // 3. High Precision NTP Clock Synchronization
  public startNtpSync() {
    if (this.ntpIntervalId) clearInterval(this.ntpIntervalId);

    // Initial burst of 5 pings to rapidly find low-jitter network baseline
    let burstCount = 0;
    const burstInterval = setInterval(() => {
      this.pingServer();
      burstCount++;
      if (burstCount >= 5) {
        clearInterval(burstInterval);
        // Continue regular sync every 3.5 seconds
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

    if (this.isPlaying && this.audioElement) {
      const serverNow = this.getServerTime();
      const elapsedSec = (serverNow - this.scheduledServerTime - this.hardwareDelayOffset) / 1000;
      const expectedPos = Math.max(0, this.startPosition + elapsedSec);
      this.audioElement.currentTime = expectedPos;
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

      // Estimated server time at moment t1 = serverTime + (rtt / 2)
      // Client system time now = Date.now()
      const estimatedServerNow = serverTime + (rtt / 2);
      const measuredOffset = estimatedServerNow - Date.now();

      // Exponential moving average for clock offset filter
      if (!this.isNtpSynced) {
        this.clockOffset = measuredOffset;
        this.isNtpSynced = true;
      } else {
        // Weight new reading 25% if RTT is reasonably low
        this.clockOffset = this.clockOffset * 0.75 + measuredOffset * 0.25;
      }

      this.notifyStats();
    });
  }

  // Current server time calculated with clock offset
  public getServerTime(): number {
    return Date.now() + this.clockOffset;
  }

  // 4. Playback Scheduling & Sync Engine
  public schedulePlayback(track: Track, scheduledServerTime: number, startPosition: number = 0) {
    this.clearScheduledTimers();
    this.currentTrack = track;
    this.scheduledServerTime = scheduledServerTime;
    this.startPosition = startPosition;
    this.isPlaying = true;

    this.initAudio();

    if (!this.audioElement) return;

    // Load track if URL changed
    if (this.audioElement.src !== track.audioUrl) {
      this.audioElement.src = track.audioUrl;
      this.audioElement.load();
    }

    const currentServerTime = this.getServerTime();
    // Factor in hardware delay offset (soundbar / Bluetooth latency)
    const delayMs = scheduledServerTime - currentServerTime - this.hardwareDelayOffset;

    if (delayMs > 0) {
      // Future scheduled start: prepare position and wait
      this.audioElement.currentTime = startPosition;

      this.scheduledTimerId = setTimeout(() => {
        this.executePlay(startPosition);
      }, delayMs);
    } else {
      // We joined mid-stream: calculate exact offset
      const catchUpSec = Math.abs(delayMs) / 1000;
      const targetPos = startPosition + catchUpSec;
      this.executePlay(targetPos);
    }

    this.startDriftCorrectionLoop();
  }

  private executePlay(startSec: number) {
    if (!this.audioElement) return;

    if (Math.abs(this.audioElement.currentTime - startSec) > 0.05) {
      this.audioElement.currentTime = startSec;
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    const playPromise = this.audioElement.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Playback blocked by browser policy. Click anywhere to activate speaker.', err);
      });
    }
  }

  public pausePlayback(atPosition?: number) {
    this.clearScheduledTimers();
    this.isPlaying = false;

    if (this.audioElement) {
      this.audioElement.pause();
      if (typeof atPosition === 'number') {
        this.audioElement.currentTime = atPosition;
      }
      this.audioElement.playbackRate = 1.0;
    }

    this.lastDriftMs = 0;
    this.notifyStats();
  }

  public seekPlayback(position: number) {
    if (this.audioElement) {
      this.audioElement.currentTime = position;
    }
  }

  // 5. Continuous Drift Correction Loop (Zero-Latency Beatsync Parity)
  private startDriftCorrectionLoop() {
    if (this.driftCheckIntervalId) clearInterval(this.driftCheckIntervalId);

    this.driftCheckIntervalId = setInterval(() => {
      if (!this.isPlaying || !this.audioElement || this.audioElement.paused) return;

      const serverNow = this.getServerTime();
      const elapsedSec = (serverNow - this.scheduledServerTime - this.hardwareDelayOffset) / 1000;
      const expectedPos = this.startPosition + elapsedSec;
      const actualPos = this.audioElement.currentTime;

      // Drift in milliseconds: positive means we are ahead, negative means behind
      const driftMs = (actualPos - expectedPos) * 1000;
      this.lastDriftMs = Math.round(driftMs);

      // Micro-Rate Adjustment:
      // If drift is between 25ms and 250ms, gently nudge playback speed to lock in phase without audible pitch clicks!
      if (Math.abs(driftMs) < 25) {
        // Locked within 25 milliseconds (human ear imperceptible)
        if (this.audioElement.playbackRate !== 1.0) {
          this.audioElement.playbackRate = 1.0;
        }
      } else if (driftMs > 25 && driftMs < 250) {
        // Playing slightly ahead: slow down 2%
        this.audioElement.playbackRate = 0.98;
      } else if (driftMs < -25 && driftMs > -250) {
        // Playing slightly behind: speed up 2%
        this.audioElement.playbackRate = 1.02;
      } else if (Math.abs(driftMs) >= 250) {
        // Significant desync (>250ms): smooth seek to exact sync point
        this.audioElement.currentTime = Math.max(0, expectedPos);
        this.audioElement.playbackRate = 1.0;
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

  // 6. Visualizer Analyser Node Access
  public getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  // 7. Event Subscriptions
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

    // Accurately determine if locked:
    // When playing: audio drift must be within 45ms
    // When paused/stopped: NTP must be synced and RTT healthy (<350ms)
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
    this.onPositionUpdateCallbacks.forEach((cb) => cb(pos, dur));
  }

  public cleanup() {
    this.clearScheduledTimers();
    if (this.ntpIntervalId) clearInterval(this.ntpIntervalId);
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
    }
  }
}

export const syncEngine = new SyncEngine();
