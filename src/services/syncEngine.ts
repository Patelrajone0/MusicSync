import { socket } from './socket';
import { SyncStats, Track } from '../types';
import { mediaSessionService } from './mediaSession';

interface AudioDeck {
  id: 'A' | 'B';
  element: HTMLAudioElement;
  sourceNode: MediaElementAudioSourceNode | null;
  gainNode: GainNode | null;
  track: Track | null;
}

class SyncEngine {
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  // Dual-Deck Audio Architecture for Gapless Crossfade
  private deckA: AudioDeck | null = null;
  private deckB: AudioDeck | null = null;
  private activeDeckId: 'A' | 'B' = 'A';
  private crossfadeDuration: number = 2.5; // seconds
  private masterVolume: number = 0.9;
  private crossfadeTimer: any = null;

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

  // 1. Dual-Deck Audio Initialization
  public initAudio() {
    if (typeof window === 'undefined') return;

    const setupDeckElement = (id: 'A' | 'B'): HTMLAudioElement => {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';

      audio.addEventListener('ended', () => {
        if (this.activeDeckId === id && this.onTrackEndedCallback) {
          this.onTrackEndedCallback();
        }
      });

      audio.addEventListener('timeupdate', () => {
        if (this.activeDeckId === id) {
          const current = audio.currentTime;
          const total = audio.duration || this.currentTrack?.duration || 0;
          this.notifyPositionUpdate(current, total);
        }
      });

      return audio;
    };

    if (!this.deckA) {
      this.deckA = {
        id: 'A',
        element: setupDeckElement('A'),
        sourceNode: null,
        gainNode: null,
        track: null
      };
    }

    if (!this.deckB) {
      this.deckB = {
        id: 'B',
        element: setupDeckElement('B'),
        sourceNode: null,
        gainNode: null,
        track: null
      };
    }

    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        this.masterGainNode = this.audioContext.createGain();
        this.masterGainNode.gain.value = this.masterVolume;

        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.fftSize = 256;
        this.analyserNode.smoothingTimeConstant = 0.85;

        // Route: Deck Gains -> AnalyserNode -> MasterGainNode -> Output
        this.analyserNode.connect(this.masterGainNode);
        this.masterGainNode.connect(this.audioContext.destination);

        const connectDeck = (deck: AudioDeck, initialGain: number) => {
          if (!this.audioContext || !this.analyserNode) return;
          try {
            deck.gainNode = this.audioContext.createGain();
            deck.gainNode.gain.value = initialGain;
            deck.sourceNode = this.audioContext.createMediaElementSource(deck.element);
            deck.sourceNode.connect(deck.gainNode);
            deck.gainNode.connect(this.analyserNode);
          } catch (e) {
            console.warn(`Deck ${deck.id} WebAudio connection note:`, e);
          }
        };

        connectDeck(this.deckA, this.activeDeckId === 'A' ? 1.0 : 0.0);
        connectDeck(this.deckB, this.activeDeckId === 'B' ? 1.0 : 0.0);
      }
    }
  }

  // 2. Unlock Audio on User Gesture
  public async unlockAudio(): Promise<boolean> {
    try {
      this.initAudio();
      if (this.audioContext) {
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
        // Play an imperceptible silent 1-sample buffer to unlock hardware audio pipeline
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
    this.masterVolume = clamped;
    if (this.masterGainNode) {
      this.masterGainNode.gain.value = clamped;
    }
    if (this.deckA) this.deckA.element.volume = clamped;
    if (this.deckB) this.deckB.element.volume = clamped;
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

  // Active Deck Getter Helper
  private getActiveDeck(): AudioDeck {
    this.initAudio();
    return this.activeDeckId === 'A' ? this.deckA! : this.deckB!;
  }

  // Standby Deck Getter Helper
  private getStandbyDeck(): AudioDeck {
    this.initAudio();
    return this.activeDeckId === 'A' ? this.deckB! : this.deckA!;
  }

  // 3. Preload Upcoming Song in Standby Deck for Gapless Instant Playback
  public preloadNextTrack(track: Track | null) {
    if (!track || !track.audioUrl) return;
    this.initAudio();
    const standby = this.getStandbyDeck();

    if (standby.track?.id !== track.id || standby.element.src !== track.audioUrl) {
      standby.track = track;
      standby.element.src = track.audioUrl;
      standby.element.preload = 'auto';
      standby.element.load();
    }
  }

  // 4. High Precision NTP Clock Synchronization
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

    const active = this.getActiveDeck();
    if (this.isPlaying && active.element) {
      const serverNow = this.getServerTime();
      const elapsedSec = (serverNow - this.scheduledServerTime - this.hardwareDelayOffset) / 1000;
      const expectedPos = Math.max(0, this.startPosition + elapsedSec);
      active.element.currentTime = expectedPos;
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

  // 5. Playback Scheduling with Seamless Dual-Deck Crossfade
  public schedulePlayback(track: Track, scheduledServerTime: number, startPosition: number = 0) {
    this.clearScheduledTimers();
    this.scheduledServerTime = scheduledServerTime;
    this.startPosition = startPosition;
    this.isPlaying = true;
    mediaSessionService.updateMetadata(track);
    mediaSessionService.setPlaybackState('playing');

    this.initAudio();

    const isSameTrack = this.currentTrack?.id === track.id;
    const activeDeck = this.getActiveDeck();
    const standbyDeck = this.getStandbyDeck();

    const currentServerTime = this.getServerTime();
    const delayMs = scheduledServerTime - currentServerTime - this.hardwareDelayOffset;

    if (isSameTrack) {
      // In-track seek or scheduled resumption on current deck
      if (delayMs > 0) {
        activeDeck.element.currentTime = startPosition;
        this.scheduledTimerId = setTimeout(() => {
          this.executePlay(activeDeck, startPosition);
        }, delayMs);
      } else {
        const catchUpSec = Math.abs(delayMs) / 1000;
        this.executePlay(activeDeck, startPosition + catchUpSec);
      }
    } else {
      // Track Transition: Perform Gapless Dual-Deck Crossfade
      this.currentTrack = track;
      const targetDeck = standbyDeck;
      const outgoingDeck = activeDeck;

      if (targetDeck.element.src !== track.audioUrl) {
        targetDeck.element.src = track.audioUrl;
        targetDeck.element.load();
      }
      targetDeck.track = track;

      // Determine crossfade: only crossfade if outgoing deck is actively playing and transition starts near beginning
      const canCrossfade = outgoingDeck.element && !outgoingDeck.element.paused && startPosition < 2 && this.crossfadeDuration > 0;

      if (delayMs > 0) {
        targetDeck.element.currentTime = startPosition;
        this.scheduledTimerId = setTimeout(() => {
          this.performDeckTransition(outgoingDeck, targetDeck, startPosition, canCrossfade ? this.crossfadeDuration : 0);
        }, delayMs);
      } else {
        const catchUpSec = Math.abs(delayMs) / 1000;
        this.performDeckTransition(outgoingDeck, targetDeck, startPosition + catchUpSec, canCrossfade ? this.crossfadeDuration : 0);
      }
    }

    this.startDriftCorrectionLoop();
  }

  private performDeckTransition(outgoing: AudioDeck, incoming: AudioDeck, startSec: number, fadeDuration: number) {
    if (this.crossfadeTimer) {
      clearTimeout(this.crossfadeTimer);
      this.crossfadeTimer = null;
    }

    if (Math.abs(incoming.element.currentTime - startSec) > 0.05) {
      incoming.element.currentTime = startSec;
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    const now = this.audioContext ? this.audioContext.currentTime : 0;

    if (fadeDuration > 0 && this.audioContext && incoming.gainNode && outgoing.gainNode) {
      // 1. Ramp incoming deck from 0 up to 1.0 (Web Audio smooth linear curve)
      incoming.gainNode.gain.cancelScheduledValues(now);
      incoming.gainNode.gain.setValueAtTime(0.001, now);
      incoming.gainNode.gain.linearRampToValueAtTime(1.0, now + fadeDuration);

      // 2. Ramp outgoing deck from current down to 0.0
      outgoing.gainNode.gain.cancelScheduledValues(now);
      outgoing.gainNode.gain.setValueAtTime(outgoing.gainNode.gain.value || 1.0, now);
      outgoing.gainNode.gain.linearRampToValueAtTime(0.001, now + fadeDuration);

      // Start incoming deck audio
      incoming.element.play().catch(() => {});

      // Swap active deck reference
      this.activeDeckId = incoming.id;

      // After crossfade finishes, pause outgoing deck
      this.crossfadeTimer = setTimeout(() => {
        outgoing.element.pause();
        if (outgoing.gainNode && this.audioContext) {
          outgoing.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
          outgoing.gainNode.gain.setValueAtTime(0.0, this.audioContext.currentTime);
        }
      }, fadeDuration * 1000);
    } else {
      // Immediate Cut (Direct seek or 0s crossfade)
      if (incoming.gainNode && this.audioContext) {
        incoming.gainNode.gain.cancelScheduledValues(now);
        incoming.gainNode.gain.setValueAtTime(1.0, now);
      }
      if (outgoing.gainNode && this.audioContext) {
        outgoing.gainNode.gain.cancelScheduledValues(now);
        outgoing.gainNode.gain.setValueAtTime(0.0, now);
      }
      outgoing.element.pause();
      incoming.element.play().catch(() => {});
      this.activeDeckId = incoming.id;
    }
  }

  private executePlay(deck: AudioDeck, startSec: number) {
    if (!deck.element) return;

    if (Math.abs(deck.element.currentTime - startSec) > 0.05) {
      deck.element.currentTime = startSec;
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    if (deck.gainNode && this.audioContext) {
      deck.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
      deck.gainNode.gain.setValueAtTime(1.0, this.audioContext.currentTime);
    }

    const playPromise = deck.element.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Playback blocked by browser policy. Click anywhere to activate speaker.', err);
      });
    }
  }

  public pausePlayback(atPosition?: number) {
    this.clearScheduledTimers();
    if (this.crossfadeTimer) {
      clearTimeout(this.crossfadeTimer);
      this.crossfadeTimer = null;
    }
    this.isPlaying = false;
    mediaSessionService.setPlaybackState('paused');

    const active = this.getActiveDeck();
    if (active.element) {
      active.element.pause();
      if (typeof atPosition === 'number') {
        active.element.currentTime = atPosition;
      }
      active.element.playbackRate = 1.0;
    }

    const standby = this.getStandbyDeck();
    if (standby.element) {
      standby.element.pause();
    }

    this.lastDriftMs = 0;
    this.notifyStats();
  }

  public seekPlayback(position: number) {
    const active = this.getActiveDeck();
    if (active.element) {
      active.element.currentTime = position;
    }
  }

  // 6. Continuous Drift Correction Loop (Zero-Latency Beatsync Parity)
  private startDriftCorrectionLoop() {
    if (this.driftCheckIntervalId) clearInterval(this.driftCheckIntervalId);

    this.driftCheckIntervalId = setInterval(() => {
      const active = this.getActiveDeck();
      if (!this.isPlaying || !active.element || active.element.paused) return;

      const serverNow = this.getServerTime();
      const elapsedSec = (serverNow - this.scheduledServerTime - this.hardwareDelayOffset) / 1000;
      const expectedPos = this.startPosition + elapsedSec;
      const actualPos = active.element.currentTime;

      // Drift in milliseconds: positive means ahead, negative means behind
      const driftMs = (actualPos - expectedPos) * 1000;
      this.lastDriftMs = Math.round(driftMs);

      // Micro-Rate Adjustment
      if (Math.abs(driftMs) < 25) {
        if (active.element.playbackRate !== 1.0) {
          active.element.playbackRate = 1.0;
        }
      } else if (driftMs > 25 && driftMs < 250) {
        active.element.playbackRate = 0.98;
      } else if (driftMs < -25 && driftMs > -250) {
        active.element.playbackRate = 1.02;
      } else if (Math.abs(driftMs) >= 250) {
        active.element.currentTime = Math.max(0, expectedPos);
        active.element.playbackRate = 1.0;
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

  // 7. Visualizer Analyser Node Access
  public getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  // 8. Event Subscriptions
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
    const active = this.getActiveDeck();
    mediaSessionService.setPositionState(pos, dur, active.element?.playbackRate || 1.0);
    this.onPositionUpdateCallbacks.forEach((cb) => cb(pos, dur));
  }

  public getCurrentPosition(): number {
    const active = this.getActiveDeck();
    return active.element ? active.element.currentTime : 0;
  }

  public getCurrentTrack(): Track | null {
    return this.currentTrack;
  }

  public resumeLocalAudio() {
    const active = this.getActiveDeck();
    if (active.element) {
      this.executePlay(active, active.element.currentTime);
      mediaSessionService.setPlaybackState('playing');
    }
  }

  public cleanup() {
    this.clearScheduledTimers();
    if (this.crossfadeTimer) clearTimeout(this.crossfadeTimer);
    if (this.ntpIntervalId) clearInterval(this.ntpIntervalId);
    if (this.deckA?.element) {
      this.deckA.element.pause();
      this.deckA.element.src = '';
    }
    if (this.deckB?.element) {
      this.deckB.element.pause();
      this.deckB.element.src = '';
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
    }
  }
}

export const syncEngine = new SyncEngine();
