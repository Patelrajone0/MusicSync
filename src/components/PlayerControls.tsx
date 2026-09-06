import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  Layers,
  Activity,
  Maximize2,
  Crown
} from 'lucide-react';
import { Track, PlaybackState, UserRole, SyncStats } from '../types';
import { syncEngine } from '../services/syncEngine';
import { socket } from '../services/socket';

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
}) => {
  const isHost = userRole === 'host';
  const [currentPosition, setCurrentPosition] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volumeMode, setVolumeMode] = useState<'master' | 'local'>('master');
  const [volume, setVolume] = useState<number>(masterVolume ?? 0.9);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [prevVolume, setPrevVolume] = useState<number>(masterVolume ?? 0.9);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [seekValue, setSeekValue] = useState<number>(0);
  const lastVolumeEmitRef = useRef<number>(0);

  const canControl = userRole === 'host' || userRole === 'dj';
  const isPlaying = playbackState.status === 'playing';

  // Listen to position updates from syncEngine
  useEffect(() => {
    const unsub = syncEngine.onPositionUpdate((pos, dur) => {
      if (!isDragging) {
        setCurrentPosition(pos);
        setDuration(dur || currentTrack?.duration || 0);
      }
    });
    return unsub;
  }, [isDragging, currentTrack]);

  const handleTogglePlay = () => {
    if (!isAudioUnlocked) {
      onUnlockAudio();
    }
    if (!canControl) return;

    if (isPlaying) {
      socket.emit('request_pause');
    } else {
      socket.emit('request_play', { track: currentTrack, position: currentPosition });
    }
  };

  const handleSkip = () => {
    if (!canControl) return;
    socket.emit('request_skip');
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSeekValue(val);
  };

  const handleSeekCommit = () => {
    setIsDragging(false);
    setCurrentPosition(seekValue);
    if (canControl) {
      socket.emit('request_seek', { position: seekValue });
    } else {
      syncEngine.seekPlayback(seekValue);
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

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const trackDuration = duration || currentTrack?.duration || 1;
  const progressPercent = Math.min(100, (currentPosition / trackDuration) * 100);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-dark-900/95 backdrop-blur-2xl border-t border-white/10 px-3 py-2 sm:px-4 sm:py-3 md:px-8 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
      {/* Audio Unlock Warning Banner if browser muted */}
      {!isAudioUnlocked && (
        <div className="max-w-6xl mx-auto mb-2 sm:mb-2.5">
          <div className="bg-gradient-to-r from-electric-purple/30 to-electric-cyan/30 border border-electric-cyan/40 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl flex items-center justify-between text-xs sm:text-sm gap-2">
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

      {/* Scrubber Bar across top */}
      <div className="max-w-6xl mx-auto flex items-center gap-2 sm:gap-3 text-xs text-slate-400 mb-1.5 sm:mb-2">
        <span className="w-8 sm:w-10 text-right font-mono text-[10px] sm:text-[11px] shrink-0">{formatTime(isDragging ? seekValue : currentPosition)}</span>
        <div className="relative flex-1 group">
          <input
            type="range"
            min="0"
            max={trackDuration}
            step="0.5"
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
            className="w-full h-1.5 bg-dark-800 rounded-lg appearance-none cursor-pointer accent-electric-cyan focus:outline-none"
          />
        </div>
        <span className="w-8 sm:w-10 font-mono text-[10px] sm:text-[11px] shrink-0">{formatTime(trackDuration)}</span>
      </div>

      {/* Controls Container */}
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Track Info (Left) */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 md:max-w-xs">
          {currentTrack ? (
            <>
              <div className="relative group shrink-0">
                <img
                  src={currentTrack.artwork || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100'}
                  alt={currentTrack.title}
                  className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl object-cover border border-white/10 shadow-lg"
                />
                {isPlaying && (
                  <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                    <div className="flex items-end gap-0.5 h-3 sm:h-4">
                      <div className="w-0.5 bg-electric-cyan animate-pulse h-full"></div>
                      <div className="w-0.5 bg-electric-cyan animate-pulse delay-75 h-2/3"></div>
                      <div className="w-0.5 bg-electric-cyan animate-pulse delay-150 h-4/5"></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="min-w-0 overflow-hidden pr-1">
                <h4 className="text-xs sm:text-sm font-semibold text-white truncate">{currentTrack.title}</h4>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">{currentTrack.artist}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded bg-dark-800 border border-white/5 text-slate-400 font-mono">
                    {currentTrack.source}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/20 text-cyan-300 font-mono"
                    title="Lock Screen, Apple Watch & Bluetooth Car Audio synced via MediaSession"
                  >
                    <Radio className="w-2.5 h-2.5 text-cyan-400 animate-pulse" />
                    <span>Lock Screen Sync</span>
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-dark-800 flex items-center justify-center text-slate-500 border border-white/5 shrink-0">
                <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-400 truncate">No song playing</p>
                <button
                  onClick={onOpenSearch}
                  className="text-[11px] sm:text-xs text-cyan-400 hover:underline font-medium"
                >
                  + Add song
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Master Playback Controls (Center) */}
        <div className="flex items-center gap-2.5 sm:gap-4 md:gap-6 shrink-0">
          <button
            onClick={handleTogglePlay}
            disabled={!currentTrack && !canControl}
            className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 btn-play-active ${
              isPlaying
                ? 'bg-electric-cyan text-black hover:bg-white neon-glow-cyan'
                : 'bg-white text-black hover:bg-electric-cyan'
            } ${!canControl && !isAudioUnlocked ? 'ring-2 ring-electric-cyan animate-bounce' : ''}`}
            title={isPlaying ? 'Pause for all devices' : 'Play synced across room'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-current transition-transform active:scale-90" />
            ) : (
              <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current ml-0.5 transition-transform active:scale-90" />
            )}
          </button>

          <button
            onClick={handleSkip}
            disabled={!canControl}
            className={`p-2 sm:p-2.5 rounded-full text-slate-300 hover:text-white hover:bg-dark-800 transition-colors active:scale-95 ${
              !canControl ? 'opacity-40 cursor-not-allowed' : ''
            }`}
            title="Skip to next track"
          >
            <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Right Section: Volume Controls */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-3 flex-1 md:max-w-md">
          {/* Volume Control Dock */}
          <div className="relative flex items-center gap-1 sm:gap-2">
            {/* Master Volume Notice HUD Toast */}
            {masterVolumeNotice && (
              <div className="absolute -top-10 right-0 pointer-events-none z-50 animate-popover-spring whitespace-nowrap bg-dark-900/95 border border-amber-500/40 px-2.5 py-1 rounded-full shadow-2xl flex items-center gap-1.5 text-[11px] text-amber-300 font-medium">
                <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>
                  {masterVolumeNotice.setBy}: {Math.round(masterVolumeNotice.volume * 100)}%
                </span>
              </div>
            )}

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
                    <span className="hidden sm:inline">All Speakers</span>
                    <span className="sm:hidden">All</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                    <span className="hidden sm:inline">Local Only</span>
                    <span className="sm:hidden">Local</span>
                  </>
                )}
              </button>
            )}

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
              className={`hidden md:block w-20 lg:w-28 h-1.5 rounded-lg appearance-none cursor-pointer ${
                isHost && volumeMode === 'master'
                  ? 'bg-dark-800 accent-amber-400'
                  : 'bg-dark-800 accent-electric-cyan'
              }`}
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />

            {/* Percentage Display */}
            <span className="text-[11px] font-mono text-slate-400 w-8 text-right hidden sm:inline-block select-none">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
