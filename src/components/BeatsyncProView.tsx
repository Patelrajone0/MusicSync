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
  MessageCircle,
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
import { NetworkModeModal, NetworkMode } from './NetworkModeModal';
import { HeaderBrandLogo } from './HeaderBrandLogo';

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
  networkMode?: NetworkMode;
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
  masterVolume = 0.9,
  networkMode = 'local',
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

  // QR Modal & Leave Room Confirmation Modal
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Dismiss leave confirmation modal on Escape key press
  useEffect(() => {
    if (!showLeaveConfirm) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowLeaveConfirm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLeaveConfirm]);

  // Chat state
  interface SafeChatMessage {
    id: string;
    userName: string;
    userRole?: string;
    avatarColor?: string;
    text: string;
    time: string;
    isYou?: boolean;
    isSystem?: boolean;
  }

  const normalizeChatMessage = (m: any): SafeChatMessage => {
    let name = 'Guest';
    let color = '#38bdf8';
    let role = 'listener';

    if (m?.user && typeof m.user === 'object') {
      name = m.user.name || 'Guest';
      color = m.user.avatarColor || color;
      role = m.user.role || role;
    } else if (typeof m?.userName === 'string' && m.userName.trim()) {
      name = m.userName.trim();
    } else if (typeof m?.user === 'string' && m.user.trim()) {
      name = m.user.trim();
    }

    const isSystem = Boolean(m?.isSystem || name.toLowerCase() === 'system');
    const isYou = Boolean(m?.userId && (m.userId === socket.id || (currentUser && m.userId === currentUser.id)));
    const timeStr = m?.timestamp
      ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : (m?.time || 'Now');

    return {
      id: String(m?.id || `${Date.now()}-${Math.random()}`),
      userName: name,
      userRole: role,
      avatarColor: color,
      text: String(m?.text || ''),
      time: timeStr,
      isYou,
      isSystem
    };
  };

  const [chatMessages, setChatMessages] = useState<SafeChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Favorites
  const { isFavorite, toggleFavorite } = useFavorites();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Direct Live Search state (matching screenshots 1-4)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addedTrackIds, setAddedTrackIds] = useState<Set<string>>(new Set());
  const addingTrackIdsRef = useRef<Set<string>>(new Set());

  // Keep addedTrackIds synchronized with active queue and playback state
  useEffect(() => {
    setAddedTrackIds((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set<string>();
      for (const id of prev) {
        const inQueue = queue.some((q) => q.id === id || q.queueId === id);
        const isCurrent = currentTrack?.id === id || currentTrack?.queueId === id;
        if (inQueue || isCurrent) {
          next.add(id);
        }
      }
      return next;
    });
  }, [queue, currentTrack]);

  // Helper to check if a track is already in the player or queue
  const isTrackAlreadyAdded = (track: Track): boolean => {
    if (!track) return false;
    if (addedTrackIds.has(track.id)) return true;

    const tId = track.id;
    const tTitle = track.title ? track.title.trim().toLowerCase() : '';
    const tArtist = track.artist ? track.artist.trim().toLowerCase() : '';
    const tAudio = track.audioUrl || '';

    if (currentTrack) {
      if (tId && (currentTrack.id === tId || currentTrack.queueId === tId)) return true;
      if (tAudio && currentTrack.audioUrl && currentTrack.audioUrl === tAudio) return true;
      if (
        tTitle &&
        tArtist &&
        currentTrack.title &&
        currentTrack.artist &&
        currentTrack.title.trim().toLowerCase() === tTitle &&
        currentTrack.artist.trim().toLowerCase() === tArtist
      ) {
        return true;
      }
    }

    if (queue && queue.length > 0) {
      return queue.some((q) => {
        if (tId && (q.id === tId || q.queueId === tId)) return true;
        if (tAudio && q.audioUrl && q.audioUrl === tAudio) return true;
        if (
          tTitle &&
          tArtist &&
          q.title &&
          q.artist &&
          q.title.trim().toLowerCase() === tTitle &&
          q.artist.trim().toLowerCase() === tArtist
        ) {
          return true;
        }
        return false;
      });
    }

    return false;
  };
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
  };

  const handleAddSearchResult = (track: Track) => {
    if (!track) return;
    if (isTrackAlreadyAdded(track) || addingTrackIdsRef.current.has(track.id)) {
      return;
    }

    addingTrackIdsRef.current.add(track.id);
    setAddedTrackIds((prev) => new Set(prev).add(track.id));

    // Emit only once to prevent duplicate addition
    socket.emit('queue_add', { track });

    setTimeout(() => {
      addingTrackIdsRef.current.delete(track.id);
    }, 1000);
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

  // Listen for real-time room chat messages and playback permission updates
  useEffect(() => {
    const handleNewChatMessage = (msg: any) => {
      const normalized = normalizeChatMessage(msg);
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === normalized.id)) return prev;
        return [...prev, normalized];
      });
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    };

    const handleChatHistory = (data: { messages: any[] }) => {
      if (Array.isArray(data?.messages)) {
        // Exclude system notices and deduplicate by message ID
        const seenIds = new Set<string>();
        const userMessages: SafeChatMessage[] = [];
        for (const rawMsg of data.messages) {
          if (rawMsg.isSystem || rawMsg.userName === 'System' || rawMsg.user?.name === 'System') continue;
          const normalized = normalizeChatMessage(rawMsg);
          if (!seenIds.has(normalized.id)) {
            seenIds.add(normalized.id);
            userMessages.push(normalized);
          }
        }
        setChatMessages(userMessages);
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    };

    const handlePlaybackPermissionUpdated = (data: { permission: 'everyone' | 'admins' }) => {
      if (data?.permission) {
        setPlaybackPermission(data.permission);
      }
    };

    socket.on('new_chat_message', handleNewChatMessage);
    socket.on('chat_history', handleChatHistory);
    socket.on('playback_permission_updated', handlePlaybackPermissionUpdated);

    socket.emit('get_chat_history');
    socket.emit('get_playback_permission');

    return () => {
      socket.off('new_chat_message', handleNewChatMessage);
      socket.off('chat_history', handleChatHistory);
      socket.off('playback_permission_updated', handlePlaybackPermissionUpdated);
    };
  }, [roomCode]);

  // Keep mobile tab and right tab in sync
  useEffect(() => {
    if (mobileTab === 'spatial' || mobileTab === 'chat') {
      setRightTab(mobileTab);
    }
  }, [mobileTab]);

  // Spatial audio drag handling (Desktop Mouse + Mobile Touch)
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

  const handleRadarTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isSpatialEnabled || e.touches.length === 0) return;
    setIsDraggingNode(true);
    updateNodePosition(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleRadarTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingNode || !isSpatialEnabled || e.touches.length === 0) return;
    updateNodePosition(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleRadarTouchEnd = () => {
    setIsDraggingNode(false);
  };

  const handleToggleSpatial = () => {
    setIsSpatialEnabled((prev) => {
      const next = !prev;
      if (!next) {
        syncEngine.disableSpatialAudio();
        setIs8DRotating(false);
      } else {
        const dist = Math.sqrt(listenerPos.x * listenerPos.x + listenerPos.y * listenerPos.y);
        syncEngine.setSpatialPosition(listenerPos.x, dist);
      }
      return next;
    });
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
    if (!isSpatialEnabled) {
      setIsSpatialEnabled(true);
    }
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
    const text = chatInput.trim();
    socket.emit('send_chat', { text });
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
          <HeaderBrandLogo />

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

        {/* Right: Room Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Leave Room Button */}
          <button
            type="button"
            onClick={() => setShowLeaveConfirm(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition-all cursor-pointer text-xs font-medium active:scale-95"
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
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5 truncate">
                <span># Room {roomCode}</span>
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsQRModalOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition-all shrink-0"
              title="View Room QR Code & Info"
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

            {queue.length > 0 && searchQuery.trim() && (
              <div className="flex items-center justify-end px-1 mt-1.5 text-[10px] font-mono select-none">
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
              </div>
            )}
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
                    const isAdded = isTrackAlreadyAdded(track);
                    const cleanTitle = cleanTrackTitle(track.title, track.artist);

                    return (
                      <div
                        key={track.id}
                        onClick={() => {
                          if (!isAdded) {
                            handleAddSearchResult(track);
                          }
                        }}
                        className={`flex items-center justify-between p-2 sm:p-2.5 rounded-xl border transition-all select-none ${
                          isAdded
                            ? 'bg-emerald-500/[0.05] border-emerald-500/20 shadow-sm'
                            : 'hover:bg-white/[0.06] active:bg-white/[0.08] border-transparent cursor-pointer group'
                        }`}
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
                            <div className="flex items-center gap-2">
                              <h4
                                className={`text-xs sm:text-sm font-semibold truncate leading-tight transition-colors ${
                                  isAdded ? 'text-emerald-300' : 'text-white group-hover:text-emerald-400'
                                }`}
                              >
                                {cleanTitle}
                              </h4>
                              {isAdded && (
                                <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  In List
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
                              {track.artist || 'Unknown Artist'}
                            </p>
                          </div>
                        </div>

                        {/* Right: Duration & Add button */}
                        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 ml-3">
                          <span className="text-xs font-mono text-slate-400">
                            {track.duration > 0 ? formatTime(track.duration) : '--:--'}
                          </span>

                          {isAdded ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              disabled
                              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-semibold shadow-[0_0_10px_rgba(16,185,129,0.25)] cursor-default select-none"
                              title="Already added to your list"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Added</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddSearchResult(track);
                              }}
                              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 active:scale-95 text-slate-300 hover:text-emerald-300 border border-white/10 hover:border-emerald-500/40 text-xs font-medium cursor-pointer transition-all shadow-sm"
                              title="Add to queue"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Add</span>
                            </button>
                          )}
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
        <aside className={`w-full md:w-72 lg:w-80 shrink-0 bg-[#0a0a0d] border-l border-white/[0.08] flex flex-col p-3 sm:p-3.5 gap-3 h-full overflow-hidden ${
          mobileTab === 'spatial' || mobileTab === 'chat' ? 'flex' : 'hidden md:flex'
        }`}>
          {/* Segmented Top Tab Switcher: Chat vs Spatial */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#121216] border border-white/10 text-xs shrink-0">
            <button
              type="button"
              onClick={() => {
                setRightTab('chat');
                setMobileTab('chat');
              }}
              className={`py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                rightTab === 'chat'
                  ? 'bg-[#1e1e24] text-white shadow-sm border border-white/10 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chat</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRightTab('spatial');
                setMobileTab('spatial');
              }}
              className={`py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                rightTab === 'spatial'
                  ? 'bg-[#1e1e24] text-white shadow-sm border border-white/10 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Compass className="w-4 h-4" />
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
                  onClick={handleToggleSpatial}
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

              {/* 2D Interactive Soundstage Radar Canvas (Touch & Mouse) */}
              <div
                ref={radarRef}
                onMouseDown={handleRadarMouseDown}
                onMouseMove={handleRadarMouseMove}
                onMouseUp={handleRadarMouseUp}
                onTouchStart={handleRadarTouchStart}
                onTouchMove={handleRadarTouchMove}
                onTouchEnd={handleRadarTouchEnd}
                className="relative w-full aspect-square rounded-2xl bg-[#060608] border border-white/10 overflow-hidden flex items-center justify-center cursor-crosshair select-none touch-none"
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
            <div className="flex-1 flex flex-col min-h-0 bg-[#060608] rounded-2xl border border-white/[0.06] overflow-hidden">
              {/* Message scroll container or empty state */}
              <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col">
                {chatMessages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4 select-none my-auto">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center text-slate-500 mb-3">
                      <MessageCircle className="w-14 h-14 sm:w-16 sm:h-16 stroke-[1.2]" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-200 tracking-tight">
                      No messages yet
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
                      Start the conversation
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {chatMessages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex flex-col text-xs leading-snug ${
                          m.isYou ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: m.avatarColor || '#38bdf8' }}
                          />
                          <span className="text-[10px] text-slate-400 font-medium font-mono">
                            {m.isYou ? 'You' : m.userName}
                          </span>
                          <span className="text-[10px] text-slate-600 font-mono">
                            {m.time}
                          </span>
                        </div>
                        <div
                          className={`px-3 py-2 rounded-2xl max-w-[85%] break-words text-xs ${
                            m.isYou
                              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-100 rounded-br-sm'
                              : 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-sm'
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>

              {/* Bottom Message Input Bar */}
              <div className="p-2.5 sm:p-3 border-t border-white/[0.08] bg-[#0d0d11]/90 backdrop-blur-sm shrink-0">
                <form onSubmit={handleSendChat} className="relative flex items-center w-full">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Message"
                    className="w-full bg-[#141418] border border-white/[0.08] hover:border-white/15 focus:border-white/25 rounded-2xl px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none transition-all pr-10"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="absolute right-2 p-1.5 rounded-xl text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 transition-all cursor-pointer disabled:cursor-default"
                    title="Send Message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
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
          onClick={() => {
            setMobileTab('spatial');
            setRightTab('spatial');
          }}
          className={`flex flex-col items-center gap-0.5 ${mobileTab === 'spatial' ? 'text-[#10b981] font-bold' : 'text-slate-400'}`}
        >
          <Compass className="w-4 h-4" />
          <span>Spatial</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMobileTab('chat');
            setRightTab('chat');
          }}
          className={`flex flex-col items-center gap-0.5 ${mobileTab === 'chat' ? 'text-[#10b981] font-bold' : 'text-slate-400'}`}
        >
          <MessageCircle className="w-4 h-4" />
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
                className="flex-1 py-1.5 -my-1.5 flex items-center cursor-pointer relative group select-none"
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
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-white group-hover:bg-[#10b981] transition-colors"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
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
          currentMode={networkMode}
          isHost={isHost}
          onToggleMode={() => {
            const nextMode = networkMode === 'local' ? 'online' : 'local';
            socket.emit('set_room_network_mode', { mode: nextMode });
          }}
        />
      )}

      {/* Exit Room Confirmation Modal */}
      {showLeaveConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none"
          onClick={() => setShowLeaveConfirm(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-[#121217] border border-white/10 p-5 sm:p-6 shadow-[0_16px_50px_rgba(0,0,0,0.85)] overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient background glow */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Modal Content */}
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3.5 shadow-[0_0_20px_rgba(244,63,94,0.25)]">
                <LogOut className="w-6 h-6 stroke-[2.2]" />
              </div>

              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Exit Room?
              </h3>

              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                Are you sure you want to exit <span className="font-semibold text-white"># Room {roomCode}</span>? You will be disconnected from the synchronized music session.
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 w-full mt-6">
                <button
                  type="button"
                  onClick={() => setShowLeaveConfirm(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-95"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowLeaveConfirm(false);
                    onLeaveRoom();
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-[0_0_16px_rgba(244,63,94,0.35)] cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Exit Room</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const MusicSyncProView = BeatsyncProView;
