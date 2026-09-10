import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  User as UserIcon,
} from 'lucide-react';
import { RoomState, User } from '../types';
import { socket } from '../services/socket';
import { syncEngine } from '../services/syncEngine';
import { Logo } from './Logo';
import { getDeviceId } from '../utils/deviceId';

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

    // Attempt to unlock Web Audio in background without blocking room creation
    syncEngine.unlockAudio().catch(() => {});

    const doCreate = () => {
      const timeoutId = setTimeout(() => {
        setIsCreating(false);
        setErrorMessage('Connection taking longer than expected. Please check your internet or retry.');
      }, 12000);

      socket.emit('create_room', { userName, deviceId: getDeviceId() }, (res: any) => {
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
    <div className="min-h-screen flex flex-col justify-center items-center px-3 sm:px-4 py-4 sm:py-6 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-electric-cyan/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-electric-purple/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div
        className="max-w-md w-full z-10 transition-all duration-300 relative"
        style={isEntering ? { animation: 'cyberBlurWarp 0.52s cubic-bezier(0.4, 0, 0.2, 1) forwards' } : {}}
      >
        {/* Logo & Headline */}
        <div className="text-center mb-3 sm:mb-4">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handleRefresh();
            }}
            title="Refresh MusicSync"
            className="inline-flex flex-col items-center group cursor-pointer focus:outline-none transition-transform active:scale-95 mb-1"
          >
            <Logo size="lg" layout="vertical" showTagline={true} />
          </a>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm mx-auto px-2">
            Zero-latency synchronized music streaming. Turn any group of phones and laptops into an acoustic speaker system.
          </p>
        </div>

        {/* Identity & Room Action Card */}
        <div className="relative bg-dark-900/85 backdrop-blur-2xl border border-white/10 hover:border-cyan-400/30 rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_25px_rgba(0,240,255,0.06)] space-y-5 sm:space-y-6 transition-all duration-300 overflow-hidden">
          {/* Ambient Cyber Top Accent Line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent pointer-events-none" />

          {/* Username Input */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <div className="relative w-4 h-4 rounded-full p-[1px] bg-gradient-to-tr from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_6px_rgba(0,240,255,0.4)] shrink-0 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center">
                  <UserIcon className="w-2.5 h-2.5 text-cyan-400" />
                </div>
              </div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">
                Username
              </label>
            </div>
            <div className="relative w-full">
              <input
                type="text"
                value={userName}
                onChange={handleNameChange}
                placeholder="Enter your username"
                maxLength={24}
                className="w-full bg-dark-950/90 border border-white/10 hover:border-cyan-400/30 focus:border-cyan-400 focus:shadow-[0_0_16px_rgba(0,240,255,0.25)] rounded-full px-5 py-2.5 sm:py-3 text-base sm:text-sm text-white font-semibold focus:outline-none transition-all duration-200"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 pl-1">
              No account required. Instant anonymous access.
            </p>
          </div>

          {/* Action 1: Create New Room */}
          <div>
            <button
              onClick={handleCreateRoom}
              disabled={isCreating || isJoining || isEntering}
              className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-300 hover:brightness-105 active:scale-[0.98] text-black font-extrabold text-sm shadow-[0_0_25px_rgba(0,240,255,0.45)] hover:shadow-[0_0_35px_rgba(0,240,255,0.8)] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {(isCreating || isEntering) && (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin shrink-0" />
              )}
              <span className="font-black tracking-tight text-sm text-black">
                {isEntering
                  ? 'Entering Music Room...'
                  : isCreating
                  ? 'Creating Music Room...'
                  : 'Create New Music Room'}
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <div className="flex-shrink mx-3 px-3 py-0.5 rounded-full bg-dark-950/80 border border-white/10 shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(0,240,255,0.8)] animate-pulse" />
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-slate-400 font-medium">
                or join room
              </span>
            </div>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          {/* Action 2: Join Existing Room */}
          <form onSubmit={handleJoinRoom} className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Room Code (e.g. 58392)"
                maxLength={6}
                disabled={isEntering}
                className="flex-1 bg-dark-950/90 border border-white/10 hover:border-cyan-400/30 focus:border-cyan-400 focus:shadow-[0_0_16px_rgba(0,240,255,0.25)] rounded-full px-4 py-2.5 sm:py-3 text-base sm:text-sm font-mono tracking-widest text-center text-white placeholder-slate-600 focus:outline-none transition-all duration-200"
              />
              <button
                type="submit"
                disabled={!roomCodeInput.trim() || isJoining || isEntering}
                className="px-2 pl-4 py-1.5 rounded-full bg-dark-900/90 hover:bg-dark-850 border border-white/15 hover:border-cyan-400/60 text-white font-bold text-xs transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center gap-2 cursor-pointer shadow-md group/join"
              >
                <span className="tracking-wide">{isEntering ? 'Entering...' : 'Join'}</span>
                <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full p-[1.5px] bg-gradient-to-tr from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_8px_rgba(0,240,255,0.4)] group-hover/join:shadow-[0_0_14px_rgba(0,240,255,0.7)] shrink-0 flex items-center justify-center transition-shadow duration-200">
                  <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center text-cyan-400 group-hover/join:text-white transition-colors">
                    {isJoining || isEntering ? (
                      <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5 group-hover/join:translate-x-0.5 transition-transform duration-200" />
                    )}
                  </div>
                </div>
              </button>
            </div>
          </form>

          {/* Error Message Feedback */}
          {errorMessage && (
            <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-red-950/50 border border-red-500/30 text-red-300 text-xs text-center shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.8)]" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Smooth Cyber Light Flare Bloom during Room Entry */}
      {isEntering && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center animate-fade-in">
          <div className="w-[650px] h-[650px] rounded-full bg-cyan-400/25 blur-3xl animate-pulse" />
        </div>
      )}
    </div>
  );
};
