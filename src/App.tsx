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
  SyncStats,
  RoomState
} from './types';
import { Lobby } from './components/Lobby';
import { RoomHeader } from './components/RoomHeader';
import { NetworkMode } from './components/NetworkModeModal';
import { PlayerControls } from './components/PlayerControls';
import { QueueList } from './components/QueueList';
import { MusicSearchModal } from './components/MusicSearchModal';
import { PlaybackHistoryModal } from './components/PlaybackHistoryModal';
import { Logo } from './components/Logo';
import { UserX, Disc3, Search } from 'lucide-react';

import { userTasteEngine } from './services/userTaste';
import { getDeviceId } from './utils/deviceId';
import { triggerMonetagAds } from './services/adManager';

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
  const [kickedNotice, setKickedNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'player' | 'queue' | 'search'>('player');

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
    const unsubPlaybackError = syncEngine.onPlaybackError((msg) => {
      console.warn('[App] Playback notification:', msg);
      setPlaybackState((prev) => {
        if (prev.status === 'playing') {
          return { ...prev, status: 'paused' };
        }
        return prev;
      });
    });
    return () => {
      unsubStats();
      unsubAutoplay();
      unsubPlaybackError();
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
        if (currentTrack) {
          syncEngine.primePlayback(currentTrack, syncEngine.getCurrentPosition());
        }
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

  // Ad Timing Controller:
  // - 30 seconds delay on Login page (Lobby)
  // - At least 5 minutes (300 seconds) delay on Main page (inside Room)
  useEffect(() => {
    const delayMs = roomCode ? 5 * 60 * 1000 : 30 * 1000;
    const timer = setTimeout(() => {
      triggerMonetagAds();
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [roomCode]);

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
      setQueue(Array.isArray(data?.queue) ? data.queue : []);
      if (data?.queue && data.queue.length > 0 && data.queue[0]) {
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
      setPlaybackState((prev) => {
        if (prev.status === 'stopped') {
          return prev;
        }
        return {
          ...prev,
          status: 'paused',
          lastPausedPosition: data.position,
        };
      });
      syncEngine.pausePlayback(data.position);
    };

    const handlePlaybackStopped = () => {
      setCurrentTrack(null);
      setPlaybackState({
        status: 'stopped',
        scheduledServerTime: 0,
        scheduledPosition: 0,
        lastPausedPosition: 0,
        duration: 0,
      });
      syncEngine.stopPlayback();
    };

    const handlePlaybackSeeked = (data: { position: number }) => {
      setPlaybackState((prev) => ({
        ...prev,
        scheduledPosition: data.position,
        lastPausedPosition: data.position,
      }));
      syncEngine.seekPlayback(data.position);
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
    socket.on('playback_stopped', handlePlaybackStopped);
    socket.on('playback_seeked', handlePlaybackSeeked);
    socket.on('master_volume_updated', handleMasterVolumeUpdated);
    socket.on('kicked_from_room', handleKickedFromRoom);
    socket.on('room_network_mode_updated', handleRoomNetworkModeUpdated);

    return () => {
      socket.off('room_users_updated', handleRoomUsersUpdated);
      socket.off('queue_updated', handleQueueUpdated);
      socket.off('playback_scheduled', handlePlaybackScheduled);
      socket.off('playback_paused', handlePlaybackPaused);
      socket.off('playback_stopped', handlePlaybackStopped);
      socket.off('playback_seeked', handlePlaybackSeeked);
      socket.off('master_volume_updated', handleMasterVolumeUpdated);
      socket.off('kicked_from_room', handleKickedFromRoom);
      socket.off('room_network_mode_updated', handleRoomNetworkModeUpdated);
    };
  }, [roomCode, currentUser]);

  const handleUnlockAudio = async () => {
    try {
      // Optimistically update UI so the banner dismisses with 0ms lag
      setIsAudioUnlocked(true);
      const shouldPlay = playbackState.status === 'playing';
      // Pass undefined for position so syncEngine computes authoritative live room position from clock
      const success = await syncEngine.unlockAudio(currentTrack, undefined, shouldPlay);
      setIsAudioUnlocked(success);
    } catch (e) {
      console.warn('[App] Audio unlock error:', e);
    }
  };

  const handleRoomReady = (room: RoomState, user: User) => {
    setRoomCode(room.code);
    setCurrentUser(user);
    setUsers(room.users);
    setHostId(room.hostId);
    setQueue(room.queue || []);
    setCurrentTrack(room.currentTrack || null);
    setPlaybackState(room.playbackState);
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
  const isHost = Boolean(
    currentUser && (
      currentUser.role === 'host' ||
      (hostId && (currentUser.id === hostId || socket.id === hostId)) ||
      users.some((u) => (u.id === currentUser.id || u.id === socket.id) && u.role === 'host')
    )
  );
  const myRole: UserRole = isHost ? 'host' : (currentUser?.role || 'listener');

  const handleOpenSearch = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setActiveTab('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      const el = document.getElementById('universal-music-library');
      if (el) {
        const input = el.querySelector<HTMLInputElement>('input[type="text"]');
        if (input) {
          input.focus({ preventScroll: true });
        }
      }
    }, 150);
  };

  return (
    <div
      onClick={() => {
        if (!isAudioUnlocked) handleUnlockAudio();
      }}
      onTouchStart={() => {
        if (!isAudioUnlocked) handleUnlockAudio();
      }}
      className="h-screen h-[100dvh] max-h-screen overflow-hidden bg-dark-950 text-slate-100 flex flex-col relative w-full max-w-full overflow-x-clip"
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

      {/* Desktop Tab Switcher: Neon Underline Rail (Spotify / Linear Style) */}
      <div className="hidden md:flex items-center justify-center w-full px-3 sm:px-5 lg:px-6 pt-1.5 pb-0.5 shrink-0 z-30 select-none">
        <div className="flex items-center justify-center gap-6 sm:gap-8 py-1 relative">
          {/* Tab 1: Player & Queue */}
          <button
            type="button"
            onClick={() => setActiveTab('player')}
            className="group relative flex items-center gap-2 py-1.5 text-xs tracking-wider uppercase transition-colors cursor-pointer select-none"
          >
            <Disc3
              className={`w-4 h-4 ${
                activeTab === 'player' || activeTab === 'queue'
                  ? 'text-cyan-400 animate-spin'
                  : 'text-slate-500 group-hover:text-slate-300'
              }`}
              style={{ animationDuration: '3s' }}
            />
            <span
              className={`font-black tracking-wide ${
                activeTab === 'player' || activeTab === 'queue'
                  ? 'text-white'
                  : 'text-slate-400 group-hover:text-slate-200'
              }`}
            >
              Up Next & Queue
            </span>
            {queue.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                {queue.length}
              </span>
            )}
            {(activeTab === 'player' || activeTab === 'queue') && (
              <span className="absolute -bottom-1 left-0 right-0 h-[2.5px] bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 rounded-full shadow-[0_0_10px_#00f0ff]" />
            )}
          </button>

          {/* Small horizontal divider line in the middle gap */}
          <span className="w-5 sm:w-6 h-[2px] bg-slate-700/80 rounded-full select-none" />

          {/* Tab 2: Search / Library */}
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className="group relative flex items-center gap-2 py-1.5 text-xs tracking-wider uppercase transition-colors cursor-pointer select-none"
          >
            <Search
              className={`w-4 h-4 ${
                activeTab === 'search' ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
              }`}
            />
            <span
              className={`font-black tracking-wide ${
                activeTab === 'search' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
              }`}
            >
              Search / Library
            </span>
            {activeTab === 'search' && (
              <span className="absolute -bottom-1 left-0 right-0 h-[2.5px] bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 rounded-full shadow-[0_0_10px_#00f0ff]" />
            )}
          </button>
        </div>
      </div>

      {/* 2. Active Tab Content */}
      <main className="w-full px-2.5 sm:px-5 lg:px-6 py-1.5 sm:py-2.5 md:py-3 lg:py-4 flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* TAB 1: 🎵 Up Next (Collaborative Queue & Favorites) */}
        {(activeTab === 'player' || activeTab === 'queue') && (
          <div className="flex-1 w-full h-full min-h-0 animate-fade-in flex flex-col max-w-5xl mx-auto">
            <div id="upnext-queue-section" className="w-full h-full min-h-0 flex-1 flex flex-col">
              <QueueList
                queue={queue}
                currentTrack={currentTrack}
                userRole={myRole}
                currentUserId={currentUser?.id}
                onOpenSearch={() => setActiveTab('search')}
              />
            </div>
          </div>
        )}

        {/* TAB 2: 🔍 Search / Library (Universal Music Catalog & Local MP3s) */}
        {activeTab === 'search' && (
          <div className="flex-1 w-full h-full min-h-0 overflow-y-auto overscroll-contain touch-pan-y animate-fade-in pr-1">
            <MusicSearchModal
              inline={true}
              queue={queue}
              currentTrack={currentTrack}
            />
          </div>
        )}
      </main>

      {/* 3. Bottom Master Playback Dock */}
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

      {/* 4. Sleek Mobile Bottom Tab Bar */}
      <nav className="md:hidden shrink-0 z-50 h-[calc(56px+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] bg-dark-950/98 backdrop-blur-2xl border-t border-white/10 px-6 flex items-center justify-around shadow-[0_-10px_35px_rgba(0,0,0,0.85)] select-none">
        {/* Tab 1: Player & Queue */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('player');
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition-all active:scale-90 cursor-pointer ${
            activeTab === 'player' || activeTab === 'queue'
              ? 'text-cyan-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`relative p-1 rounded-full ${(activeTab === 'player' || activeTab === 'queue') ? 'bg-cyan-500/15 shadow-[0_0_10px_rgba(0,240,255,0.35)]' : ''}`}>
            <Disc3 className={`w-5 h-5 ${(activeTab === 'player' || activeTab === 'queue') && isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
            {queue.length > 0 && (
              <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full bg-cyan-400 text-black font-mono font-black text-[9px] shadow-sm">
                {queue.length}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">Up Next</span>
        </button>

        {/* Tab 2: Search / Library */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('search');
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition-all active:scale-90 cursor-pointer ${
            activeTab === 'search'
              ? 'text-cyan-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-full ${activeTab === 'search' ? 'bg-cyan-500/15 shadow-[0_0_10px_rgba(0,240,255,0.35)]' : ''}`}>
            <Search className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">Search & Library</span>
        </button>
      </nav>

      {/* 5. Fallback Modal if opened standalone */}
      {isSearchOpen && (
        <MusicSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          queue={queue}
          currentTrack={currentTrack}
        />
      )}



      {/* 6. Playback History Modal */}
      <PlaybackHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        queue={queue}
        currentTrack={currentTrack}
      />

      {/* 7. Kicked From Room Notice Popup Modal */}
      {kickedPopupModal}
    </div>
  );
}

export default App;
