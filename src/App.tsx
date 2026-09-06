import React, { useState, useEffect } from 'react';
import { socket } from './services/socket';
import { syncEngine } from './services/syncEngine';
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
import { AudioVisualizer } from './components/AudioVisualizer';
import { PlayerControls } from './components/PlayerControls';
import { QueueList } from './components/QueueList';
import { LiveChatAndReactions } from './components/LiveChatAndReactions';
import { MusicSearchModal } from './components/MusicSearchModal';
import { SyncDiagnosticsModal } from './components/SyncDiagnosticsModal';
import { PlaybackHistoryModal } from './components/PlaybackHistoryModal';
import { Volume2, Radio, Disc, Sparkles, Layers, ShieldCheck } from 'lucide-react';

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
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

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

  // Socket.io Real-Time Room Event Listeners
  useEffect(() => {
    if (!roomCode) return;

    const handleRoomUsersUpdated = (data: { users: User[]; hostId?: string }) => {
      setUsers(data.users);
      if (data.hostId) setHostId(data.hostId);

      // Update current user's role if modified
      if (currentUser) {
        const updatedSelf = data.users.find((u) => u.id === socket.id);
        if (updatedSelf) setCurrentUser(updatedSelf);
      }
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

    socket.on('room_users_updated', handleRoomUsersUpdated);
    socket.on('queue_updated', handleQueueUpdated);
    socket.on('playback_scheduled', handlePlaybackScheduled);
    socket.on('playback_paused', handlePlaybackPaused);
    socket.on('playback_seeked', handlePlaybackSeeked);
    socket.on('new_chat_message', handleNewChatMessage);
    socket.on('master_volume_updated', handleMasterVolumeUpdated);

    return () => {
      socket.off('room_users_updated', handleRoomUsersUpdated);
      socket.off('queue_updated', handleQueueUpdated);
      socket.off('playback_scheduled', handlePlaybackScheduled);
      socket.off('playback_paused', handlePlaybackPaused);
      socket.off('playback_seeked', handlePlaybackSeeked);
      socket.off('new_chat_message', handleNewChatMessage);
      socket.off('master_volume_updated', handleMasterVolumeUpdated);
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
    socket.disconnect();
    socket.connect();

    const cleanUrl = window.location.pathname;
    window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
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

  // Reconnecting splash screen during page refresh
  if (isReconnecting) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-electric-cyan to-electric-purple flex items-center justify-center font-black text-black text-2xl shadow-xl animate-pulse">
            MS
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Reconnecting to Party...</h3>
            <p className="text-xs text-slate-400">Restoring your synchronized room session</p>
          </div>
          <div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin"></div>
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

  return (
    <div
      onClick={() => {
        if (!isAudioUnlocked) handleUnlockAudio();
      }}
      className="min-h-screen bg-dark-950 text-slate-100 flex flex-col relative pb-32"
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
      <main className="max-w-6xl mx-auto w-full px-4 py-6 flex-1 flex flex-col gap-6">
        {/* Hero Section: Currently Playing + Beat-Responsive Visualizer */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Visualizer & Now Playing Display (7 Cols) */}
          <div className="lg:col-span-7 bg-dark-900/70 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between shadow-2xl min-h-[320px]">
            {/* Embedded Beat-Responsive Audio Visualizer Canvas */}
            <div className="absolute inset-0 opacity-85 pointer-events-auto">
              <AudioVisualizer isPlaying={isPlaying} className="w-full h-full" />
            </div>

            {/* Subtle Gradient Overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-dark-950/95 via-dark-950/40 to-transparent pointer-events-none" />

            {/* Top Status Bar over Visualizer */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-dark-950/80 backdrop-blur-md border border-white/10 text-xs font-mono">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isPlaying ? 'bg-electric-cyan animate-pulse' : 'bg-slate-500'
                  }`}
                />
                <span className="text-slate-300 uppercase tracking-wider text-[10px]">
                  {isPlaying ? 'Synced Speaker Broadcast' : 'Paused'}
                </span>
              </div>

              <button
                onClick={() => setIsDiagnosticsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-dark-950/80 backdrop-blur-md border border-white/10 text-xs font-mono text-slate-300 hover:text-white transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-electric-cyan" />
                <span>Zero Latency</span>
              </button>
            </div>

            {/* Bottom Current Track Metadata */}
            <div className="relative z-10 pt-16">
              {currentTrack ? (
                <div className="flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-[11px] font-mono uppercase tracking-widest text-electric-cyan font-bold">
                      Now Playing
                    </span>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-white truncate tracking-tight">
                      {currentTrack.title}
                    </h2>
                    <p className="text-sm text-slate-300 truncate mt-0.5">{currentTrack.artist}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-dark-800/80 border border-white/10 text-slate-400 font-mono">
                        {currentTrack.genre || 'Electronic'}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        Added by {currentTrack.addedBy || 'Host'}
                      </span>
                    </div>
                  </div>

                  {/* Album Artwork Preview */}
                  <img
                    src={currentTrack.artwork || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=160'}
                    alt={currentTrack.title}
                    className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover border border-white/20 shadow-2xl shrink-0"
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-400">Nothing currently playing.</p>
                  <button
                    onClick={() => setIsSearchOpen(true)}
                    className="mt-2 text-xs text-electric-cyan hover:underline font-semibold"
                  >
                    Select a song from the library to kick off the party →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Collaborative Live Chat & Floating Reaction Panel (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <LiveChatAndReactions messages={chatMessages} currentUser={currentUser} />
          </div>
        </section>

        {/* Section 2: Democratic Collaborative Queue */}
        <section className="flex-1">
          <QueueList
            queue={queue}
            currentTrack={currentTrack}
            userRole={myRole}
            currentUserId={currentUser?.id}
            onOpenSearch={() => setIsSearchOpen(true)}
          />
        </section>
      </main>

      {/* 3. Bottom Master Playback Dock */}
      <PlayerControls
        currentTrack={currentTrack}
        playbackState={playbackState}
        userRole={myRole}
        syncStats={syncStats}
        isAudioUnlocked={isAudioUnlocked}
        onUnlockAudio={handleUnlockAudio}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        masterVolume={masterVolume}
        masterVolumeNotice={masterVolumeNotice}
      />

      {/* 4. Universal Music Library Search Modal */}
      <MusicSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* 5. NTP Telemetry & Sync Diagnostics Modal */}
      <SyncDiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        syncStats={syncStats}
      />

      {/* 6. Playback History Modal */}
      <PlaybackHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
}

export default App;
