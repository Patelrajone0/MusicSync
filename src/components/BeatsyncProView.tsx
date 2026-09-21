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
  X,
  GripVertical,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Track, PlaybackState, UserRole, SyncStats, User } from '../types';
import { syncEngine } from '../services/syncEngine';
import { socket } from '../services/socket';
import { cleanTrackTitle, searchTracks } from '../services/musicApi';
import { useFavorites } from '../services/favoritesService';
import { localMusicService } from '../services/localMusicService';
import { NetworkModeModal, NetworkMode } from './NetworkModeModal';
import { HeaderBrandLogo } from './HeaderBrandLogo';
import { TitaniumHeader } from './TitaniumHeader';
import { TitaniumHeaderShowcase } from './TitaniumHeaderShowcase';
import { TitaniumSidebar } from './TitaniumSidebar';
import { TitaniumSidebarShowcase } from './TitaniumSidebarShowcase';
import { TitaniumStudioShowcase } from './TitaniumStudioShowcase';
import { analytics } from '../services/analytics';

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

  // Right column tab: 'chat' vs 'spatial' (Chat default)
  const [rightTab, setRightTab] = useState<'spatial' | 'chat'>('chat');

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
  const [isHeaderShowcaseOpen, setIsHeaderShowcaseOpen] = useState(false);
  const [isSidebarShowcaseOpen, setIsSidebarShowcaseOpen] = useState(false);
  const [isStudioShowcaseOpen, setIsStudioShowcaseOpen] = useState(false);

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

  // Local optimistic queue state for instantaneous UI reordering
  const [localQueue, setLocalQueue] = useState<Track[]>(queue);

  useEffect(() => {
    setLocalQueue(queue);
  }, [queue]);

  // Queue Drag & Drop and Touch Reordering state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const touchDragStartIndexRef = useRef<number | null>(null);
  const touchDragCurrentIndexRef = useRef<number | null>(null);

  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (!canControl) return;
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= localQueue.length ||
      toIndex >= localQueue.length
    ) {
      return;
    }

    // Optimistically update local queue so reordering feels instantaneous (0ms lag)
    const updatedQueue = [...localQueue];
    const [movedItem] = updatedQueue.splice(fromIndex, 1);
    updatedQueue.splice(toIndex, 0, movedItem);
    setLocalQueue(updatedQueue);

    // Sync authoritative reordered queue with room server & other clients
    socket.emit('queue_reorder', {
      fromIndex,
      toIndex,
      queueIds: updatedQueue.map((t) => t.queueId || t.id),
    });
  };

  const handleMoveQueueItem = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    handleReorder(fromIndex, toIndex);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!canControl) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!canControl) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent, index: number) => {
    if (dragOverIndex === index) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const fromStr = e.dataTransfer.getData('text/plain');
    const from = draggedIndex ?? (fromStr ? parseInt(fromStr, 10) : null);
    setDraggedIndex(null);
    setDragOverIndex(null);
    if (typeof from === 'number' && !isNaN(from) && from !== targetIndex) {
      handleReorder(from, targetIndex);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Touch Drag-and-Drop for mobile devices (iOS / Android)
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    if (!canControl) return;
    touchDragStartIndexRef.current = index;
    touchDragCurrentIndexRef.current = index;
    setDraggedIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchDragStartIndexRef.current === null) return;
    const touch = e.touches[0];
    if (!touch) return;

    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const queueItemEl = element?.closest('[data-queue-index]');
    if (queueItemEl) {
      const targetIdx = parseInt(queueItemEl.getAttribute('data-queue-index') || '', 10);
      if (!isNaN(targetIdx) && targetIdx !== touchDragCurrentIndexRef.current) {
        touchDragCurrentIndexRef.current = targetIdx;
        setDragOverIndex(targetIdx);
      }
    }
  };

  const handleTouchEnd = () => {
    const from = touchDragStartIndexRef.current;
    const to = touchDragCurrentIndexRef.current;
    touchDragStartIndexRef.current = null;
    touchDragCurrentIndexRef.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);

    if (from !== null && to !== null && from !== to) {
      handleReorder(from, to);
    }
  };

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
  const chatScrollContainerRef = useRef<HTMLDivElement | null>(null);

  const scrollToChatBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTo({
        top: chatScrollContainerRef.current.scrollHeight,
        behavior,
      });
    }
  };

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
        analytics.trackSearch(q);
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
    analytics.trackPlay(track.title, track.artist);
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

  // Toggle Play / Pause Handler
  const handleTogglePlay = () => {
    if (!isAudioUnlocked) {
      onUnlockAudio();
    }
    if (isPlaying) {
      syncEngine.pausePlayback(currentPosition);
      analytics.trackPause(currentTrack?.title);
      if (canControl) {
        socket.emit('request_pause', { position: currentPosition });
        socket.emit('pause', { position: currentPosition });
      }
    } else {
      const target = currentTrack || (queue.length > 0 ? queue[0] : null);
      if (target) {
        const startPos = currentTrack ? currentPosition : 0;
        syncEngine.primePlayback(target, startPos);
        analytics.trackPlay(target.title, target.artist);
        if (canControl) {
          socket.emit('request_play', { track: target, position: startPos });
          socket.emit('resume');
        } else {
          syncEngine.resumeLocalAudio();
        }
      }
    }
  };

  const handleTogglePlayRef = useRef(handleTogglePlay);
  useEffect(() => {
    handleTogglePlayRef.current = handleTogglePlay;
  });

  // Global Keyboard Shortcut: Spacebar for Instant Play / Pause on Windows, Mac & Linux
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key repeat when holding down the key
      if (e.repeat) return;

      // Detect Spacebar across all Windows, Mac, and Linux browsers
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar' || e.keyCode === 32) {
        const target = e.target as HTMLElement | null;
        const activeEl = document.activeElement as HTMLElement | null;

        const isTextInput = (el: HTMLElement | null): boolean => {
          if (!el) return false;
          if (el.tagName === 'TEXTAREA' || el.isContentEditable || el.getAttribute('contenteditable') === 'true') {
            return true;
          }
          if (el.tagName === 'INPUT') {
            const type = (el as HTMLInputElement).type?.toLowerCase() || 'text';
            const nonTextTypes = [
              'button',
              'submit',
              'reset',
              'checkbox',
              'radio',
              'range',
              'file',
              'color',
              'image',
            ];
            return !nonTextTypes.includes(type);
          }
          return Boolean(
            el.closest(
              'textarea, [contenteditable="true"], input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="color"]):not([type="image"])'
            )
          );
        };

        // If currently focused on any text input or textarea, allow normal space typing
        if (isTextInput(target) || isTextInput(activeEl)) {
          return;
        }

        // Prevent page scroll down and prevent accidental trigger of whatever button/link had focus
        e.preventDefault();
        e.stopPropagation();

        // Blur any active button, slider, or interactive element so spacebar doesn't trigger its click event
        if (target && typeof target.blur === 'function') {
          target.blur();
        }
        if (activeEl && typeof activeEl.blur === 'function') {
          activeEl.blur();
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

  // Auto-scroll chat container to bottom when rightTab or mobileTab changes to 'chat'
  useEffect(() => {
    if (rightTab === 'chat' || mobileTab === 'chat') {
      requestAnimationFrame(() => {
        scrollToChatBottom('auto');
      });
    }
  }, [rightTab, mobileTab]);

  // Listen for real-time room chat messages and playback permission updates
  useEffect(() => {
    const handleNewChatMessage = (msg: any) => {
      const normalized = normalizeChatMessage(msg);
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === normalized.id)) return prev;
        return [...prev, normalized];
      });
      requestAnimationFrame(() => {
        scrollToChatBottom('smooth');
      });
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
        requestAnimationFrame(() => {
          scrollToChatBottom('auto');
        });
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
    if (window.scrollY !== 0 || window.scrollX !== 0) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
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
    <div className="flex-1 w-full h-full min-h-0 bg-dark-950 text-slate-200 flex flex-col font-sans select-none overflow-hidden text-[13px] relative">
      {/* Background ambient lighting matching Lobby */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-electric-cyan/[0.07] rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute bottom-1/4 right-1/4 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-electric-purple/[0.07] rounded-full blur-3xl pointer-events-none z-0" />

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.m4a,.wav,.ogg,.flac"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* 1. TOP TELEMETRY HUD BAR (Titanium Studio Minimal) */}
      <TitaniumHeader
        roomCode={roomCode}
        syncStats={syncStats}
        onLeaveRoom={() => setShowLeaveConfirm(true)}
        theme="studio"
        showThemeSwitcher={false}
      />

      {isHeaderShowcaseOpen && (
        <TitaniumHeaderShowcase
          onClose={() => setIsHeaderShowcaseOpen(false)}
        />
      )}

      {/* 2. THREE-COLUMN PRO STUDIO DASHBOARD (Desktop) / TABBED (Mobile) */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        
        {/* ========================================================= */}
        {/* COLUMN 1: LEFT SIDEBAR (Titanium Studio Minimal) */}
        {/* ========================================================= */}
        <TitaniumSidebar
          roomCode={roomCode}
          users={users}
          currentUser={currentUser}
          hostId={hostId}
          mobileTab={mobileTab}
          playbackPermission={playbackPermission}
          onPermissionChange={(perm) => {
            setPlaybackPermission(perm);
            socket.emit('set_playback_permission', { permission: perm });
          }}
          onOpenQR={() => setIsQRModalOpen(true)}
          onUploadAudio={handleUploadClick}
          theme="studio"
          showThemeSwitcher={false}
        />

        {isSidebarShowcaseOpen && (
          <TitaniumSidebarShowcase
            onClose={() => setIsSidebarShowcaseOpen(false)}
          />
        )}

        {isStudioShowcaseOpen && (
          <TitaniumStudioShowcase
            onClose={() => setIsStudioShowcaseOpen(false)}
          />
        )}

        {/* ========================================================= */}
        {/* COLUMN 2: CENTER (Direct Search & Live Results / Added Songs) */}
        {/* ========================================================= */}
        <main className={`flex-1 min-w-0 flex flex-col p-2 sm:p-4 gap-2 sm:gap-3 bg-dark-950/40 overflow-hidden relative z-10 ${
          mobileTab === 'queue' ? 'flex' : 'hidden md:flex'
        }`}>
          {/* Universal Search Bar with Titanium Studio Look */}
          <div className="w-full shrink-0">
            <div className="relative w-full h-11 sm:h-12 px-4 rounded-full bg-[#0d0f12]/90 backdrop-blur-2xl border border-white/[0.08] hover:border-zinc-500/40 focus-within:border-zinc-400/80 focus-within:shadow-[0_0_20px_rgba(255,255,255,0.06)] flex items-center justify-between transition-all duration-200">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <Search className="w-4 h-4 text-zinc-400 shrink-0" />
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
                  className="w-full bg-transparent text-white text-xs sm:text-sm font-semibold placeholder:text-zinc-500 outline-none caret-emerald-400"
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
                    className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors text-xs cursor-pointer mr-1"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <kbd className="px-2 py-0.5 rounded-full bg-black/60 border border-white/[0.08] text-[10px] font-mono text-zinc-400">
                  ⌘K
                </kbd>
              </div>
            </div>

            {localQueue.length > 0 && searchQuery.trim() && (
              <div className="flex items-center justify-end px-2 mt-1.5 text-[10px] font-mono select-none">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="text-zinc-300 hover:text-white font-mono text-[10px] cursor-pointer transition-colors"
                >
                  View Queue ({localQueue.length}) →
                </button>
              </div>
            )}
          </div>

          {/* MAIN CENTER CONTENT AREA: SEARCH RESULTS OR ADDED SONGS (QUEUE) */}
          {searchQuery.trim() ? (
            /* STATE 1: SEARCH RESULTS in Titanium Card */
            <div className="flex-1 min-h-0 flex flex-col rounded-3xl bg-[#0d0f12]/90 backdrop-blur-2xl border border-white/[0.08] hover:border-zinc-500/30 p-3 sm:p-4 overflow-hidden animate-fade-in shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
              {/* Top ambient hairline */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-zinc-200/40 to-transparent pointer-events-none" />

              {isSearching && searchResults.length === 0 ? (
                <div className="flex-1 min-h-[220px] flex flex-col items-center justify-center text-zinc-400 gap-2.5">
                  <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
                  <span className="text-xs font-mono text-zinc-400">Searching 50M+ songs...</span>
                </div>
              ) : !isSearching && searchResults.length === 0 ? (
                <div className="flex-1 min-h-[220px] flex flex-col items-center justify-center text-zinc-500">
                  <p className="text-xs">No songs found for "{searchQuery}"</p>
                  <p className="text-[11px] text-zinc-600 mt-1">Try another title, artist name, or genre</p>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 select-none">
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
                        className={`flex items-center justify-between p-2 sm:p-2.5 rounded-2xl border transition-all select-none ${
                          isAdded
                            ? 'bg-emerald-500/[0.08] border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                            : 'bg-[#12151b]/60 hover:bg-[#181c24]/90 border-white/[0.05] hover:border-white/[0.15] cursor-pointer group'
                        }`}
                      >
                        {/* Left: Thumbnail & Info */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {track.artwork ? (
                            <img
                              src={track.artwork}
                              alt={track.title}
                              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover bg-black/50 shrink-0 shadow-sm border border-white/5"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#14171d] border border-white/[0.08] flex items-center justify-center shrink-0">
                              <Music className="w-5 h-5 text-zinc-400" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4
                                className={`text-xs sm:text-sm font-semibold truncate leading-tight transition-colors ${
                                  isAdded ? 'text-emerald-300' : 'text-zinc-100 group-hover:text-white'
                                }`}
                              >
                                {cleanTitle}
                              </h4>
                              {isAdded && (
                                <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                                  In List
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400 truncate leading-tight mt-0.5">
                              {track.artist || 'Unknown Artist'}
                            </p>
                          </div>
                        </div>

                        {/* Right: Duration & Add button */}
                        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 ml-3">
                          <span className="text-xs font-mono text-zinc-400">
                            {track.duration > 0 ? formatTime(track.duration) : '--:--'}
                          </span>

                          {isAdded ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              disabled
                              className="flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-semibold shadow-[0_0_12px_rgba(16,185,129,0.25)] cursor-default select-none"
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
                              className="flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 rounded-full bg-[#161a22] hover:bg-zinc-800 active:scale-95 text-zinc-200 hover:text-white border border-white/[0.12] hover:border-white/30 text-xs font-semibold cursor-pointer transition-all shadow-sm"
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
            /* STATE 2: ADDED SONGS / QUEUE in Titanium Card */
            <div className="flex-1 min-h-0 flex flex-col rounded-3xl bg-[#0d0f12]/90 backdrop-blur-2xl border border-white/[0.08] hover:border-zinc-500/30 p-3 sm:p-4 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
              {/* Top ambient hairline */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-zinc-200/40 to-transparent pointer-events-none" />

              <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 select-none pt-1">
                {localQueue.length === 0 ? (
                  <div className="flex-1 min-h-[220px] py-12 flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                    <div className="relative w-12 h-12 mb-3 rounded-full border border-white/[0.12] bg-[#14171d] flex items-center justify-center text-zinc-400 shadow-[inset_0_1px_3px_rgba(255,255,255,0.08),0_4px_16px_rgba(0,0,0,0.5)]">
                      <Disc3 className="w-6 h-6 text-zinc-400 animate-spin-slow" />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)] absolute" />
                    </div>
                    <p className="text-sm font-semibold text-zinc-200 tracking-tight">No songs in queue</p>
                    <p className="text-xs text-zinc-500 mt-1">Type in the search bar above to add music</p>
                  </div>
                ) : (
                  localQueue.map((track, idx) => {
                    const isCurrent = Boolean(
                      currentTrack &&
                      ((track.queueId && currentTrack.queueId && track.queueId === currentTrack.queueId) ||
                        track.id === currentTrack.id)
                    );
                    const isBeingDragged = draggedIndex === idx;
                    const isDropTarget = dragOverIndex === idx && draggedIndex !== idx;

                    const cleanTitle = cleanTrackTitle(track.title, track.artist);
                    const displayTitle = track.artist && !cleanTitle.toLowerCase().includes(track.artist.toLowerCase())
                      ? `${track.artist} - ${cleanTitle}`
                      : cleanTitle;

                    return (
                      <div
                        key={track.queueId || `${track.id}-${idx}`}
                        data-queue-index={idx}
                        draggable={canControl}
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragLeave={(e) => handleDragLeave(e, idx)}
                        onDrop={(e) => handleDrop(e, idx)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handlePlayTrack(track)}
                        className={`relative flex items-center justify-between py-2 px-3 rounded-2xl border transition-all cursor-pointer group select-none ${
                          isBeingDragged
                            ? 'opacity-40 border-dashed border-zinc-400/80 bg-zinc-900/60 scale-[0.98]'
                            : isDropTarget
                            ? 'bg-zinc-800/70 border-zinc-300 ring-2 ring-zinc-400/50 shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                            : isCurrent
                            ? 'bg-gradient-to-r from-zinc-800/80 via-zinc-900/90 to-black/80 border border-zinc-400/40 shadow-[0_0_20px_rgba(255,255,255,0.05)] ring-1 ring-white/10'
                            : 'bg-[#12151b]/50 hover:bg-[#181c24]/80 border-white/[0.05] hover:border-white/[0.12]'
                        }`}
                      >
                        {/* Drop Target Indicator Bar */}
                        {isDropTarget && (
                          <div className="absolute -top-1 left-2 right-2 h-1 rounded-full bg-gradient-to-r from-zinc-200 via-white to-emerald-400 shadow-[0_0_10px_rgba(255,255,255,0.8)] pointer-events-none z-20 animate-pulse" />
                        )}

                        {/* Left: Grip Handle + Move Arrows + Number + Play Button + Title */}
                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                          {canControl ? (
                            <div
                              className="flex items-center gap-0.5 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Touch & Mouse Drag Gripper Handle */}
                              <div
                                onTouchStart={(e) => handleTouchStart(e, idx)}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                                className={`p-1 -ml-1 text-zinc-500 hover:text-white active:text-zinc-200 cursor-grab active:cursor-grabbing transition-colors rounded touch-none ${
                                  isBeingDragged ? 'text-zinc-300' : ''
                                }`}
                                title="Drag to reorder"
                              >
                                <GripVertical className="w-3.5 h-3.5" />
                              </div>

                              {/* Quick Move Up/Down Arrows */}
                              <div className="hidden sm:flex flex-col -space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveQueueItem(idx, 'up');
                                  }}
                                  className="text-zinc-500 hover:text-white disabled:opacity-0 p-0.5 transition-colors cursor-pointer"
                                  title="Move up"
                                >
                                  <ChevronUp className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === localQueue.length - 1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveQueueItem(idx, 'down');
                                  }}
                                  className="text-zinc-500 hover:text-white disabled:opacity-0 p-0.5 transition-colors cursor-pointer"
                                  title="Move down"
                                >
                                  <ChevronDown className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-zinc-600 group-hover:text-zinc-400 text-xs shrink-0 select-none opacity-40 font-mono tracking-tighter">
                              ⠿
                            </span>
                          )}

                          <span className={`text-xs font-mono font-bold w-4 text-center shrink-0 ${
                            isCurrent ? 'text-emerald-400' : 'text-zinc-500'
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
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                              isCurrent && isPlaying
                                ? 'text-black bg-gradient-to-b from-zinc-100 to-zinc-200 border border-white/80 shadow-[0_0_12px_rgba(255,255,255,0.3)]'
                                : 'text-zinc-400 hover:text-white hover:bg-white/10'
                            }`}
                            title={isCurrent && isPlaying ? 'Playing' : 'Play now'}
                          >
                            {isCurrent && isPlaying ? (
                              <Volume2 className="w-3.5 h-3.5 text-black" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            )}
                          </button>

                          <div className="min-w-0 flex-1">
                            <span
                              className={`text-xs sm:text-[13px] truncate block transition-colors ${
                                isCurrent
                                  ? 'text-white font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]'
                                  : 'text-zinc-200 group-hover:text-white font-medium'
                              }`}
                              title="Click to play now"
                            >
                              {displayTitle}
                            </span>
                          </div>
                        </div>

                        {/* Right: Duration & Remove action */}
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className="text-xs font-mono text-zinc-400">
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
                              className="text-zinc-500 hover:text-rose-400 transition-colors p-1 text-xs cursor-pointer"
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
            </div>
          )}
        </main>

        {/* ========================================================= */}
        {/* COLUMN 3: RIGHT (Spatial Audio, 8D Effects & Live Chat)   */}
        {/* ========================================================= */}
        <aside className={`w-full md:w-72 lg:w-80 shrink-0 bg-[#0c0e12]/95 backdrop-blur-2xl border-l border-white/[0.08] flex flex-col p-2.5 sm:p-3.5 gap-2.5 sm:gap-3 h-full overflow-hidden relative z-10 ${
          mobileTab === 'spatial' || mobileTab === 'chat' ? 'flex' : 'hidden md:flex'
        }`}>
          {/* Segmented Top Tab Switcher: Chat vs Spatial */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#090b0e] border border-white/[0.08] text-xs shrink-0">
            <button
              type="button"
              onClick={() => {
                setRightTab('chat');
                setMobileTab('chat');
              }}
              className={`py-1.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                rightTab === 'chat'
                  ? 'bg-zinc-800/90 border border-white/[0.15] text-white font-bold shadow-[0_2px_8px_rgba(0,0,0,0.5)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Chat</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRightTab('spatial');
                setMobileTab('spatial');
              }}
              className={`py-1.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                rightTab === 'spatial'
                  ? 'bg-zinc-800/90 border border-white/[0.15] text-white font-bold shadow-[0_2px_8px_rgba(0,0,0,0.5)]'
                  : 'text-zinc-400 hover:text-white'
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
                <div className="flex items-center gap-1.5 font-bold text-xs text-zinc-200">
                  <Compass className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Spatial Audio</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleSpatial}
                  className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                    isSpatialEnabled ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-zinc-800'
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
                className="relative w-full aspect-square rounded-3xl bg-[#090b0e] border border-white/[0.08] overflow-hidden flex items-center justify-center cursor-crosshair select-none touch-none shadow-inner"
              >
                {/* Radar Grid Lines */}
                <div className="absolute inset-2 border border-white/[0.04] rounded-full pointer-events-none" />
                <div className="absolute inset-8 border border-white/[0.04] rounded-full pointer-events-none" />
                <div className="absolute inset-16 border border-white/[0.04] rounded-full pointer-events-none" />
                <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.04] pointer-events-none" />
                <div className="absolute inset-y-0 left-1/2 w-px bg-white/[0.04] pointer-events-none" />

                {/* Center Host Speaker Node */}
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-10">
                  <div className="relative w-8 h-8 rounded-full bg-[#14171d] border border-white/[0.15] flex items-center justify-center text-xs font-bold text-zinc-200 shadow-[0_0_12px_rgba(0,0,0,0.5)]">
                    <span>PR</span>
                    <span className="absolute -top-1 -right-1 text-amber-400">
                      <Crown className="w-2.5 h-2.5 fill-amber-400" />
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-400 mt-0.5">Host</span>
                </div>

                {/* Draggable Listener Node (Headphone) */}
                <div
                  style={{
                    left: `${((listenerPos.x + 1) / 2) * 100}%`,
                    top: `${((listenerPos.y + 1) / 2) * 100}%`
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gradient-to-tr from-zinc-100 via-white to-zinc-200 text-black flex items-center justify-center shadow-[0_0_16px_rgba(255,255,255,0.4)] cursor-grab active:cursor-grabbing transition-transform ${
                    isDraggingNode ? 'scale-110' : ''
                  }`}
                  title="Drag to position your speaker in 3D room soundstage"
                >
                  <Radio className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Distance Slider & Reset Button */}
              <div className="flex items-center justify-between text-xs text-zinc-400 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-emerald-400 font-bold">{distanceMetric}%</span>
                  <div className="w-20 sm:w-24 h-1.5 rounded-full bg-[#08090c] border border-white/[0.08] overflow-hidden shadow-inner">
                    <div className="h-full bg-gradient-to-r from-zinc-200 to-emerald-400" style={{ width: `${distanceMetric}%` }} />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetNode}
                  className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#14171d] hover:bg-zinc-800 border border-white/[0.08] hover:border-white/20 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm"
                >
                  <ArrowUp className="w-3 h-3" />
                  <span>Move to Top</span>
                </button>
              </div>

              {/* Audio Effects Section (8D Rotation) */}
              <div className="p-3 rounded-2xl bg-[#090b0e] border border-white/[0.08] space-y-2 shrink-0">
                <div className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1 font-bold">
                  <Sparkles className="w-3 h-3 text-zinc-400" />
                  <span>Audio Effects</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs">
                    <RotateCw className={`w-3.5 h-3.5 text-zinc-400 ${is8DRotating ? 'animate-spin' : ''}`} />
                    <span className="font-medium text-white">8D Rotation</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => !is8DRotating && handleToggle8D()}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        is8DRotating
                          ? 'bg-white text-black font-extrabold shadow-[0_0_12px_rgba(255,255,255,0.3)]'
                          : 'bg-white/5 hover:bg-white/10 text-zinc-300'
                      }`}
                    >
                      Start
                    </button>
                    <button
                      type="button"
                      onClick={() => is8DRotating && handleToggle8D()}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        !is8DRotating
                          ? 'bg-white/20 text-white'
                          : 'bg-white/5 hover:bg-white/10 text-zinc-400'
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
            <div className="flex-1 flex flex-col min-h-0 bg-[#090b0e] rounded-3xl border border-white/[0.08] overflow-hidden relative shadow-inner">
              {/* Top ambient hairline */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-[1px] bg-gradient-to-r from-transparent via-zinc-300/30 to-transparent pointer-events-none" />

              {/* Message scroll container or empty state */}
              <div
                ref={chatScrollContainerRef}
                className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col overscroll-contain"
              >
                {chatMessages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4 select-none my-auto">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center text-zinc-600 mb-3">
                      <MessageCircle className="w-14 h-14 sm:w-16 sm:h-16 stroke-[1.2]" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-zinc-200 tracking-tight">
                      No messages yet
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-normal">
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
                            style={{ backgroundColor: m.avatarColor || '#a1a1aa' }}
                          />
                          <span className="text-[10px] text-zinc-400 font-medium font-mono">
                            {m.isYou ? 'You' : m.userName}
                          </span>
                          <span className="text-[10px] text-zinc-600 font-mono">
                            {m.time}
                          </span>
                        </div>
                        <div
                          className={`px-3.5 py-2 rounded-2xl max-w-[85%] break-words text-xs ${
                            m.isYou
                              ? 'bg-zinc-800/90 border border-zinc-600/30 text-zinc-100 shadow-[0_2px_12px_rgba(0,0,0,0.3)] rounded-br-sm'
                              : 'bg-[#14171d] border border-white/[0.06] text-zinc-300 rounded-bl-sm'
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Message Input Bar */}
              <div className="p-2.5 sm:p-3 border-t border-white/[0.08] bg-[#090b0e] backdrop-blur-md shrink-0">
                <form onSubmit={handleSendChat} className="relative flex items-center w-full">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onBlur={() => {
                      if (window.scrollY !== 0 || window.scrollX !== 0) {
                        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                      }
                    }}
                    placeholder="Message"
                    className="w-full bg-[#12151b] border border-white/[0.08] hover:border-zinc-500/40 focus:border-zinc-300 focus:shadow-[0_0_16px_rgba(255,255,255,0.08)] rounded-full px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none transition-all pr-10"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="absolute right-2.5 p-1.5 rounded-full text-zinc-400 hover:text-white disabled:opacity-20 disabled:hover:text-zinc-400 transition-all cursor-pointer disabled:cursor-default"
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
      <nav className="md:hidden shrink-0 h-12 bg-[#0c0e12]/95 backdrop-blur-xl border-t border-white/[0.08] px-4 flex items-center justify-around text-[11px] select-none z-30">
        <button
          type="button"
          onClick={() => setMobileTab('queue')}
          className={`flex flex-col items-center gap-0.5 ${mobileTab === 'queue' ? 'text-white font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'text-zinc-400'}`}
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
          className={`flex flex-col items-center gap-0.5 ${mobileTab === 'spatial' ? 'text-white font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'text-zinc-400'}`}
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
          className={`flex flex-col items-center gap-0.5 ${mobileTab === 'chat' ? 'text-white font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'text-zinc-400'}`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>Chat</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('room')}
          className={`flex flex-col items-center gap-0.5 ${mobileTab === 'room' ? 'text-white font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'text-zinc-400'}`}
        >
          <Users className="w-4 h-4" />
          <span>Room</span>
        </button>
      </nav>

      {/* 4. BOTTOM MASTER PLAYBACK BAR */}
      <footer className="shrink-0 bg-[#0b0d11]/95 backdrop-blur-2xl border-t border-white/[0.08] px-3 sm:px-6 pt-1.5 sm:pt-2.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] flex flex-col md:flex-row items-center justify-between gap-2 sm:gap-3 z-40 select-none relative shadow-[0_-4px_30px_rgba(0,0,0,0.9)]">
        {/* Top ambient hairline */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 sm:w-96 h-[1px] bg-gradient-to-r from-transparent via-zinc-200/40 to-transparent pointer-events-none" />

        {/* Left: Latency Fine-Tuning & Metronome Tools */}
        <div className="flex items-center gap-2 text-xs text-zinc-400 w-full md:w-auto justify-between md:justify-start">
          {/* Millisecond Nudge */}
          <div className="flex items-center gap-1 bg-[#07080a] border border-white/[0.08] rounded-full p-0.5 px-3 font-mono shadow-inner">
            <button
              type="button"
              onClick={() => handleNudge(-10)}
              className="text-zinc-400 hover:text-white font-bold cursor-pointer px-1 transition-colors"
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
              className="text-zinc-400 hover:text-white font-bold cursor-pointer px-1 transition-colors"
              title="Nudge audio +10ms later"
            >
              &gt;&gt;
            </button>
          </div>

          {/* Metronome Tool */}
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-[#07080a] border border-white/[0.08] font-mono text-[10px] text-zinc-400">
              {metronomeBpm}
            </span>
            <button
              type="button"
              onClick={handleToggleMetronome}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                metronomeActive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                  : 'bg-[#07080a] hover:bg-white/5 border border-white/[0.08] text-zinc-300'
              }`}
              title="Toggle synchronized audible metronome tick"
            >
              <span>⏱ metronome</span>
            </button>
          </div>
        </div>

        {/* Center: Controls & Scrubber */}
        <div className="flex flex-col items-center justify-center gap-1.5 w-full md:max-w-xl">
          {/* Control Buttons */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                socket.emit('queue_shuffle');
                socket.emit('toggle_shuffle');
              }}
              className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
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
              className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Previous"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            {/* Play/Pause Button (Brushed Platinum Precision Disc) */}
            <button
              type="button"
              onClick={handleTogglePlay}
              className="w-11 h-11 rounded-full bg-gradient-to-b from-zinc-100 via-white to-zinc-200 hover:brightness-105 active:scale-95 text-black font-black flex items-center justify-center transition-all shadow-[0_0_20px_rgba(255,255,255,0.25),0_2px_8px_rgba(0,0,0,0.5)] border border-white/80 cursor-pointer"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
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
              className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
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
              className="p-1 text-zinc-300 hover:text-white transition-colors cursor-pointer relative"
              title="Repeat"
            >
              <Repeat className="w-4 h-4" />
              <span className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)] absolute bottom-0 left-1/2 -translate-x-1/2" />
            </button>
          </div>

          {/* Scrubber Progress Bar */}
          <div className="flex items-center gap-2.5 w-full text-[11px] font-mono text-zinc-400">
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
              <div className="w-full h-1.5 bg-[#07080a] border border-white/[0.08] rounded-full overflow-hidden relative shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-zinc-200 via-white to-emerald-400 shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <span>{formatTime(trackDur)}</span>
          </div>
        </div>

        {/* Right: Master Volume Slider */}
        <div className="hidden md:flex items-center gap-2.5 w-44 justify-end">
          <button
            type="button"
            onClick={() => {
              const newMuted = !isMuted;
              setIsMuted(newMuted);
              syncEngine.setVolume(newMuted ? 0 : volume);
            }}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-zinc-300" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-24 h-1.5 bg-[#07080a] border border-white/[0.08] rounded-lg appearance-none cursor-pointer accent-zinc-200 shadow-inner"
          />
          <span className="text-[11px] font-mono text-zinc-200 font-bold w-8 text-right">
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
            className="relative w-full max-w-sm rounded-3xl bg-dark-900/95 backdrop-blur-2xl border border-white/10 p-6 sm:p-7 shadow-[0_0_50px_rgba(0,0,0,0.85),0_0_30px_rgba(244,63,94,0.15)] overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient top hairline accent */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-rose-500/60 to-transparent" />

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
