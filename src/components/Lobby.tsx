import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Wifi,
  Globe,
  Sparkles,
  Plus,
  LogIn,
} from 'lucide-react';
import { RoomState, User } from '../types';
import { socket } from '../services/socket';
import { syncEngine } from '../services/syncEngine';
import { Logo } from './Logo';
import { getDeviceId } from '../utils/deviceId';
import { NetworkMode } from './NetworkModeModal';

interface LobbyProps {
  onRoomReady: (room: RoomState, user: User) => void;
  initialRoomCode?: string;
}

const USER_NAME_STORAGE_KEY = 'musicsync_user_name';

export const Lobby: React.FC<LobbyProps> = ({ onRoomReady, initialRoomCode = '' }) => {
  // Mode: 'create' | 'join'
  const [activeTab, setActiveTab] = useState<'create' | 'join'>(initialRoomCode ? 'join' : 'create');

  const [userName, setUserName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(USER_NAME_STORAGE_KEY);
      if (saved && saved.trim()) return saved.trim();
    } catch (e) {}
    return '';
  });

  const [roomCodeInput, setRoomCodeInput] = useState<string>(initialRoomCode);
  const [networkMode, setNetworkMode] = useState<NetworkMode>(() => {
    try {
      return (localStorage.getItem('musicsync_network_mode') as NetworkMode) || 'local';
    } catch {
      return 'local';
    }
  });

  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleNetworkModeChange = (mode: NetworkMode) => {
    setNetworkMode(mode);
    try {
      localStorage.setItem('musicsync_network_mode', mode);
    } catch {}
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(USER_NAME_STORAGE_KEY);
      if (saved && saved.trim()) {
        setUserName(saved.trim());
      }
    } catch (e) {}

    if (initialRoomCode) {
      setRoomCodeInput(initialRoomCode.replace(/\D/g, ''));
      setActiveTab('join');
    }
  }, [initialRoomCode]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUserName(val);
    try {
      localStorage.setItem(USER_NAME_STORAGE_KEY, val.trim());
    } catch (e) {}
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleCreateRoom = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsCreating(true);
    setErrorMessage('');

    syncEngine.unlockAudio().catch(() => {});

    const doCreate = () => {
      const timeoutId = setTimeout(() => {
        setIsCreating(false);
        setErrorMessage('Connection taking longer than expected. Please check your internet or retry.');
      }, 12000);

      socket.emit('create_room', { userName, deviceId: getDeviceId(), networkMode }, (res: any) => {
        clearTimeout(timeoutId);
        if (res && res.success && res.room && res.user) {
          setIsEntering(true);
          setTimeout(() => {
            setIsCreating(false);
            onRoomReady(res.room, res.user);
          }, 450);
        } else {
          setIsCreating(false);
          setErrorMessage(res?.error || 'Failed to create room. Please try again.');
        }
      });
    };

    if (socket.connected) {
      doCreate();
    } else {
      socket.connect();
      const waitingTimer = setTimeout(() => {
        setErrorMessage('Connecting to live server...');
      }, 1500);

      const connectTimeout = setTimeout(() => {
        socket.off('connect', onConnect);
        socket.off('connect_error', onErr);
        clearTimeout(waitingTimer);
        setIsCreating(false);
        setErrorMessage('Could not connect to the server. Please verify your connection or check if backend is running.');
      }, 12000);

      const onConnect = () => {
        clearTimeout(waitingTimer);
        clearTimeout(connectTimeout);
        socket.off('connect_error', onErr);
        setErrorMessage('');
        doCreate();
      };

      const onErr = (err: any) => {
        console.warn('Socket connect error:', err);
      };

      socket.once('connect', onConnect);
      socket.once('connect_error', onErr);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = roomCodeInput.trim().replace(/\D/g, '');
    if (!code) {
      setErrorMessage('Please enter a 6-digit room code.');
      return;
    }

    setIsJoining(true);
    setErrorMessage('');

    syncEngine.unlockAudio().catch(() => {});

    const doJoin = () => {
      const timeoutId = setTimeout(() => {
        setIsJoining(false);
        setErrorMessage('Connection timed out. Check the code and try again.');
      }, 12000);

      socket.emit('join_room', { roomCode: code, userName, deviceId: getDeviceId() }, (res: any) => {
        clearTimeout(timeoutId);
        if (res && res.success && res.room && res.user) {
          setIsEntering(true);
          setTimeout(() => {
            setIsJoining(false);
            onRoomReady(res.room, res.user);
          }, 450);
        } else {
          setIsJoining(false);
          setErrorMessage(res?.error || 'Room not found. Check code and try again.');
        }
      });
    };

    if (socket.connected) {
      doJoin();
    } else {
      socket.connect();
      const waitingTimer = setTimeout(() => {
        setErrorMessage('Connecting to live server...');
      }, 1500);

      const connectTimeout = setTimeout(() => {
        socket.off('connect', onConnect);
        socket.off('connect_error', onErr);
        clearTimeout(waitingTimer);
        setIsJoining(false);
        setErrorMessage('Could not connect to the server. Please verify your connection or check if backend is running.');
      }, 12000);

      const onConnect = () => {
        clearTimeout(waitingTimer);
        clearTimeout(connectTimeout);
        socket.off('connect_error', onErr);
        setErrorMessage('');
        doJoin();
      };

      const onErr = (err: any) => {
        console.warn('Socket join connect error:', err);
      };

      socket.once('connect', onConnect);
      socket.once('connect_error', onErr);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans select-none antialiased">
      {/* Subtle, dark, atmospheric ambient vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-15%,rgba(120,119,198,0.07),rgba(0,0,0,0))] pointer-events-none" />

      {/* Main Container */}
      <div
        className="max-w-[420px] w-full z-10 transition-all duration-300 relative my-auto"
        style={isEntering ? { animation: 'cyberBlurWarp 0.45s cubic-bezier(0.4, 0, 0.2, 1) forwards' } : {}}
      >
        {/* Brand Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handleRefresh();
            }}
            title="Refresh MusicSync"
            className="inline-flex flex-col items-center group cursor-pointer focus:outline-none transition-transform active:scale-98"
          >
            <Logo size="lg" layout="vertical" variant="titanium" showTagline={false} />
          </a>
        </div>

        {/* Modern Classic Dark Card */}
        <div className="bg-[#111115]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
          
          {/* Segmented Tab: [ Create Room ]  [ Join Room ] */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-900/80 border border-white/[0.06] text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setActiveTab('create');
                setErrorMessage('');
              }}
              className={`py-2 rounded-lg transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-zinc-800 text-white font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Room</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('join');
                setErrorMessage('');
              }}
              className={`py-2 rounded-lg transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'join'
                  ? 'bg-zinc-800 text-white font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Join Room</span>
            </button>
          </div>

          {/* TAB 1: CREATE ROOM */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateRoom} className="space-y-4 animate-fade-in">
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 block font-mono">
                  Your Display Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={userName}
                    onChange={handleNameChange}
                    placeholder="e.g. Host, Laptop, Raj"
                    maxLength={24}
                    className="w-full bg-zinc-900/60 border border-white/[0.08] hover:border-white/[0.16] focus:border-zinc-500 focus:bg-zinc-900/90 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Network Mode Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                  <span className="uppercase tracking-wider font-medium">Network Scope</span>
                  <span className="text-zinc-400 text-[10px]">
                    {networkMode === 'local' ? 'LAN Mesh' : 'Worldwide Cloud'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Local Wi-Fi */}
                  <button
                    type="button"
                    onClick={() => handleNetworkModeChange('local')}
                    className={`p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                      networkMode === 'local'
                        ? 'bg-zinc-800/90 border-zinc-500/60 text-white shadow-sm ring-1 ring-zinc-500/30'
                        : 'bg-zinc-900/40 border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:border-white/[0.12]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-100">
                        <Wifi className="w-3.5 h-3.5 text-zinc-300" />
                        <span>Local Wi-Fi</span>
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-700/60 text-zinc-300 font-bold">
                        0ms
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight">
                      Same Wi-Fi or hotspot only.
                    </p>
                  </button>

                  {/* Online Cloud */}
                  <button
                    type="button"
                    onClick={() => handleNetworkModeChange('online')}
                    className={`p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                      networkMode === 'online'
                        ? 'bg-zinc-800/90 border-zinc-500/60 text-white shadow-sm ring-1 ring-zinc-500/30'
                        : 'bg-zinc-900/40 border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:border-white/[0.12]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-100">
                        <Globe className="w-3.5 h-3.5 text-zinc-300" />
                        <span>Online Cloud</span>
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-700/60 text-zinc-300 font-bold">
                        Public
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight">
                      Any cellular or internet network.
                    </p>
                  </button>
                </div>
              </div>

              {/* Primary Action Button */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isCreating || isEntering}
                  className="w-full py-3 px-4 rounded-xl bg-zinc-100 hover:bg-white active:bg-zinc-200 text-zinc-950 font-semibold text-sm transition-all duration-150 shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 select-none active:scale-[0.99]"
                >
                  {isCreating || isEntering ? (
                    <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-zinc-900" />
                  )}
                  <span>
                    {isEntering
                      ? 'Opening Room...'
                      : isCreating
                      ? 'Creating Room...'
                      : `Create ${networkMode === 'local' ? 'Local' : 'Cloud'} Room`}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: JOIN ROOM */}
          {activeTab === 'join' && (
            <form onSubmit={handleJoinRoom} className="space-y-4 animate-fade-in">
              {/* Optional Name for joining */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 block font-mono">
                  Your Display Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={handleNameChange}
                  placeholder="e.g. Listener, Phone"
                  maxLength={24}
                  className="w-full bg-zinc-900/60 border border-white/[0.08] hover:border-white/[0.16] focus:border-zinc-500 focus:bg-zinc-900/90 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-all"
                />
              </div>

              {/* Room Code */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 block font-mono">
                  Room Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit code"
                  maxLength={6}
                  disabled={isEntering}
                  autoFocus={activeTab === 'join'}
                  className="w-full bg-zinc-900/60 border border-white/[0.08] hover:border-white/[0.16] focus:border-zinc-500 focus:bg-zinc-900/90 rounded-xl px-4 py-3 text-center font-mono text-base tracking-[0.25em] text-zinc-100 placeholder:text-zinc-600 placeholder:tracking-normal outline-none transition-all"
                />
              </div>

              {/* Join Action Button */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={!roomCodeInput.trim() || isJoining || isEntering}
                  className="w-full py-3 px-4 rounded-xl bg-zinc-100 hover:bg-white active:bg-zinc-200 text-zinc-950 font-semibold text-sm transition-all duration-150 shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-[0.99]"
                >
                  {isJoining || isEntering ? (
                    <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-zinc-900" />
                  )}
                  <span>{isEntering ? 'Connecting...' : 'Join Room'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/20 text-red-300 text-xs text-center">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Minimal Footer Note */}
        <p className="text-[11px] text-zinc-500 text-center mt-4">
          No account required · Instant peer-to-peer sync
        </p>
      </div>

      {/* Subtle Fade on Entry */}
      {isEntering && (
        <div className="fixed inset-0 z-40 pointer-events-none bg-black/40 backdrop-blur-sm animate-fade-in" />
      )}
    </div>
  );
};
