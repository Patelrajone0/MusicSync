import { socket } from './socket';
import { SyncStats, Track } from '../types';
import { mediaSessionService } from './mediaSession';

// Detect iOS devices (iPhone, iPad, iPod, iPadOS on MacIntel, and WebKit touch browsers)
export const isIOSDevice = typeof navigator !== 'undefined' && (
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (typeof (navigator as any).platform === 'string' && /iPad|iPhone|iPod/.test((navigator as any).platform)) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1) ||
  (typeof window !== 'undefined' && typeof document !== 'undefined' && Boolean((window as any).indexedDB && ('ontouchend' in document || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0)) && /AppleWebKit/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)))
);

class SyncEngine {
  private audio: HTMLAudioElement | null = null;
  private preloadAudio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private mediaSourceNode: MediaElementAudioSourceNode | null = null;
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
  private loadedAudioUrl: string | null = null;
  private scheduledServerTime: number = 0;
  private startPosition: number = 0;
  private isPlaying: boolean = false;
  private isBuffering: boolean = false;
  private scheduledTimerId: any = null;
  private driftCheckIntervalId: any = null;
  private lastDriftMs: number = 0;
  private lastSeekTime: number = 0;
  private playbackStartTime: number = 0;
  private seekCooldownUntil: number = 0;
  private isAutoplayBlocked: boolean = false;
  private hasUserUnlocked: boolean = false;
  private networkMode: 'local' | 'online' = 'local';

  // Callbacks
  private onStatsChangeCallbacks: Set<(stats: SyncStats) => void> = new Set();
  private onPositionUpdateCallbacks: Set<(position: number, duration: number) => void> = new Set();
  private onAutoplayBlockedCallbacks: Set<(blocked: boolean) => void> = new Set();
  private onBufferingCallbacks: Set<(isBuffering: boolean) => void> = new Set();
  private onPlaybackErrorCallbacks: Set<(errorMsg: string) => void> = new Set();
  private onTrackEndedCallback: (() => void) | null = null;

