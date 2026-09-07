import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Radio,
  Users,
  ArrowRight,
  Shuffle,
  Music,
  Volume2,
  Zap,
  ShieldCheck,
  Headphones
} from 'lucide-react';
import { RoomState, User } from '../types';
import { socket } from '../services/socket';
import { syncEngine } from '../services/syncEngine';
import { Logo } from './Logo';

interface LobbyProps {
  onRoomReady: (room: RoomState, user: User) => void;
  initialRoomCode?: string;
}

const GUEST_ADJECTIVES = [
  'Neon', 'Cyber', 'Cosmic', 'Electric', 'Sonic', 'Astral', 'Hyper',
  'Pulse', 'Quantum', 'Glitch', 'Turbo', 'Vibe', 'Solar', 'Velvet', 'Prism'
];
const GUEST_ANIMALS = [
  'Tiger', 'Falcon', 'Panda', 'Wolf', 'Panther', 'Fox', 'Viper',
  'Otter', 'Jaguar', 'Lynx', 'Raven', 'Eagle', 'Cheetah', 'Badger', 'Cobra'
];

function getRandomGuestName(): string {
  const adj = GUEST_ADJECTIVES[Math.floor(Math.random() * GUEST_ADJECTIVES.length)];
  const animal = GUEST_ANIMALS[Math.floor(Math.random() * GUEST_ANIMALS.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${adj}-${animal}-${num}`;
}

const USER_NAME_STORAGE_KEY = 'musicsync_user_name';

export const Lobby: React.FC<LobbyProps> = ({ onRoomReady, initialRoomCode = '' }) => {
  const [userName, setUserName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(USER_NAME_STORAGE_KEY);
      if (saved && saved.trim()) return saved.trim();
    } catch (e) {}
    const defaultName = getRandomGuestName();
    try {
      localStorage.setItem(USER_NAME_STORAGE_KEY, defaultName);
    } catch (e) {}
    return defaultName;
  });
  const [roomCodeInput, setRoomCodeInput] = useState<string>(initialRoomCode);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
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
      if (val.trim()) {
        localStorage.setItem(USER_NAME_STORAGE_KEY, val.trim());
      }
    } catch (e) {}
  };

  const handleShuffleName = () => {
    const freshName = getRandomGuestName();
    setUserName(freshName);
    try {
      localStorage.setItem(USER_NAME_STORAGE_KEY, freshName);
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

    if (!socket.connected) {
      socket.connect();
    }

    const timeoutId = setTimeout(() => {
      setIsCreating(false);
      setErrorMessage('Connection taking longer than expected. Retrying...');
    }, 6000);

    socket.emit('create_room', { userName }, (res: any) => {
      clearTimeout(timeoutId);
      setIsCreating(false);
      if (res && res.success && res.room && res.user) {
        onRoomReady(res.room, res.user);
      } else {
        setErrorMessage(res?.error || 'Failed to create room. Please try again.');
      }
    });
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = roomCodeInput.trim().replace(/\D/g, '');
    if (!code) return;

    setIsJoining(true);
    setErrorMessage('');

    syncEngine.unlockAudio().catch(() => {});

    if (!socket.connected) {
      socket.connect();
    }

    const timeoutId = setTimeout(() => {
      setIsJoining(false);
      setErrorMessage('Connection timed out. Check the code and try again.');
    }, 6000);

    socket.emit('join_room', { roomCode: code, userName }, (res: any) => {
      clearTimeout(timeoutId);
      setIsJoining(false);
      if (res && res.success && res.room && res.user) {
        onRoomReady(res.room, res.user);
      } else {
        setErrorMessage(res?.error || 'Room not found. Check code and try again.');
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-3 sm:px-4 py-6 sm:py-12 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-electric-cyan/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-electric-purple/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-md w-full z-10">
        {/* Logo & Headline */}
        <div className="text-center mb-6 sm:mb-8">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handleRefresh();
            }}
            title="Refresh MusicSync"
            className="inline-flex flex-col items-center group cursor-pointer focus:outline-none transition-transform active:scale-95 mb-2"
          >
            <Logo size="lg" layout="vertical" showTagline={true} />
          </a>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-sm mx-auto px-2">
            Zero-latency synchronized music streaming. Turn any group of phones and laptops into an acoustic speaker system.
          </p>
        </div>

        {/* Identity & Room Action Card */}
        <div className="bg-dark-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl space-y-5 sm:space-y-6">
          {/* Guest Identity Generator */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Your Guest Identity
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={userName}
                  onChange={handleNameChange}
                  placeholder="Guest Username"
                  maxLength={24}
                  className="w-full bg-dark-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white font-semibold focus:outline-none focus:border-electric-cyan transition-colors"
                />
              </div>
              <button
                type="button"
                onClick={handleShuffleName}
                title="Generate another fun alias"
                className="p-2.5 rounded-xl bg-dark-850 hover:bg-dark-800 border border-white/10 text-electric-cyan hover:text-white transition-all active:scale-95"
              >
                <Shuffle className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              No account required. Instant anonymous access.
            </p>
          </div>

          {/* Action 1: Create New Room */}
          <div>
            <button
              onClick={handleCreateRoom}
              disabled={isCreating || isJoining}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-electric-cyan to-electric-blue text-black font-bold text-sm hover:brightness-110 transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 neon-glow-cyan"
            >
              {isCreating ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>Create New Party Room</span>
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-4 text-xs font-mono uppercase text-slate-500">or join room</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          {/* Action 2: Join Existing Room */}
          <form onSubmit={handleJoinRoom} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Room Code (e.g. 58392)"
                maxLength={6}
                className="flex-1 bg-dark-950 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm font-mono tracking-widest text-center text-white placeholder-slate-600 focus:outline-none focus:border-electric-cyan transition-colors"
              />
              <button
                type="submit"
                disabled={!roomCodeInput.trim() || isJoining}
                className="px-4 sm:px-5 py-2.5 rounded-xl bg-dark-850 hover:bg-dark-800 border border-white/10 hover:border-electric-cyan/40 text-white font-semibold text-xs transition-all active:scale-95 disabled:opacity-40 shrink-0"
              >
                {isJoining ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="flex items-center gap-1">
                    <span>Join</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>
            </div>
          </form>

          {/* Error Message Feedback */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs text-center">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Feature Highlights Footer */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5 sm:mt-6 text-center text-[11px] text-slate-400">
          <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-dark-900/40 border border-white/5">
            <Zap className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-electric-cyan mx-auto mb-1" />
            <span className="font-semibold text-slate-200 block text-[10px] sm:text-[11px]">NTP Sync</span>
            <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">Sub-50ms sync</p>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-dark-900/40 border border-white/5">
            <Music className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-electric-purple mx-auto mb-1" />
            <span className="font-semibold text-slate-200 block text-[10px] sm:text-[11px]">Universal</span>
            <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">Audius + iTunes</p>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-dark-900/40 border border-white/5">
            <Users className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-emerald-400 mx-auto mb-1" />
            <span className="font-semibold text-slate-200 block text-[10px] sm:text-[11px]">Shared Queue</span>
            <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">Synced playlist</p>
          </div>
        </div>
      </div>
    </div>
  );
};
