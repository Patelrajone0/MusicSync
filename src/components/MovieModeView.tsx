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
} from 'lucide-react';
import { MovieState, SpeakerRole, TheaterPreset, User } from '../types';
import { movieSyncService } from '../services/movieSyncService';
import { spatialTheaterEngine } from '../services/spatialTheaterEngine';
import { SurroundRoleModal } from './SurroundRoleModal';
import { BACKGROUND_THEMES, BackgroundThemeId } from '../types/backgroundThemes';

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSurroundModalOpen, setIsSurroundModalOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<TheaterPreset>('cinema');
  const [isTheaterActive, setIsTheaterActive] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [isHostMuted, setIsHostMuted] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Local synchronized playback states for 60fps responsive UI
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controlsTimeoutRef = useRef<any>(null);

  const activeThemeDef =
    BACKGROUND_THEMES.find((t) => t.id === currentBgTheme) || BACKGROUND_THEMES[0];
  const isLight = activeThemeDef.id === 'pure-light';

  // Attach video element callback ref ensuring it is connected immediately
  const setVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      videoRef.current = el;
      if (el && isHost) {
        movieSyncService.attachHostVideo(el);
      }
    },
    [isHost]
  );

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

  // Ensure video element gets attached when opened or when streamUrl changes
  useEffect(() => {
    if (isHost && videoRef.current) {
      movieSyncService.attachHostVideo(videoRef.current);
    }
  }, [isHost, isOpen, movieState.streamUrl]);

  // Host automatically broadcasts WebRTC audio to all connected room devices
  useEffect(() => {
    if (isHost && movieState.isActive && users.length > 0) {
      const clientIds = users
        .filter((u) => u.id !== currentUser?.id)
        .map((u) => u.id);
      movieSyncService.broadcastAudioToClients(clientIds);
    }
  }, [isHost, movieState.isActive, users, currentUser?.id]);

  // Client requests live audio stream from Host when movie is active
  useEffect(() => {
    if (!isHost && movieState.isActive) {
      const hostUser = users.find((u) => u.role === 'host');
      movieSyncService.requestAudioFromHost(hostUser?.id);
    }
  }, [isHost, movieState.isActive, users]);

  // Handle controls auto-hide during active playback
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
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        const activeEl = document.activeElement as HTMLElement | null;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === 'Escape' && !isSurroundModalOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSurroundModalOpen, movieState.isActive]);

  if (!isOpen) return null;

  const handleFilePicked = async (file: File) => {
    if (!file) return;
    setVideoError(null);

    const isVideo = file.type.startsWith('video/') || /\.(mp4|mkv|webm|mov|avi)$/i.test(file.name);
    const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|flac|aac|m4a|ogg)$/i.test(file.name);

    if (!isVideo && !isAudio) {
      alert('Please select a valid video (.mp4, .mkv, .webm) or audio file.');
      return;
    }

    // Resume Web Audio Context
    await spatialTheaterEngine.resumeContext();

    if (videoRef.current) {
      movieSyncService.attachHostVideo(videoRef.current);
    }

    const title = file.name.replace(/\.[^/.]+$/, '');
    movieSyncService.startMovie(title, file, 0, file.size);

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
        className={`absolute top-0 inset-x-0 z-30 px-4 sm:px-6 py-2.5 border-b backdrop-blur-2xl flex items-center justify-between transition-all duration-300 ${
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
              <h2 className={`text-xs sm:text-sm font-bold tracking-tight truncate max-w-[180px] sm:max-w-md ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {movieState.title || 'Home Theater'}
              </h2>
              {movieState.isActive && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse shrink-0" title="Synchronized Audio Active" />
              )}
            </div>
            <p className={`text-[10px] hidden sm:block truncate ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Host video screen • Multi-device synced audio
            </p>
          </div>
        </div>

        {/* Center: Minimal Sound Mode Selector */}
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

        {/* Right: Speaker Role & Window Actions */}
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

          {/* Minimal Lip-Sync Calibration */}
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

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`p-1.5 rounded-full transition-colors cursor-pointer active:scale-90 ${isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
            title="Toggle Cinema Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors cursor-pointer active:scale-90 ${isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
            title="Exit Home Theater"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. MAXIMUM AREA CINEMA CANVAS (Edge-to-Edge Screen Utilization) */}
      <main
        className="flex-1 w-full h-full min-h-0 relative flex items-center justify-center overflow-hidden bg-black"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* HOST VIDEO (Always Mounted in DOM for Instant Playback & Audio Routing) */}
        {isHost ? (
          <>
            <video
              ref={setVideoRef}
              src={movieState.streamUrl || undefined}
              playsInline
              className={`w-full h-full max-w-full max-h-full object-contain bg-black cursor-pointer transition-opacity duration-300 ${
                movieState.isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              onClick={handleTogglePlay}
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (v.duration) setDuration(v.duration);
              }}
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
                if (v.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
                  setVideoError('Video format or codec is not supported by your browser. Please try an .mp4 or .webm file.');
                } else if (v.error) {
                  setVideoError(`Video error (${v.error.message || 'code ' + v.error.code}). Please choose a supported movie file.`);
                }
              }}
            />

            {/* Error Notification Banner */}
            {videoError && (
              <div className="absolute top-16 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-40 max-w-md p-3.5 rounded-2xl bg-rose-950/90 border border-rose-500/40 text-rose-200 backdrop-blur-xl shadow-2xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <div className="text-xs flex-1">{videoError}</div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-rose-500 text-white font-bold text-[10px] hover:bg-rose-400 transition-colors shrink-0 cursor-pointer"
                >
                  Pick Other
                </button>
              </div>
            )}

            {/* Minimalist Movie Dropzone (Shown when no movie is active) */}
            {!movieState.isActive && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-white/[0.02] transition-all group z-20 ${
                  isDraggingFile ? 'bg-amber-500/10 ring-4 ring-amber-400/40' : ''
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/mkv,video/webm,video/quicktime,video/x-msvideo,audio/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFilePicked(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5 shadow-[0_0_30px_rgba(245,158,11,0.25)] group-hover:scale-110 group-hover:shadow-[0_0_45px_rgba(245,158,11,0.45)] transition-all duration-300">
                  <Film className="w-10 h-10" />
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 tracking-tight">
                  Choose Movie to Play
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-md leading-relaxed mb-6">
                  Video displays on this screen in maximum area • Audio syncs to all connected room devices
                </p>

                <div className="px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-[0_0_20px_rgba(245,158,11,0.35)] flex items-center gap-2 group-hover:scale-105 active:scale-95">
                  <span>Browse .mp4, .mkv, .webm</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            )}
          </>
        ) : (
          /* CLIENT VIEW (Zero Video Transferred, Pure Synchronized Audio) */
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
            <p className="text-xs text-zinc-400 mt-1 max-w-sm">
              Video is playing exclusively on Host device • Your speaker is playing in perfect lip-sync
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
                if (videoRef.current) {
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
                {/* Host Audio Mute Toggle */}
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

                {/* Change Movie Button */}
                <button
                  type="button"
                  onClick={() => {
                    movieSyncService.stopMovie();
                    setCurrentTime(0);
                    setDuration(0);
                    setIsPlaying(false);
                  }}
                  className="text-[11px] font-mono text-zinc-400 hover:text-amber-300 transition-colors cursor-pointer active:scale-95"
                  title="Stop playback and select another movie"
                >
                  Change Movie
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
