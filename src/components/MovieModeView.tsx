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
  ChevronRight,
  AlertCircle,
  RotateCcw,
  PictureInPicture,
  PictureInPicture2,
  Globe,
  Link2,
  Tv,
  Loader2,
  Check,
  ArrowRight,
  Layers,
  Video,
} from 'lucide-react';
import Hls from 'hls.js';
import { MovieState, MovieSourceType, SpeakerRole, TheaterPreset, User } from '../types';
import { movieSyncService, MAX_MOVIE_FILE_SIZE_BYTES } from '../services/movieSyncService';
import { spatialTheaterEngine } from '../services/spatialTheaterEngine';
import { SurroundRoleModal } from './SurroundRoleModal';
import { BACKGROUND_THEMES, BackgroundThemeId } from '../types/backgroundThemes';

export const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

// Preset sample streams for instant testing
const SAMPLE_STREAM_PRESETS = [
  {
    name: 'Big Buck Bunny (MP4)',
    type: 'direct' as MovieSourceType,
    url: 'https://vjs.zencdn.net/v/oceans.mp4',
    badge: 'Direct MP4',
  },
  {
    name: 'Mux Live Test (HLS)',
    type: 'hls' as MovieSourceType,
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    badge: 'HLS .m3u8',
  },
  {
    name: 'Tears of Steel (MP4)',
    type: 'direct' as MovieSourceType,
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    badge: 'Direct 4K',
  },
  {
    name: 'YouTube Music / 4K',
    type: 'youtube' as MovieSourceType,
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    badge: 'YouTube',
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
  const [activeInputTab, setActiveInputTab] = useState<'local' | 'url'>('url');
  const [urlInput, setUrlInput] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [urlDetection, setUrlDetection] = useState<{
    type: MovieSourceType;
    label: string;
    icon: 'youtube' | 'hls' | 'direct';
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
  const [isNativePipActive, setIsNativePipActive] = useState(false);

  // Synchronized playback states for 60fps responsive UI
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

        // Destroy previous player instance if any
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
                // 1 = playing, 2 = paused, 3 = buffering
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
                console.error('[YouTube Player Error]', err);
                setVideoError('YouTube video failed to embed or is restricted by copyright/region.');
              },
            },
          });
          ytPlayerRef.current = player;
        } catch (e) {
          console.error('[YouTube init error]', e);
        }
      });

      // Poll time for YouTube player
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

  // Track Native Picture-in-Picture events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onEnterPip = () => setIsNativePipActive(true);
    const onLeavePip = () => setIsNativePipActive(false);

    video.addEventListener('enterpictureinpicture', onEnterPip);
    video.addEventListener('leavepictureinpicture', onLeavePip);

    return () => {
      video.removeEventListener('enterpictureinpicture', onEnterPip);
      video.removeEventListener('leavepictureinpicture', onLeavePip);
    };
  }, []);

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
        // Pressing escape minimizes to floating PiP player if playing
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
      setUrlDetection({ type: 'youtube', label: 'YouTube Stream', icon: 'youtube' });
    } else if (trimmed.includes('.m3u8')) {
      setUrlDetection({ type: 'hls', label: 'HLS Live Stream (.m3u8)', icon: 'hls' });
    } else if (/\.(mp4|webm|mov|mkv|ogg|m4v)(\?|$)/i.test(trimmed)) {
      setUrlDetection({ type: 'direct', label: 'Direct Video (MP4 / WebM)', icon: 'direct' });
    } else {
      setUrlDetection({ type: 'direct', label: 'Online Video URL', icon: 'direct' });
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

      // Query server for metadata probe
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
        // Direct MP4 / WebM / MOV: check if external or same origin
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

    // Validation: enforce up to 5 GB video size limit
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

    // Resume Web Audio Context
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
        setIsNativePipActive(false);
      } else if (videoRef.current && document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
        setIsNativePipActive(true);
      } else {
        // Fallback to in-app floating mini-player
        setDisplayMode('pip');
      }
    } catch (err) {
      console.warn('Native PiP not available or permission denied, using In-App Floating PiP:', err);
      setDisplayMode('pip');
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const mySpeakerRole = currentUser?.speakerRole || 'all';
  const roleDisplay = mySpeakerRole === 'all' ? 'STEREO' : mySpeakerRole.replace('_', ' ').toUpperCase();
  const totalDuration = duration || movieState.duration || 0;
  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  // Source Type Label & Badge
  const getSourceBadge = () => {
    if (movieState.sourceType === 'youtube') return { label: 'YouTube', color: 'bg-red-500/20 text-red-300 border-red-500/40' };
    if (movieState.sourceType === 'hls') return { label: 'HLS Live', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
    if (movieState.sourceType === 'direct') return { label: 'Online Video', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    return { label: 'Local 5 GB', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
  };

  if (!isOpen) return null;

  // =========================================================================
  // RENDER 1: IN-APP PICTURE-IN-PICTURE (PIP) FLOATING MINI-PLAYER WINDOW
  // Allows watching movie while chatting, browsing files, or adjusting speakers
  // =========================================================================
  if (displayMode === 'pip') {
    return (
      <div className="fixed inset-0 z-50 pointer-events-none select-none">
        {/* Floating Mini Player Card (Pointer events enabled on card only) */}
        <div
          role="region"
          aria-label="Picture in Picture Video Player"
          className="pointer-events-auto absolute bottom-4 right-4 sm:bottom-6 sm:right-6 w-80 sm:w-96 aspect-video rounded-2xl border border-amber-500/40 bg-zinc-950/95 shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl overflow-hidden group transition-all duration-300 ring-1 ring-white/10 hover:ring-amber-500/50 hover:shadow-[0_0_35px_rgba(245,158,11,0.35)] flex flex-col"
        >
          {/* Video / YouTube Content Area */}
          <div className="relative w-full h-full flex-1 bg-black overflow-hidden flex items-center justify-center">
            {/* Host Video Element */}
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

            {/* YouTube Mount Container */}
            {movieState.sourceType === 'youtube' && (
              <div id="youtube-theater-mount" className="w-full h-full" />
            )}

            {/* Client View (Audio Only Stream Display) */}
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

            {/* Top Floating Mini-Bar (Reveals on hover) */}
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
                {/* Surround Speaker Modal */}
                <button
                  type="button"
                  onClick={() => setIsSurroundModalOpen(true)}
                  className="p-1 rounded-lg bg-white/10 hover:bg-cyan-500/30 text-cyan-300 transition-colors cursor-pointer"
                  title="Configure Speaker Role"
                >
                  <Speaker className="w-3.5 h-3.5" />
                </button>

                {/* Native OS PiP Button */}
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

                {/* Expand to Cinema Mode */}
                <button
                  type="button"
                  onClick={() => setDisplayMode('cinema')}
                  className="p-1 rounded-lg bg-white/10 hover:bg-amber-400 text-zinc-200 hover:text-black transition-colors cursor-pointer"
                  title="Expand to Full Cinema Screen"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>

                {/* Close Movie / PiP */}
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

            {/* Quick Play/Pause Center Indicator on hover */}
            <button
              type="button"
              onClick={handleTogglePlay}
              className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-black/60 border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer shadow-lg active:scale-90 z-20"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
          </div>

          {/* Mini Scrubber & Controls Footer */}
          <div className="px-2.5 py-1.5 bg-zinc-950 border-t border-white/10 flex flex-col gap-1 z-30">
            {/* Scrubber bar */}
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
                {isHost && (
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
                  className="text-amber-400 hover:underline cursor-pointer"
                >
                  CINEMA
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Surround Sound Modal (Accessible directly from PiP mode) */}
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
  // RENDER 2: FULL IMMERSIVE THEATER CINEMA VIEW
  // =========================================================================
  return (
    <div
      role="dialog"
      aria-modal="true"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-50 flex flex-col w-full h-full min-h-screen overflow-hidden bg-black font-sans select-none"
    >
      {/* Dynamic Ambient Ambilight Back-Glow Behind Video */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85vw] h-[75vh] rounded-full blur-[160px] pointer-events-none transition-all duration-700 ease-out"
        style={{
          backgroundColor: isTheaterActive ? '#f59e0b' : (activeThemeDef.glowColor1 || activeThemeDef.accentHex || '#38bdf8'),
          opacity: isPlaying || movieState.isPlaying ? 0.22 : 0.08,
          transform: `translate(-50%, -50%) scale(${isPlaying || movieState.isPlaying ? 1.08 : 0.95})`,
        }}
      />

      {/* 1. TOP FLOATING CINEMA BAR (Fades out when playing and mouse is idle) */}
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
              {movieState.fileSize && movieState.fileSize > 0 ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                  {formatFileSize(movieState.fileSize)}
                </span>
              ) : null}
              {movieState.isActive && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse shrink-0" title="Synchronized Audio Active" />
              )}
            </div>
            <p className={`text-[10px] hidden sm:block truncate ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Host video screen • YouTube, HLS & up to 5 GB files • Synced 5.1 audio
            </p>
          </div>
        </div>

        {/* Center: Sound Mode Selector */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 3D Cinema Toggle */}
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

          {/* Simple Preset Selector (Visible when 3D Cinema is ON) */}
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

        {/* Right: Speaker Role, PiP, Fullscreen, Close */}
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

          {/* Picture-in-Picture (In-App Floating Mini-Player) */}
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

          {/* Native OS Picture-in-Picture */}
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
                // Minimize to floating player so party audio / video is not killed
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

      {/* 2. CINEMA CANVAS AREA */}
      <main
        className="flex-1 w-full h-full min-h-0 relative flex items-center justify-center overflow-hidden bg-black"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* HOST VIDEO (Mounted for Direct MP4, HLS, or Local Video) */}
        {isHost ? (
          <>
            {/* HTML5 Video Element for Direct MP4, HLS, Local Files */}
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
                console.error('[MovieModeView] Video playback error:', v.error);
                setIsBuffering(false);
                if (v.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
                  setVideoError('Video format or codec is not supported by your browser. Try a supported MP4, WebM, or HLS stream.');
                } else if (v.error) {
                  setVideoError(`Video error (${v.error.message || 'code ' + v.error.code}). Check the URL or choose another video.`);
                }
              }}
            />

            {/* YouTube Player Container for YouTube Streams */}
            <div
              className={`w-full h-full max-w-full max-h-full flex items-center justify-center ${
                movieState.isActive && movieState.sourceType === 'youtube' ? 'block' : 'hidden'
              }`}
            >
              <div id="youtube-theater-mount" className="w-full h-full max-w-full max-h-full aspect-video" />
            </div>

            {/* High-Bitrate Buffering Indicator */}
            {isBuffering && movieState.isActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30 bg-black/30 backdrop-blur-[2px]">
                <div className="w-14 h-14 rounded-full border-2 border-amber-400/20 border-t-amber-400 animate-spin flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.5)]">
                  <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                </div>
                <span className="mt-3 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-[11px] font-mono text-zinc-300">
                  Buffering Video Stream...
                </span>
              </div>
            )}

            {/* Error Notification Banner */}
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
            {/* SETUP / PICKER MODAL (When No Movie is Active) */}
            {/* Tabs for: 1) Online Video URL Stream, 2) Local 5 GB File */}
            {/* ========================================================= */}
            {!movieState.isActive && (
              <div className="relative z-20 w-full max-w-2xl mx-auto p-4 sm:p-6 flex flex-col items-center text-center">
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

                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 sm:mb-4 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
                  <Film className="w-8 h-8 sm:w-10 sm:h-10" />
                </div>

                <h3 className="text-xl sm:text-3xl font-extrabold text-white mb-1.5 tracking-tight">
                  Home Theater & Watch Party
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-lg leading-relaxed mb-5">
                  Stream online video URLs or local files up to 5 GB • Full cinema screen with synchronized 5.1 surround sound across all room devices
                </p>

                {/* Tab Switcher: Online Video Stream vs Local 5 GB Movie */}
                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-900/90 border border-white/10 mb-5 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setActiveInputTab('url')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeInputTab === 'url'
                        ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Online Video URL (YouTube / MP4 / HLS)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveInputTab('local')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeInputTab === 'local'
                        ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Local Movie (Up to 5 GB)</span>
                  </button>
                </div>

                {/* TAB 1: ONLINE VIDEO URL STREAM */}
                {activeInputTab === 'url' && (
                  <div className="w-full max-w-xl p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl flex flex-col gap-4 shadow-xl">
                    <div className="flex flex-col gap-2 text-left">
                      <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center justify-between">
                        <span>Video Stream URL</span>
                        {urlDetection && (
                          <span className="text-[10px] text-cyan-400 font-bold bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                            {urlDetection.label}
                          </span>
                        )}
                      </label>

                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
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
                            placeholder="Paste YouTube link, direct MP4 URL, or HLS (.m3u8)..."
                            className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-xs sm:text-sm text-white placeholder:text-zinc-600 outline-none transition-all pr-8"
                          />
                          {urlInput && (
                            <button
                              type="button"
                              onClick={() => {
                                setUrlInput('');
                                setUrlDetection(null);
                              }}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={!urlInput.trim() || isLoadingUrl}
                          onClick={() => handleLoadUrlStream()}
                          className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-black text-xs font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          {isLoadingUrl ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <span>Play Stream</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Quick Preset Samples */}
                    <div className="flex flex-col gap-1.5 text-left border-t border-white/10 pt-3">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                        Quick Demo Streams:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {SAMPLE_STREAM_PRESETS.map((sample) => (
                          <button
                            key={sample.name}
                            type="button"
                            onClick={() => {
                              setUrlInput(sample.url);
                              detectUrlType(sample.url);
                              handleLoadUrlStream(sample.url);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/40 text-[11px] text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span>{sample.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: LOCAL 5 GB VIDEO FILE */}
                {activeInputTab === 'local' && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full max-w-xl p-6 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-amber-400/40 backdrop-blur-xl flex flex-col items-center justify-center cursor-pointer transition-all group/drop ${
                      isDraggingFile ? 'bg-amber-500/10 ring-4 ring-amber-400/40' : ''
                    }`}
                  >
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-mono font-bold mb-3 shadow-sm">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      <span>UP TO 5 GB VIDEOS SUPPORTED • ZERO NETWORK LAG</span>
                    </div>

                    <h4 className="text-base sm:text-lg font-bold text-white mb-1">
                      Drag & Drop Movie File Here
                    </h4>
                    <p className="text-xs text-zinc-400 mb-4 max-w-sm">
                      Direct local hardware decoding • MP4, MKV, WebM, MOV files up to 5 GB
                    </p>

                    <div className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center gap-2 group-hover/drop:scale-105 active:scale-95">
                      <span>Browse Video File</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                )}

                {/* Feature highlight pills */}
                <div className="flex flex-wrap items-center justify-center gap-2 max-w-md mt-6">
                  <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-300">
                    YouTube & HLS .m3u8
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-300">
                    Up to 5 GB Local Video
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-300">
                    Multi-Device 5.1 Audio
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-300">
                    Picture-in-Picture Mini-Player
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          /* CLIENT VIEW (Pure Synchronized Audio) */
          <div
            onClick={async () => {
              await movieSyncService.unlockClientAudio();
            }}
            className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-zinc-950 via-black to-zinc-950 cursor-pointer select-none"
          >
            {/* Dynamic Animated Acoustic Waves */}
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

        {/* Privacy Notice Pill */}
        <div className="absolute top-14 left-4 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-mono text-zinc-300 shadow-sm z-20">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Host Video Only</span>
        </div>

        {/* Floating Minimalist Cinema Playback Bar (Visible on Hover / Tap) */}
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
                {/* Pop Out to Floating PiP Player */}
                <button
                  type="button"
                  onClick={() => setDisplayMode('pip')}
                  className="flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200 transition-colors cursor-pointer active:scale-95"
                  title="Pop out video into floating mini-player"
                >
                  <PictureInPicture className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mini Player (PiP)</span>
                </button>

                {/* Host Audio Mute Toggle */}
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

                {/* Change Movie / URL Button */}
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
                  Change Stream
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. SURROUND ROLE MODAL */}
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
