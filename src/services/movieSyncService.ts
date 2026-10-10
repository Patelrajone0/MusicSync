import { socket } from './socket';
import { MovieState, SpeakerRole, TheaterPreset, TheaterSettings } from '../types';
import { spatialTheaterEngine } from './spatialTheaterEngine';
import { syncEngine } from './syncEngine';

export interface ChunkUploadProgress {
  isUploading: boolean;
  progress: number; // 0 - 100
  uploadedBytes: number;
  totalBytes: number;
  fileName: string;
  error?: string;
}

export class MovieSyncService {
  private movieState: MovieState = {
    isActive: false,
    title: '',
    fileName: '',
    duration: 0,
    currentTime: 0,
    isPlaying: false,
    isHostVideo: true,
    audioBroadcastMode: 'webrtc',
    streamUrl: '',
    theaterSettings: spatialTheaterEngine.getSettings(),
    lipSyncOffsetMs: 0,
    updatedAt: Date.now(),
  };

  // Host Video Element reference
  private hostVideoElement: HTMLVideoElement | null = null;
  private clientAudioElement: HTMLAudioElement | null = null;

  // WebRTC Audio Broadcast (Host to Multi-Client)
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private hostAudioStreamDestination: MediaStreamAudioDestinationNode | null = null;
  private hostMediaElementSource: MediaElementAudioSourceNode | null = null;
  private clientRemoteStream: MediaStream | null = null;
  private isBroadcastingWebRTC: boolean = false;

  // Sync intervals
  private syncIntervalId: any = null;
  private driftCheckIntervalId: any = null;

  // Subscribers
  private stateListeners: Set<(state: MovieState) => void> = new Set();
  private uploadListeners: Set<(p: ChunkUploadProgress) => void> = new Set();

  private uploadProgress: ChunkUploadProgress = {
    isUploading: false,
    progress: 0,
    uploadedBytes: 0,
    totalBytes: 0,
    fileName: '',
  };

  constructor() {
    this.setupSocketListeners();
  }

  public subscribe(cb: (state: MovieState) => void): () => void {
    this.stateListeners.add(cb);
    cb({ ...this.movieState });
    return () => this.stateListeners.delete(cb);
  }

  public subscribeUpload(cb: (p: ChunkUploadProgress) => void): () => void {
    this.uploadListeners.add(cb);
    cb({ ...this.uploadProgress });
    return () => this.uploadListeners.delete(cb);
  }

  private notify() {
    this.stateListeners.forEach((cb) => {
      try {
        cb({ ...this.movieState });
      } catch (e) {
        console.error('MovieSyncService listener error:', e);
      }
    });
  }

  private notifyUpload(p: ChunkUploadProgress) {
    this.uploadProgress = p;
    this.uploadListeners.forEach((cb) => {
      try {
        cb(p);
      } catch (e) {}
    });
  }

  public getState(): MovieState {
    return { ...this.movieState };
  }

  // 1. Socket Event Listeners for Movie Sync & WebRTC Signaling
  private setupSocketListeners() {
    socket.on('movie_state_changed', (state: MovieState) => {
      this.movieState = { ...this.movieState, ...state };
      this.notify();

      // If movie stopped, cleanup client playback
      if (!state.isActive) {
        this.stopClientAudio();
      }
    });

    socket.on('movie_sync_state', (data: {
      isPlaying: boolean;
      currentTime: number;
      duration: number;
      scheduledServerTime: number;
      playbackRate?: number;
    }) => {
      this.handleIncomingSync(data);
    });

    socket.on('movie_theater_updated', (settings: TheaterSettings) => {
      this.movieState.theaterSettings = settings;
      spatialTheaterEngine.setTheaterEnabled(settings.enabled);
      spatialTheaterEngine.setPreset(settings.preset);
      spatialTheaterEngine.setSpatialWidening(settings.spatialWidening);
      spatialTheaterEngine.setDialogueBoost(settings.dialogueBoost);
      spatialTheaterEngine.setLfeBoost(settings.lfeBoost);
      this.notify();
    });

    // WebRTC Signaling Relay
    socket.on('webrtc_signal', async ({ fromUserId, data }: { fromUserId: string; data: any }) => {
      await this.handleWebRTCSignal(fromUserId, data);
    });
  }

