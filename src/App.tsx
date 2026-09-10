import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { socket } from './services/socket';
import { syncEngine } from './services/syncEngine';
import { mediaSessionService } from './services/mediaSession';
import {
  Track,
  User,
  UserRole,
  PlaybackState,
  ChatMessage,
  SyncStats,
  RoomState
} from './types';
import { Lobby } from './components/Lobby';
import { RoomHeader } from './components/RoomHeader';
import { NetworkMode } from './components/NetworkModeModal';
import { PlayerControls } from './components/PlayerControls';
import { QueueList } from './components/QueueList';
import { LiveChatAndReactions } from './components/LiveChatAndReactions';
import { MusicSearchModal } from './components/MusicSearchModal';
import { PlaybackHistoryModal } from './components/PlaybackHistoryModal';
import { Logo } from './components/Logo';
import { Volume2, Radio, Disc, Sparkles, Layers, Plus, MessageSquare, Music2, UserX } from 'lucide-react';

import { userTasteEngine } from './services/userTaste';
import { cleanTrackTitle } from './services/musicApi';
import { getDeviceId } from './utils/deviceId';

const SESSION_STORAGE_KEY = 'musicsync_user_session';
const USER_NAME_STORAGE_KEY = 'musicsync_user_name';

interface StoredSession {
  roomCode: string;
  userName: string;
  userRole?: UserRole;
  avatarColor?: string;
}

function getStoredUserName(): string {
  try {
    return localStorage.getItem(USER_NAME_STORAGE_KEY) || '';
  } catch (e) {
    return '';
  }
}

function saveStoredUserName(name: string) {
  try {
    if (name && name.trim()) {
      localStorage.setItem(USER_NAME_STORAGE_KEY, name.trim());
    }
  } catch (e) {}
}

function getStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse stored session:', e);
  }
  return null;
}

function saveStoredSession(session: StoredSession) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    if (session.userName) {
      saveStoredUserName(session.userName);
    }
  } catch (e) {
    console.warn('Failed to save session:', e);
  }
}

function clearStoredSession() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    // Note: We deliberately KEEP USER_NAME_STORAGE_KEY so the user's chosen name is remembered forever!
  } catch (e) {}
}

