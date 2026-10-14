import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Film,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sparkles,
  Speaker,
  ShieldCheck,
  X,
  AlertCircle,
  PictureInPicture,
  PictureInPicture2,
  Globe,
  Link2,
  Loader2,
  Video,
  FolderOpen,
} from 'lucide-react';
import Hls from 'hls.js';
import { MovieState, MovieSourceType, TheaterPreset, User } from '../types';
import { movieSyncService, MAX_MOVIE_FILE_SIZE_BYTES } from '../services/movieSyncService';
import { spatialTheaterEngine } from '../services/spatialTheaterEngine';
import { SurroundRoleModal } from './SurroundRoleModal';
import { BACKGROUND_THEMES, BackgroundThemeId } from '../types/backgroundThemes';

export const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

// Preset demo streams for 1-click instant testing
const DEMO_PRESETS = [
  {
    name: 'YouTube Demo',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    badge: 'YouTube',
  },
  {
    name: 'HLS Live Stream',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    badge: 'HLS .m3u8',
  },
  {
    name: 'Direct MP4',
    url: 'https://vjs.zencdn.net/v/oceans.mp4',
    badge: 'MP4 1080p',
  },
];

// Helper to load YouTube Iframe Player API
function loadYouTubeIframeApi(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).YT && (window as any).YT.Player) {
      return resolve();
    }
    const existing = document.getElementById('youtube-iframe-api');
    if (existing) {
      const interval = setInterval(() => {
        if ((window as any).YT && (window as any).YT.Player) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
      return;
    }
    const tag = document.createElement('script');
    tag.id = 'youtube-iframe-api';
    tag.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(tag);
    (window as any).onYouTubeIframeAPIReady = () => {
      resolve();
    };
  });
}

interface MovieModeViewProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  users: User[];
  isHost: boolean;
  currentBgTheme: BackgroundThemeId;
}