  // 2. Host Video Setup (Local Video Only - NEVER Sent to Clients)
  public attachHostVideo(video: HTMLVideoElement) {
    this.hostVideoElement = video;

    // Never set crossOrigin on local blob: or data: URLs to avoid CORS blocking
    if (this.movieState.streamUrl && !this.movieState.streamUrl.startsWith('blob:') && !this.movieState.streamUrl.startsWith('data:')) {
      video.crossOrigin = 'anonymous';
    } else {
      video.removeAttribute('crossorigin');
    }

    // Attach stream URL if one is already active and not yet set
    if (this.movieState.streamUrl && video.src !== this.movieState.streamUrl) {
      video.src = this.movieState.streamUrl;
      video.load();
    }

    video.onloadedmetadata = () => {
      this.movieState.duration = video.duration || this.movieState.duration;
      this.movieState.currentTime = video.currentTime;
      this.notify();
    };

    video.oncanplay = () => {
      if (video.duration && (!this.movieState.duration || this.movieState.duration === 0)) {
        this.movieState.duration = video.duration;
        this.notify();
      }
    };

    video.onplay = () => {
      this.movieState.isPlaying = true;
      this.movieState.currentTime = video.currentTime;
      this.broadcastPlaybackState(true, video.currentTime);
      this.notify();
    };

    video.onpause = () => {
      this.movieState.isPlaying = false;
      this.movieState.currentTime = video.currentTime;
      this.broadcastPlaybackState(false, video.currentTime);
      this.notify();
    };

    video.onseeked = () => {
      this.movieState.currentTime = video.currentTime;
      this.broadcastPlaybackState(this.movieState.isPlaying, video.currentTime);
      this.notify();
    };

    video.ontimeupdate = () => {
      this.movieState.currentTime = video.currentTime;
      if (video.duration && (!this.movieState.duration || this.movieState.duration === 0)) {
        this.movieState.duration = video.duration;
      }
      this.notify();
    };

    // Setup Web Audio Capture for WebRTC P2P Audio Broadcast
    this.setupHostAudioCapture();
  }

  // Host extracts audio from video element and creates broadcast destination
  private setupHostAudioCapture() {
    if (!this.hostVideoElement) return;
    try {
      const audioCtx = spatialTheaterEngine.ensureContext();
      if (!audioCtx) return;

      if (!this.hostAudioStreamDestination) {
        this.hostAudioStreamDestination = audioCtx.createMediaStreamDestination();
      }

      if (!this.hostMediaElementSource) {
        this.hostMediaElementSource = audioCtx.createMediaElementSource(this.hostVideoElement);

        // Route through spatial theater engine
        const theaterOutput = spatialTheaterEngine.attachToSource(this.hostMediaElementSource);

        // Route audio track to WebRTC broadcast destination
        theaterOutput.connect(this.hostAudioStreamDestination);
        this.isBroadcastingWebRTC = true;
      }
    } catch (e) {
      console.warn('[MovieSyncService] Host audio capture note:', e);
    }
  }