export function App() {
  // Room session state
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [hostId, setHostId] = useState<string>('');
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    status: 'stopped',
    scheduledServerTime: 0,
    scheduledPosition: 0,
    lastPausedPosition: 0,
    duration: 0,
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [masterVolume, setMasterVolume] = useState<number>(0.9);
  const [masterVolumeNotice, setMasterVolumeNotice] = useState<{ volume: number; setBy: string } | null>(null);

  const [syncStats, setSyncStats] = useState<SyncStats>({
    rtt: 0,
    clockOffset: 0,
    drift: 0,
    isLocked: false,
    syncQuality: 'excellent',
  });
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(false);

  // Modals state
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isChatVisible, setIsChatVisible] = useState<boolean>(false);
  const [kickedNotice, setKickedNotice] = useState<string | null>(null);

  // Auto-reconnect state on page refresh
  const [isReconnecting, setIsReconnecting] = useState<boolean>(() => {
    const urlRoom = new URLSearchParams(window.location.search).get('room');
    const session = getStoredSession();
    return Boolean(urlRoom || (session && session.roomCode));
  });

  // Network mode state (synchronized across room)
  const [networkMode, setNetworkMode] = useState<NetworkMode>(() => {
    try {
      const urlMode = new URLSearchParams(window.location.search).get('mode') as NetworkMode;
      if (urlMode === 'local' || urlMode === 'online') {
        localStorage.setItem('musicsync_network_mode', urlMode);
        return urlMode;
      }
      return (localStorage.getItem('musicsync_network_mode') as NetworkMode) || 'local';
    } catch {
      return 'local';
    }
  });

  // Query parameter support (?room=CODE, ?mode=local|online)
  const [initialRoomCode, setInitialRoomCode] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    if (code) {
      setInitialRoomCode(code.replace(/\D/g, ''));
    }
    const modeParam = params.get('mode') as NetworkMode;
    if (modeParam === 'local' || modeParam === 'online') {
      setNetworkMode(modeParam);
      syncEngine.setNetworkMode(modeParam);
      try {
        localStorage.setItem('musicsync_network_mode', modeParam);
      } catch {}
    } else {
      syncEngine.setNetworkMode(networkMode);
    }
  }, []);

  // Listen to sync engine telemetry stats & autoplay status
  useEffect(() => {
    const unsubStats = syncEngine.onStatsChange((stats) => {
      setSyncStats(stats);
    });
    const unsubAutoplay = syncEngine.onAutoplayBlocked((blocked) => {
      setIsAudioUnlocked(!blocked);
    });
    return () => {
      unsubStats();
      unsubAutoplay();
    };
  }, []);

  // Synchronize Room Code with Native MediaSession
  useEffect(() => {
    if (roomCode) {
      mediaSessionService.setRoomCode(roomCode);
    }
  }, [roomCode]);

  // Register Native Mobile Lock Screen, Apple Watch, & Bluetooth Car Audio Action Handlers
  useEffect(() => {
    mediaSessionService.setHandlers({
      onPlay: () => {
        if (!isAudioUnlocked) {
          handleUnlockAudio();
        }
        if (currentUser?.role === 'host' || currentUser?.role === 'dj') {
          socket.emit('request_play', {
            track: currentTrack,
            position: syncEngine.getCurrentPosition(),
          });
        } else {
          syncEngine.resumeLocalAudio();
        }
      },
      onPause: () => {
        if (currentUser?.role === 'host' || currentUser?.role === 'dj') {
          const currentPos = syncEngine.getCurrentPosition();
          syncEngine.pausePlayback(currentPos);
          socket.emit('request_pause', { position: currentPos });
        } else {
          syncEngine.pausePlayback();
        }
      },
      onSkip: () => {
        if (currentUser?.role === 'host' || currentUser?.role === 'dj') {
          socket.emit('request_skip');
        }
      },
      onPrevious: () => {
        if (currentUser?.role === 'host' || currentUser?.role === 'dj') {
          socket.emit('request_seek', { position: 0 });
        } else {
          syncEngine.seekPlayback(0);
        }
      },
      onSeek: (seekTime: number) => {
        if (currentUser?.role === 'host' || currentUser?.role === 'dj') {
          socket.emit('request_seek', { position: seekTime });
        } else {
          syncEngine.seekPlayback(seekTime);
        }
      },
    });
  }, [currentUser, currentTrack, isAudioUnlocked]);

  const handleLeaveRoom = () => {
    clearStoredSession();
    setRoomCode(null);
    setCurrentUser(null);
    setUsers([]);
    setQueue([]);
    setCurrentTrack(null);
    setPlaybackState({
      status: 'stopped',
      scheduledServerTime: 0,
      scheduledPosition: 0,
      lastPausedPosition: 0,
      duration: 0,
    });
    setChatMessages([]);
    syncEngine.pausePlayback();
    mediaSessionService.updateMetadata(null);
    socket.emit('leave_room', { deviceId: getDeviceId() });
    socket.disconnect();
    socket.connect();

    const cleanUrl = window.location.pathname;
    window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
  };

  // Socket.io Real-Time Room Event Listeners
  useEffect(() => {
    if (!roomCode) return;

    const handleRoomUsersUpdated = (data: { users: User[]; hostId?: string }) => {
      // Deduplicate devices by deviceId or id so 1 device never appears multiple times
      const uniqueUsers: User[] = [];
      const seen = new Set<string>();
      for (const u of data.users) {
        const key = u.deviceId || u.id;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueUsers.push(u);
        }
      }

      setUsers(uniqueUsers);
      if (data.hostId) setHostId(data.hostId);

      // Update current user's role if modified
      const myDeviceId = getDeviceId();
      const updatedSelf = data.users.find(
        (u) => (u.deviceId && u.deviceId === myDeviceId) || u.id === socket.id || (currentUser && u.id === currentUser.id)
      );
      if (updatedSelf) setCurrentUser(updatedSelf);
    };

    const handleQueueUpdated = (data: { queue: Track[] }) => {
      setQueue(data.queue);
      if (data.queue && data.queue.length > 0 && data.queue[0]) {
        syncEngine.preloadNextTrack(data.queue[0]);
      }
    };

    const handlePlaybackScheduled = (data: {
      track: Track;
      status: 'playing';
      scheduledServerTime: number;
      startPosition: number;
    }) => {
      setCurrentTrack(data.track);
      setPlaybackState({
        status: 'playing',
        scheduledServerTime: data.scheduledServerTime,
        scheduledPosition: data.startPosition,
        lastPausedPosition: data.startPosition,
        duration: data.track.duration || 0,
      });

      // Save to user taste history
      userTasteEngine.recordInteraction(data.track, 'listened');

      // Hand off scheduled playback to the Web Audio NTP sync engine!
      syncEngine.schedulePlayback(data.track, data.scheduledServerTime, data.startPosition);
    };

    const handlePlaybackPaused = (data: { position: number }) => {
      setPlaybackState((prev) => ({
        ...prev,
        status: 'paused',
        lastPausedPosition: data.position,
      }));
      syncEngine.pausePlayback(data.position);
    };

    const handlePlaybackSeeked = (data: { position: number }) => {
      setPlaybackState((prev) => ({
        ...prev,
        scheduledPosition: data.position,
        lastPausedPosition: data.position,
      }));
      syncEngine.seekPlayback(data.position);
    };

    const handleNewChatMessage = (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    };

    const handleMasterVolumeUpdated = (data: { volume: number; setBy: string }) => {
      setMasterVolume(data.volume);
      syncEngine.setVolume(data.volume);
      // Only show the floating notice if someone else adjusted the master volume
      if (!currentUser?.name || data.setBy !== currentUser.name) {
        setMasterVolumeNotice(data);
        setTimeout(() => {
          setMasterVolumeNotice((prev) => (prev?.volume === data.volume ? null : prev));
        }, 3500);
      }
    };

    const handleKickedFromRoom = (data: { reason?: string }) => {
      setKickedNotice(data?.reason || 'The host has removed you from the Synced Room.');
      handleLeaveRoom();
    };

    const handleRoomNetworkModeUpdated = (data: { mode: NetworkMode }) => {
      if (data.mode === 'local' || data.mode === 'online') {
        setNetworkMode(data.mode);
        syncEngine.setNetworkMode(data.mode);
        try {
          localStorage.setItem('musicsync_network_mode', data.mode);
        } catch {}
      }
    };

    socket.on('room_users_updated', handleRoomUsersUpdated);
    socket.on('queue_updated', handleQueueUpdated);
    socket.on('playback_scheduled', handlePlaybackScheduled);
    socket.on('playback_paused', handlePlaybackPaused);
    socket.on('playback_seeked', handlePlaybackSeeked);
    socket.on('new_chat_message', handleNewChatMessage);
    socket.on('master_volume_updated', handleMasterVolumeUpdated);
    socket.on('kicked_from_room', handleKickedFromRoom);
    socket.on('room_network_mode_updated', handleRoomNetworkModeUpdated);

    return () => {
      socket.off('room_users_updated', handleRoomUsersUpdated);
      socket.off('queue_updated', handleQueueUpdated);
      socket.off('playback_scheduled', handlePlaybackScheduled);
      socket.off('playback_paused', handlePlaybackPaused);
      socket.off('playback_seeked', handlePlaybackSeeked);
      socket.off('new_chat_message', handleNewChatMessage);
      socket.off('master_volume_updated', handleMasterVolumeUpdated);
      socket.off('kicked_from_room', handleKickedFromRoom);
      socket.off('room_network_mode_updated', handleRoomNetworkModeUpdated);
    };
  }, [roomCode, currentUser]);

  const handleUnlockAudio = async () => {
    const success = await syncEngine.unlockAudio();
    setIsAudioUnlocked(success);
  };

  const handleRoomReady = (room: RoomState, user: User) => {
    setRoomCode(room.code);
    setCurrentUser(user);
    setUsers(room.users);
    setHostId(room.hostId);
    setQueue(room.queue || []);
    setCurrentTrack(room.currentTrack || null);
    setPlaybackState(room.playbackState);
    setChatMessages(room.chatMessages || []);
    if (typeof room.masterVolume === 'number') {
      setMasterVolume(room.masterVolume);
      syncEngine.setVolume(room.masterVolume);
    }
    if (room.networkMode) {
      setNetworkMode(room.networkMode);
      syncEngine.setNetworkMode(room.networkMode);
    }
    setIsAudioUnlocked(syncEngine.isUnlocked());

    // Save session and persistent user name in localStorage forever!
    saveStoredSession({
      roomCode: room.code,
      userName: user.name,
      userRole: user.role,
      avatarColor: user.avatarColor,
    });
    saveStoredUserName(user.name);

    // Update browser URL query without reload
    const currentMode = room.networkMode || 'local';
    const newUrl = `${window.location.pathname}?room=${room.code}&mode=${currentMode}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);

    // If a track was already playing when joined, sync immediately!
    if (room.currentTrack && room.playbackState.status === 'playing') {
      syncEngine.schedulePlayback(
        room.currentTrack,
        room.playbackState.scheduledServerTime,
        room.playbackState.scheduledPosition
      );
    }
  };

  // Auto-reconnect on refresh effect: restores room session seamlessly
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoom = urlParams.get('room')?.toUpperCase();
    const session = getStoredSession();

    const targetRoom = urlRoom || session?.roomCode;
    const targetUserName = session?.userName || getStoredUserName();
    const targetRole = session?.userRole || 'listener';
    const targetColor = session?.avatarColor;

    if (!targetRoom) {
      setIsReconnecting(false);
      return;
    }

    let isMounted = true;

    const attemptRejoin = () => {
      if (!isMounted) return;

      socket.emit(
        'join_room',
        {
          roomCode: targetRoom,
          userName: targetUserName,
          previousRole: targetRole,
          avatarColor: targetColor,
          deviceId: getDeviceId(),
        },
        (response: { success: boolean; room?: RoomState; user?: User; error?: string }) => {
          if (!isMounted) return;
          setIsReconnecting(false);

          if (response.success && response.room && response.user) {
            handleRoomReady(response.room, response.user);
          } else {
            console.log('Could not auto-rejoin room:', response.error);
            clearStoredSession();
            setInitialRoomCode(targetRoom);
            if (response.error && (response.error.includes('Local Wi-Fi Only') || response.error.includes('same Wi-Fi'))) {
              setKickedNotice(response.error);
            }
            const cleanUrl = window.location.pathname;
            window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
          }
        }
      );
    };

    if (socket.connected) {
      attemptRejoin();
    } else {
      socket.connect();
      socket.once('connect', attemptRejoin);
    }

    const timer = setTimeout(() => {
      if (isMounted) {
        setIsReconnecting(false);
      }
    }, 4000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      socket.off('connect', attemptRejoin);
    };
  }, []);

  // Dismiss kicked notice modal on Escape key press
  useEffect(() => {
    if (!kickedNotice) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setKickedNotice(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [kickedNotice]);

  // Prevent browser from automatically scrolling down on entering room or reloading
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [roomCode]);

  // Reconnecting splash screen during page refresh
  if (isReconnecting) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-4 select-none relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-cyan-500/15 via-purple-500/10 to-pink-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center gap-6 text-center max-w-md w-full relative z-10 px-4">
          {/* Prominent Large Logo with Neon Aura */}
          <div className="relative group flex items-center justify-center w-full">
            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/25 via-purple-500/20 to-pink-500/25 rounded-3xl blur-2xl opacity-75 animate-pulse pointer-events-none" />
            <img
              src="/musicsync-logo.png"
              alt="MusicSync Logo"
              className="w-full max-w-[340px] sm:max-w-[420px] md:max-w-[460px] h-auto object-contain relative z-10 mix-blend-screen drop-shadow-[0_8px_32px_rgba(0,0,0,0.8)] border-none outline-none"
            />
          </div>

          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">Reloading, please wait...</h3>
            <p className="text-xs sm:text-sm text-slate-400">Restoring your synchronized room session</p>
          </div>

          <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-dark-900/90 border border-cyan-400/35 shadow-[0_0_18px_rgba(0,240,255,0.25)] backdrop-blur-md">
            <div className="w-4 h-4 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin shrink-0"></div>
            <span className="text-[11px] font-mono text-cyan-400 font-bold tracking-wider uppercase">
              Reconnecting Session
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Kicked From Room Notice Popup Modal
  const kickedPopupModal = kickedNotice && typeof document !== 'undefined' ? createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kicked-modal-title"
      onClick={() => setKickedNotice(null)}
      className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-dark-900/95 border border-rose-500/40 rounded-3xl p-6 sm:p-7 max-w-sm sm:max-w-md w-full shadow-[0_0_50px_rgba(244,63,94,0.28)] animate-popover-spring text-center select-none"
      >
        {/* Glow ambient aura behind modal */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 bg-rose-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Halo Badged Icon */}
        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-[0_0_24px_rgba(244,63,94,0.35)] mb-4">
          <UserX className="w-8 h-8" />
        </div>

        {/* Title */}
        <h3 id="kicked-modal-title" className="text-lg sm:text-xl font-black tracking-tight text-white mb-2">
          Removed from Room
        </h3>

        {/* Short message informing the user */}
        <p className="text-sm font-medium text-slate-200 leading-relaxed mb-1">
          {kickedNotice}
        </p>
        <p className="text-xs text-slate-400 mb-6">
          You can create your own room or join another room at any time.
        </p>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={() => setKickedNotice(null)}
          className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-rose-500 via-pink-600 to-rose-600 hover:from-rose-400 hover:to-pink-500 text-white font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(244,63,94,0.35)] hover:shadow-[0_0_25px_rgba(244,63,94,0.55)] transition-all duration-200 active:scale-95 cursor-pointer"
        >
          Understood
        </button>
      </div>
    </div>,
    document.body
  ) : null;

  // If user has not joined a room yet, display the sleek Lobby
  if (!roomCode) {
    return (
      <>
        <Lobby onRoomReady={handleRoomReady} initialRoomCode={initialRoomCode} />
        {kickedPopupModal}
      </>
    );
  }

  const isPlaying = playbackState.status === 'playing';
  const myRole: UserRole = currentUser?.role || 'listener';

  const handleOpenSearch = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const el = document.getElementById('universal-music-library');
    if (el) {
      // 1. Native smooth scrollIntoView (respects CSS scroll-mt-20 / scroll-mt-24)
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (err) {
        el.scrollIntoView();
      }

      // 2. Multi-tier direct window & document scroll fallback to guarantee scrolling on all devices
      const header = document.querySelector('header');
      const headerHeight = header ? header.getBoundingClientRect().height + 16 : 80;
      const currentScroll =
        window.pageYOffset ||
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;
      const targetTop = Math.max(0, el.getBoundingClientRect().top + currentScroll - headerHeight);

      window.scrollTo({
        top: targetTop,
        behavior: 'smooth',
      });

      if (document.documentElement && typeof document.documentElement.scrollTo === 'function') {
        document.documentElement.scrollTo({
          top: targetTop,
          behavior: 'smooth',
        });
      }
      if (document.body && typeof document.body.scrollTo === 'function') {
        document.body.scrollTo({
          top: targetTop,
          behavior: 'smooth',
        });
      }

      // 3. Subtle neon arrival pulse animation to guide user's attention
      el.classList.add('ring-2', 'ring-cyan-400', 'shadow-[0_0_30px_rgba(0,240,255,0.4)]');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-cyan-400', 'shadow-[0_0_30px_rgba(0,240,255,0.4)]');
      }, 1600);

      // 4. Gently focus the search input after scroll begins without jumping or breaking the smooth animation
      setTimeout(() => {
        const input = el.querySelector<HTMLInputElement>('input[type="text"]');
        if (input) {
          input.focus({ preventScroll: true });
        }
      }, 500);
    } else {
      setIsSearchOpen(true);
    }
  };

  return (
    <div
      onClick={() => {
        if (!isAudioUnlocked) handleUnlockAudio();
      }}
      className="min-h-screen bg-dark-950 text-slate-100 flex flex-col relative pb-36 sm:pb-32 w-full max-w-full overflow-x-clip"
    >
      {/* 1. Sticky Room Navigation Header */}
      <RoomHeader
        roomCode={roomCode}
        users={users}
        currentUser={currentUser}
        hostId={hostId}
        onLeaveRoom={handleLeaveRoom}
        masterVolume={masterVolume}
        currentNetworkMode={networkMode}
      />

      {/* 2. Main Synchronized Party Content */}
      <main className="max-w-6xl mx-auto w-full px-3 py-3 sm:px-4 sm:py-5 flex-1 flex flex-col gap-3.5 sm:gap-5">
        {/* Action Toolbar: Music Picker & Utility Options */}
        <div className="flex items-center justify-between gap-2 bg-dark-900/60 backdrop-blur-md border border-white/10 p-1.5 sm:p-2 rounded-full w-full shadow-lg">
          {/* Quick Primary Actions */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <button
              type="button"
              onClick={handleOpenSearch}
              className="group flex items-center gap-2 p-1 pl-1.5 pr-3.5 sm:pr-4 rounded-full bg-dark-900 hover:bg-dark-850 border border-cyan-400/40 hover:border-cyan-400 text-white text-xs font-bold transition-all duration-200 shadow-[0_0_12px_rgba(0,240,255,0.25)] hover:shadow-[0_0_18px_rgba(0,240,255,0.5)] active:scale-95 shrink-0 cursor-pointer select-none"
            >
              <div className="relative w-[24px] h-[24px] sm:w-[26px] sm:h-[26px] rounded-full p-[1.5px] bg-gradient-to-tr from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_8px_rgba(0,240,255,0.5)] group-hover:shadow-[0_0_12px_rgba(0,240,255,0.8)] shrink-0 flex items-center justify-center transition-shadow">
                <div className="w-full h-full rounded-full bg-cyan-400 flex items-center justify-center text-black font-black">
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </div>
              <span className="tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-300 group-hover:from-white group-hover:to-cyan-200">
                Select Music
              </span>
            </button>
          </div>

          {/* Toggle Chat Button */}
          <button
            onClick={() => setIsChatVisible(!isChatVisible)}
            className={`group flex items-center gap-2 p-1 pl-1.5 pr-2.5 sm:pr-3 rounded-full border text-xs font-semibold transition-all duration-200 active:scale-95 shrink-0 shadow-lg cursor-pointer select-none ${
              isChatVisible
                ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-[0_0_14px_rgba(0,240,255,0.35)]'
                : 'bg-dark-900/90 hover:bg-dark-850 border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-white'
            }`}
            title={isChatVisible ? 'Hide chat to maximize music space' : 'Open live room chat'}
          >
            <div className="relative w-[22px] h-[22px] sm:w-[24px] sm:h-[24px] rounded-full p-[1.5px] bg-gradient-to-tr from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_8px_rgba(0,240,255,0.4)] group-hover:shadow-[0_0_12px_rgba(0,240,255,0.65)] shrink-0 flex items-center justify-center transition-shadow">
              <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center text-cyan-400">
                <MessageSquare className="w-3 h-3" />
              </div>
            </div>
            <span>{isChatVisible ? 'Hide Chat' : 'Chat'}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-dark-950 text-[10px] font-mono text-cyan-300 border border-white/10 font-bold">
              {chatMessages.length}
            </span>
          </button>
        </div>

        {/* Section 1: Now Playing (Rendered when a track is active) + Live Chat */}
        {(currentTrack || isChatVisible) && (
          <section className={`grid grid-cols-1 ${isChatVisible && currentTrack ? 'lg:grid-cols-12' : ''} gap-3.5 sm:gap-5 items-start animate-fade-in`}>
            {/* Now Playing Card - Only displayed when a track is actually active */}
            {currentTrack && (
              <div className={`${isChatVisible ? 'lg:col-span-7' : 'w-full'} bg-dark-900/70 backdrop-blur-xl border border-white/10 hover:border-cyan-400/30 rounded-2xl p-3.5 sm:p-4 md:p-5 relative flex flex-col justify-between shadow-xl overflow-hidden transition-all duration-300`}>
                {/* Top Bar */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-dark-950/80 border border-white/10 shadow-sm">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isPlaying
                          ? 'bg-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.9)] animate-pulse'
                          : 'bg-amber-400/80 shadow-[0_0_6px_rgba(251,191,36,0.6)]'
                      }`}
                    />
                    <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-slate-300 font-medium">
                      {isPlaying ? 'Synced Broadcast' : 'Playback Paused'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenSearch}
                    className="group text-xs text-cyan-400 hover:text-white font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/25 hover:border-cyan-400/50 transition-all duration-200 active:scale-95 cursor-pointer"
                  >
                    <span>Browse Songs</span>
                    <span className="group-hover:translate-x-0.5 transition-transform duration-200">→</span>
                  </button>
                </div>

                {/* Track Metadata */}
                <div className="flex items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    {/* Circular Artwork with Neon Halo Ring */}
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full p-[2px] bg-gradient-to-tr from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_14px_rgba(0,240,255,0.45)] group-hover:shadow-[0_0_20px_rgba(0,240,255,0.7)] shrink-0 flex items-center justify-center transition-shadow duration-300">
                      <img
                        src={currentTrack.artwork || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=160'}
                        alt={currentTrack.title}
                        className="w-full h-full rounded-full object-cover bg-dark-950 border border-dark-950"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                        Now Playing
                      </span>
                      <h2 className="text-sm sm:text-base md:text-lg font-bold text-white truncate tracking-tight">
                        {cleanTrackTitle(currentTrack.title, currentTrack.artist)}
                      </h2>
                      <p className="text-xs md:text-sm text-slate-300 truncate mt-0.5">{currentTrack.artist}</p>
                      <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-dark-800 border border-white/5 text-slate-400 font-mono">
                          {currentTrack.genre || 'Music'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono truncate max-w-[150px] sm:max-w-none">
                          Added by {currentTrack.addedBy || 'Host'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Compact Live Chat (Rendered when toggled open) */}
            {isChatVisible && (
              <div className={`${currentTrack ? 'lg:col-span-5' : 'w-full'} flex flex-col`}>
                <LiveChatAndReactions
                  messages={chatMessages}
                  currentUser={currentUser}
                  onHide={() => setIsChatVisible(false)}
                />
              </div>
            )}
          </section>
        )}

        {/* Section 2: Up Next Collaborative Queue (Spacious) */}
        <section className="flex-1">
          <QueueList
            queue={queue}
            currentTrack={currentTrack}
            userRole={myRole}
            currentUserId={currentUser?.id}
            onOpenSearch={handleOpenSearch}
          />
        </section>

        {/* Section 3: Universal Music Library (Directly under Up Next) */}
        <section className="w-full">
          <MusicSearchModal inline={true} />
        </section>
      </main>

      {/* 4. Bottom Master Playback Dock */}
      <PlayerControls
        currentTrack={currentTrack}
        playbackState={playbackState}
        userRole={myRole}
        syncStats={syncStats}
        isAudioUnlocked={isAudioUnlocked}
        onUnlockAudio={handleUnlockAudio}
        onOpenSearch={handleOpenSearch}
        masterVolume={masterVolume}
        masterVolumeNotice={masterVolumeNotice}
        queue={queue}
      />

      {/* 5. Fallback Modal if opened standalone */}
      {isSearchOpen && (
        <MusicSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
        />
      )}

      {/* 6. Playback History Modal */}
      <PlaybackHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      {/* 7. Kicked From Room Notice Popup Modal */}
      {kickedPopupModal}
    </div>
  );
}

export default App;
