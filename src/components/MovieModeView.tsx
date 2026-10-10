import React, { useState, useEffect, useRef } from 'react';
import {
  Film,
  Play,
  Pause,
  Upload,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sparkles,
  Speaker,
  Compass,
  Tv,
  Radio,
  Check,
  ChevronDown,
  RotateCcw,
  Sliders,
  ShieldCheck,
  X,
  Clock,
  Layers,
  AlertCircle,
  FileVideo,
} from 'lucide-react';
import { MovieState, SpeakerRole, TheaterPreset, User } from '../types';
import { movieSyncService, ChunkUploadProgress } from '../services/movieSyncService';
import { spatialTheaterEngine, THEATER_PRESETS } from '../services/spatialTheaterEngine';
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
  const [uploadProgress, setUploadProgress] = useState<ChunkUploadProgress>({
    isUploading: false,
    progress: 0,
    uploadedBytes: 0,
    totalBytes: 0,
    fileName: '',
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSurroundModalOpen, setIsSurroundModalOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<TheaterPreset>('cinema');
  const [isTheaterActive, setIsTheaterActive] = useState(false);
  const [spatialWidening, setSpatialWidening] = useState(0.75);
  const [dialogueBoost, setDialogueBoost] = useState(0.6);
  const [lfeBoost, setLfeBoost] = useState(0.7);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activeThemeDef =
    BACKGROUND_THEMES.find((t) => t.id === currentBgTheme) || BACKGROUND_THEMES[0];

  useEffect(() => {
    const unsubState = movieSyncService.subscribe((state) => {
      setMovieState(state);
      setIsTheaterActive(state.theaterSettings.enabled);
      setSelectedPreset(state.theaterSettings.preset);
      setSpatialWidening(state.theaterSettings.spatialWidening);
      setDialogueBoost(state.theaterSettings.dialogueBoost);
      setLfeBoost(state.theaterSettings.lfeBoost);
    });

    const unsubUpload = movieSyncService.subscribeUpload((progress) => {
      setUploadProgress(progress);
    });

    return () => {
      unsubState();
      unsubUpload();
    };
  }, []);

  // Attach Video Element when Host mounts
  useEffect(() => {
    if (isHost && videoRef.current) {
      movieSyncService.attachHostVideo(videoRef.current);
    }
  }, [isHost, isOpen]);

  if (!isOpen) return null;

  // Handle File Drag & Drop or Selection
  const handleFilePicked = (file: File) => {
    if (!file) return;

    const isVideo = file.type.startsWith('video/') || /\.(mp4|mkv|webm|mov|avi)$/i.test(file.name);
    const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|flac|aac|m4a|ogg)$/i.test(file.name);

    if (!isVideo && !isAudio) {
      alert('Please select a valid video (.mp4, .mkv, .webm) or audio file.');
      return;
    }

    // Local instant playback for zero wait & zero network overhead
    movieSyncService.startMovie(file.name.replace(/\.[^/.]+$/, ''), file, 0, file.size);
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

  const handleResetNudge = () => {
    movieSyncService.setLipSyncOffset(0);
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

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    const mb = bytes / (1024 * 1024);
    if (mb > 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      ref={containerRef}
      style={{
        backgroundColor: activeThemeDef.hexPrimary,
        color: activeThemeDef.id === 'pure-light' ? '#0f172a' : '#f8fafc',
      }}
      className="fixed inset-0 z-50 flex flex-col w-full h-full min-h-screen overflow-hidden backdrop-blur-3xl animate-fade-in font-sans select-none"
    >
      {/* Top Ambient Hairline Glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-1 rounded-full blur-md pointer-events-none opacity-80"
        style={{ backgroundColor: activeThemeDef.accentHex }}
      />

      {/* 1. CINEMA BAR HEADER */}
      <header
        style={{
          backgroundColor: activeThemeDef.hexCard,
          borderColor: activeThemeDef.hexBorder,
        }}
        className="shrink-0 px-4 sm:px-6 py-3 border-b flex items-center justify-between backdrop-blur-2xl z-20"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2">
                <span>Home Theater Mode</span>
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase">
                {movieState.isActive ? 'LIVE MOVIE' : 'READY'}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Host Video Screen · Ultra-Low Latency Multi-Speaker Audio Sync
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5">
          {/* Surround Sound Quick Role Button */}
          <button
            type="button"
            onClick={() => setIsSurroundModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <Speaker className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Speaker Role:</span>
            <span className="font-mono uppercase text-white font-extrabold">
              {mySpeakerRole.replace('_', ' ')}
            </span>
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Toggle Cinema Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close Modal Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Close Movie View"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. MAIN THEATER STAGE */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT / CENTER: CINEMA SCREEN VIEWPORT */}
        <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-5 overflow-y-auto no-scrollbar justify-between">
          {/* VIDEO / CINEMA CONTAINER */}
          <div
            style={{
              backgroundColor: '#000000',
              borderColor: activeThemeDef.hexBorder,
            }}
            className="relative w-full aspect-video max-h-[65vh] rounded-3xl border overflow-hidden flex items-center justify-center shadow-2xl group"
          >
            {/* If Host: Native Video Element */}
            {isHost ? (
              movieState.isActive ? (
                <video
                  ref={videoRef}
                  playsInline
                  className="w-full h-full object-contain bg-black cursor-pointer"
                  onClick={handleTogglePlay}
                />
              ) : (
                /* Host Dropzone for Movie File Selection */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-white/[0.02] transition-colors"
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
                  <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-[0_0_24px_rgba(245,158,11,0.25)] group-hover:scale-105 transition-transform">
                    <FileVideo className="w-8 h-8" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-1">
                    Select Full-Length Movie or Audio File
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 max-w-md">
                    Choose any <strong className="text-white">.mp4, .mkv, .webm</strong> or large audio file (1GB+ supported).
                    The video will play exclusively on your screen while audio syncs to all connected devices.
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-white/10 text-zinc-300 border border-white/10">
                      0MB RAM STREAMING
                    </span>
                    <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                      SUB-FRAME LIP-SYNC
                    </span>
                  </div>
                </div>
              )
            ) : (
              /* If Client: Cinema Audio Listening Visualization (Zero Video Downloaded) */
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#0a0d14] via-black to-[#05070a]">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-cyan-300 shadow-[0_0_30px_rgba(6,182,212,0.3)] mb-4 animate-pulse relative"
                  style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)' }}
                >
                  <Speaker className="w-10 h-10" />
                  <span className="absolute inset-0 rounded-full border border-cyan-400/40 animate-ping opacity-30" />
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                    CONNECTED SPEAKER
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/10 font-bold">
                    ROLE: {mySpeakerRole.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {movieState.title || 'Movie Audio Stream Active'}
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mt-1">
                  Video is streaming on the Host screen only. Your device is acting as a synchronized{' '}
                  <strong className="text-cyan-300 font-bold">{mySpeakerRole.replace('_', ' ')}</strong> speaker!
                </p>
              </div>
            )}

            {/* Video Privacy Banner */}
            <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-mono text-zinc-300 shadow-lg">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Host Video Only · Clients Receive Synced Audio</span>
            </div>

            {/* Host Play Overlay Controls on Hover */}
            {isHost && movieState.isActive && (
              <div className="absolute bottom-3 inset-x-3 p-3 rounded-2xl bg-black/80 backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between text-xs text-white">
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="flex items-center gap-2 px-3 py-1 rounded-full bg-white text-black font-bold cursor-pointer hover:bg-zinc-200 transition-colors"
                >
                  {movieState.isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Play</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2 font-mono text-zinc-300">
                  <span>{formatTime(movieState.currentTime)}</span>
                  <span>/</span>
                  <span>{formatTime(movieState.duration)}</span>
                </div>
              </div>
            )}
          </div>

          {/* LIP-SYNC FINE CALIBRATION & LATENCY NUDGE BAR */}
          <div
            style={{
              backgroundColor: activeThemeDef.hexCard,
              borderColor: activeThemeDef.hexBorder,
            }}
            className="mt-3 p-3 sm:p-4 rounded-2xl border backdrop-blur-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>Lip-Sync Calibration</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    NUDGE
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Align Bluetooth/Speaker latency to match host screen lip movements
                </p>
              </div>
            </div>

            {/* Nudge Buttons */}
            <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-full p-1 font-mono">
              <button
                type="button"
                onClick={() => handleNudge(-50)}
                className="px-2 py-0.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="-50ms earlier"
              >
                -50
              </button>
              <button
                type="button"
                onClick={() => handleNudge(-10)}
                className="px-2 py-0.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="-10ms earlier"
              >
                -10
              </button>
              <button
                type="button"
                onClick={() => handleNudge(-5)}
                className="px-2 py-0.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="-5ms earlier"
              >
                -5
              </button>
              <span className="px-2.5 font-bold text-emerald-400 min-w-[50px] text-center">
                {movieState.lipSyncOffsetMs >= 0
                  ? `+${movieState.lipSyncOffsetMs}`
                  : movieState.lipSyncOffsetMs}
                ms
              </span>
              <button
                type="button"
                onClick={() => handleNudge(5)}
                className="px-2 py-0.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="+5ms later"
              >
                +5
              </button>
              <button
                type="button"
                onClick={() => handleNudge(10)}
                className="px-2 py-0.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="+10ms later"
              >
                +10
              </button>
              <button
                type="button"
                onClick={() => handleNudge(50)}
                className="px-2 py-0.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="+50ms later"
              >
                +50
              </button>
              <button
                type="button"
                onClick={handleResetNudge}
                className="ml-1 p-1 rounded-full hover:bg-white/10 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                title="Reset to 0ms"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: 3D THEATER ACOUSTICS & CONTROL PANEL */}
        <div
          style={{
            backgroundColor: activeThemeDef.hexElevated,
            borderColor: activeThemeDef.hexBorder,
          }}
          className="w-full lg:w-96 shrink-0 border-t lg:border-t-0 lg:border-l p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto no-scrollbar backdrop-blur-2xl"
        >
          {/* 3D THEATER MODE TOGGLE SWITCH */}
          <div
            style={{
              backgroundColor: isTheaterActive
                ? 'rgba(245, 158, 11, 0.12)'
                : 'var(--bg-card, rgba(0, 0, 0, 0.4))',
              borderColor: isTheaterActive
                ? 'rgba(245, 158, 11, 0.4)'
                : 'var(--bg-border, rgba(255, 255, 255, 0.08))',
            }}
            className="p-4 rounded-3xl border flex items-center justify-between transition-all shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                  isTheaterActive
                    ? 'bg-amber-500/25 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                    : 'bg-white/5 text-zinc-400'
                }`}
              >
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">3D Theater Mode</h3>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold uppercase border ${
                      isTheaterActive
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    {isTheaterActive ? 'ON' : 'OFF'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Web Audio API spatial reverb & acoustic widening
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              onClick={handleToggleTheater}
              aria-label="Toggle 3D Theater Mode"
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                isTheaterActive
                  ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                  : 'bg-zinc-800'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                  isTheaterActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* THEATER ACOUSTIC PRESETS */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Cinema Acoustic Presets</span>
            </label>

            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(THEATER_PRESETS) as TheaterPreset[]).map((key) => {
                const preset = THEATER_PRESETS[key];
                const isSelected = selectedPreset === key;

                return (
                  <div
                    key={key}
                    onClick={() => handlePresetChange(key)}
                    style={{
                      backgroundColor: isSelected
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'var(--bg-card, rgba(0, 0, 0, 0.25))',
                      borderColor: isSelected
                        ? 'rgba(245, 158, 11, 0.5)'
                        : 'var(--bg-border, rgba(255, 255, 255, 0.06))',
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                      isSelected
                        ? 'shadow-[0_0_14px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/30'
                        : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                          {preset.name}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full border ${preset.badgeColor}`}
                        >
                          {preset.tag.split('·')[0].trim()}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">
                        {preset.description}
                      </p>
                    </div>

                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ACOUSTIC TUNING SLIDERS */}
          <div
            style={{
              backgroundColor: 'var(--bg-card, rgba(0, 0, 0, 0.4))',
              borderColor: 'var(--bg-border, rgba(255, 255, 255, 0.08))',
            }}
            className="p-3.5 rounded-2xl border space-y-3"
          >
            <div className="text-[10px] font-mono uppercase text-zinc-400 font-bold tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3 h-3 text-cyan-400" />
              <span>Acoustic Equalizer & Widener</span>
            </div>

            {/* Spatial Widening */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-300">Spatial Widening</span>
                <span className="font-mono text-cyan-400 font-bold">
                  {Math.round(spatialWidening * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={spatialWidening}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSpatialWidening(val);
                  spatialTheaterEngine.setSpatialWidening(val);
                }}
                className="w-full h-1.5 bg-black rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Dialogue Clarity Boost */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-300">Dialogue Clarity (2.8kHz)</span>
                <span className="font-mono text-amber-400 font-bold">
                  {Math.round(dialogueBoost * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={dialogueBoost}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setDialogueBoost(val);
                  spatialTheaterEngine.setDialogueBoost(val);
                }}
                className="w-full h-1.5 bg-black rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Cinema Sub-Bass Rumble */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-300">LFE Cinema Bass (55Hz)</span>
                <span className="font-mono text-rose-400 font-bold">
                  {Math.round(lfeBoost * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={lfeBoost}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setLfeBoost(val);
                  spatialTheaterEngine.setLfeBoost(val);
                }}
                className="w-full h-1.5 bg-black rounded-lg appearance-none cursor-pointer accent-rose-400"
              />
            </div>
          </div>

          {/* CONNECTED SPEAKERS STATUS LIST */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 font-bold">
              <span>CONNECTED SPEAKERS ({users.length})</span>
              <button
                type="button"
                onClick={() => setIsSurroundModalOpen(true)}
                className="text-cyan-400 hover:text-white cursor-pointer transition-colors"
              >
                Change Roles →
              </button>
            </div>

            <div className="space-y-1 max-h-36 overflow-y-auto no-scrollbar">
              {users.map((u) => {
                const roleName = (u.speakerRole || 'all').replace('_', ' ');
                const isMe = u.id === currentUser?.id;

                return (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: u.avatarColor || '#00f0ff' }}
                      />
                      <span className="text-zinc-200 truncate font-semibold">
                        {u.name} {isMe ? '(You)' : ''}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-zinc-300 uppercase border border-white/10 shrink-0">
                      {roleName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* SURROUND ROLE MODAL */}
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
