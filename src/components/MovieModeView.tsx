import React, { useState, useEffect, useRef } from 'react';
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
  RotateCcw,
} from 'lucide-react';
import { MovieState, SpeakerRole, TheaterPreset, User } from '../types';
import { movieSyncService } from '../services/movieSyncService';
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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controlsTimeoutRef = useRef<any>(null);

  const activeThemeDef =
    BACKGROUND_THEMES.find((t) => t.id === currentBgTheme) || BACKGROUND_THEMES[0];
  const isLight = activeThemeDef.id === 'pure-light';

  useEffect(() => {
    const unsubState = movieSyncService.subscribe((state) => {
      setMovieState(state);
      setIsTheaterActive(state.theaterSettings.enabled);
      setSelectedPreset(state.theaterSettings.preset);
    });

    return () => unsubState();
  }, []);

  // Attach Video Element when Host mounts
  useEffect(() => {
    if (isHost && videoRef.current) {
      movieSyncService.attachHostVideo(videoRef.current);
    }
  }, [isHost, isOpen]);

  // Handle controls auto-hide during playback
  const handleMouseMove = () => {
    setIsControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (movieState.isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setIsControlsVisible(false);
      }, 3500);
    }
  };

  // Keyboard shortcut: Spacebar for instant play/pause toggle
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        const activeEl = document.activeElement as HTMLElement | null;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        movieSyncService.togglePlayPause();
      } else if (e.key === 'Escape' && !isSurroundModalOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSurroundModalOpen, movieState.isActive]);

  if (!isOpen) return null;

  const handleFilePicked = (file: File) => {
    if (!file) return;
    const isVideo = file.type.startsWith('video/') || /\.(mp4|mkv|webm|mov|avi)$/i.test(file.name);
    const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|flac|aac|m4a|ogg)$/i.test(file.name);

    if (!isVideo && !isAudio) {
      alert('Please select a valid video (.mp4, .mkv, .webm) or audio file.');
      return;
    }
    movieSyncService.startMovie(file.name.replace(/\.[^/.]+$/, ''), file, 0, file.size);
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

  const handleTogglePlay = () => {
    movieSyncService.togglePlayPause();
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
  const progressPercent = movieState.duration > 0 ? (movieState.currentTime / movieState.duration) * 100 : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      style={{
        backgroundColor: isLight ? '#f8fafc' : activeThemeDef.hexPrimary,
        color: isLight ? '#0f172a' : '#f8fafc',
      }}
      className="fixed inset-0 z-50 flex flex-col w-full h-full min-h-screen overflow-hidden backdrop-blur-3xl animate-fade-in font-sans select-none transition-colors duration-300"
    >
      {/* Dynamic Ambient Ambilight Back-Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[72vw] h-[55vh] rounded-full blur-[140px] pointer-events-none transition-all duration-700 ease-out"
        style={{
          backgroundColor: isTheaterActive ? '#f59e0b' : (activeThemeDef.glowColor1 || activeThemeDef.accentHex || '#38bdf8'),
          opacity: movieState.isPlaying ? (isLight ? 0.16 : 0.25) : 0.08,
          transform: `translate(-50%, -50%) scale(${movieState.isPlaying ? 1.05 : 0.95})`,
        }}
      />

      {/* 1. TOP MINIMALIST BAR */}
      <header
        style={{
          backgroundColor: isLight ? 'rgba(255, 255, 255, 0.92)' : 'rgba(10, 10, 15, 0.85)',
          borderColor: isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.08)',
        }}
        className={`shrink-0 px-4 sm:px-6 py-2.5 border-b flex items-center justify-between backdrop-blur-2xl z-30 transition-all duration-300 ${
          isControlsVisible || !movieState.isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        {/* Left: Branding & Synced Status */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm transition-transform hover:scale-105">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-xs sm:text-sm font-bold tracking-tight truncate max-w-[180px] sm:max-w-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {movieState.title || 'Home Theater'}
              </h2>
              {movieState.isActive && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" title="Synchronized Audio Active" />
              )}
            </div>
            <p className={`text-[10px] hidden sm:block ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
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

        {/* Right: Speaker Role & Compact Actions */}
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

      {/* 2. MAIN CINEMA CANVAS (CENTERPIECE) */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-3 sm:p-6 relative overflow-hidden">
        <div
          style={{
            backgroundColor: '#000000',
            borderColor: isLight ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.12)',
          }}
          className={`relative w-full max-w-5xl aspect-video rounded-3xl border overflow-hidden flex items-center justify-center shadow-2xl transition-all duration-300 ${
            isDraggingFile ? 'ring-2 ring-amber-400 scale-[1.01]' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* HOST VIEW */}
          {isHost ? (
            movieState.isActive ? (
              <video
                ref={videoRef}
                playsInline
                className="w-full h-full object-contain bg-black cursor-pointer"
                onClick={handleTogglePlay}
              />
            ) : (
              /* Minimalist Movie Dropzone */
              <div
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-white/[0.02] transition-all group"
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

                <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-[0_0_24px_rgba(245,158,11,0.25)] group-hover:scale-110 group-hover:shadow-[0_0_36px_rgba(245,158,11,0.4)] transition-all duration-300">
                  <Film className="w-8 h-8" />
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 tracking-tight">
                  Choose Movie to Play
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-sm leading-relaxed mb-4">
                  Video displays on this screen • Audio syncs to all connected room speakers
                </p>

                <div className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 group-hover:bg-amber-500 group-hover:text-black group-hover:border-amber-400">
                  <span>Browse .mp4, .mkv, .webm</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            )
          ) : (
            /* CLIENT VIEW (Zero Video Downloaded, Pure Synchronized Audio) */
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-zinc-950 via-black to-zinc-950">
              {/* Dynamic Animated Acoustic Waves */}
              <div className="flex items-center gap-1.5 h-14 mb-4">
                {[35, 75, 50, 95, 60, 85, 45, 90, 65, 40].map((h, i) => (
                  <span
                    key={i}
                    style={{
                      height: movieState.isPlaying ? `${h}%` : '20%',
                      animationDuration: `${0.6 + (i % 4) * 0.2}s`,
                    }}
                    className={`w-1.5 rounded-full bg-gradient-to-t from-cyan-500 to-blue-400 transition-all ${
                      movieState.isPlaying ? 'animate-pulse' : 'opacity-30'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsSurroundModalOpen(true)}
                className="flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 transition-all cursor-pointer"
                title="Tap to change your physical speaker role"
              >
                <Speaker className="w-3.5 h-3.5" />
                <span className="text-[11px] font-mono font-bold uppercase">
                  {roleDisplay} CHANNEL
                </span>
              </button>

              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {movieState.title || 'Movie Audio Stream'}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                Video is playing on Host device • Your speaker is playing in sync
              </p>
            </div>
          )}

          {/* Privacy Notice Pill */}
          <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-mono text-zinc-300 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Host Video Only</span>
          </div>

          {/* Floating Minimalist Cinema Playback Bar (Visible on Hover / Tap) */}
          {isHost && movieState.isActive && (
            <div
              style={{
                backgroundColor: 'rgba(6, 6, 12, 0.90)',
                borderColor: 'rgba(255, 255, 255, 0.12)',
              }}
              className={`absolute bottom-3 inset-x-3 sm:inset-x-6 p-2.5 sm:p-3 rounded-2xl border backdrop-blur-2xl flex flex-col gap-2 transition-all duration-300 shadow-2xl z-20 ${
                isControlsVisible || !movieState.isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
              }`}
            >
              {/* Scrubber Progress Bar */}
              <div
                className="w-full h-1.5 bg-white/15 hover:h-2 rounded-full overflow-hidden cursor-pointer relative transition-all group/scrub"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  movieSyncService.seek(pct * movieState.duration);
                }}
              >
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.7)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-between text-xs text-white">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    className="p-1.5 rounded-full bg-white text-black hover:bg-zinc-200 transition-colors cursor-pointer active:scale-90"
                    title={movieState.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                  >
                    {movieState.isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                  </button>

                  <div className="font-mono text-[11px] text-zinc-300 flex items-center gap-1">
                    <span>{formatTime(movieState.currentTime)}</span>
                    <span className="text-zinc-600">/</span>
                    <span className="text-zinc-400">{formatTime(movieState.duration)}</span>
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
                    onClick={() => movieSyncService.stopMovie()}
                    className="text-[11px] font-mono text-zinc-400 hover:text-amber-300 transition-colors cursor-pointer active:scale-95"
                    title="Stop playback and select another movie"
                  >
                    Change Movie
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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
