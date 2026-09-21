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
import { NetworkMode } from './components/NetworkModeModal';
import { PlaybackHistoryModal } from './components/PlaybackHistoryModal';
import { BeatsyncProView } from './components/BeatsyncProView';
import { InstallPwaPrompt } from './components/InstallPwaPrompt';
import { UserX } from 'lucide-react';

import { userTasteEngine } from './services/userTaste';
import { getDeviceId } from './utils/deviceId';
import { triggerMonetagAds, ADS_ENABLED } from './services/adManager';
import { analytics } from './services/analytics';
import { LoadingScreen } from './components/LoadingScreen';
import { RoomCreationLoadingDemo } from './components/RoomCreationLoading';
import { TitaniumHeaderShowcase } from './components/TitaniumHeaderShowcase';
import { TitaniumSidebarShowcase } from './components/TitaniumSidebarShowcase';

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
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [kickedNotice, setKickedNotice] = useState<string | null>(null);

  // Auto-reconnect & page refresh loading screen state (guarantees at least 1 full animation cycle)
  const [showLoadingScreen, setShowLoadingScreen] = useState<boolean>(() => {
    const urlRoom = new URLSearchParams(window.location.search).get('room');
    const session = getStoredSession();
    const hasRoom = Boolean(urlRoom || (session && session.roomCode));

    // Detect if this page load is a browser refresh / reload
    const isReload = (() => {
      try {
        const navEntries = performance.getEntriesByType('navigation');
        if (navEntries.length > 0) {
          return (navEntries[0] as PerformanceNavigationTiming).type === 'reload';
        }
        return (performance as any).navigation?.type === 1;
      } catch {
        return false;
      }
    })();

    return hasRoom || isReload;
  });

  const [isRejoinReady, setIsRejoinReady] = useState<boolean>(() => {
    const urlRoom = new URLSearchParams(window.location.search).get('room');
    const session = getStoredSession();
    const hasRoom = Boolean(urlRoom || (session && session.roomCode));
    return !hasRoom; // Already ready if no room to rejoin
  });

  const [isPreviewLoadingOpen, setIsPreviewLoadingOpen] = useState<boolean>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const preview = urlParams.get('preview');
      return preview === 'loading' || preview === 'true';
    } catch {
      return false;
    }
  });

  const [isDemoLoadingOpen, setIsDemoLoadingOpen] = useState<boolean>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const demo = urlParams.get('demo');
      return demo === 'create' || demo === 'calibration' || demo === 'enter' || demo === 'true';
    } catch {
      return false;
    }
  });

  const [isHeaderDemoOpen, setIsHeaderDemoOpen] = useState<boolean>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const demo = urlParams.get('demo');
      const preview = urlParams.get('preview');
      return demo === 'header' || preview === 'header';
    } catch {
      return false;
    }
  });

  const [isSidebarDemoOpen, setIsSidebarDemoOpen] = useState<boolean>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const demo = urlParams.get('demo');
      const preview = urlParams.get('preview');
      return demo === 'sidebar' || preview === 'sidebar';
    } catch {
      return false;
    }
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

  // Ad Timing Controller (Master controlled via ADS_ENABLED in adManager.ts)
  useEffect(() => {
    if (!ADS_ENABLED) return;
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

    // Track analytics event for room session
    if (user.role === 'host') {
      analytics.trackRoomCreated(room.code, room.networkMode);
    } else {
      analytics.trackRoomJoined(room.code, user.role);
    }
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
      setIsRejoinReady(true);
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

          setIsRejoinReady(true);
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
        setIsRejoinReady(true);
      }
    }, 4500);

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

  // Lock window scroll strictly at (0, 0) to prevent browser from shifting layout
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    const resetScroll = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
    };
    resetScroll();
    window.addEventListener('scroll', resetScroll, { passive: true });
    window.addEventListener('resize', resetScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', resetScroll);
      window.removeEventListener('resize', resetScroll);
    };
  }, [roomCode]);

  // If user requested live interactive demo of Titanium Header options:
  if (isHeaderDemoOpen) {
    return (
      <TitaniumHeaderShowcase
        onClose={() => {
          setIsHeaderDemoOpen(false);
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('demo');
            url.searchParams.delete('preview');
            window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
          } catch {}
        }}
      />
    );
  }

  // If user requested live interactive demo of Titanium Sidebar options:
  if (isSidebarDemoOpen) {
    return (
      <TitaniumSidebarShowcase
        onClose={() => {
          setIsSidebarDemoOpen(false);
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('demo');
            url.searchParams.delete('preview');
            window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
          } catch {}
        }}
      />
    );
  }

  // If user requested live interactive demo of room creation calibration:
  if (isDemoLoadingOpen) {
    return (
      <RoomCreationLoadingDemo
        onClose={() => {
          setIsDemoLoadingOpen(false);
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('demo');
            window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
          } catch {}
        }}
      />
    );
  }

  // If user requested live preview of loading screen:
  if (isPreviewLoadingOpen) {
    return (
      <LoadingScreen
        isPreview
        onClose={() => {
          setIsPreviewLoadingOpen(false);
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('preview');
            window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
          } catch {}
        }}
      />
    );
  }

  // Reconnecting / page refresh loading screen (completes at least 1 full animation cycle)
  if (showLoadingScreen) {
    return (
      <LoadingScreen
        isReady={isRejoinReady}
        onComplete={() => setShowLoadingScreen(false)}
      />
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
        <Lobby
          onRoomReady={handleRoomReady}
          initialRoomCode={initialRoomCode}
        />
        {kickedPopupModal}
        <InstallPwaPrompt />
      </>
    );
  }

  return (
    <div
      onClick={() => {
        if (!isAudioUnlocked) handleUnlockAudio();
      }}
      onTouchStart={() => {
        if (!isAudioUnlocked) handleUnlockAudio();
      }}
      className="fixed inset-0 w-full h-full min-h-screen overflow-hidden bg-dark-950 text-slate-100 flex flex-col font-sans select-none pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]"
    >
      <BeatsyncProView
        roomCode={roomCode}
        users={users}
        currentUser={currentUser}
        hostId={hostId}
        currentTrack={currentTrack}
        playbackState={playbackState}
        queue={queue}
        syncStats={syncStats}
        isAudioUnlocked={isAudioUnlocked}
        onUnlockAudio={handleUnlockAudio}
        onLeaveRoom={handleLeaveRoom}
        masterVolume={masterVolume}
        networkMode={networkMode}
      />

      {/* Playback History Modal */}
      <PlaybackHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        queue={queue}
        currentTrack={currentTrack}
      />

      {/* Kicked Notice */}
      {kickedPopupModal}

      {/* Progressive Web App Install Modal */}
      <InstallPwaPrompt />
    </div>
  );
}

export default App;
