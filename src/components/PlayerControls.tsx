import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  Crown
} from 'lucide-react';
import { Track, PlaybackState, UserRole, SyncStats } from '../types';
import { syncEngine } from '../services/syncEngine';
import { socket } from '../services/socket';
import { cleanTrackTitle } from '../services/musicApi';

interface PlayerControlsProps {
  currentTrack: Track | null;
  playbackState: PlaybackState;
  userRole: UserRole;
  syncStats: SyncStats;
  isAudioUnlocked: boolean;
  onUnlockAudio: () => void;
  onOpenSearch: () => void;
  masterVolume?: number;
  masterVolumeNotice?: { volume: number; setBy: string } | null;
  queue?: Track[];
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  currentTrack,
  playbackState,
  userRole,
  syncStats,
  isAudioUnlocked,
  onUnlockAudio,
  onOpenSearch,
  masterVolume,
  masterVolumeNotice,
  queue = [],
}) => {
  const isHost = userRole === 'host';
  const canControl = userRole === 'host' || userRole === 'dj';

  // Playback position & scrubber state
  const [currentPosition, setCurrentPosition] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [seekValue, setSeekValue] = useState<number>(0);
  const [isScrubberHovered, setIsScrubberHovered] = useState<boolean>(false);

  // Volume state
  const [volumeMode, setVolumeMode] = useState<'master' | 'local'>('master');
  const [volume, setVolume] = useState<number>(masterVolume ?? 0.9);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [prevVolume, setPrevVolume] = useState<number>(masterVolume ?? 0.9);
  const lastVolumeEmitRef = useRef<number>(0);

  // Instant optimistic play state for 0ms perceived latency
  const [optimisticPlaying, setOptimisticPlaying] = useState<boolean | null>(null);
  const isPlaying = optimisticPlaying !== null ? optimisticPlaying : playbackState.status === 'playing';

  // Shuffle & Repeat state with persistent storage
  const [isShuffle, setIsShuffle] = useState<boolean>(() => {
    try {
      return localStorage.getItem('musicsync_shuffle') === 'true';
    } catch {
      return false;
    }
  });

  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>(() => {
    try {
      return (localStorage.getItem('musicsync_repeat_mode') as 'off' | 'all' | 'one') || 'off';
    } catch {
      return 'off';
    }
  });

  // Dynamic feedback HUD
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [animatingBtn, setAnimatingBtn] = useState<string | null>(null);

  // History tracking for seamless rewind / previous
  const prevTrackIdRef = useRef<string | null>(null);

  // Reset optimistic playing when server broadcasts authoritative state
  useEffect(() => {
    setOptimisticPlaying(null);
  }, [playbackState.status, playbackState.scheduledServerTime]);

  // Keep track of active song
  useEffect(() => {
    if (currentTrack) {
      prevTrackIdRef.current = currentTrack.id;
    }
  }, [currentTrack]);

  // Listen to position updates from syncEngine smoothly
  useEffect(() => {
    const unsub = syncEngine.onPositionUpdate((pos, dur) => {
      if (!isDragging) {
        setCurrentPosition(pos);
        setDuration(dur || currentTrack?.duration || 0);
      }
    });
    return unsub;
  }, [isDragging, currentTrack]);

  // Handle automatic repeat & track end
  useEffect(() => {
    syncEngine.setOnTrackEnded(() => {
      if (repeatMode === 'one') {
        syncEngine.seekPlayback(0);
        setCurrentPosition(0);
        if (canControl) {
          socket.emit('request_seek', { position: 0 });
          socket.emit('request_play', { track: currentTrack, position: 0 });
        }
      } else if (canControl) {
        socket.emit('request_skip');
      }
    });
  }, [repeatMode, canControl, currentTrack]);

  // Preload upcoming queue track in standby deck for zero-gap transition
  useEffect(() => {
    if (queue && queue.length > 0 && queue[0]) {
      syncEngine.preloadNextTrack(queue[0]);
    }
  }, [queue]);

  // Sync repeat mode updates from room host
  useEffect(() => {
    const handleRepeatUpdated = ({ repeatMode: mode }: { repeatMode: 'off' | 'all' | 'one' }) => {
      if (['off', 'all', 'one'].includes(mode)) {
        setRepeatMode(mode);
      }
    };
    socket.on('repeat_mode_updated', handleRepeatUpdated);
    return () => {
      socket.off('repeat_mode_updated', handleRepeatUpdated);
    };
  }, []);

  // Trigger smooth micro-bounce animation on click
  const triggerBtnAnimation = (btnName: string) => {
    setAnimatingBtn(btnName);
    setTimeout(() => {
      setAnimatingBtn((prev) => (prev === btnName ? null : prev));
    }, 280);
  };

  // 1. Play / Pause Toggle with Zero-Lag Optimistic feedback & listener speaker toggle
  const handleTogglePlay = () => {
    triggerBtnAnimation('play');

    if (!isAudioUnlocked) {
      onUnlockAudio();
    }

    // If no song loaded yet: play queue[0] if available. Never trigger search bar on play/pause!
    if (!currentTrack) {
      if (queue && queue.length > 0 && queue[0] && canControl) {
        socket.emit('request_play', { track: queue[0], position: 0 });
      }
      return;
    }

    // Listener toggle: control local audio speaker
    if (!canControl) {
      if (isPlaying) {
        syncEngine.pausePlayback();
        setOptimisticPlaying(false);
      } else {
        if (playbackState.status === 'playing' && playbackState.scheduledServerTime > 0) {
          const serverNow = syncEngine.getServerTime();
          const elapsed = (serverNow - playbackState.scheduledServerTime) / 1000;
          const pos = Math.max(0, playbackState.scheduledPosition + elapsed);
          syncEngine.seekPlayback(pos);
        }
        syncEngine.resumeLocalAudio();
        setOptimisticPlaying(true);
      }
      return;
    }

    // Host / DJ toggle: control room playback
    const nextPlayState = !isPlaying;
    setOptimisticPlaying(nextPlayState);

    if (nextPlayState) {
      syncEngine.resumeLocalAudio();
      socket.emit('request_play', { track: currentTrack, position: currentPosition });
    } else {
      syncEngine.pausePlayback();
      socket.emit('request_pause');
    }
  };

  const handleTogglePlayRef = useRef(handleTogglePlay);
  useEffect(() => {
    handleTogglePlayRef.current = handleTogglePlay;
  });

  // Global Keyboard Shortcut: Spacebar for Instant Play / Pause on Windows & Mac
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key repeat when holding down the key
      if (e.repeat) return;

      // Detect Spacebar across all Windows and Mac browsers
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
        const target = e.target as HTMLElement | null;

        // If currently focused on any text input, textarea, select, or editable container, allow normal space typing
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable ||
            target.getAttribute('contenteditable') === 'true' ||
            Boolean(target.closest('input, textarea, select, [contenteditable="true"]')))
        ) {
          return;
        }

        // Prevent page scroll down and prevent accidental trigger of whatever button had focus
        e.preventDefault();
        e.stopPropagation();

        // Blur any active button, link, or interactive element so spacebar doesn't trigger its click event
        if (target && typeof target.blur === 'function') {
          target.blur();
        }

        // Efficiently execute play/pause toggle with zero delay
        handleTogglePlayRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, []);

  // 2. Previous Track / Rewind
  const handlePrevious = () => {
    triggerBtnAnimation('prev');

    if (!canControl) return;

    // If more than 3 seconds into the track, rewind to start
    if (currentPosition > 3) {
      syncEngine.seekPlayback(0);
      setCurrentPosition(0);
      socket.emit('request_seek', { position: 0 });
      if (!isPlaying && currentTrack) {
        socket.emit('request_play', { track: currentTrack, position: 0 });
      }
      return;
    }

    // Otherwise, jump to the previous track in the Up Next queue!
    socket.emit('request_previous');
  };

  // 3. Next Track / Skip
  const handleSkip = () => {
    triggerBtnAnimation('next');
    if (!currentTrack && queue && queue.length > 0 && queue[0]) {
      if (canControl) {
        socket.emit('request_play', { track: queue[0], position: 0 });
      }
      return;
    }
    if (!canControl) return;
    socket.emit('request_skip');
  };

  // 4. Shuffle Toggle
  const handleToggleShuffle = () => {
    triggerBtnAnimation('shuffle');
    const nextVal = !isShuffle;
    setIsShuffle(nextVal);
    try {
      localStorage.setItem('musicsync_shuffle', String(nextVal));
    } catch {}

    if (nextVal) {
      if (canControl && queue.length > 1) {
        socket.emit('queue_shuffle');
      }
      setStatusToast('Shuffle: On');
    } else {
      setStatusToast('Shuffle: Off');
    }
    setTimeout(() => setStatusToast(null), 1800);
  };

  // 5. Repeat Toggle (off -> all -> one -> off)
  const handleToggleRepeat = () => {
    triggerBtnAnimation('repeat');
    const nextMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    setRepeatMode(nextMode);
    try {
      localStorage.setItem('musicsync_repeat_mode', nextMode);
    } catch {}

    if (canControl) {
      socket.emit('set_repeat_mode', { mode: nextMode });
    }

    if (nextMode === 'one') {
      setStatusToast('Repeat: Track');
    } else if (nextMode === 'all') {
      setStatusToast('Repeat: All');
    } else {
      setStatusToast('Repeat: Off');
    }
    setTimeout(() => setStatusToast(null), 1800);
  };

  // Scrubber seeking handlers
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSeekValue(val);
  };

  const handleSeekCommit = () => {
    setIsDragging(false);
    setCurrentPosition(seekValue);
    // Instant local seek for zero lag
    syncEngine.seekPlayback(seekValue);
    if (canControl) {
      socket.emit('request_seek', { position: seekValue });
    }
  };

  // React to Master Volume changes broadcast by Host or server
  useEffect(() => {
    if (typeof masterVolume === 'number') {
      setVolume(masterVolume);
      setIsMuted(masterVolume === 0);
      if (masterVolume > 0) {
        setPrevVolume(masterVolume);
      }
    }
  }, [masterVolume]);

  const emitMasterVolume = (val: number) => {
    if (!isHost || volumeMode !== 'master') return;
    lastVolumeEmitRef.current = Date.now();
    socket.emit('set_master_volume', { volume: val });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    syncEngine.setVolume(val);

    if (isHost && volumeMode === 'master') {
      const now = Date.now();
      if (now - lastVolumeEmitRef.current > 50) {
        emitMasterVolume(val);
      }
    }
  };

  const handleVolumeCommit = () => {
    if (isHost && volumeMode === 'master') {
      emitMasterVolume(isMuted ? 0 : volume);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      const target = prevVolume || 0.8;
      setIsMuted(false);
      setVolume(target);
      syncEngine.setVolume(target);
      if (isHost && volumeMode === 'master') {
        emitMasterVolume(target);
      }
    } else {
      setPrevVolume(volume);
      setIsMuted(true);
      setVolume(0);
      syncEngine.setVolume(0);
      if (isHost && volumeMode === 'master') {
        emitMasterVolume(0);
      }
    }
  };

  // Format time with 2 digits for seconds and minutes as in Spotify (e.g. 00:00)
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const trackDuration = duration || currentTrack?.duration || 1;
  const currentPos = isDragging ? seekValue : currentPosition;
  const progressPercent = Math.min(100, Math.max(0, (currentPos / trackDuration) * 100));

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-dark-950/95 backdrop-blur-2xl border-t border-white/10 px-2.5 py-1.5 sm:px-4 sm:py-2 md:px-8 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(0.65rem+env(safe-area-inset-bottom,0px))] select-none w-full max-w-full overflow-visible">
      {/* Audio Unlock Warning Banner if browser muted */}
      {!isAudioUnlocked && (
        <div className="max-w-7xl mx-auto mb-2 sm:mb-2.5">
          <div className="bg-gradient-to-r from-electric-purple/30 to-electric-cyan/30 border border-electric-cyan/40 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl flex items-center justify-between text-xs sm:text-sm gap-2 shadow-lg">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-2 w-2 sm:h-2.5 sm:w-2.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-electric-cyan opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-electric-cyan"></span>
              </span>
              <span className="text-white font-medium truncate text-[11px] sm:text-xs">
                Tap to sync speaker audio
              </span>
            </div>
            <button
              onClick={onUnlockAudio}
              className="bg-electric-cyan text-black px-2.5 py-1 sm:px-3.5 sm:py-1 rounded-lg font-semibold text-[11px] sm:text-xs hover:bg-white transition-all shadow-md active:scale-95 shrink-0"
            >
              Activate
            </button>
          </div>
        </div>
      )}

      {/* Floating Status Toast for Shuffle / Repeat */}
      {statusToast && (
        <div className="absolute -top-11 left-1/2 -translate-x-1/2 pointer-events-none z-50 animate-spring-pop whitespace-nowrap bg-dark-900/95 border border-[#1ed760]/40 px-3 py-1 rounded-full shadow-2xl flex items-center gap-1.5 text-xs text-[#1ed760] font-medium max-w-[90vw] truncate">
          <Sparkles className="w-3 h-3 text-[#1ed760] shrink-0" />
          <span className="truncate">{statusToast}</span>
        </div>
      )}

      {/* Master Volume Notice HUD Toast (Floats cleanly above player bar, never clipped) */}
      {masterVolumeNotice && (
        <div className="absolute -top-11 right-4 sm:right-6 md:right-8 pointer-events-none z-50 animate-spring-pop whitespace-nowrap bg-dark-900/95 backdrop-blur-md border border-amber-500/40 px-3 py-1 rounded-full shadow-2xl flex items-center gap-1.5 text-xs text-amber-300 font-medium">
          <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
          <span>
            {masterVolumeNotice.setBy}: {Math.round(masterVolumeNotice.volume * 100)}%
          </span>
        </div>
      )}

      {/* Main 3-Column Dock Layout */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-1.5 md:gap-3 w-full">
        
        {/* Mobile Mini Bar: Compact track info & quick volume (Visible on small screens) */}
        <div className="flex md:hidden items-center justify-between w-full mb-0.5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {currentTrack ? (
              <>
                <div className="relative w-8 h-8 rounded-full p-[1px] bg-gradient-to-tr from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_6px_rgba(0,240,255,0.4)] shrink-0 flex items-center justify-center">
                  <img
                    src={currentTrack.artwork || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100'}
                    alt={currentTrack.title}
                    className="w-full h-full rounded-full object-cover bg-dark-950 border border-dark-950"
                  />
                </div>
                <div className="min-w-0 overflow-hidden">
                  <h4 className="text-xs font-semibold text-white truncate leading-tight">{cleanTrackTitle(currentTrack.title, currentTrack.artist)}</h4>
                  <p className="text-[10px] text-slate-400 truncate leading-tight">{currentTrack.artist}</p>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400 font-medium">No song playing</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={toggleMute}
              className={`p-1.5 rounded-lg text-slate-400 hover:text-white ${isMuted || volume === 0 ? 'text-red-400' : ''}`}
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
            </button>
          </div>
        </div>

        {/* Column 1: Track Info (Desktop, Left) */}
        <div className="hidden md:flex items-center gap-3 min-w-0 w-[26%] max-w-xs shrink-0">
          {currentTrack ? (
            <>
              <div className="relative group shrink-0">
                <div className="relative w-11 h-11 md:w-12 md:h-12 rounded-full p-[1.5px] bg-gradient-to-tr from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_10px_rgba(0,240,255,0.4)] shrink-0 flex items-center justify-center">
                  <img
                    src={currentTrack.artwork || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100'}
                    alt={currentTrack.title}
                    className="w-full h-full rounded-full object-cover bg-dark-950 border border-dark-950"
                  />
                </div>
                {isPlaying && (
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                    <div className="flex items-end gap-0.5 h-3.5">
                      <div className="w-0.5 bg-electric-cyan animate-pulse h-full"></div>
                      <div className="w-0.5 bg-electric-cyan animate-pulse delay-75 h-2/3"></div>
                      <div className="w-0.5 bg-electric-cyan animate-pulse delay-150 h-4/5"></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="min-w-0 overflow-hidden pr-1">
                <h4 className="text-xs md:text-sm font-semibold text-white truncate leading-snug">{cleanTrackTitle(currentTrack.title, currentTrack.artist)}</h4>
                <p className="text-[11px] md:text-xs text-slate-400 truncate leading-snug">{currentTrack.artist}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/20 text-cyan-300 font-mono">
                    <Radio className="w-2.5 h-2.5 text-cyan-400 animate-pulse" />
                    <span>Live Synced</span>
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full p-[1.5px] bg-gradient-to-tr from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_8px_rgba(0,240,255,0.4)] shrink-0 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center text-cyan-400">
                  <Radio className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm font-medium text-slate-300 truncate">No song playing</p>
                <button
                  onClick={onOpenSearch}
                  className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline font-bold cursor-pointer"
                >
                  + Add song
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Column 2: The Control System (Bottom Center of Screen with Medium Size) */}
        <div className="w-full md:w-[48%] max-w-xl flex flex-col items-center justify-center gap-1 sm:gap-1.5">
          
          {/* Top Row: 5 Control Buttons Centered (Shuffle, Prev, Play/Pause, Next, Repeat) */}
          <div className="flex items-center justify-center gap-4 sm:gap-6">
            
            {/* 1. Shuffle Button */}
            <div className="relative flex flex-col items-center">
              <button
                type="button"
                onClick={handleToggleShuffle}
                className={`ctrl-btn p-2 rounded-full cursor-pointer flex items-center justify-center ${
                  animatingBtn === 'shuffle' ? 'animate-spring-pop' : ''
                } ${
                  isShuffle
                    ? 'text-[#1ed760] hover:text-[#22e76b]'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={isShuffle ? 'Disable Shuffle' : 'Enable Shuffle'}
              >
                <Shuffle className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              </button>
              {isShuffle && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1ed760] shadow-[0_0_6px_#1ed760]" />
              )}
            </div>

            {/* 2. Previous Button */}
            <button
              type="button"
              onClick={handlePrevious}
              disabled={!currentTrack}
              className={`ctrl-btn p-2 rounded-full text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center ${
                animatingBtn === 'prev' ? 'animate-spring-pop' : ''
              }`}
              title="Previous track / Rewind"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            {/* 3. Center Play/Pause Button (Medium Size Solid White Circle, Black Icon) */}
            <button
              type="button"
              onClick={handleTogglePlay}
              className={`ctrl-btn ctrl-btn-play w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white text-black flex items-center justify-center shadow-lg shadow-white/10 cursor-pointer active:scale-95 transition-transform ${
                animatingBtn === 'play' ? 'animate-spring-pop' : ''
              }`}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-black text-black" />
              ) : (
                <Play className="w-5 h-5 fill-black text-black ml-0.5" />
              )}
            </button>

            {/* 4. Next Button */}
            <button
              type="button"
              onClick={handleSkip}
              disabled={!currentTrack && (!queue || queue.length === 0)}
              className={`ctrl-btn p-2 rounded-full text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center ${
                animatingBtn === 'next' ? 'animate-spring-pop' : ''
              }`}
              title="Next track"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            {/* 5. Repeat Button (Green with small green dot when active, like Spotify) */}
            <div className="relative flex flex-col items-center">
              <button
                type="button"
                onClick={handleToggleRepeat}
                className={`ctrl-btn p-2 rounded-full cursor-pointer flex items-center justify-center ${
                  animatingBtn === 'repeat' ? 'animate-spring-pop' : ''
                } ${
                  repeatMode !== 'off'
                    ? 'text-[#1ed760] hover:text-[#22e76b]'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={
                  repeatMode === 'one'
                    ? 'Repeat: Current Track'
                    : repeatMode === 'all'
                    ? 'Repeat: All'
                    : 'Repeat: Off'
                }
              >
                {repeatMode === 'one' ? (
                  <Repeat1 className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                ) : (
                  <Repeat className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                )}
              </button>
              {repeatMode !== 'off' && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1ed760] shadow-[0_0_6px_#1ed760]" />
              )}
            </div>
          </div>

          {/* Bottom Row: Scrubber Bar with Left Timestamp (00:00) & Right Duration */}
          <div className="w-full flex items-center gap-2 sm:gap-3 text-xs text-slate-400">
            <span className="w-9 sm:w-10 text-right font-mono text-[10px] sm:text-[11px] text-slate-400 select-none shrink-0 tabular-nums">
              {formatTime(isDragging ? seekValue : currentPosition)}
            </span>
            <div
              className="relative flex-1 group flex items-center h-4 cursor-pointer select-none"
              onMouseEnter={() => setIsScrubberHovered(true)}
              onMouseLeave={() => setIsScrubberHovered(false)}
            >
              {/* Background Track */}
              <div className="w-full h-1 group-hover:h-1.5 bg-white/20 rounded-full overflow-hidden transition-all duration-150">
                {/* Progress fill */}
                <div
                  className={`h-full ${
                    isScrubberHovered ? 'bg-[#1ed760]' : 'bg-white'
                  } transition-colors duration-150 rounded-full`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {/* Scrubber Knob */}
              <div
                className={`absolute w-3 h-3 bg-white rounded-full shadow-md -translate-x-1/2 pointer-events-none transition-opacity duration-150 ${
                  isScrubberHovered || isDragging ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                }`}
                style={{ left: `${progressPercent}%` }}
              />
              {/* Range Input for accessibility & smooth scrubbing */}
              <input
                type="range"
                min="0"
                max={trackDuration}
                step="0.2"
                value={isDragging ? seekValue : currentPosition}
                onChange={handleSeekChange}
                onMouseDown={() => {
                  setIsDragging(true);
                  setSeekValue(currentPosition);
                }}
                onTouchStart={() => {
                  setIsDragging(true);
                  setSeekValue(currentPosition);
                }}
                onMouseUp={handleSeekCommit}
                onTouchEnd={handleSeekCommit}
                disabled={!currentTrack || !canControl}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title={`Seek: ${formatTime(isDragging ? seekValue : currentPosition)}`}
              />
            </div>
            <span className="w-9 sm:w-10 text-left font-mono text-[10px] sm:text-[11px] text-slate-400 select-none shrink-0 tabular-nums">
              {formatTime(trackDuration)}
            </span>
          </div>

        </div>

        {/* Column 3: Volume Controls & Host Hub (Desktop, Right) */}
        <div className="hidden md:flex items-center justify-end gap-2 sm:gap-3 w-[26%] max-w-xs shrink-0">
          <div className="relative flex items-center gap-1.5 sm:gap-2">


            {/* Host Master / Local Switcher Pill */}
            {isHost && (
              <button
                type="button"
                onClick={() => setVolumeMode((prev) => (prev === 'master' ? 'local' : 'master'))}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all active:scale-95 ${
                  volumeMode === 'master'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 shadow-sm shadow-amber-500/10'
                    : 'bg-dark-850 text-slate-400 border-white/10 hover:text-white'
                }`}
                title={
                  volumeMode === 'master'
                    ? '👑 Controlling all connected devices. Click to switch to Local Only.'
                    : '📱 Controlling only this device. Click to switch to Master (All Speakers).'
                }
              >
                {volumeMode === 'master' ? (
                  <>
                    <Crown className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                    <span>All Speakers</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                    <span>Local Only</span>
                  </>
                )}
              </button>
            )}

            {/* Gapless Crossfade Mode Badge */}
            <button
              type="button"
              onClick={() => {
                const cur = syncEngine.getCrossfadeDuration();
                const next = cur > 0 ? 0 : 2.5;
                syncEngine.setCrossfadeDuration(next);
                setStatusToast(next > 0 ? '✨ 2.5s DJ Crossfade Active' : 'Crossfade Off (Cut)');
                setTimeout(() => setStatusToast(null), 1800);
              }}
              className={`hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border transition-all active:scale-95 ${
                syncEngine.getCrossfadeDuration() > 0
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-dark-850 text-slate-500 border-white/5 hover:text-slate-400'
              }`}
              title="Click to toggle Gapless DJ Audio Crossfade between songs"
            >
              <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
              <span>{syncEngine.getCrossfadeDuration() > 0 ? '2.5s Fade' : 'Cut'}</span>
            </button>

            {/* Mute Button */}
            <button
              onClick={toggleMute}
              className={`p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors active:scale-95 ${
                isMuted || volume === 0 ? 'text-red-400' : ''
              }`}
              title={
                isMuted
                  ? 'Unmute'
                  : isHost && volumeMode === 'master'
                  ? 'Mute All Connected Devices'
                  : 'Mute Audio'
              }
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-5 h-5 text-red-400" />
              ) : (
                <Volume2
                  className={`w-5 h-5 ${
                    isHost && volumeMode === 'master' ? 'text-amber-400' : 'text-slate-300'
                  }`}
                />
              )}
            </button>

            {/* Volume Range Slider */}
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              onPointerUp={handleVolumeCommit}
              onTouchEnd={handleVolumeCommit}
              onMouseUp={handleVolumeCommit}
              onKeyUp={handleVolumeCommit}
              className={`w-18 lg:w-24 h-1.5 rounded-lg appearance-none cursor-pointer ${
                isHost && volumeMode === 'master'
                  ? 'bg-dark-800 accent-amber-400'
                  : 'bg-dark-800 accent-[#1ed760]'
              }`}
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />

            {/* Percentage Display */}
            <span className="text-[11px] font-mono text-slate-400 w-8 text-right select-none">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