  constructor() {
    try {
      const savedDelay = localStorage.getItem('musicsync_hardware_delay');
      if (savedDelay !== null) {
        this.hardwareDelayOffset = parseInt(savedDelay, 10) || 0;
      } else {
        if (isIOSDevice) {
          this.hardwareDelayOffset = 25; // Balanced +25ms offset for iOS WebKit/AVPlayer DAC latency
        }
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
      // Only set crossOrigin on non-iOS browsers.
      // On iOS Safari, crossOrigin='anonymous' causes media elements to drop streams on redirects or CORS quirks
      if (!isIOSDevice) {
        audio.crossOrigin = 'anonymous';
      }
      audio.preservesPitch = true;
      (audio as any).webkitPreservesPitch = true;
      (audio as any).mozPreservesPitch = true;
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      audio.volume = this.masterVolume;

      audio.addEventListener('error', () => {
        const errMsg = audio.error?.message || (audio.error?.code === 4 ? 'Audio source not supported or stream offline' : 'Media stream error');
        console.error('[AudioEngine] Media error:', errMsg, 'code:', audio.error?.code, 'src:', audio.src);
        this.clearScheduledTimers();
        this.isPlaying = false;
        this.isBuffering = false;
        this.notifyBuffering(false);
        this.notifyStats();
        this.notifyPlaybackError(errMsg);
      });

      audio.addEventListener('waiting', () => {
        this.isBuffering = true;
        this.notifyBuffering(true);
      });

      audio.addEventListener('playing', () => {
        this.isBuffering = false;
        this.notifyBuffering(false);
      });

      audio.addEventListener('canplay', () => {
        this.isBuffering = false;
        this.notifyBuffering(false);
      });

      audio.addEventListener('ended', () => {
        this.isBuffering = false;
        this.notifyBuffering(false);
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

    if (!this.preloadAudio && !isIOSDevice) {
      const preload = new Audio();
      preload.preload = 'auto';
      preload.volume = 0;
      this.preloadAudio = preload;
    }
  }

  // Safe time seeker that avoids redundant seeks and waits for metadata if audio is not yet loaded
  private setTimeSafe(timeSec: number) {
    if (!this.audio) return;
    const clamped = Math.max(0, timeSec);
    if (Math.abs(this.audio.currentTime - clamped) < 0.05) {
      return;
    }
    if (this.audio.readyState >= 1) {
      try {
        this.audio.currentTime = clamped;
      } catch (e) {}
    } else {
      const onLoaded = () => {
        try {
          if (this.audio && Math.abs(this.audio.currentTime - clamped) >= 0.05) {
            this.audio.currentTime = clamped;
          }
        } catch (e) {}
      };
      this.audio.addEventListener('loadedmetadata', onLoaded, { once: true });
    }
  }

  // 2. Unlock Audio on User Gesture (Seamless instant sync on user tap)
  // By default, primes the audio element silently without starting playback of loaded tracks,
  // unless shouldPlay is true OR playback is actively running.
  public async unlockAudio(targetTrack?: Track | null, position?: number, shouldPlay: boolean = false): Promise<boolean> {
    try {
      this.initAudio();
      this.hasUserUnlocked = true;

      // Ensure AudioContext is resumed in direct response to user gesture
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      this.isAutoplayBlocked = false;
      this.notifyAutoplayBlocked(false);

      const trackToUse = targetTrack || this.currentTrack;
      const isActivelyPlaying = shouldPlay || this.isPlaying;

      if (this.audio) {
        this.clearScheduledTimers();
        this.audio.volume = this.masterVolume;

        // ONLY start audio playback if explicitly requested (shouldPlay) or actively playing
        if (isActivelyPlaying && trackToUse && trackToUse.audioUrl) {
          this.currentTrack = trackToUse;
          if (this.loadedAudioUrl !== trackToUse.audioUrl) {
            this.loadedAudioUrl = trackToUse.audioUrl;
            this.audio.src = trackToUse.audioUrl;
            this.audio.load();
          }

          let startPos = typeof position === 'number' ? position : this.startPosition;
          // Calculate true live position if track was scheduled in the room
          if (this.scheduledServerTime > 0) {
            const serverNow = this.getServerTime();
            const elapsedSec = (serverNow - this.scheduledServerTime + this.hardwareDelayOffset) / 1000;
            if (elapsedSec > 0) {
              startPos = Math.max(0, this.startPosition + elapsedSec);
            }
          }

          this.setTimeSafe(startPos);
          this.isPlaying = true;
          this.isAutoplayBlocked = false;
          this.notifyAutoplayBlocked(false);

          const playPromise = this.audio.play();
          if (playPromise !== undefined) {
            await playPromise.catch((err) => {
              if (err?.name === 'NotAllowedError') {
                this.isAutoplayBlocked = true;
                this.isPlaying = false;
                this.notifyAutoplayBlocked(true);
                throw err;
              }
              // AbortError is normal when requests overlap or seek
            });
          }
          this.startDriftCorrectionLoop();
        } else {
          // If not actively playing, perform a silent play-and-pause on the element
          // so Safari / WebKit permanently blesses this audio element as user-activated!
          try {
            const prevVol = this.audio.volume;
            this.audio.volume = 0.001;
            const p = this.audio.play();
            if (p !== undefined) {
              await p.then(() => {
                if (this.audio) {
                  this.audio.pause();
                  this.audio.volume = prevVol;
                }
              }).catch(() => {});
            }
          } catch (e) {}
        }
      }

      this.isAutoplayBlocked = false;
      this.notifyAutoplayBlocked(false);
      socket.emit('set_audio_ready', { isReady: true });
      return true;
    } catch (err) {
      console.warn('[AudioEngine] Audio unlock warning:', err);
      return false;
    }
  }

  // 2b. Synchronously prime the HTMLAudioElement directly during the user click gesture
  public primePlayback(track?: Track | null, position: number = 0): boolean {
    if (typeof window === 'undefined') return false;
    this.initAudio();
    if (!this.audio) return false;

    this.hasUserUnlocked = true;
    this.isAutoplayBlocked = false;
    this.notifyAutoplayBlocked(false);

    const targetTrack = track || this.currentTrack;
    if (targetTrack && targetTrack.audioUrl) {
      this.currentTrack = targetTrack;
      if (this.loadedAudioUrl !== targetTrack.audioUrl) {
        this.loadedAudioUrl = targetTrack.audioUrl;
        this.audio.src = targetTrack.audioUrl;
        this.audio.load();
      }
      this.setTimeSafe(position);
      this.isPlaying = true;
      this.audio.volume = this.masterVolume;

      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.isAutoplayBlocked = false;
            this.notifyAutoplayBlocked(false);
          })
          .catch((err) => {
            if (err?.name === 'NotAllowedError') {
              console.warn('[AudioEngine] Prime playback blocked by browser policy:', err.message);
              this.isAutoplayBlocked = true;
              this.isPlaying = false;
              this.notifyAutoplayBlocked(true);
            }
          });
      }
      socket.emit('set_audio_ready', { isReady: true });
      return true;
    } else {
      try {
        const p = this.audio.play();
        if (p !== undefined) {
          p.catch(() => {});
        }
      } catch (e) {}
      socket.emit('set_audio_ready', { isReady: true });
      return true;
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

  // 3. Preload Upcoming Song in background for Instant Playback (Disabled on iOS to prevent AVPlayer decoder stalls)
  public preloadNextTrack(track: Track | null) {
    if (!track || !track.audioUrl || isIOSDevice) return;
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
      const elapsedSec = (serverNow - this.scheduledServerTime + this.hardwareDelayOffset) / 1000;
      const expectedPos = Math.max(0, this.startPosition + elapsedSec);
      this.audio.currentTime = expectedPos;
    }
    this.notifyStats();
  }

  public getHardwareDelayOffset(): number {
    return this.hardwareDelayOffset;
  }

  public setNetworkMode(mode: 'local' | 'online') {
    this.networkMode = mode;
    try {
      localStorage.setItem('musicsync_network_mode', mode);
    } catch (e) {}

    if (this.isPlaying) {
      this.startDriftCorrectionLoop();
    }
    this.notifyStats();
  }

  public getNetworkMode(): 'local' | 'online' {
    return this.networkMode;
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

    // Load track into audio element only if the audio URL actually changed
    if (this.loadedAudioUrl !== track.audioUrl) {
      this.loadedAudioUrl = track.audioUrl;
      this.audio.src = track.audioUrl;
      this.audio.load();
    }

    const currentServerTime = this.getServerTime();
    const delayMs = scheduledServerTime - currentServerTime - this.hardwareDelayOffset;

    // If audio is already actively playing or loading from user gesture prime,
    // NEVER pause or hard-seek it! Let it continue playing and let the smooth drift loop align it seamlessly.
    if (this.audio && (!this.audio.paused || (this.isPlaying && this.loadedAudioUrl === track.audioUrl && Date.now() - this.playbackStartTime < 2500))) {
      this.playbackStartTime = Date.now();
      this.startDriftCorrectionLoop();
      return;
    }

    this.playbackStartTime = Date.now();
    if (delayMs > 0) {
      if (Math.abs(this.audio.currentTime - startPosition) >= 0.05) {
        this.setTimeSafe(startPosition);
      }
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
    this.playbackStartTime = Date.now();

    // Only set initial time if meaningfully different (>0.25s) to avoid AVPlayer pipeline buffer flushes
    if (Math.abs(this.audio.currentTime - startSec) > 0.25) {
      this.setTimeSafe(startSec);
    }

    this.audio.volume = this.masterVolume;
    if (isIOSDevice) {
      this.audio.playbackRate = 1.0;
    }

    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          if (this.isAutoplayBlocked) {
            this.isAutoplayBlocked = false;
            this.notifyAutoplayBlocked(false);
          }
          // Do NOT immediately seek right after playPromise resolves on iOS!
          // Seeking right at startup interrupts the hardware decoder and causes playback stutter.
          // The smooth drift correction loop will naturally and gently bring it into millisecond lock.
        })
        .catch((err: any) => {
          if (err?.name === 'NotAllowedError') {
            console.warn('[AudioEngine] Autoplay blocked by browser policy:', err.message);
            this.isAutoplayBlocked = true;
            this.isPlaying = false;
            this.notifyAutoplayBlocked(true);
            this.notifyPlaybackError('Audio blocked by browser. Tap anywhere to activate speaker audio.');
          } else if (err?.name === 'AbortError') {
            // Normal when play requests overlap, seek occurs, or track changes
            console.log('[AudioEngine] Play request superseded/aborted (normal).');
          } else {
            console.warn('[AudioEngine] Playback promise warning:', err);
            this.isPlaying = false;
            this.notifyPlaybackError(err?.message || 'Playback stream error');
          }
        });
    }
  }