  // 3. Start Movie Mode
  public startMovie(
    title: string,
    fileOrUrl: File | string,
    duration: number = 0,
    fileSize: number = 0
  ) {
    let streamUrl = '';
    let fileName = '';

    if (typeof fileOrUrl === 'string') {
      streamUrl = fileOrUrl;
      fileName = title;
    } else {
      // Local File: Zero memory copy via Object URL
      streamUrl = URL.createObjectURL(fileOrUrl);
      fileName = fileOrUrl.name;
      fileSize = fileOrUrl.size;
    }

    this.movieState = {
      isActive: true,
      title: title || fileName,
      fileName,
      fileSize,
      duration,
      currentTime: 0,
      isPlaying: false,
      isHostVideo: true,
      audioBroadcastMode: 'webrtc',
      streamUrl,
      theaterSettings: spatialTheaterEngine.getSettings(),
      lipSyncOffsetMs: 0,
      updatedAt: Date.now(),
    };

    if (this.hostVideoElement) {
      if (streamUrl.startsWith('blob:') || streamUrl.startsWith('data:')) {
        this.hostVideoElement.removeAttribute('crossorigin');
      }
      this.hostVideoElement.src = streamUrl;
      this.hostVideoElement.load();
      spatialTheaterEngine.resumeContext().catch(console.warn);
      this.hostVideoElement.play().catch((err) => {
        console.log('[MovieSyncService] Playback pending user action:', err);
      });
    }

    // Broadcast movie_start to all connected room devices
    socket.emit('movie_start', {
      title: this.movieState.title,
      fileName: this.movieState.fileName,
      fileSize: this.movieState.fileSize,
      duration: this.movieState.duration,
      streamUrl: typeof fileOrUrl === 'string' ? streamUrl : '',
      audioBroadcastMode: this.movieState.audioBroadcastMode,
    });

    this.notify();
    this.startPeriodicSyncTimer();
  }

  public stopMovie() {
    this.movieState.isActive = false;
    this.movieState.isPlaying = false;

    if (this.hostVideoElement) {
      this.hostVideoElement.pause();
      this.hostVideoElement.removeAttribute('src');
      this.hostVideoElement.load();
    }

    this.stopClientAudio();
    this.stopPeriodicSyncTimer();
    this.closeAllPeerConnections();

    socket.emit('movie_stop', {});
    this.notify();
  }

  public async togglePlayPause() {
    if (this.hostVideoElement) {
      await spatialTheaterEngine.resumeContext();
      if (this.hostVideoElement.paused) {
        try {
          await this.hostVideoElement.play();
        } catch (e) {
          console.warn('[MovieSyncService] play error:', e);
        }
      } else {
        this.hostVideoElement.pause();
      }
    }
  }

  public seek(targetSeconds: number) {
    if (this.hostVideoElement) {
      this.hostVideoElement.currentTime = targetSeconds;
    }
    this.movieState.currentTime = targetSeconds;
    this.broadcastPlaybackState(this.movieState.isPlaying, targetSeconds);
    this.notify();
  }

  // Lip-Sync Fine Calibration (Nudge +/- 5ms, +/- 10ms, etc.)
  public nudgeLipSync(deltaMs: number) {
    const nextOffset = Math.max(-500, Math.min(500, this.movieState.lipSyncOffsetMs + deltaMs));
    this.movieState.lipSyncOffsetMs = nextOffset;

    // Apply hardware delay offset into syncEngine
    syncEngine.setHardwareDelayOffset(nextOffset);
    this.notify();
  }

  public setLipSyncOffset(offsetMs: number) {
    this.movieState.lipSyncOffsetMs = Math.max(-500, Math.min(500, offsetMs));
    syncEngine.setHardwareDelayOffset(this.movieState.lipSyncOffsetMs);
    this.notify();
  }

  // 4. Ultra-Low Latency Lip-Sync Synchronization Broadcast
  private broadcastPlaybackState(isPlaying: boolean, currentPos: number) {
    const serverNow = syncEngine.getServerTime();
    socket.emit('movie_sync', {
      isPlaying,
      currentTime: currentPos,
      duration: this.movieState.duration,
      scheduledServerTime: serverNow,
      playbackRate: this.hostVideoElement?.playbackRate || 1.0,
    });
  }

  private startPeriodicSyncTimer() {
    this.stopPeriodicSyncTimer();
    // High frequency sync heartbeat (every 800ms) for frame-accurate lip-sync
    this.syncIntervalId = setInterval(() => {
      if (this.movieState.isActive && this.hostVideoElement) {
        this.broadcastPlaybackState(
          !this.hostVideoElement.paused,
          this.hostVideoElement.currentTime
        );
      }
    }, 800);
  }