export const MovieModeView: React.FC<MovieModeViewProps> = ({
  isOpen,
  onClose,
  currentUser,
  users,
  isHost,
  currentBgTheme,
}) => {
  const [movieState, setMovieState] = useState<MovieState>(() => movieSyncService.getState());
  const [displayMode, setDisplayMode] = useState<'cinema' | 'pip'>('cinema');

  // URL Input State
  const [urlInput, setUrlInput] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [urlDetection, setUrlDetection] = useState<{
    type: MovieSourceType;
    label: string;
  } | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSurroundModalOpen, setIsSurroundModalOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<TheaterPreset>('cinema');
  const [isTheaterActive, setIsTheaterActive] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [isHostMuted, setIsHostMuted] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);

  // Synchronized playback states for responsive UI
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controlsTimeoutRef = useRef<any>(null);
  const hlsRef = useRef<Hls | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytTimerRef = useRef<any>(null);

  const activeThemeDef =
    BACKGROUND_THEMES.find((t) => t.id === currentBgTheme) || BACKGROUND_THEMES[0];
  const isLight = activeThemeDef.id === 'pure-light';

  // Attach video element callback ref ensuring it is connected immediately
  const setVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      videoRef.current = el;
      if (el && isHost && movieState.sourceType !== 'youtube') {
        movieSyncService.attachHostVideo(el);
      }
    },
    [isHost, movieState.sourceType]
  );

  // Subscribe to movie sync service state
  useEffect(() => {
    const unsubState = movieSyncService.subscribe((state) => {
      setMovieState(state);
      setIsTheaterActive(state.theaterSettings.enabled);
      setSelectedPreset(state.theaterSettings.preset);
      setIsPlaying(state.isPlaying);
      if (state.duration) setDuration(state.duration);
      if (state.currentTime !== undefined) setCurrentTime(state.currentTime);
    });

    return () => unsubState();
  }, []);

  // Ensure video element gets attached when opened or when streamUrl changes (non-YouTube)
  useEffect(() => {
    if (isHost && videoRef.current && movieState.sourceType !== 'youtube') {
      movieSyncService.attachHostVideo(videoRef.current);
    }
  }, [isHost, isOpen, movieState.streamUrl, movieState.sourceType]);

  // Handle HLS stream mounting
  useEffect(() => {
    if (isHost && movieState.sourceType === 'hls' && movieState.streamUrl && videoRef.current) {
      if (Hls.isSupported()) {
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hls.loadSource(movieState.streamUrl);
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsBuffering(false);
          spatialTheaterEngine.resumeContext().catch(console.warn);
          videoRef.current?.play().catch(console.warn);
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            console.error('[HLS Error]', data);
            setVideoError(`HLS stream error: ${data.details || 'stream unavailable'}`);
          }
        });
        hlsRef.current = hls;
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = movieState.streamUrl;
        videoRef.current.load();
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [isHost, movieState.sourceType, movieState.streamUrl]);

  // Handle YouTube player mounting
  useEffect(() => {
    let isCancelled = false;

    if (movieState.sourceType === 'youtube' && movieState.youtubeId && movieState.isActive) {
      loadYouTubeIframeApi().then(() => {
        if (isCancelled) return;
        const targetDiv = document.getElementById('youtube-theater-mount');
        if (!targetDiv) return;

        if (ytPlayerRef.current) {
          try {
            ytPlayerRef.current.destroy();
          } catch {}
          ytPlayerRef.current = null;
        }

        try {
          const player = new (window as any).YT.Player('youtube-theater-mount', {
            videoId: movieState.youtubeId,
            playerVars: {
              autoplay: 1,
              controls: 1,
              rel: 0,
              modestbranding: 1,
              playsinline: 1,
              enablejsapi: 1,
              origin: window.location.origin,
            },
            events: {
              onReady: (event: any) => {
                ytPlayerRef.current = event.target;
                const d = event.target.getDuration();
                if (d) setDuration(d);
                if (movieState.currentTime > 0) {
                  event.target.seekTo(movieState.currentTime, true);
                }
                event.target.playVideo();
                setIsPlaying(true);
                setIsBuffering(false);
              },
              onStateChange: (event: any) => {
                if (event.data === 1) {
                  setIsPlaying(true);
                  setIsBuffering(false);
                  if (isHost) {
                    movieSyncService.broadcastPlaybackUpdate(
                      true,
                      event.target.getCurrentTime(),
                      event.target.getDuration()
                    );
                  }
                } else if (event.data === 2) {
                  setIsPlaying(false);
                  setIsBuffering(false);
                  if (isHost) {
                    movieSyncService.broadcastPlaybackUpdate(
                      false,
                      event.target.getCurrentTime(),
                      event.target.getDuration()
                    );
                  }
                } else if (event.data === 3) {
                  setIsBuffering(true);
                }
              },
              onError: (err: any) => {
                console.error('[YouTube Error]', err);
                setVideoError('YouTube video failed to load or is restricted by copyright/region.');
              },
            },
          });
          ytPlayerRef.current = player;
        } catch (e) {
          console.error('[YouTube init error]', e);
        }
      });

      if (ytTimerRef.current) clearInterval(ytTimerRef.current);
      ytTimerRef.current = setInterval(() => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          try {
            const t = ytPlayerRef.current.getCurrentTime();
            const d = ytPlayerRef.current.getDuration();
            if (typeof t === 'number') setCurrentTime(t);
            if (typeof d === 'number' && d > 0 && duration === 0) setDuration(d);
          } catch {}
        }
      }, 500);
    } else {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {}
        ytPlayerRef.current = null;
      }
      if (ytTimerRef.current) {
        clearInterval(ytTimerRef.current);
        ytTimerRef.current = null;
      }
    }

    return () => {
      isCancelled = true;
      if (ytTimerRef.current) {
        clearInterval(ytTimerRef.current);
        ytTimerRef.current = null;
      }
    };
  }, [movieState.sourceType, movieState.youtubeId, movieState.isActive, isHost]);

  // Host automatically broadcasts WebRTC audio to all connected room devices
  useEffect(() => {
    if (isHost && movieState.isActive && users.length > 0 && movieState.sourceType !== 'youtube') {
      const clientIds = users
        .filter((u) => u.id !== currentUser?.id)
        .map((u) => u.id);
      movieSyncService.broadcastAudioToClients(clientIds);
    }
  }, [isHost, movieState.isActive, users, currentUser?.id, movieState.sourceType]);

  // Client requests live audio stream from Host when movie is active
  useEffect(() => {
    if (!isHost && movieState.isActive && movieState.sourceType !== 'youtube') {
      const hostUser = users.find((u) => u.role === 'host');
      movieSyncService.requestAudioFromHost(hostUser?.id);
    }
  }, [isHost, movieState.isActive, users, movieState.sourceType]);

  // Handle controls auto-hide during active playback in Cinema mode
  const handleMouseMove = () => {
    setIsControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying || movieState.isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setIsControlsVisible(false);
      }, 3500);
    }
  };

  // Keyboard shortcut: Spacebar for instant play/pause toggle
  const handleTogglePlay = async () => {
    setVideoError(null);
    await spatialTheaterEngine.resumeContext();

    if (movieState.sourceType === 'youtube' && ytPlayerRef.current) {
      try {
        if (isPlaying) {
          ytPlayerRef.current.pauseVideo();
        } else {
          ytPlayerRef.current.playVideo();
        }
      } catch {}
      return;
    }

    if (videoRef.current) {
      if (videoRef.current.paused) {
        try {
          await videoRef.current.play();
        } catch (e) {
          console.warn('[MovieModeView] Playback gesture note:', e);
        }
      } else {
        videoRef.current.pause();
      }
    } else {
      movieSyncService.togglePlayPause();
    }
  };

  useEffect(() => {
    if (!isOpen || displayMode !== 'cinema') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        const activeEl = document.activeElement as HTMLElement | null;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === 'Escape' && !isSurroundModalOpen) {
        if (movieState.isActive) {
          setDisplayMode('pip');
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, displayMode, isSurroundModalOpen, movieState.isActive, isPlaying]);

  // Auto-detect URL type as user types
  const detectUrlType = (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      setUrlDetection(null);
      return;
    }

    if (/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i.test(trimmed)) {
      setUrlDetection({ type: 'youtube', label: 'YouTube Video' });
    } else if (trimmed.includes('.m3u8')) {
      setUrlDetection({ type: 'hls', label: 'HLS Live Stream' });
    } else if (/\.(mp4|webm|mov|mkv|ogg|m4v)(\?|$)/i.test(trimmed)) {
      setUrlDetection({ type: 'direct', label: 'Direct MP4' });
    } else {
      setUrlDetection({ type: 'direct', label: 'Online Video' });
    }
  };

  // Submit and start online video URL stream
  const handleLoadUrlStream = async (targetUrl?: string) => {
    const rawUrl = (targetUrl || urlInput).trim();
    if (!rawUrl) return;

    setVideoError(null);
    setIsLoadingUrl(true);
    setIsBuffering(true);

    try {
      await spatialTheaterEngine.resumeContext();

      const res = await fetch(`/api/movie/info?url=${encodeURIComponent(rawUrl)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to inspect video stream URL');
      }

      const title = data.title || 'Online Video Stream';
      const sType: MovieSourceType = data.type || 'direct';
      const yId: string = data.videoId || '';

      if (sType === 'youtube') {
        movieSyncService.startMovie(title, rawUrl, 0, 0, 'youtube', yId);
      } else if (sType === 'hls') {
        movieSyncService.startMovie(title, rawUrl, 0, 0, 'hls');
      } else {
        const playUrl = rawUrl.startsWith('http') && !rawUrl.startsWith(window.location.origin)
          ? `/api/stream/video-proxy?url=${encodeURIComponent(rawUrl)}`
          : rawUrl;
        movieSyncService.startMovie(title, playUrl, 0, data.size || 0, 'direct');
      }

      setUrlInput('');
    } catch (err: any) {
      console.error('[MovieModeView] Load URL stream error:', err);
      setVideoError(err.message || 'Unable to play video from this URL. Check the link and try again.');
      setIsBuffering(false);
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const handleFilePicked = async (file: File) => {
    if (!file) return;
    setVideoError(null);

    if (file.size > MAX_MOVIE_FILE_SIZE_BYTES) {
      const currentGb = (file.size / (1024 * 1024 * 1024)).toFixed(2);
      setVideoError(
        `File size (${currentGb} GB) exceeds the 5 GB maximum limit for Home Theater. Please select a movie file within 5 GB.`
      );
      return;
    }

    const isVideo =
      file.type.startsWith('video/') ||
      /\.(mp4|mkv|webm|mov|avi|m4v)$/i.test(file.name);
    const isAudio =
      file.type.startsWith('audio/') ||
      /\.(mp3|wav|flac|aac|m4a|ogg)$/i.test(file.name);

    if (!isVideo && !isAudio) {
      setVideoError('Please select a valid video (.mp4, .mkv, .webm, .mov) or audio file.');
      return;
    }

    setIsBuffering(true);
    await spatialTheaterEngine.resumeContext();

    if (videoRef.current) {
      movieSyncService.attachHostVideo(videoRef.current);
    }

    const title = file.name.replace(/\.[^/.]+$/, '');
    movieSyncService.startMovie(title, file, 0, file.size, 'local');

    if (videoRef.current) {
      try {
        await videoRef.current.play();
      } catch (err) {
        console.log('[MovieModeView] Autoplay pending user interaction:', err);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFilePicked(e.dataTransfer.files[0]);
    }
  };

  const handleToggleTheater = () => {
    const next = !isTheaterActive;
    setIsTheaterActive(next);
    movieSyncService.setTheaterMode(next);
  };

  const handlePresetChange = (preset: TheaterPreset) => {
    setSelectedPreset(preset);
    movieSyncService.setTheaterPreset(preset);
  };

  const handleNudge = (deltaMs: number) => {
    movieSyncService.nudgeLipSync(deltaMs);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(console.warn);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.warn);
      setIsFullscreen(false);
    }
  };

  // Native Browser Picture-in-Picture
  const handleNativePip = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current && document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      } else {
        setDisplayMode('pip');
      }
    } catch (err) {
      console.warn('Native PiP not available, using In-App Floating PiP:', err);
      setDisplayMode('pip');
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const mySpeakerRole = currentUser?.speakerRole || 'all';
  const roleDisplay = mySpeakerRole === 'all' ? 'STEREO' : mySpeakerRole.replace('_', ' ').toUpperCase();
  const totalDuration = duration || movieState.duration || 0;
  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  const getSourceBadge = () => {
    if (movieState.sourceType === 'youtube') return { label: 'YouTube', color: 'bg-red-500/20 text-red-300 border-red-500/40' };
    if (movieState.sourceType === 'hls') return { label: 'HLS Live', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
    if (movieState.sourceType === 'direct') return { label: 'Online Video', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    return { label: 'Local 5 GB', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
  };

  if (!isOpen) return null;

  // =========================================================================
  // VIEW 1: IN-APP PICTURE-IN-PICTURE (PIP) FLOATING MINI-PLAYER WINDOW
  // =========================================================================
  if (displayMode === 'pip') {
    return (
      <div className="fixed inset-0 z-50 pointer-events-none select-none">
        <div
          role="region"
          aria-label="Picture in Picture Video Player"
          className="pointer-events-auto absolute bottom-4 right-4 sm:bottom-6 sm:right-6 w-80 sm:w-96 aspect-video rounded-2xl border border-amber-500/40 bg-zinc-950/95 shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl overflow-hidden group transition-all duration-300 ring-1 ring-white/10 hover:ring-amber-500/50 hover:shadow-[0_0_35px_rgba(245,158,11,0.35)] flex flex-col"
        >
          <div className="relative w-full h-full flex-1 bg-black overflow-hidden flex items-center justify-center">
            {isHost && (
              <video
                ref={setVideoRef}
                src={movieState.sourceType !== 'youtube' ? movieState.streamUrl || undefined : undefined}
                playsInline
                preload="metadata"
                className={`w-full h-full object-contain ${
                  movieState.sourceType === 'youtube' ? 'hidden' : 'block'
                }`}
                onClick={handleTogglePlay}
                onTimeUpdate={(e) => {
                  const v = e.currentTarget;
                  setCurrentTime(v.currentTime);
                  if (v.duration && duration === 0) setDuration(v.duration);
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            )}

            {movieState.sourceType === 'youtube' && (
              <div id="youtube-theater-mount" className="w-full h-full" />
            )}

            {!isHost && (
              <div
                onClick={async () => {
                  await movieSyncService.unlockClientAudio();
                }}
                className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-zinc-900 to-black cursor-pointer"
              >
                <div className="flex items-center gap-1 h-8 mb-2">
                  {[40, 80, 55, 95, 60, 85].map((h, i) => (
                    <span
                      key={i}
                      style={{ height: isPlaying ? `${h}%` : '25%' }}
                      className="w-1.5 rounded-full bg-cyan-400 transition-all duration-200"
                    />
                  ))}
                </div>
                <span className="text-xs font-bold text-white truncate max-w-[200px]">
                  {movieState.title || 'Movie Audio'}
                </span>
                <span className="text-[10px] text-cyan-300 font-mono mt-0.5">
                  Synced 5.1 Audio • Host Screen
                </span>
              </div>
            )}

            {/* Hover Top Floating Bar */}
            <div className="absolute top-0 inset-x-0 p-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30">
              <div className="flex items-center gap-1.5 min-w-0 pr-2">
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border shrink-0 ${getSourceBadge().color}`}>
                  {getSourceBadge().label}
                </span>
                <span className="text-[11px] font-semibold text-white truncate max-w-[130px] sm:max-w-[180px]">
                  {movieState.title}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSurroundModalOpen(true)}
                  className="p-1 rounded-lg bg-white/10 hover:bg-cyan-500/30 text-cyan-300 transition-colors cursor-pointer"
                  title="Configure Speaker Role"
                >
                  <Speaker className="w-3.5 h-3.5" />
                </button>

                {movieState.sourceType !== 'youtube' && (
                  <button
                    type="button"
                    onClick={handleNativePip}
                    className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title="Pop out into native OS Picture-in-Picture window"
                  >
                    <PictureInPicture2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setDisplayMode('cinema')}
                  className="p-1 rounded-lg bg-white/10 hover:bg-amber-400 text-zinc-200 hover:text-black transition-colors cursor-pointer"
                  title="Expand to Full Cinema Screen"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    movieSyncService.stopMovie();
                    onClose();
                  }}
                  className="p-1 rounded-lg bg-white/10 hover:bg-rose-500 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  title="Close Movie"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTogglePlay}
              className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-black/60 border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer shadow-lg active:scale-90 z-20"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
          </div>

          <div className="px-2.5 py-1.5 bg-zinc-950 border-t border-white/10 flex flex-col gap-1 z-30">
            <div
              className="w-full h-1 bg-white/15 hover:h-2 rounded-full overflow-hidden cursor-pointer relative transition-all"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                const targetTime = pct * totalDuration;
                if (movieState.sourceType === 'youtube' && ytPlayerRef.current) {
                  ytPlayerRef.current.seekTo(targetTime, true);
                } else if (videoRef.current) {
                  videoRef.current.currentTime = targetTime;
                }
                movieSyncService.seek(targetTime);
              }}
            >
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="text-white hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {isPlaying ? 'PAUSE' : 'PLAY'}
                </button>
                <span>
                  {formatTime(currentTime)} / {formatTime(totalDuration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isHost && movieState.sourceType !== 'youtube' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.muted = !isHostMuted;
                        setIsHostMuted(!isHostMuted);
                      }
                    }}
                    className="hover:text-white transition-colors cursor-pointer"
                    title={isHostMuted ? 'Host audio muted' : 'Mute host audio'}
                  >
                    {isHostMuted ? <VolumeX className="w-3 h-3 text-rose-400" /> : <Volume2 className="w-3 h-3" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDisplayMode('cinema')}
                  className="text-amber-400 hover:underline cursor-pointer font-bold"
                >
                  CINEMA
                </button>
              </div>
            </div>
          </div>
        </div>

        <SurroundRoleModal
          isOpen={isSurroundModalOpen}
          onClose={() => setIsSurroundModalOpen(false)}
          currentUser={currentUser}
          users={users}
          isHost={isHost}
          activeTheme={currentBgTheme}
        />
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: FULL IMMERSIVE CINEMA SCREEN (MINIMALIST & SLEEK)
  // =========================================================================
  return (
    <div
      role="dialog"
      aria-modal="true"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-50 flex flex-col w-full h-full min-h-screen overflow-hidden bg-black font-sans select-none"
    >
      {/* Dynamic Ambient Glow Behind Video */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[70vh] rounded-full blur-[140px] pointer-events-none transition-all duration-700 ease-out"
        style={{
          backgroundColor: isTheaterActive ? '#f59e0b' : (activeThemeDef.glowColor1 || activeThemeDef.accentHex || '#38bdf8'),
          opacity: isPlaying || movieState.isPlaying ? 0.22 : 0.08,
          transform: `translate(-50%, -50%) scale(${isPlaying || movieState.isPlaying ? 1.08 : 0.95})`,
        }}
      />

      {/* TOP FLOATING CINEMA BAR */}
      <header
        style={{
          backgroundColor: isLight ? 'rgba(255, 255, 255, 0.92)' : 'rgba(8, 8, 12, 0.88)',
          borderColor: isLight ? 'rgba(15, 23, 42, 0.1)' : 'rgba(255, 255, 255, 0.12)',
        }}
        className={`absolute top-0 inset-x-0 z-30 px-3 sm:px-6 py-2.5 border-b backdrop-blur-2xl flex items-center justify-between transition-all duration-300 ${
          isControlsVisible || !movieState.isActive || !isPlaying
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
            <Film className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className={`text-xs sm:text-sm font-bold tracking-tight truncate max-w-[130px] sm:max-w-md ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {movieState.title || 'Home Theater'}
              </h2>
              {movieState.isActive && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border shrink-0 ${getSourceBadge().color}`}>
                  {getSourceBadge().label}
                </span>
              )}
              {movieState.isActive && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse shrink-0" title="Synchronized Audio Active" />
              )}
            </div>
            <p className={`text-[10px] hidden sm:block truncate ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              YouTube, HLS streams & local files • Multi-device 5.1 surround sound
            </p>
          </div>
        </div>

        {/* Center: Sound Mode Selector */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleToggleTheater}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer active:scale-95 ${
              isTheaterActive
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                : isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-400'
            }`}
            title="Toggle Web Audio 3D Spatial Theater"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">3D Cinema</span>
            <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${isTheaterActive ? 'bg-amber-400 text-black' : 'opacity-60'}`}>
              {isTheaterActive ? 'ON' : 'OFF'}
            </span>
          </button>

          {isTheaterActive && (
            <div className={`hidden md:flex items-center gap-1 p-0.5 rounded-full border transition-all animate-fade-in ${isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-black/60 border-white/10'}`}>
              {(['cinema', 'atmos', 'intimate'] as TheaterPreset[]).map((p) => {
                const isSel = selectedPreset === p;
                const label = p === 'cinema' ? 'Hall' : p === 'atmos' ? 'Atmos' : 'Studio';
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePresetChange(p)}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase transition-all cursor-pointer active:scale-95 ${
                      isSel
                        ? 'bg-amber-400 text-black shadow-sm'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Speaker Role Pill */}
          <button
            type="button"
            onClick={() => setIsSurroundModalOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer active:scale-95 ${
              isLight
                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
            }`}
            title="Configure speaker room position"
          >
            <Speaker className="w-3.5 h-3.5" />
            <span className="font-mono text-[10px] font-bold uppercase">
              {roleDisplay}
            </span>
          </button>

          {/* Lip-Sync Calibration */}
          <div className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-mono ${isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-zinc-300'}`}>
            <button
              type="button"
              onClick={() => handleNudge(-10)}
              className="hover:text-emerald-400 font-bold px-1 transition-colors cursor-pointer"
              title="Nudge audio -10ms earlier"
            >
              -
            </button>
            <span className="font-bold text-emerald-400 min-w-[34px] text-center">
              {movieState.lipSyncOffsetMs >= 0 ? `+${movieState.lipSyncOffsetMs}` : movieState.lipSyncOffsetMs}ms
            </span>
            <button
              type="button"
              onClick={() => handleNudge(10)}
              className="hover:text-emerald-400 font-bold px-1 transition-colors cursor-pointer"
              title="Nudge audio +10ms later"
            >
              +
            </button>
          </div>

          {/* Picture-in-Picture Button */}
          {movieState.isActive && (
            <button
              type="button"
              onClick={() => setDisplayMode('pip')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer active:scale-95 ${
                isLight
                  ? 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
              }`}
              title="Pop out video into floating mini-player while chatting & browsing"
            >
              <PictureInPicture className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline text-[11px]">Pop Out (PiP)</span>
            </button>
          )}

          {/* Native OS PiP */}
          {movieState.isActive && movieState.sourceType !== 'youtube' && (
            <button
              type="button"
              onClick={handleNativePip}
              className={`p-1.5 rounded-full transition-colors cursor-pointer active:scale-90 ${
                isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200' : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
              title="Native OS Picture-in-Picture window"
            >
              <PictureInPicture2 className="w-4 h-4" />
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`p-1.5 rounded-full transition-colors cursor-pointer active:scale-90 ${isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
            title="Toggle Cinema Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close / Minimize */}
          <button
            type="button"
            onClick={() => {
              if (movieState.isActive) {
                setDisplayMode('pip');
              } else {
                onClose();
              }
            }}
            className={`p-1.5 rounded-full transition-colors cursor-pointer active:scale-90 ${isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
            title={movieState.isActive ? 'Minimize to floating mini-player' : 'Exit Home Theater'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* CINEMA CANVAS */}
      <main
        className="flex-1 w-full h-full min-h-0 relative flex items-center justify-center overflow-hidden bg-black"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isHost ? (
          <>
            {/* HTML5 Video for MP4, HLS, Local */}
            <video
              ref={setVideoRef}
              src={movieState.sourceType !== 'youtube' ? movieState.streamUrl || undefined : undefined}
              playsInline
              preload="metadata"
              className={`w-full h-full max-w-full max-h-full object-contain bg-black cursor-pointer transition-opacity duration-300 ${
                movieState.isActive && movieState.sourceType !== 'youtube' ? 'opacity-100' : 'opacity-0 pointer-events-none hidden'
              }`}
              onClick={handleTogglePlay}
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (v.duration) setDuration(v.duration);
                setIsBuffering(false);
              }}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => {
                setIsPlaying(true);
                setIsBuffering(false);
              }}
              onSeeking={() => setIsBuffering(true)}
              onSeeked={() => setIsBuffering(false)}
              onLoadedData={() => setIsBuffering(false)}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                setCurrentTime(v.currentTime);
                if (v.duration && duration === 0) setDuration(v.duration);
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={(e) => {
                const v = e.currentTarget;
                console.error('[MovieModeView] Video error:', v.error);
                setIsBuffering(false);
                setVideoError('Video format or stream is not playable. Try an MP4, YouTube link, or HLS stream.');
              }}
            />

            {/* YouTube Player Mount */}
            <div
              className={`w-full h-full max-w-full max-h-full flex items-center justify-center ${
                movieState.isActive && movieState.sourceType === 'youtube' ? 'block' : 'hidden'
              }`}
            >
              <div id="youtube-theater-mount" className="w-full h-full max-w-full max-h-full aspect-video" />
            </div>

            {/* Buffering Indicator */}
            {isBuffering && movieState.isActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30 bg-black/30 backdrop-blur-[2px]">
                <div className="w-12 h-12 rounded-full border-2 border-amber-400/20 border-t-amber-400 animate-spin flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                </div>
                <span className="mt-2.5 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-[11px] font-mono text-zinc-300">
                  Buffering Stream...
                </span>
              </div>
            )}

            {/* Error Notification */}
            {videoError && (
              <div className="absolute top-16 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-40 max-w-md p-3.5 rounded-2xl bg-rose-950/90 border border-rose-500/40 text-rose-200 backdrop-blur-xl shadow-2xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <div className="text-xs flex-1">{videoError}</div>
                <button
                  type="button"
                  onClick={() => setVideoError(null)}
                  className="px-2.5 py-1 rounded-lg bg-rose-500 text-white font-bold text-[10px] hover:bg-rose-400 transition-colors shrink-0 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* ========================================================= */}
            {/* MINIMALIST & SIMPLE SETUP VIEW (When No Movie is Active) */}
            {/* ========================================================= */}
            {!movieState.isActive && (
              <div className="relative z-20 w-full max-w-xl mx-auto px-4 py-8 flex flex-col items-center text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/mkv,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,video/x-m4v,video/*,audio/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFilePicked(e.target.files[0]);
                    }
                  }}
                />

                {/* Minimalist Glowing Film Icon */}
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
                  <Film className="w-7 h-7" />
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-white mb-1 tracking-tight">
                  Home Theater & Watch Party
                </h3>
                <p className="text-xs text-zinc-400 mb-6 max-w-md">
                  Paste a video link or drop a local file (up to 5 GB) with synchronized 5.1 surround sound across all devices
                </p>

                {/* PROMINENT MINIMALIST ONLINE VIDEO URL BAR */}
                <div className="w-full flex items-center gap-2 p-1.5 rounded-2xl bg-zinc-900/90 border border-white/20 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20 shadow-2xl backdrop-blur-xl transition-all">
                  <Link2 className="w-4 h-4 text-zinc-400 ml-3 shrink-0" />
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      detectUrlType(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleLoadUrlStream();
                    }}
                    placeholder="Paste YouTube, direct MP4, or HLS stream URL..."
                    className="w-full bg-transparent text-white text-xs sm:text-sm placeholder:text-zinc-500 outline-none px-2 py-1.5"
                  />
                  {urlDetection && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                      {urlDetection.label}
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={!urlInput.trim() || isLoadingUrl}
                    onClick={() => handleLoadUrlStream()}
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] shrink-0 cursor-pointer active:scale-95"
                  >
                    {isLoadingUrl ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play Stream</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Quick 1-Click Demo Stream Chips */}
                <div className="flex items-center gap-1.5 mt-3 flex-wrap justify-center">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase mr-1">Demo:</span>
                  {DEMO_PRESETS.map((demo) => (
                    <button
                      key={demo.name}
                      type="button"
                      onClick={() => {
                        setUrlInput(demo.url);
                        detectUrlType(demo.url);
                        handleLoadUrlStream(demo.url);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/40 text-[11px] text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span>{demo.name}</span>
                    </button>
                  ))}
                </div>

                {/* Minimal Divider & Local File Picker Button */}
                <div className="w-full flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">or</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Choose Local File Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full py-3 px-4 rounded-2xl border border-white/15 hover:border-amber-400/50 bg-white/5 hover:bg-white/[0.08] transition-all flex items-center justify-center gap-2 text-zinc-200 hover:text-white cursor-pointer active:scale-[0.99] group ${
                    isDraggingFile ? 'border-amber-400 ring-2 ring-amber-400/30 bg-amber-500/10' : ''
                  }`}
                >
                  <FolderOpen className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold">
                    Browse Local Video File (Up to 5 GB • Drag & Drop Anywhere)
                  </span>
                </button>
              </div>
            )}
          </>
        ) : (
          /* CLIENT VIEW (Pure Synced Audio) */
          <div
            onClick={async () => {
              await movieSyncService.unlockClientAudio();
            }}
            className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-zinc-950 via-black to-zinc-950 cursor-pointer select-none"
          >
            <div className="flex items-center gap-1.5 h-16 mb-5">
              {[35, 75, 50, 95, 60, 85, 45, 90, 65, 40].map((h, i) => (
                <span
                  key={i}
                  style={{
                    height: movieState.isPlaying ? `${h}%` : '20%',
                    animationDuration: `${0.6 + (i % 4) * 0.2}s`,
                  }}
                  className={`w-2 rounded-full bg-gradient-to-t from-cyan-500 to-blue-400 transition-all ${
                    movieState.isPlaying ? 'animate-pulse' : 'opacity-30'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsSurroundModalOpen(true);
              }}
              className="flex items-center gap-2 mb-2 px-3.5 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 transition-all cursor-pointer active:scale-95 shadow-sm"
              title="Tap to change your physical speaker role"
            >
              <Speaker className="w-4 h-4" />
              <span className="text-xs font-mono font-bold uppercase">
                {roleDisplay} CHANNEL
              </span>
            </button>

            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {movieState.title || 'Movie Audio Stream'}
            </h3>
            {movieState.isActive && (
              <span className={`mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${getSourceBadge().color}`}>
                {getSourceBadge().label} Stream
              </span>
            )}
            <p className="text-xs text-zinc-400 mt-1 max-w-sm">
              Video is playing on Host device • Your speaker is playing in frame-accurate lip-sync
            </p>

            <div className="mt-4 px-4 py-2 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-semibold flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all animate-pulse">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <span>Tap Anywhere to Listen in Sync</span>
            </div>
          </div>
        )}

        {/* Floating Minimalist Playback Bar (Visible when Active) */}
        {isHost && movieState.isActive && (
          <div
            style={{
              backgroundColor: 'rgba(6, 6, 12, 0.92)',
              borderColor: 'rgba(255, 255, 255, 0.12)',
            }}
            className={`absolute bottom-3 inset-x-3 sm:inset-x-8 p-2.5 sm:p-3 rounded-2xl border backdrop-blur-2xl flex flex-col gap-2 transition-all duration-300 shadow-2xl z-30 ${
              isControlsVisible || !isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
            }`}
          >
            {/* Scrubber Progress Bar */}
            <div
              className="w-full h-1.5 bg-white/15 hover:h-2.5 rounded-full overflow-hidden cursor-pointer relative transition-all group/scrub"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                const targetTime = pct * totalDuration;
                if (movieState.sourceType === 'youtube' && ytPlayerRef.current) {
                  ytPlayerRef.current.seekTo(targetTime, true);
                } else if (videoRef.current) {
                  videoRef.current.currentTime = targetTime;
                }
                movieSyncService.seek(targetTime);
              }}
            >
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.8)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between text-xs text-white">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="p-1.5 sm:p-2 rounded-full bg-white text-black hover:bg-zinc-200 transition-colors cursor-pointer active:scale-90 shadow-sm"
                  title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                </button>

                <div className="font-mono text-[11px] text-zinc-300 flex items-center gap-1">
                  <span>{formatTime(currentTime)}</span>
                  <span className="text-zinc-600">/</span>
                  <span className="text-zinc-400">{formatTime(totalDuration)}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDisplayMode('pip')}
                  className="flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200 transition-colors cursor-pointer active:scale-95"
                  title="Pop out video into floating mini-player"
                >
                  <PictureInPicture className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mini Player (PiP)</span>
                </button>

                {movieState.sourceType !== 'youtube' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.muted = !isHostMuted;
                        setIsHostMuted(!isHostMuted);
                      }
                    }}
                    className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors cursor-pointer active:scale-95"
                    title="Mute host laptop screen audio"
                  >
                    {isHostMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{isHostMuted ? 'Host Muted' : 'Host Audio'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    movieSyncService.stopMovie();
                    setCurrentTime(0);
                    setDuration(0);
                    setIsPlaying(false);
                  }}
                  className="text-[11px] font-mono text-zinc-400 hover:text-amber-300 transition-colors cursor-pointer active:scale-95"
                  title="Stop playback and select another stream or movie"
                >
                  Change Video
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <SurroundRoleModal
        isOpen={isSurroundModalOpen}
        onClose={() => setIsSurroundModalOpen(false)}
        currentUser={currentUser}
        users={users}
        isHost={isHost}
        activeTheme={currentBgTheme}
      />
    </div>
  );
};