  public pausePlayback(atPosition?: number) {
    this.clearScheduledTimers();
    this.isPlaying = false;
    this.isBuffering = false;
    this.notifyBuffering(false);
    mediaSessionService.setPlaybackState('paused');

    if (this.audio) {
      this.audio.pause();
      if (typeof atPosition === 'number' && atPosition >= 0) {
        this.setTimeSafe(atPosition);
      }
      this.audio.playbackRate = 1.0;
    }

    this.lastDriftMs = 0;
    this.notifyStats();
  }

  public stopPlayback() {
    this.clearScheduledTimers();
    this.isPlaying = false;
    this.isBuffering = false;
    this.notifyBuffering(false);
    mediaSessionService.updateMetadata(null);
    mediaSessionService.setPlaybackState('none');

    if (this.audio) {
      this.audio.pause();
      this.setTimeSafe(0);
      try {
        this.audio.removeAttribute('src');
        this.audio.load();
      } catch (e) {
        console.warn('[AudioEngine] stopPlayback audio reset warning:', e);
      }
      this.audio.playbackRate = 1.0;
    }

    if (this.preloadAudio) {
      this.preloadAudio.pause();
      try {
        this.preloadAudio.removeAttribute('src');
        this.preloadAudio.load();
      } catch (e) {}
    }

    this.lastDriftMs = 0;
    this.notifyStats();
  }

