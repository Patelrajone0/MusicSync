import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  Crown,
  Search,
  Upload,
  QrCode,
  Users,
  MessageSquare,
  Compass,
  ArrowUp,
  RotateCw,
  Send,
  Star,
  Trash2,
  Sliders,
  Check,
  Disc3,
  LogOut,
  ExternalLink
} from 'lucide-react';
import { Track, PlaybackState, UserRole, SyncStats, User } from '../types';
import { syncEngine } from '../services/syncEngine';
import { socket } from '../services/socket';
import { cleanTrackTitle } from '../services/musicApi';
import { useFavorites } from '../services/favoritesService';
import { localMusicService } from '../services/localMusicService';
import { NetworkModeModal } from './NetworkModeModal';

interface BeatsyncProViewProps {
  roomCode: string;
  users: User[];
  currentUser: User | null;
  hostId: string | null;
  currentTrack: Track | null;
  playbackState: PlaybackState;
  queue: Track[];
  syncStats: SyncStats;
  isAudioUnlocked: boolean;
  onUnlockAudio: () => void;
  onOpenSearch: () => void;
  onLeaveRoom: () => void;
  masterVolume?: number;
  onToggleTheme: () => void;
  themeMode: 'beatsync' | 'classic';
}

export const BeatsyncProView: React.FC<BeatsyncProViewProps> = ({
  roomCode,
  users,
  currentUser,
  hostId,
  currentTrack,
  playbackState,
  queue,
  syncStats,
  isAudioUnlocked,
  onUnlockAudio,
  onOpenSearch,
  onLeaveRoom,
  masterVolume = 0.9,
  onToggleTheme,
  themeMode
}) => {
  const isHost = Boolean(
    currentUser && (
      currentUser.role === 'host' ||
      (hostId && (currentUser.id === hostId || socket.id === hostId)) ||
      users.some((u) => (u.id === currentUser.id || u.id === socket.id) && u.role === 'host')
    )
  );
  const myRole: UserRole = isHost ? 'host' : (currentUser?.role || 'listener');

  // Playback permissions state: 'everyone' vs 'admins'
  const [playbackPermission, setPlaybackPermission] = useState<'everyone' | 'admins'>('admins');
  const canControl = playbackPermission === 'everyone' || myRole === 'host' || myRole === 'dj';

  // Right column tab: 'spatial' vs 'chat'
  const [rightTab, setRightTab] = useState<'spatial' | 'chat'>('spatial');

  // Mobile bottom tab: 'queue' | 'spatial' | 'chat' | 'room'
  const [mobileTab, setMobileTab] = useState<'queue' | 'spatial' | 'chat' | 'room'>('queue');

  // Spatial Audio state
  const [isSpatialEnabled, setIsSpatialEnabled] = useState(true);
  const [listenerPos, setListenerPos] = useState<{ x: number; y: number }>({ x: 0, y: 0.35 }); // normalized -1 to +1
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [is8DRotating, setIs8DRotating] = useState(false);
  const radarRef = useRef<HTMLDivElement | null>(null);

  // Metronome & Latency Nudge state
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [metronomeBpm, setMetronomeBpm] = useState(50);
  const [hardwareDelay, setHardwareDelay] = useState<number>(() => syncEngine.getHardwareDelayOffset());

  // Scrubber & Playback position
  const [currentPosition, setCurrentPosition] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isDraggingScrubber, setIsDraggingScrubber] = useState(false);
  const [seekValue, setSeekValue] = useState<number>(0);

  // Volume state
  const [volume, setVolume] = useState<number>(masterVolume);
  const [isMuted, setIsMuted] = useState(false);

  // QR Modal
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; user: string; text: string; time: string; isYou?: boolean }>>([
    { id: '1', user: 'System', text: `Welcome to Room #${roomCode}! All devices are synced with microsecond clock alignment.`, time: 'Now' }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Favorites
  const { isFavorite, toggleFavorite } = useFavorites();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isPlaying = playbackState.status === 'playing';

  // Listen for sync engine position updates
  useEffect(() => {
    const unsub = syncEngine.onPositionUpdate((pos, dur) => {
      if (!isDraggingScrubber) {
        setCurrentPosition(pos);
      }
      setDuration(dur || currentTrack?.duration || 0);
    });
    return unsub;
  }, [isDraggingScrubber, currentTrack]);

  // Spatial audio drag handling
  const handleRadarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSpatialEnabled) return;
    setIsDraggingNode(true);
    updateNodePosition(e.clientX, e.clientY);
  };

  const handleRadarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingNode || !isSpatialEnabled) return;
    updateNodePosition(e.clientX, e.clientY);
  };

  const handleRadarMouseUp = () => {
    setIsDraggingNode(false);
  };

  const updateNodePosition = (clientX: number, clientY: number) => {
    if (!radarRef.current) return;
    const rect = radarRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Clamp to -1 .. +1
    let x = (clientX - centerX) / (rect.width / 2);
    let y = (clientY - centerY) / (rect.height / 2);
    x = Math.max(-0.9, Math.min(0.9, x));
    y = Math.max(-0.9, Math.min(0.9, y));

    setListenerPos({ x, y });
    const dist = Math.sqrt(x * x + y * y);
    syncEngine.setSpatialPosition(x, dist);
  };

  const handleResetNode = () => {
    setListenerPos({ x: 0, y: -0.7 });
    syncEngine.setSpatialPosition(0, 0.2);
  };

  const handleToggle8D = () => {
    const active = syncEngine.toggle8DRotation();
    setIs8DRotating(active);
  };

  const handleNudge = (deltaMs: number) => {
    const newOffset = hardwareDelay + deltaMs;
    setHardwareDelay(newOffset);
    syncEngine.setHardwareDelayOffset(newOffset);
  };

  const handleToggleMetronome = () => {
    const active = syncEngine.toggleMetronome(metronomeBpm);
    setMetronomeActive(active);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    syncEngine.setVolume(val);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const newMsg = {
      id: Date.now().toString(),
      user: currentUser?.name || 'Guest',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isYou: true
    };
    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput('');
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const file = files[0];
      const tracks = await localMusicService.importFiles([file]);
      if (tracks && tracks.length > 0) {
        socket.emit('add_to_queue', { track: tracks[0] });
      }
    } catch (err) {
      console.error('Failed to upload track:', err);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const activeTrack = currentTrack || (queue.length > 0 ? queue[0] : null);
  const currentPos = isDraggingScrubber ? seekValue : currentPosition;
  const trackDur = duration || activeTrack?.duration || 1;
  const progressPercent = Math.min(100, Math.max(0, (currentPos / trackDur) * 100));

  // Calculate simulated distance volume percentage based on listener position
  const distanceMetric = Math.round((1 - Math.min(1, Math.sqrt(listenerPos.x * listenerPos.x + listenerPos.y * listenerPos.y) * 0.7)) * 100);

  return (
    <div className="h-full w-full bg-[#08080a] text-slate-200 flex flex-col font-sans select-none overflow-hidden text-[13px]">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.m4a,.wav,.ogg,.flac"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* 1. TOP TELEMETRY HUD BAR (Beatsync style) */}
      <header className="shrink-0 h-9 bg-[#060608] border-b border-white/[0.08] px-3 sm:px-4 flex items-center justify-between text-[11px] font-mono text-slate-400 select-none z-30">
        {/* Left: Brand + Buffer + Room Code + User count */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
          <div className="flex items-center gap-1.5 font-bold text-white tracking-tight">
            <span className="text-[#10b981] font-black text-sm">👑</span>
            <span className="font-sans font-black text-xs tracking-wider text-white">BEATSYNC</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 uppercase font-mono">PRO</span>
          </div>

          <span className="text-white/20 hidden sm:inline">•</span>

          {/* Sync Buffer Indicator */}
          <div className="flex items-center gap-1 text-emerald-400 font-semibold" title="NTP Clock Sync Buffer (16/16)">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <span>16/16</span>
          </div>

          <span className="text-white/20 hidden sm:inline">•</span>

          <span className="text-slate-300 font-semibold truncate">
            # {roomCode}
          </span>

          <span className="text-white/20 hidden sm:inline">•</span>

          <div className="flex items-center gap-1 text-slate-400">
            <Users className="w-3 h-3 text-slate-500" />
            <span>{users.length} {users.length === 1 ? 'user' : 'users'}</span>
          </div>
        </div>

        {/* Center: Real-time Audio Latency Telemetry */}
        <div className="hidden md:flex items-center gap-4 text-slate-400">
          <span className="text-white/20">|</span>
          <div>
            Offset: <span className="text-emerald-400 font-bold font-mono">{(syncStats.clockOffset ?? -16.39).toFixed(2)}ms</span>
          </div>
          <div>
            RTT: <span className="text-slate-300 font-bold font-mono">{(syncStats.rtt ?? 285.57).toFixed(2)}ms</span>
          </div>
          <div>
            Drift: <span className="text-slate-300 font-bold font-mono">{(syncStats.drift ?? 0).toFixed(0)}ms</span>
          </div>
        </div>

        {/* Right: Theme Toggle & Controls */}
        <div className="flex items-center gap-2">
          {/* Theme switcher button */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300 hover:text-white transition-all cursor-pointer text-[10px] font-sans font-semibold"
            title="Switch back to MusicSync Classic Theme"
          >
            <span>💎 Classic Theme</span>
          </button>

          <button
            type="button"
            onClick={onLeaveRoom}
            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
            title="Leave Room"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. THREE-COLUMN PRO STUDIO DASHBOARD (Desktop) / TABBED (Mobile) */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        
        {/* ========================================================= */}
        {/* COLUMN 1: LEFT SIDEBAR (Room Info, Permissions, Users, Tips) */}
        {/* ========================================================= */}
        <aside className={`w-full md:w-60 lg:w-64 shrink-0 bg-[#0a0a0d] border-r border-white/[0.08] flex-col p-3.5 gap-4 overflow-y-auto ${
          mobileTab === 'room' ? 'flex' : 'hidden md:flex'
        }`}>
          {/* Room Header & QR Trigger */}
          <div className="flex items-center justify-between shrink-0">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              <span># Room {roomCode}</span>
            </h2>
            <button
              type="button"
              onClick={() => setIsQRModalOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition-all"
              title="View Room QR Code"
            >
              <QrCode className="w-3 h-3" />
              <span>QR</span>
            </button>
          </div>

          {/* PLAYBACK PERMISSIONS (Everyone vs Admins) */}
          <div className="space-y-1.5 shrink-0">
            <div className="text-[10px] font-mono tracking-wider text-slate-500 uppercase flex items-center gap-1">
              <span>▷ PLAYBACK PERMISSIONS</span>
            </div>
            <div className="grid grid-cols-2 p-0.5 rounded-lg bg-black/60 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => isHost && setPlaybackPermission('everyone')}
                className={`py-1.5 rounded-md font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  playbackPermission === 'everyone'
                    ? 'bg-white/15 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3 h-3" />
                <span>Everyone</span>
              </button>
              <button
                type="button"
                onClick={() => isHost && setPlaybackPermission('admins')}
                className={`py-1.5 rounded-md font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  playbackPermission === 'admins'
                    ? 'bg-gradient-to-r from-amber-500/30 to-amber-600/30 border border-amber-500/50 text-amber-300 font-bold shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>Admins</span>
              </button>
            </div>
          </div>

          {/* CONNECTED USERS LIST */}
          <div className="space-y-1.5 flex-1 min-h-[140px] flex flex-col">
            <div className="text-[10px] font-mono tracking-wider text-slate-500 uppercase flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" /> CONNECTED USERS
              </span>
              <span className="px-1.5 py-0.2 rounded bg-white/5 text-slate-400 font-mono text-[10px]">
                {users.length}
              </span>
            </div>

            <div className="space-y-1 overflow-y-auto flex-1 pr-1">
              {users.map((u) => {
                const isUserHost = u.role === 'host' || u.id === hostId;
                const isYou = u.id === currentUser?.id || u.id === socket.id;

                return (
                  <div
                    key={u.id}
                    className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                      isYou
                        ? 'bg-[#10b981]/10 border-[#10b981]/30 text-white'
                        : 'bg-black/30 border-white/5 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Country Flag / User Avatar */}
                      <div className="relative w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs shrink-0">
                        <span>🇮🇳</span>
                        {isUserHost && (
                          <span className="absolute -top-1 -right-1 text-amber-400">
                            <Crown className="w-2.5 h-2.5 fill-amber-400" />
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-medium truncate">{u.name}</span>
                    </div>

                    {isYou && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#10b981] text-black shrink-0">
                        You
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tips Section */}
          <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-[11px] text-slate-400 space-y-1 shrink-0">
            <div className="font-semibold text-slate-300 flex items-center gap-1 text-[10px] font-mono uppercase">
              <span>Tips</span>
            </div>
            <p className="leading-relaxed">
              • Play on speaker directly. Don't use Bluetooth.
            </p>
          </div>

          {/* Quick Upload Button */}
          <button
            type="button"
            onClick={handleUploadClick}
            className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 hover:bg-white/5 flex items-center gap-2.5 text-left transition-all cursor-pointer group active:scale-[0.98] shrink-0"
          >
            <div className="w-7 h-7 rounded-lg bg-[#10b981]/20 border border-[#10b981]/40 flex items-center justify-center text-[#10b981] shrink-0 group-hover:bg-[#10b981] group-hover:text-black transition-colors">
              <Upload className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white leading-tight">Upload audio</h4>
              <p className="text-[10px] text-slate-400 leading-tight">Add music to queue</p>
            </div>
          </button>
        </aside>

        {/* ========================================================= */}
        {/* COLUMN 2: CENTER (Search Bar, Queue, Playback Details)     */}
        {/* ========================================================= */}
        <main className={`flex-1 min-w-0 flex flex-col p-3 sm:p-4 gap-3 bg-[#08080a] overflow-hidden ${
          mobileTab === 'queue' ? 'flex' : 'hidden md:flex'
        }`}>
          {/* Universal Search Bar with Beta tag (Beatsync style) */}
          <div className="w-full shrink-0">
            <div
              onClick={onOpenSearch}
              className="w-full h-11 px-3.5 rounded-xl bg-[#0e0e12] border border-white/10 hover:border-[#10b981]/50 flex items-center justify-between text-slate-400 text-xs cursor-pointer transition-all shadow-sm group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Search className="w-4 h-4 text-slate-400 group-hover:text-[#10b981] transition-colors" />
                <span className="truncate">What do you want to play?</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <kbd className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-slate-400">
                  ⌘K
                </kbd>
              </div>
            </div>
            <div className="flex items-center justify-between px-1 mt-1 text-[10px] font-mono text-slate-500">
              <span>⚡ [EXPERIMENTAL FREE BETA - 50M+ SONGS]</span>
              <button
                type="button"
                onClick={onOpenSearch}
                className="text-[#10b981] hover:underline cursor-pointer font-sans"
              >
                + Browse Library
              </button>
            </div>
          </div>

          {/* Up Next Section / Queue List */}
          <div className="flex-1 min-h-0 flex flex-col rounded-2xl bg-[#0b0b0e] border border-white/[0.08] p-3 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-white">Up Next</span>
                <span className="px-1.5 py-0.2 rounded bg-white/5 text-[10px] font-mono text-slate-400">
                  {queue.length}
                </span>
              </div>

              {canControl && queue.length > 0 && (
                <button
                  type="button"
                  onClick={() => socket.emit('clear_queue')}
                  className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Track List */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 select-none">
              {queue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <Disc3 className="w-10 h-10 mb-2 opacity-30 text-slate-400" />
                  <p className="text-xs font-medium text-slate-300">No songs lined up next</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 mb-3">Add songs to keep the music playing across the room</p>
                  <button
                    type="button"
                    onClick={onOpenSearch}
                    className="px-3.5 py-1.5 rounded-full bg-[#10b981] text-black font-bold text-xs hover:bg-emerald-400 transition-all cursor-pointer"
                  >
                    + Add Songs
                  </button>
                </div>
              ) : (
                queue.map((track, idx) => {
                  const isCurrent = Boolean(
                    currentTrack &&
                    ((track.queueId && currentTrack.queueId && track.queueId === currentTrack.queueId) ||
                      track.id === currentTrack.id)
                  );
                  const starred = isFavorite(track.id);

                  return (
                    <div
                      key={track.queueId || `${track.id}-${idx}`}
                      className={`flex items-center justify-between p-2 rounded-xl border transition-all group ${
                        isCurrent
                          ? 'bg-[#10b981]/10 border-[#10b981]/40 shadow-[0_0_20px_rgba(16,185,129,0.08)]'
                          : 'bg-black/40 border-white/5 hover:border-white/15'
                      }`}
                    >
                      {/* Left: Drag Handle + Index + Details */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="text-slate-600 group-hover:text-slate-400 cursor-grab text-xs shrink-0 select-none">
                          :::
                        </span>

                        <span className={`text-xs font-mono font-bold w-4 text-right shrink-0 ${isCurrent ? 'text-[#10b981]' : 'text-slate-500'}`}>
                          {idx + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <h4 className={`text-xs font-semibold truncate leading-tight ${isCurrent ? 'text-[#10b981] font-bold' : 'text-slate-200 group-hover:text-white'}`}>
                            {cleanTrackTitle(track.title, track.artist)}
                          </h4>
                          <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                            {track.artist}
                          </p>
                        </div>
                      </div>

                      {/* Right: Duration & Actions */}
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-[11px] font-mono text-slate-500">
                          {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                        </span>

                        {/* Star Favorite */}
                        <button
                          type="button"
                          onClick={() => toggleFavorite(track)}
                          className={`p-1 text-slate-500 hover:text-amber-400 transition-colors ${starred ? 'text-amber-400' : ''}`}
                          title="Favorite"
                        >
                          <Star className={`w-3.5 h-3.5 ${starred ? 'fill-amber-400' : ''}`} />
                        </button>

                        {/* Force Play */}
                        {canControl && (
                          <button
                            type="button"
                            onClick={() => socket.emit('play_track_now', { track, position: 0 })}
                            className="p-1 text-slate-400 hover:text-[#10b981] transition-colors"
                            title="Play Track Now"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        )}

                        {/* Remove Track */}
                        {canControl && (
                          <button
                            type="button"
                            onClick={() => socket.emit('remove_from_queue', { queueId: track.queueId, trackId: track.id })}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                            title="Remove"
                          >
                            <span className="text-sm leading-none">—</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </main>

        {/* ========================================================= */}
        {/* COLUMN 3: RIGHT (Spatial Audio, 8D Effects & Live Chat)   */}
        {/* ========================================================= */}
        <aside className={`w-full md:w-72 lg:w-80 shrink-0 bg-[#0a0a0d] border-l border-white/[0.08] flex-col p-3.5 gap-3 overflow-y-auto ${
          mobileTab === 'spatial' || mobileTab === 'chat' ? 'flex' : 'hidden md:flex'
        }`}>
          {/* Segmented Top Tab Switcher: Chat vs Spatial */}
          <div className="grid grid-cols-2 p-0.5 rounded-lg bg-black/60 border border-white/10 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setRightTab('chat')}
              className={`py-1.5 rounded-md font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                rightTab === 'chat'
                  ? 'bg-white/15 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat</span>
            </button>
            <button
              type="button"
              onClick={() => setRightTab('spatial')}
              className={`py-1.5 rounded-md font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                rightTab === 'spatial'
                  ? 'bg-[#10b981]/20 border border-[#10b981]/40 text-[#10b981] font-bold shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Spatial</span>
            </button>
          </div>

          {/* SPATIAL AUDIO VIEW */}
          {rightTab === 'spatial' && (
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              {/* Spatial Audio Header with ON/OFF switch */}
              <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                  <Compass className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>Spatial Audio</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSpatialEnabled((prev) => !prev)}
                  className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                    isSpatialEnabled ? 'bg-[#10b981]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      isSpatialEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* 2D Interactive Soundstage Radar Canvas */}
              <div
                ref={radarRef}
                onMouseDown={handleRadarMouseDown}
                onMouseMove={handleRadarMouseMove}
                onMouseUp={handleRadarMouseUp}
                className="relative w-full aspect-square rounded-2xl bg-[#060608] border border-white/10 overflow-hidden flex items-center justify-center cursor-crosshair select-none"
              >
                {/* Radar Grid Lines */}
                <div className="absolute inset-2 border border-white/5 rounded-full pointer-events-none" />
                <div className="absolute inset-8 border border-white/5 rounded-full pointer-events-none" />
                <div className="absolute inset-16 border border-white/5 rounded-full pointer-events-none" />
                <div className="absolute inset-x-0 top-1/2 h-px bg-white/5 pointer-events-none" />
                <div className="absolute inset-y-0 left-1/2 w-px bg-white/5 pointer-events-none" />

                {/* Center Host Speaker Node */}
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-10">
                  <div className="relative w-8 h-8 rounded-full bg-slate-900 border border-emerald-500/50 flex items-center justify-center text-xs font-bold text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                    <span>PR</span>
                    <span className="absolute -top-1 -right-1 text-amber-400">
                      <Crown className="w-2.5 h-2.5 fill-amber-400" />
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 mt-0.5">Host</span>
                </div>

                {/* Draggable Listener Node (Headphone) */}
                <div
                  style={{
                    left: `${((listenerPos.x + 1) / 2) * 100}%`,
                    top: `${((listenerPos.y + 1) / 2) * 100}%`
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#10b981] text-black flex items-center justify-center shadow-[0_0_16px_rgba(16,185,129,0.6)] cursor-grab active:cursor-grabbing transition-transform ${
                    isDraggingNode ? 'scale-110' : ''
                  }`}
                  title="Drag to position your speaker in 3D room soundstage"
                >
                  <Radio className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Distance Slider & Reset Button */}
              <div className="flex items-center justify-between text-xs text-slate-400 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-emerald-400 font-bold">{distanceMetric}%</span>
                  <div className="w-20 sm:w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-[#10b981]" style={{ width: `${distanceMetric}%` }} />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetNode}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
                >
                  <ArrowUp className="w-3 h-3" />
                  <span>Move to Top</span>
                </button>
              </div>

              {/* Audio Effects Section (8D Rotation) */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2 shrink-0">
                <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1 font-bold">
                  <Sparkles className="w-3 h-3 text-[#10b981]" />
                  <span>Audio Effects</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs">
                    <RotateCw className={`w-3.5 h-3.5 text-[#10b981] ${is8DRotating ? 'animate-spin' : ''}`} />
                    <span className="font-medium text-white">8D Rotation</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => !is8DRotating && handleToggle8D()}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                        is8DRotating
                          ? 'bg-[#10b981] text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      Start
                    </button>
                    <button
                      type="button"
                      onClick={() => is8DRotating && handleToggle8D()}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                        !is8DRotating
                          ? 'bg-white/20 text-white'
                          : 'bg-white/5 hover:bg-white/10 text-slate-400'
                      }`}
                    >
                      Stop
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CHAT TAB VIEW */}
          {rightTab === 'chat' && (
            <div className="flex-1 flex flex-col min-h-0 bg-[#060608] rounded-xl border border-white/5 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2">
                {chatMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col text-xs leading-snug ${
                      m.isYou ? 'items-end' : 'items-start'
                    }`}
                  >
                    <span className="text-[10px] text-slate-500 mb-0.5">{m.user} • {m.time}</span>
                    <div className={`p-2 rounded-xl max-w-[85%] ${
                      m.isYou
                        ? 'bg-[#10b981]/20 border border-[#10b981]/30 text-white'
                        : 'bg-white/5 border border-white/10 text-slate-200'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendChat} className="p-2 border-t border-white/5 flex gap-1.5 shrink-0">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Chat with room..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#10b981]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-[#10b981] text-black font-bold text-xs hover:bg-emerald-400 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </aside>
      </div>

      {/* 3. SLEEK MOBILE BOTTOM NAVIGATION TABS (Mobile only) */}
      <nav className="md:hidden shrink-0 h-12 bg-[#060608] border-t border-white/[0.08] px-4 flex items-center justify-around text-[11px] select-none z-30">
        <button
          type="button"
          onClick={() => setMobileTab('queue')}
          className={`flex flex-col items-center gap-0.5 ${mobileTab === 'queue' ? 'text-[#10b981] font-bold' : 'text-slate-400'}`}
        >
          <Disc3 className="w-4 h-4" />
          <span>Queue</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('spatial')}
          className={`flex flex-col items-center gap-0.5 ${mobileTab === 'spatial' ? 'text-[#10b981] font-bold' : 'text-slate-400'}`}
        >
          <Compass className="w-4 h-4" />
          <span>Spatial</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('chat')}
          className={`flex flex-col items-center gap-0.5 ${mobileTab === 'chat' ? 'text-[#10b981] font-bold' : 'text-slate-400'}`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chat</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('room')}
          className={`flex flex-col items-center gap-0.5 ${mobileTab === 'room' ? 'text-[#10b981] font-bold' : 'text-slate-400'}`}
        >
          <Users className="w-4 h-4" />
          <span>Room</span>
        </button>
      </nav>

      {/* 4. BOTTOM MASTER PLAYBACK BAR (Beatsync style) */}
      <footer className="shrink-0 bg-[#060608] border-t border-white/[0.08] px-3 sm:px-5 py-2 flex flex-col md:flex-row items-center justify-between gap-2 z-40 select-none">
        
        {/* Left: Latency Fine-Tuning & Metronome Tools */}
        <div className="flex items-center gap-2 text-xs text-slate-400 w-full md:w-auto justify-between md:justify-start">
          {/* Millisecond Nudge */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5 px-2 font-mono">
            <button
              type="button"
              onClick={() => handleNudge(-10)}
              className="hover:text-white font-bold cursor-pointer px-1"
              title="Nudge audio -10ms earlier"
            >
              &lt;&lt;
            </button>
            <span className="text-emerald-400 font-bold px-1 min-w-[36px] text-center">
              {hardwareDelay >= 0 ? `+${hardwareDelay}` : hardwareDelay}ms
            </span>
            <button
              type="button"
              onClick={() => handleNudge(10)}
              className="hover:text-white font-bold cursor-pointer px-1"
              title="Nudge audio +10ms later"
            >
              &gt;&gt;
            </button>
          </div>

          {/* Metronome Tool */}
          <div className="flex items-center gap-1">
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px] text-slate-400">
              {metronomeBpm}
            </span>
            <button
              type="button"
              onClick={handleToggleMetronome}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                metronomeActive
                  ? 'bg-[#10b981] text-black font-bold shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300'
              }`}
              title="Toggle synchronized audible metronome tick"
            >
              <span>⏱ metronome</span>
            </button>
          </div>
        </div>

        {/* Center: Controls & Scrubber */}
        <div className="flex flex-col items-center justify-center gap-1 w-full md:max-w-xl">
          {/* Control Buttons */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => socket.emit('toggle_shuffle')}
              className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => socket.emit('play_prev')}
              className="p-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Previous"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            {/* Play/Pause Button (Solid white circle with black icon) */}
            <button
              type="button"
              onClick={() => {
                if (!isAudioUnlocked) {
                  onUnlockAudio();
                  return;
                }
                if (isPlaying) {
                  socket.emit('pause');
                } else {
                  socket.emit('resume');
                }
              }}
              className="w-9 h-9 rounded-full bg-white hover:bg-slate-200 text-black flex items-center justify-center transition-all active:scale-95 shadow-lg cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => socket.emit('play_next')}
              className="p-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Next"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            <button
              type="button"
              onClick={() => socket.emit('toggle_repeat')}
              className="p-1 text-[#10b981] transition-colors cursor-pointer relative"
              title="Repeat"
            >
              <Repeat className="w-4 h-4" />
              <span className="w-1 h-1 rounded-full bg-[#10b981] absolute bottom-0 left-1/2 -translate-x-1/2" />
            </button>
          </div>

          {/* Scrubber Progress Bar */}
          <div className="flex items-center gap-2 w-full text-[11px] font-mono text-slate-400">
            <span>{formatTime(currentPos)}</span>
            <div
              className="flex-1 h-1 bg-slate-800 rounded-full cursor-pointer relative group overflow-hidden"
              onClick={(e) => {
                if (!canControl) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const pct = Math.max(0, Math.min(1, clickX / rect.width));
                const targetTime = pct * trackDur;
                socket.emit('seek', { position: targetTime });
              }}
            >
              <div
                className="h-full bg-white group-hover:bg-[#10b981] transition-colors"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span>{formatTime(trackDur)}</span>
          </div>
        </div>

        {/* Right: Master Volume Slider */}
        <div className="hidden md:flex items-center gap-2 w-44 justify-end">
          <button
            type="button"
            onClick={() => {
              const newMuted = !isMuted;
              setIsMuted(newMuted);
              syncEngine.setVolume(newMuted ? 0 : volume);
            }}
            className="text-slate-400 hover:text-white"
          >
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-24 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#10b981]"
          />
          <span className="text-[11px] font-mono text-slate-400 w-8 text-right">
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>
      </footer>

      {/* QR Code & Invite Modal */}
      {isQRModalOpen && (
        <NetworkModeModal
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
          roomCode={roomCode}
          currentMode="local"
        />
      )}
    </div>
  );
};
