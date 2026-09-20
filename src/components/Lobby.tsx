import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  User as UserIcon,
  Wifi,
  Globe,
  Radio,
  Sparkles,
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
  const [userName, setUserName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(USER_NAME_STORAGE_KEY);
      if (saved && saved.trim()) return saved.trim();
    } catch (e) {}
    return '';
  });
  const [roomCodeInput, setRoomCodeInput] = useState<string>(initialRoomCode);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [networkMode, setNetworkMode] = useState<NetworkMode>(() => {
    try {
      return (localStorage.getItem('musicsync_network_mode') as NetworkMode) || 'local';
    } catch {
      return 'local';
    }
  });

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

  const handleCreateRoom = async () => {
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
          }, 520);
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
    if (!code) return;

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
          }, 520);
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
    <div className="min-h-screen bg-dark-950 text-slate-200 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans select-none">
      {/* Soft, elegant ambient background glow matching the in-room studio page */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-electric-cyan/[0.07] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-electric-purple/[0.07] rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div
        className="max-w-md w-full z-10 transition-all duration-300 relative my-auto"
        style={isEntering ? { animation: 'cyberBlurWarp 0.52s cubic-bezier(0.4, 0, 0.2, 1) forwards' } : {}}
      >
        {/* Brand Header */}
        <div className="text-center mb-5">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handleRefresh();
            }}
            title="Refresh MusicSync"
            className="inline-flex flex-col items-center group cursor-pointer focus:outline-none transition-transform active:scale-95 mb-1.5"
          >
            <Logo size="lg" layout="vertical" showTagline={true} />
          </a>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-sm mx-auto px-2 leading-relaxed">
            Zero-latency synchronized music streaming across all your phones and laptops.
          </p>
        </div>

        {/* Minimal, Simple & Classic Card */}
        <div className="relative bg-dark-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_20px_rgba(0,240,255,0.04)] space-y-5 overflow-hidden">
          {/* Subtle Cyan Top Hairline */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent pointer-events-none" />

          {/* 1. Username Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>Username</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">Anonymous access</span>
            </div>

            <div className="relative w-full">
              <input
                type="text"
                value={userName}
                onChange={handleNameChange}
                placeholder="Enter your name"
                maxLength={24}
                className="w-full bg-dark-950/80 border border-white/10 hover:border-white/20 focus:border-cyan-400/80 focus:ring-1 focus:ring-cyan-400/30 rounded-2xl px-4 py-2.5 sm:py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* 2. Room Network Mode */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
              <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span>Network Mode</span>
              </span>
              <span className="text-[10px] text-cyan-400/90 font-medium">
                {networkMode === 'local' ? 'Private · Wi-Fi Only' : 'Public · Open Worldwide'}
              </span>
            </div>

            {/* Clean 2-Card Mode Selector */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Local Wi-Fi */}
              <button
                type="button"
                onClick={() => handleNetworkModeChange('local')}
                className={`p-3 rounded-2xl border text-left transition-all duration-150 cursor-pointer ${
                  networkMode === 'local'
                    ? 'bg-cyan-950/40 border-cyan-400/60 text-white shadow-[0_0_15px_rgba(0,240,255,0.12)] ring-1 ring-cyan-400/40'
                    : 'bg-dark-950/50 hover:bg-dark-950/80 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white">
                    <Wifi className={`w-3.5 h-3.5 ${networkMode === 'local' ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span>Local Wi-Fi</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-cyan-400/10 text-cyan-300 font-bold">
                    0ms
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Same Wi-Fi or hotspot. Zero delay.
                </p>
              </button>

              {/* Online Cloud */}
              <button
                type="button"
                onClick={() => handleNetworkModeChange('online')}
                className={`p-3 rounded-2xl border text-left transition-all duration-150 cursor-pointer ${
                  networkMode === 'online'
                    ? 'bg-cyan-950/40 border-cyan-400/60 text-white shadow-[0_0_15px_rgba(0,240,255,0.12)] ring-1 ring-cyan-400/40'
                    : 'bg-dark-950/50 hover:bg-dark-950/80 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white">
                    <Globe className={`w-3.5 h-3.5 ${networkMode === 'online' ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span>Online Cloud</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-cyan-400/10 text-cyan-300 font-bold">
                    Public
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Join via cellular (4G/5G) or any network.
                </p>
              </button>
            </div>
          </div>

          {/* 3. Create Room Button */}
          <div>
            <button
              type="button"
              onClick={handleCreateRoom}
              disabled={isCreating || isJoining || isEntering}
              className="w-full py-3 sm:py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-300 hover:brightness-105 active:scale-[0.99] text-black font-bold text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(0,240,255,0.35)] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 select-none"
            >
              {isCreating || isEntering ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 fill-current text-black shrink-0" />
              )}
              <span className="truncate">
                {isEntering
                  ? 'Entering Room...'
                  : isCreating
                  ? 'Creating Room...'
                  : `Create ${networkMode === 'local' ? 'Private' : 'Public'} Room`}
              </span>
            </button>
          </div>

          {/* 4. Minimal Divider */}
          <div className="relative flex py-0.5 items-center">
            <div className="flex-grow border-t border-white/10" />
            <span className="mx-3 text-[10px] font-mono uppercase tracking-wider text-slate-500">
              or join room
            </span>
            <div className="flex-grow border-t border-white/10" />
          </div>

          {/* 5. Join Existing Room */}
          <form onSubmit={handleJoinRoom} className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter Room Code"
              maxLength={6}
              disabled={isEntering}
              className="flex-1 min-w-0 bg-dark-950/80 border border-white/10 hover:border-white/20 focus:border-cyan-400/80 focus:ring-1 focus:ring-cyan-400/30 rounded-2xl px-4 py-2.5 text-center font-mono text-sm tracking-widest text-white placeholder:text-slate-600 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!roomCodeInput.trim() || isJoining || isEntering}
              className="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-cyan-400 hover:text-black text-white font-semibold text-xs sm:text-sm transition-all active:scale-95 disabled:opacity-30 disabled:hover:bg-white/10 disabled:hover:text-white cursor-pointer flex items-center gap-1.5 shrink-0 select-none shadow-sm"
            >
              {isJoining || isEntering ? (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>Join</span>
            </button>
          </form>

          {/* Error Feedback */}
          {errorMessage && (
            <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-red-950/50 border border-red-500/30 text-red-300 text-xs text-center shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.8)]" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Smooth Light Flare on Room Entry */}
      {isEntering && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center animate-fade-in">
          <div className="w-[600px] h-[600px] rounded-full bg-cyan-400/20 blur-3xl animate-pulse" />
        </div>
      )}
    </div>
  );
};