  public seekPlayback(position: number) {
    if (this.audio) {
      this.seekCooldownUntil = Date.now() + 4000;
      this.lastSeekTime = Date.now();
      this.setTimeSafe(position);
    }
  }

  // 6. Continuous Drift Correction Loop (Runs every 250ms on desktop, 500ms on iOS for smooth playback)
  private startDriftCorrectionLoop() {
    if (this.driftCheckIntervalId) clearInterval(this.driftCheckIntervalId);

    const intervalMs = isIOSDevice ? 500 : (this.networkMode === 'local' ? 120 : 250);

    this.driftCheckIntervalId = setInterval(() => {
      if (!this.isPlaying || !this.audio || this.audio.paused) return;

      // Do NOT calculate drift or adjust rate while audio is actively buffering or seeking
      if (this.audio.seeking || this.isBuffering || this.audio.readyState < 2) {
        return;
      }

      const serverNow = this.getServerTime();
      const elapsedSec = (serverNow - this.scheduledServerTime + this.hardwareDelayOffset) / 1000;
      const expectedPos = this.startPosition + elapsedSec;
      const actualPos = this.audio.currentTime;

      // Drift in ms: positive = ahead of room, negative = behind room
      const driftMs = (actualPos - expectedPos) * 1000;
      this.lastDriftMs = Math.round(driftMs);

      if (isIOSDevice) {
        // CRITICAL FOR IPHONE / IPAD (iOS Safari & WebKit):
        // AVPlayer on iOS maintains an internal progressive download stream.
        // Changing playbackRate or setting currentTime during playback drains or flushes the buffer,
        // causing repeated 1-second audio pauses every 3-4 seconds.
        // To ensure music NEVER stops until the user pauses, lock playbackRate strictly to 1.0x
        // and NEVER perform in-flight seeks during active playback.
        if (this.audio.playbackRate !== 1.0) {
          this.audio.playbackRate = 1.0;
        }
      } else {
        // Desktop & Android Smooth Dynamic Rate-Based Nudging:
        // Desktop browsers (Chrome/Firefox/Edge) cleanly resample audio pitch in memory.
        // Nudge playbackRate gently without hard seeks so music never cuts out or stutters.
        const absDrift = Math.abs(driftMs);
        if (absDrift < 25) {
          if (this.audio.playbackRate !== 1.0) {
            this.audio.playbackRate = 1.0;
          }
        } else if (driftMs >= 25 && driftMs < 100) {
          this.audio.playbackRate = 0.98;
        } else if (driftMs <= -25 && driftMs > -100) {
          this.audio.playbackRate = 1.02;
        } else if (driftMs >= 100 && driftMs < 300) {
          this.audio.playbackRate = 0.95;
        } else if (driftMs <= -100 && driftMs > -300) {
          this.audio.playbackRate = 1.05;
        } else if (driftMs >= 300 && driftMs < 800) {
          this.audio.playbackRate = 0.92;
        } else if (driftMs <= -300 && driftMs > -800) {
          this.audio.playbackRate = 1.08;
        } else if (driftMs >= 800) {
          this.audio.playbackRate = 0.90;
        } else if (driftMs <= -800) {
          this.audio.playbackRate = 1.10;
        }
      }

      this.notifyStats();
    }, intervalMs);
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

  public setupAudioNodes() {
    if (typeof window === 'undefined' || !this.audio) return;
    // CRITICAL FOR IOS SAFARI:
    // Do NOT connect HTMLAudioElement to Web Audio API createMediaElementSource on iOS!
    // WebKit frequently silences playback, blocks cross-origin streams, or mutes when AudioContext suspends.
    // AudioVisualizer uses a synthetic beat visualizer when getAnalyser is null, keeping audio 100% audible and loud.
    if (isIOSDevice) {
      return;
    }
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
        }
      }
      if (this.audioContext && !this.analyserNode) {
        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.fftSize = 256;
        this.analyserNode.smoothingTimeConstant = 0.75;
      }
      if (this.audioContext && this.analyserNode && !this.mediaSourceNode) {
        this.mediaSourceNode = this.audioContext.createMediaElementSource(this.audio);
        this.mediaSourceNode.connect(this.analyserNode);
        this.analyserNode.connect(this.audioContext.destination);
      }
    } catch (e) {
      // Handled if media element already connected
    }
  }

  public getAudioElement(): HTMLAudioElement | null {
    return this.audio;
  }

  public getAnalyser(): AnalyserNode | null {
    if (isIOSDevice) {
      return null;
    }
    if (!this.analyserNode) {
      this.setupAudioNodes();
    }
    return this.analyserNode;
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

    if (this.currentTrack && this.loadedAudioUrl !== this.currentTrack.audioUrl) {
      this.loadedAudioUrl = this.currentTrack.audioUrl;
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

  public onAutoplayBlocked(cb: (blocked: boolean) => void) {
    this.onAutoplayBlockedCallbacks.add(cb);
    return () => {
      this.onAutoplayBlockedCallbacks.delete(cb);
    };
  }

  private notifyAutoplayBlocked(blocked: boolean) {
    this.onAutoplayBlockedCallbacks.forEach((cb) => cb(blocked));
  }

  public onBuffering(cb: (isBuffering: boolean) => void) {
    this.onBufferingCallbacks.add(cb);
    return () => {
      this.onBufferingCallbacks.delete(cb);
    };
  }

  private notifyBuffering(isBuffering: boolean) {
    this.onBufferingCallbacks.forEach((cb) => cb(isBuffering));
  }

  public onPlaybackError(cb: (errorMsg: string) => void) {
    this.onPlaybackErrorCallbacks.add(cb);
    return () => {
      this.onPlaybackErrorCallbacks.delete(cb);
    };
  }

  private notifyPlaybackError(errorMsg: string) {
    this.onPlaybackErrorCallbacks.forEach((cb) => cb(errorMsg));
  }

  public getIsBuffering(): boolean {
    return this.isBuffering;
  }

  public isUnlocked(): boolean {
    if (isIOSDevice && !this.hasUserUnlocked && !this.isPlaying) {
      return false;
    }
    return !this.isAutoplayBlocked;
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