  private stopPeriodicSyncTimer() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }

  // 5. Client Handling: Receiving & Synchronizing Audio Stream
  private handleIncomingSync(data: {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    scheduledServerTime: number;
    playbackRate?: number;
  }) {
    this.movieState.isPlaying = data.isPlaying;
    this.movieState.duration = data.duration || this.movieState.duration;

    const serverNow = syncEngine.getServerTime();
    const elapsedSincePacket = (serverNow - data.scheduledServerTime) / 1000;
    const targetPosition = data.currentTime + (data.isPlaying ? elapsedSincePacket : 0);

    this.movieState.currentTime = targetPosition;
    this.notify();

    // If client is playing direct audio element (fallback)
    if (this.clientAudioElement) {
      const currentClientTime = this.clientAudioElement.currentTime;
      // Account for lip-sync calibration offset
      const calibratedTarget = targetPosition + this.movieState.lipSyncOffsetMs / 1000;
      const drift = Math.abs(currentClientTime - calibratedTarget);

      if (drift > 0.15) {
        // Hard seek if drift > 150ms
        this.clientAudioElement.currentTime = calibratedTarget;
      } else if (drift > 0.03) {
        // Micro-rate adjustment (0.98x or 1.02x) for seamless phase lock
        const rate = currentClientTime < calibratedTarget ? 1.03 : 0.97;
        this.clientAudioElement.playbackRate = rate;
      } else {
        this.clientAudioElement.playbackRate = 1.0;
      }

      if (data.isPlaying && this.clientAudioElement.paused) {
        this.clientAudioElement.play().catch(console.warn);
      } else if (!data.isPlaying && !this.clientAudioElement.paused) {
        this.clientAudioElement.pause();
      }
    }
  }

  private stopClientAudio() {
    if (this.clientAudioElement) {
      this.clientAudioElement.pause();
      this.clientAudioElement.removeAttribute('src');
      this.clientAudioElement.load();
      this.clientAudioElement = null;
    }
    if (this.clientRemoteStream) {
      this.clientRemoteStream.getTracks().forEach((t) => t.stop());
      this.clientRemoteStream = null;
    }
  }

  // 6. WebRTC P2P Audio Streaming Protocol (Host -> Connected Clients)
  public async initiateWebRTCBroadCastToClient(targetClientId: string) {
    if (!this.hostAudioStreamDestination) return;
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      this.peerConnections.set(targetClientId, pc);

      // Add audio track to peer connection
      const stream = this.hostAudioStreamDestination.stream;
      stream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc_signal', {
            targetUserId: targetClientId,
            data: { type: 'candidate', candidate: event.candidate },
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('webrtc_signal', {
        targetUserId: targetClientId,
        data: { type: 'offer', sdp: offer },
      });
    } catch (e) {
      console.warn('[MovieSyncService] WebRTC broadcast offer error:', e);
    }
  }

  private async handleWebRTCSignal(fromUserId: string, data: any) {
    try {
      if (data.type === 'offer') {
        // Client receives offer from Host
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        this.peerConnections.set(fromUserId, pc);

        pc.ontrack = (event) => {
          this.clientRemoteStream = event.streams[0];
          this.playClientRemoteAudio(event.streams[0]);
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('webrtc_signal', {
              targetUserId: fromUserId,
              data: { type: 'candidate', candidate: event.candidate },
            });
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc_signal', {
          targetUserId: fromUserId,
          data: { type: 'answer', sdp: answer },
        });
      } else if (data.type === 'answer') {
        // Host receives answer from Client
        const pc = this.peerConnections.get(fromUserId);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        }
      } else if (data.type === 'candidate') {
        // ICE Candidate exchange
        const pc = this.peerConnections.get(fromUserId);
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      }
    } catch (e) {
      console.warn('[MovieSyncService] WebRTC signal error:', e);
    }
  }

  private playClientRemoteAudio(stream: MediaStream) {
    try {
      const audioCtx = spatialTheaterEngine.ensureContext();
      if (!audioCtx) return;

      const streamSource = audioCtx.createMediaStreamSource(stream);
      spatialTheaterEngine.attachToSource(streamSource, audioCtx.destination);
    } catch (e) {
      console.warn('[MovieSyncService] Client remote audio play error:', e);
    }
  }

  private closeAllPeerConnections() {
    this.peerConnections.forEach((pc) => {
      try {
        pc.close();
      } catch (e) {}
    });
    this.peerConnections.clear();
  }

  // 7. Large File Chunked Uploader (1GB+ Movies without Browser Crashes)
  public async uploadChunkedMovie(
    file: File,
    onProgressUpdate?: (progress: number) => void
  ): Promise<{ streamUrl: string; duration: number }> {
    const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB per chunk
    const totalBytes = file.size;
    const totalChunks = Math.ceil(totalBytes / CHUNK_SIZE);
    const fileId = `movie_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    this.notifyUpload({
      isUploading: true,
      progress: 0,
      uploadedBytes: 0,
      totalBytes,
      fileName: file.name,
    });

    try {
      // 1. Initialize upload session
      const initRes = await fetch('/api/movies/upload-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          fileName: file.name,
          totalChunks,
          totalBytes,
        }),
      });

      if (!initRes.ok) {
        throw new Error('Failed to initialize chunked movie upload');
      }

      // 2. Upload chunks sequentially
      let uploadedBytes = 0;
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, totalBytes);
        const chunkBlob = file.slice(start, end);

        const formData = new FormData();
        formData.append('fileId', fileId);
        formData.append('chunkIndex', chunkIndex.toString());
        formData.append('chunk', chunkBlob);

        const chunkRes = await fetch('/api/movies/upload-chunk', {
          method: 'POST',
          body: formData,
        });

        if (!chunkRes.ok) {
          throw new Error(`Failed to upload chunk ${chunkIndex + 1} of ${totalChunks}`);
        }

        uploadedBytes += end - start;
        const pct = Math.round((uploadedBytes / totalBytes) * 100);

        this.notifyUpload({
          isUploading: true,
          progress: pct,
          uploadedBytes,
          totalBytes,
          fileName: file.name,
        });

        if (onProgressUpdate) {
          onProgressUpdate(pct);
        }
      }

      // 3. Finalize upload
      const finishRes = await fetch('/api/movies/upload-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, fileName: file.name }),
      });

      const finishData = await finishRes.json();

      this.notifyUpload({
        isUploading: false,
        progress: 100,
        uploadedBytes: totalBytes,
        totalBytes,
        fileName: file.name,
      });

      return {
        streamUrl: finishData.streamUrl || `/api/stream/movie/${encodeURIComponent(file.name)}`,
        duration: finishData.duration || 0,
      };
    } catch (err: any) {
      this.notifyUpload({
        isUploading: false,
        progress: 0,
        uploadedBytes: 0,
        totalBytes,
        fileName: file.name,
        error: err.message || 'Chunked upload failed',
      });
      throw err;
    }
  }

  // 8. 3D Theater Mode Controls for Movie Mode
  public setTheaterMode(enabled: boolean) {
    spatialTheaterEngine.setTheaterEnabled(enabled);
    this.movieState.theaterSettings.enabled = enabled;
    socket.emit('movie_theater_update', this.movieState.theaterSettings);
    this.notify();
  }

  public setTheaterPreset(preset: TheaterPreset) {
    spatialTheaterEngine.setPreset(preset);
    this.movieState.theaterSettings.preset = preset;
    socket.emit('movie_theater_update', this.movieState.theaterSettings);
    this.notify();
  }

  public setSpeakerRole(role: SpeakerRole) {
    spatialTheaterEngine.setSpeakerRole(role);
    socket.emit('set_speaker_role', { role });
  }
}

export const movieSyncService = new MovieSyncService();
