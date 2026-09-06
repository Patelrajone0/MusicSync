import React, { useState, useEffect } from 'react';
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
import { PlayerControls } from './components/PlayerControls';
import { QueueList } from './components/QueueList';
import { LiveChatAndReactions } from './components/LiveChatAndReactions';
import { MusicSearchModal } from './components/MusicSearchModal';
import { PlaybackHistoryModal } from './components/PlaybackHistoryModal';
import { Logo } from './components/Logo';
import { Volume2, Radio, Disc, Sparkles, Layers, Plus, History, MessageSquare, Music2 } from 'lucide-react';

import { userTasteEngine } from './services/userTaste';

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

  // Auto-reconnect state on page refresh
  const [isReconnecting, setIsReconnecting] = useState<boolean>(() => {
    const urlRoom = new URLSearchParams(window.location.search).get('room');
    const session = getStoredSession();
    return Boolean(urlRoom || (session && session.roomCode));
  });

  // Query parameter support (?room=CODE)
  const [initialRoomCode, setInitialRoomCode] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    if (code) {
      setInitialRoomCode(code.toUpperCase());
    }
  }, []);

  // Listen to sync engine telemetry stats
  useEffect(() => {
    const unsub = syncEngine.onStatsChange((stats) => {
      setSyncStats(stats);
    });
    return unsub;
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
          socket.emit('request_pause');
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
    socket.disconnect();
    socket.connect();

    const cleanUrl = window.location.pathname;
    window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
  };

  // Socket.io Real-Time Room Event Listeners
  useEffect(() => {
    if (!roomCode) return;

    const handleRoomUsersUpdated = (data: { users: User[]; hostId?: string }) => {
      setUsers(data.users);
      if (data.hostId) setHostId(data.hostId);

      // Update current user's role if modified
      const updatedSelf = data.users.find((u) => u.id === socket.id || (currentUser && u.id === currentUser.id));
      if (updatedSelf) setCurrentUser(updatedSelf);
    };

    const handleQueueUpdated = (data: { queue: Track[] }) => {
      setQueue(data.queue);
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
      setMasterVolumeNotice(data);
      setTimeout(() => {
        setMasterVolumeNotice((prev) => (prev?.volume === data.volume ? null : prev));
      }, 3500);
    };

    const handleKickedFromRoom = (data: { reason?: string }) => {
      alert(data?.reason || 'You were removed from the room by the host.');
      handleLeaveRoom();
    };

    socket.on('room_users_updated', handleRoomUsersUpdated);
    socket.on('queue_updated', handleQueueUpdated);
    socket.on('playback_scheduled', handlePlaybackScheduled);
    socket.on('playback_paused', handlePlaybackPaused);
    socket.on('playback_seeked', handlePlaybackSeeked);
    socket.on('new_chat_message', handleNewChatMessage);
    socket.on('master_volume_updated', handleMasterVolumeUpdated);
    socket.on('kicked_from_room', handleKickedFromRoom);

    return () => {
      socket.off('room_users_updated', handleRoomUsersUpdated);
      socket.off('queue_updated', handleQueueUpdated);
      socket.off('playback_scheduled', handlePlaybackScheduled);
      socket.off('playback_paused', handlePlaybackPaused);
      socket.off('playback_seeked', handlePlaybackSeeked);
      socket.off('new_chat_message', handleNewChatMessage);
      socket.off('master_volume_updated', handleMasterVolumeUpdated);
      socket.off('kicked_from_room', handleKickedFromRoom);
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
    setIsAudioUnlocked(true);

    // Save session and persistent user name in localStorage forever!
    saveStoredSession({
      roomCode: room.code,
      userName: user.name,
      userRole: user.role,
      avatarColor: user.avatarColor,
    });
    saveStoredUserName(user.name);

    // Update browser URL query without reload
    const newUrl = `${window.location.pathname}?room=${room.code}`;
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
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-4 select-none">
        <div className="flex flex-col items-center gap-5 text-center max-w-sm">
          <Logo size="lg" layout="vertical" showText={false} />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white tracking-tight">Reloading Please wait...</h3>
            <p className="text-xs text-slate-400">Restoring your synchronized room session</p>
          </div>
          <div className="w-5 h-5 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin mt-1"></div>
        </div>
      </div>
    );
  }

  // If user has not joined a room yet, display the sleek Lobby
  if (!roomCode) {
    return <Lobby onRoomReady={handleRoomReady} initialRoomCode={initialRoomCode} />;
  }

  const isPlaying = playbackState.status === 'playing';
  const myRole: UserRole = currentUser?.role || 'listener';

  const handleOpenSearch = () => {
    const el = document.getElementById('universal-music-library');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      const input = el.querySelector('input');
      if (input) {
        input.focus();
      }
    } else {
      setIsSearchOpen(true);
    }
  };

  return (
    <div
      onClick={() => {
        if (!isAudioUnlocked) handleUnlockAudio();
      }}
      className="min-h-screen bg-dark-950 text-slate-100 flex flex-col relative pb-36 sm:pb-32 w-full max-w-full overflow-x-hidden"
    >
      {/* 1. Sticky Room Navigation Header */}
      <RoomHeader
        roomCode={roomCode}
        users={users}
        currentUser={currentUser}
        hostId={hostId}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onLeaveRoom={handleLeaveRoom}
        masterVolume={masterVolume}
      />

      {/* 2. Main Synchronized Party Content */}
      <main className="max-w-6xl mx-auto w-full px-3 py-3 sm:px-4 sm:py-5 flex-1 flex flex-col gap-3.5 sm:gap-5">
        {/* Action Toolbar: Music Picker & Utility Options */}
        <div className="flex items-center justify-between gap-2 bg-dark-900/40 border border-white/5 p-1.5 sm:p-2 rounded-2xl">
          {/* Quick Primary Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleOpenSearch}
              className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-3.5 rounded-xl bg-cyan-400 hover:bg-white text-black font-semibold text-xs transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Select Music</span>
            </button>

            <button
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 rounded-xl bg-dark-800 hover:bg-dark-750 border border-white/5 text-slate-300 hover:text-white text-xs font-medium transition-colors"
            >
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span>History</span>
            </button>
          </div>

          {/* Toggle Chat Button */}
          <button
            onClick={() => setIsChatVisible(!isChatVisible)}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3 rounded-xl text-xs font-medium border transition-all ${
              isChatVisible
                ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                : 'bg-dark-800 hover:bg-dark-750 border-white/5 text-slate-400 hover:text-white'
            }`}
            title={isChatVisible ? 'Hide chat to maximize music space' : 'Open live room chat'}
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isChatVisible ? 'Hide Chat' : 'Chat'}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-dark-900 text-[10px] font-mono text-slate-300 border border-white/5">
              {chatMessages.length}
            </span>
          </button>
        </div>

        {/* Section 1: Clean Now Playing + Optional Compact Chat */}
        <section className={`grid grid-cols-1 ${isChatVisible ? 'lg:grid-cols-12' : ''} gap-3.5 sm:gap-5 items-start`}>
          {/* Compact Now Playing Card */}
          <div className={`${isChatVisible ? 'lg:col-span-7' : 'w-full'} bg-dark-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 sm:p-4 md:p-5 relative flex flex-col justify-between shadow-xl`}>
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isPlaying ? 'bg-cyan-400' : 'bg-slate-500'
                  }`}
                />
                <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  {isPlaying ? 'Synced Broadcast' : 'Playback Paused'}
                </span>
              </div>

              <button
                onClick={handleOpenSearch}
                className="text-xs text-cyan-400 hover:text-white font-medium transition-colors flex items-center gap-1"
              >
                <span>Browse Songs</span>
                <span>→</span>
              </button>
            </div>

            {/* Track Metadata */}
            {currentTrack ? (
              <div className="flex items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                  <img
                    src={currentTrack.artwork || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=160'}
                    alt={currentTrack.title}
                    className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl object-cover border border-white/10 shadow-md shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                      Now Playing
                    </span>
                    <h2 className="text-sm sm:text-base md:text-lg font-bold text-white truncate tracking-tight">
                      {currentTrack.title}
                    </h2>
                    <p className="text-xs md:text-sm text-slate-300 truncate mt-0.5">{currentTrack.artist}</p>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-dark-800 border border-white/5 text-slate-400 font-mono">
                        {currentTrack.genre || 'Music'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Added by {currentTrack.addedBy || 'Host'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-dark-950/50 border border-dashed border-white/10 text-center sm:text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center text-slate-400 border border-white/5 shrink-0">
                    <Music2 className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-semibold text-white">No track currently playing</p>
                    <p className="text-[11px] text-slate-400">Pick a song to play across all synced speakers</p>
                  </div>
                </div>
                <button
                  onClick={handleOpenSearch}
                  className="px-3 py-1.5 rounded-xl bg-cyan-400 hover:bg-white text-black text-xs font-semibold transition-all shadow-sm shrink-0 active:scale-95"
                >
                  Pick a Track
                </button>
              </div>
            )}
          </div>

          {/* Compact Live Chat (Rendered when toggled open) */}
          {isChatVisible && (
            <div className="lg:col-span-5 flex flex-col">
              <LiveChatAndReactions
                messages={chatMessages}
                currentUser={currentUser}
                onHide={() => setIsChatVisible(false)}
              />
            </div>
          )}
        </section>

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
    </div>
  );
}

export default App;
