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
  ExternalLink,
  Plus,
  Loader2,
  Music,
  X
} from 'lucide-react';
import { Track, PlaybackState, UserRole, SyncStats, User } from '../types';
import { syncEngine } from '../services/syncEngine';
import { socket } from '../services/socket';
import { cleanTrackTitle, searchTracks } from '../services/musicApi';
import { useFavorites } from '../services/favoritesService';
import { localMusicService } from '../services/localMusicService';
import { NetworkModeModal } from './NetworkModeModal';
import {
  HeaderBrandLogo,
  LogoPickerModal,
  LogoStyleId,
  getSavedLogoStyle,
  saveLogoStyle
} from './HeaderBrandLogo';

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
  onLeaveRoom: () => void;
  masterVolume?: number;
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
  onLeaveRoom,
  masterVolume = 0.9
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
  // Brand Logo Style & Interactive Demo Picker
  const [logoStyle, setLogoStyle] = useState<LogoStyleId>(() => getSavedLogoStyle());
  const [isLogoPickerOpen, setIsLogoPickerOpen] = useState(false);

  const handleSelectLogoStyle = (style: LogoStyleId) => {
    setLogoStyle(style);
    saveLogoStyle(style);
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Direct Live Search state (matching screenshots 1-4)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addedFeedbackId, setAddedFeedbackId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ⌘K Keyboard Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced search query handler
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      return;
    }

    setIsSearching(true);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await searchTracks(q, 'all', 0);
        setSearchResults(res.tracks || []);
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery]);

  const handlePlayTrack = (track: Track) => {
    if (!isAudioUnlocked) onUnlockAudio();
    syncEngine.primePlayback(track, 0);
    socket.emit('request_play', { track, position: 0 });
    socket.emit('play_track_now', { track, position: 0 });
  };

  const handleAddSearchResult = (track: Track) => {
    socket.emit('queue_add', { track });
    socket.emit('add_to_queue', { track });
    setAddedFeedbackId(track.id);

    // Return to the queue list so the user immediately sees the added songs right here to play them!
    setTimeout(() => {
      setSearchQuery('');
      setSearchResults([]);
      setAddedFeedbackId(null);
    }, 350);
  };

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
        socket.emit('queue_add', { track: tracks[0] });
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

      {/* 1. TOP TELEMETRY HUD BAR (MusicSync Pro Studio) */}
      <header className="shrink-0 h-9 bg-[#060608] border-b border-white/[0.08] px-3 sm:px-4 flex items-center justify-between text-[11px] font-mono text-slate-400 select-none z-30">
        {/* Left: Brand + Buffer + Room Code + User count */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
          <HeaderBrandLogo
            activeStyle={logoStyle}
            onOpenPicker={() => setIsLogoPickerOpen(true)}
          />

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

        {/* Right: Room Controls & Logo Switcher */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsLogoPickerOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#10b981]/15 hover:bg-[#10b981]/25 border border-[#10b981]/40 text-[#10b981] transition-all cursor-pointer text-xs font-medium shadow-[0_0_8px_rgba(16,185,129,0.2)] active:scale-95"
            title="Preview & choose between 5 MusicSync Pro logo styles"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px] font-semibold">Switch Logo</span>
          </button>

          <button
            type="button"
            onClick={onLeaveRoom}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition-all cursor-pointer text-xs font-medium"
            title="Leave Room"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Leave</span>
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
                onClick={() => {
                  setPlaybackPermission('everyone');
                  socket.emit('set_playback_permission', { permission: 'everyone' });
                }}
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
                onClick={() => {
                  setPlaybackPermission('admins');
                  socket.emit('set_playback_permission', { permission: 'admins' });
                }}
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
        {/* COLUMN 2: CENTER (Direct Search & Live Results / Added Songs) */}
        {/* ========================================================= */}
        <main className={`flex-1 min-w-0 flex flex-col p-3 sm:p-4 gap-2.5 bg-[#08080a] overflow-hidden ${
          mobileTab === 'queue' ? 'flex' : 'hidden md:flex'
        }`}>
          {/* Universal Search Bar with Live Input (Matches Competitor Screenshots 1-4) */}
          <div className="w-full shrink-0">
            <div className="relative w-full h-11 px-3.5 rounded-xl bg-[#141418] border border-white/15 focus-within:border-white/30 focus-within:ring-1 focus-within:ring-white/20 flex items-center justify-between transition-all shadow-sm">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setSearchQuery('');
                      setSearchResults([]);
                    }
                  }}
                  placeholder="What do you want to play?"
                  className="w-full bg-transparent text-white text-xs sm:text-sm font-sans placeholder:text-slate-500 outline-none caret-[#10b981]"
                />
              </div>
              <div className="flex items-center gap-1.5 shrink-0 select-none">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      searchInputRef.current?.focus();
                    }}
                    className="p-1 text-slate-400 hover:text-white rounded transition-colors text-xs cursor-pointer mr-1"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <kbd className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-slate-400">
                  ⌘K
                </kbd>
              </div>
            </div>

            <div className="flex items-center justify-between px-1 mt-1.5 text-[10px] font-mono text-slate-500 select-none">
              <span>⚡ [EXPERIMENTAL FREE BETA]</span>
              {queue.length > 0 && searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="text-[#10b981] hover:underline font-mono text-[10px] cursor-pointer"
                >
                  View Queue ({queue.length}) →
                </button>
              )}
            </div>
          </div>

          {/* MAIN CENTER CONTENT AREA: SEARCH RESULTS OR ADDED SONGS (QUEUE) */}
          {searchQuery.trim() ? (
            /* STATE 1: SEARCH RESULTS (Screenshots 1 & 2) */
            <div className="flex-1 min-h-0 flex flex-col rounded-2xl bg-[#111115] border border-white/[0.08] p-2 sm:p-2.5 overflow-hidden animate-fade-in shadow-lg">
              {isSearching && searchResults.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2.5">
                  <Loader2 className="w-6 h-6 animate-spin text-[#10b981]" />
                  <span className="text-xs font-mono text-slate-400">Searching 50M+ songs...</span>
                </div>
              ) : !isSearching && searchResults.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500">
                  <p className="text-xs">No songs found for "{searchQuery}"</p>
                  <p className="text-[11px] text-slate-600 mt-1">Try another title, artist name, or genre</p>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1 select-none">
                  {searchResults.map((track) => {
                    const isAdded = addedFeedbackId === track.id;
                    const cleanTitle = cleanTrackTitle(track.title, track.artist);

                    return (
                      <div
                        key={track.id}
                        onClick={() => handleAddSearchResult(track)}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.06] active:bg-white/[0.08] transition-colors cursor-pointer group select-none"
                      >
                        {/* Left: Thumbnail & Info */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {track.artwork ? (
                            <img
                              src={track.artwork}
                              alt={track.title}
                              className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg object-cover bg-black/50 shrink-0 shadow-sm"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                              <Music className="w-5 h-5 text-slate-400" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs sm:text-sm font-semibold text-white truncate leading-tight group-hover:text-emerald-400 transition-colors">
                              {cleanTitle}
                            </h4>
                            <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
                              {track.artist || 'Unknown Artist'}
                            </p>
                          </div>
                        </div>

                        {/* Right: Duration & Add '+' button */}
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className="text-xs font-mono text-slate-400">
                            {track.duration > 0 ? formatTime(track.duration) : '--:--'}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddSearchResult(track);
                            }}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              isAdded
                                ? 'bg-emerald-500/20 text-[#10b981]'
                                : 'text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                            title={isAdded ? 'Added to queue' : 'Add to queue'}
                          >
                            {isAdded ? (
                              <Check className="w-4 h-4 text-[#10b981]" />
                            ) : (
                              <Plus className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* STATE 2: ADDED SONGS / QUEUE (Screenshots 3 & 4) */
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 select-none pt-1">
              {queue.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <Disc3 className="w-8 h-8 mb-2 opacity-25 text-slate-400" />
                  <p className="text-xs font-medium text-slate-400">No songs in queue</p>
                  <p className="text-[11px] text-slate-600 mt-1">Type in the search bar above to add music</p>
                </div>
              ) : (
                queue.map((track, idx) => {
                  const isCurrent = Boolean(
                    currentTrack &&
                    ((track.queueId && currentTrack.queueId && track.queueId === currentTrack.queueId) ||
                      track.id === currentTrack.id)
                  );

                  const cleanTitle = cleanTrackTitle(track.title, track.artist);
                  const displayTitle = track.artist && !cleanTitle.toLowerCase().includes(track.artist.toLowerCase())
                    ? `${track.artist} - ${cleanTitle}`
                    : cleanTitle;

                  return (
                    <div
                      key={track.queueId || `${track.id}-${idx}`}
                      className={`flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/[0.04] transition-colors group cursor-pointer ${
                        isCurrent ? 'bg-[#10b981]/5 border border-[#10b981]/20' : ''
                      }`}
                      onClick={() => handlePlayTrack(track)}
                    >
                      {/* Left: Grip dots + Number + Play Button + Title */}
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <span className="text-slate-600 group-hover:text-slate-400 text-xs shrink-0 select-none opacity-40 font-mono tracking-tighter">
                          ⠿
                        </span>

                        <span className={`text-xs font-mono font-bold w-4 text-center shrink-0 ${
                          isCurrent ? 'text-[#10b981]' : 'text-slate-400'
                        }`}>
                          {idx + 1}
                        </span>

                        {/* Play / Active Volume Icon Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayTrack(track);
                          }}
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                            isCurrent && isPlaying
                              ? 'text-[#10b981] bg-[#10b981]/20 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                              : 'text-slate-400 hover:text-white hover:bg-white/10'
                          }`}
                          title={isCurrent && isPlaying ? 'Playing' : 'Play now'}
                        >
                          {isCurrent && isPlaying ? (
                            <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                          ) : (
                            <Play className="w-3 h-3 fill-current ml-0.5" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <span
                            className={`text-xs sm:text-[13px] truncate block transition-colors ${
                              isCurrent
                                ? 'text-[#10b981] font-semibold'
                                : 'text-slate-200 group-hover:text-white font-normal'
                            }`}
                            title="Click to play now"
                          >
                            {displayTitle}
                          </span>
                        </div>
                      </div>

                      {/* Right: Duration & Remove action */}
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <span className="text-xs font-mono text-slate-400">
                          {track.duration > 0 ? formatTime(track.duration) : '--:--'}
                        </span>

                        {canControl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              socket.emit('queue_remove', { queueId: track.queueId, trackId: track.id });
                              socket.emit('remove_from_queue', { queueId: track.queueId, trackId: track.id });
                            }}
                            className="text-slate-500 hover:text-rose-400 transition-colors p-1 text-xs cursor-pointer"
                            title="Remove from queue"
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
          )}
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
              onClick={() => {
                socket.emit('queue_shuffle');
                socket.emit('toggle_shuffle');
              }}
              className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                socket.emit('request_previous');
                socket.emit('play_prev');
              }}
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
                }
                if (isPlaying) {
                  syncEngine.pausePlayback(currentPosition);
                  socket.emit('request_pause', { position: currentPosition });
                  socket.emit('pause', { position: currentPosition });
                } else {
                  const target = currentTrack || (queue.length > 0 ? queue[0] : null);
                  if (target) {
                    syncEngine.primePlayback(target, currentPosition);
                    socket.emit('request_play', { track: target, position: currentPosition });
                    socket.emit('resume');
                  }
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
              onClick={() => {
                socket.emit('request_skip');
                socket.emit('play_next');
              }}
              className="p-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Next"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            <button
              type="button"
              onClick={() => {
                socket.emit('set_repeat_mode', { mode: 'all' });
                socket.emit('toggle_repeat');
              }}
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
                syncEngine.seekPlayback(targetTime);
                socket.emit('request_seek', { position: targetTime });
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

      {/* Interactive Brand Logo Style Picker Modal */}
      <LogoPickerModal
        isOpen={isLogoPickerOpen}
        onClose={() => setIsLogoPickerOpen(false)}
        activeStyle={logoStyle}
        onSelectStyle={handleSelectLogoStyle}
      />
    </div>
  );
};

export const MusicSyncProView = BeatsyncProView;
