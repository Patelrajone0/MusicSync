import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  User as UserIcon,
  Sparkles,
  Layers,
  Grid,
  CircleDot,
  Play,
  X,
  Radio,
  Eye
} from 'lucide-react';
import { RoomState, User } from '../types';
import { socket } from '../services/socket';
import { syncEngine } from '../services/syncEngine';
import { Logo } from './Logo';

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
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Transition Animation Interactive Demo States (Non-intrusive preview)
  const [activeDemo, setActiveDemo] = useState<'blur' | 'pixel' | 'dot' | 'halo' | null>(null);
  const [showDemoModal, setShowDemoModal] = useState<boolean>(false);

  const handlePlayDemo = (type: 'blur' | 'pixel' | 'dot' | 'halo') => {
    setActiveDemo(type);
    setTimeout(() => {
      setActiveDemo(null);
    }, 1600);
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
    <div className="min-h-screen flex flex-col justify-center items-center px-3 sm:px-4 py-4 sm:py-6 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-electric-cyan/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-electric-purple/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div
        className="max-w-md w-full z-10 transition-all duration-300 relative"
        style={
          activeDemo === 'blur'
            ? { animation: 'cyberBlurWarp 0.85s cubic-bezier(0.4, 0, 0.2, 1) forwards' }
            : activeDemo === 'pixel'
            ? { animation: 'pixelGlitch 0.85s cubic-bezier(0.25, 1, 0.5, 1) forwards' }
            : activeDemo === 'dot'
            ? { transform: 'scale(0.96)', filter: 'blur(3px)', opacity: 0.25, transition: 'all 0.5s ease-out' }
            : activeDemo === 'halo'
            ? { transform: 'scale(0.96)', filter: 'blur(4px)', opacity: 0.2, transition: 'all 0.5s ease-out' }
            : {}
        }
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
              disabled={isCreating || isJoining}
              className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-300 hover:brightness-105 active:scale-[0.98] text-black font-extrabold text-sm shadow-[0_0_25px_rgba(0,240,255,0.45)] hover:shadow-[0_0_35px_rgba(0,240,255,0.8)] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isCreating && (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin shrink-0" />
              )}
              <span className="font-black tracking-tight text-sm text-black">
                {isCreating ? 'Creating Music Room...' : 'Create New Music Room'}
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
                className="flex-1 bg-dark-950/90 border border-white/10 hover:border-cyan-400/30 focus:border-cyan-400 focus:shadow-[0_0_16px_rgba(0,240,255,0.25)] rounded-full px-4 py-2.5 sm:py-3 text-base sm:text-sm font-mono tracking-widest text-center text-white placeholder-slate-600 focus:outline-none transition-all duration-200"
              />
              <button
                type="submit"
                disabled={!roomCodeInput.trim() || isJoining}
                className="px-2 pl-4 py-1.5 rounded-full bg-dark-900/90 hover:bg-dark-850 border border-white/15 hover:border-cyan-400/60 text-white font-bold text-xs transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center gap-2 cursor-pointer shadow-md group/join"
              >
                <span className="tracking-wide">Join</span>
                <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full p-[1.5px] bg-gradient-to-tr from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_8px_rgba(0,240,255,0.4)] group-hover/join:shadow-[0_0_14px_rgba(0,240,255,0.7)] shrink-0 flex items-center justify-center transition-shadow duration-200">
                  <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center text-cyan-400 group-hover/join:text-white transition-colors">
                    {isJoining ? (
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

      {/* Active Animation Effect Overlays */}
      {activeDemo === 'blur' && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
          <div className="w-[600px] h-[600px] rounded-full bg-cyan-400/25 blur-3xl animate-pulse" />
        </div>
      )}

      {activeDemo === 'pixel' && (
        <div className="fixed inset-0 z-40 pointer-events-none mix-blend-screen opacity-70 bg-[linear-gradient(rgba(0,240,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.18)_1px,transparent_1px)] bg-[size:16px_16px]" />
      )}

      {activeDemo === 'dot' && (
        <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(0,240,255,0.5)_1.5px,transparent_1.5px)] bg-[size:20px_20px] opacity-80" />
          <div className="w-80 h-80 rounded-full border-2 border-cyan-400/80 shadow-[0_0_40px_rgba(0,240,255,0.8)]" style={{ animation: 'dotWavePulse 1.2s ease-out infinite' }} />
          <div className="w-80 h-80 rounded-full border-2 border-fuchsia-400/80 shadow-[0_0_40px_rgba(232,121,249,0.8)]" style={{ animation: 'dotWavePulse 1.2s ease-out 0.25s infinite' }} />
        </div>
      )}

      {activeDemo === 'halo' && (
        <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden flex items-center justify-center">
          <div
            className="w-40 h-40 rounded-full p-[4px] bg-gradient-to-tr from-cyan-400 via-sky-400 to-fuchsia-500"
            style={{ animation: 'haloPortalExpand 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
          />
          <div
            className="w-32 h-32 rounded-full p-[3px] bg-gradient-to-br from-fuchsia-400 via-purple-500 to-cyan-400"
            style={{ animation: 'haloPortalExpand 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards' }}
          />
        </div>
      )}

      {/* Simulated Live Toast during Demo */}
      {activeDemo && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none flex flex-col items-center gap-3">
          <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-dark-950/95 border border-cyan-400/80 shadow-[0_0_35px_rgba(0,240,255,0.7)] backdrop-blur-2xl">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,240,255,1)] animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider font-mono text-cyan-300">
              {activeDemo === 'blur' && 'Option 1: Cyber Blur & Hyperspace Zoom'}
              {activeDemo === 'pixel' && 'Option 2: Digital Pixel Glitch & Hologram'}
              {activeDemo === 'dot' && 'Option 3: Dot Matrix & Sonic Mesh Wave'}
              {activeDemo === 'halo' && 'Option 4: Signature Neon Halo Portal'}
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Previewing transition... resetting in a moment
          </span>
        </div>
      )}

      {/* Floating Demo Trigger Button */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
        <button
          onClick={() => setShowDemoModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-dark-900/95 hover:bg-dark-850 border border-cyan-400/40 hover:border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.3)] text-white text-xs font-bold transition-all active:scale-95 cursor-pointer backdrop-blur-xl group/demo"
        >
          <div className="w-5 h-5 rounded-full p-[1px] bg-gradient-to-tr from-cyan-400 via-sky-400 to-fuchsia-500 flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-2.5 h-2.5" />
            </div>
          </div>
          <span className="group-hover/demo:text-cyan-300 transition-colors">
            Preview Entry Animations (4 Demos)
          </span>
        </button>
      </div>

      {/* Interactive Demo Selector Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-dark-900/95 border border-cyan-400/30 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(0,240,255,0.25)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative w-6 h-6 rounded-full p-[1.5px] bg-gradient-to-tr from-cyan-400 to-fuchsia-500 flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center text-cyan-400">
                    <Eye className="w-3.5 h-3.5" />
                  </div>
                </div>
                <h3 className="text-sm sm:text-base font-black text-white tracking-tight">
                  Choose Your Transition Animation
                </h3>
              </div>
              <button
                onClick={() => setShowDemoModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Click any option below to preview how it will look when clicking <strong>Create New Music Room</strong>:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Demo 1: Blur */}
              <button
                onClick={() => {
                  setShowDemoModal(false);
                  handlePlayDemo('blur');
                }}
                className="flex flex-col text-left p-3.5 rounded-2xl bg-dark-950/80 hover:bg-dark-950 border border-white/10 hover:border-cyan-400/60 transition-all group/card shadow-sm hover:shadow-[0_0_15px_rgba(0,240,255,0.2)] cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-white group-hover/card:text-cyan-300 transition-colors flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    1. Cyber Blur
                  </span>
                  <Play className="w-3 h-3 text-cyan-400 opacity-60 group-hover/card:opacity-100" />
                </div>
                <span className="text-[11px] text-slate-400 leading-snug">
                  Smooth optical motion blur with velocity zoom bloom.
                </span>
              </button>

              {/* Demo 2: Pixel */}
              <button
                onClick={() => {
                  setShowDemoModal(false);
                  handlePlayDemo('pixel');
                }}
                className="flex flex-col text-left p-3.5 rounded-2xl bg-dark-950/80 hover:bg-dark-950 border border-white/10 hover:border-fuchsia-400/60 transition-all group/card shadow-sm hover:shadow-[0_0_15px_rgba(232,121,249,0.2)] cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-white group-hover/card:text-fuchsia-300 transition-colors flex items-center gap-1.5">
                    <Grid className="w-3.5 h-3.5 text-fuchsia-400" />
                    2. Pixel Glitch
                  </span>
                  <Play className="w-3 h-3 text-fuchsia-400 opacity-60 group-hover/card:opacity-100" />
                </div>
                <span className="text-[11px] text-slate-400 leading-snug">
                  Cyber scanline grid, chromatic RGB twitch, digital dissolve.
                </span>
              </button>

              {/* Demo 3: Dot */}
              <button
                onClick={() => {
                  setShowDemoModal(false);
                  handlePlayDemo('dot');
                }}
                className="flex flex-col text-left p-3.5 rounded-2xl bg-dark-950/80 hover:bg-dark-950 border border-white/10 hover:border-sky-400/60 transition-all group/card shadow-sm hover:shadow-[0_0_15px_rgba(56,189,248,0.2)] cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-white group-hover/card:text-sky-300 transition-colors flex items-center gap-1.5">
                    <CircleDot className="w-3.5 h-3.5 text-sky-400" />
                    3. Dot Mesh Wave
                  </span>
                  <Play className="w-3 h-3 text-sky-400 opacity-60 group-hover/card:opacity-100" />
                </div>
                <span className="text-[11px] text-slate-400 leading-snug">
                  Interconnected dot matrix with expanding acoustic ripples.
                </span>
              </button>

              {/* Demo 4: Halo Portal */}
              <button
                onClick={() => {
                  setShowDemoModal(false);
                  handlePlayDemo('halo');
                }}
                className="flex flex-col text-left p-3.5 rounded-2xl bg-dark-950/80 hover:bg-dark-950 border border-cyan-400/30 hover:border-cyan-400 transition-all group/card shadow-sm hover:shadow-[0_0_20px_rgba(0,240,255,0.35)] cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-white group-hover/card:text-cyan-300 transition-colors flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    4. Neon Halo Portal
                  </span>
                  <Play className="w-3 h-3 text-cyan-400 opacity-60 group-hover/card:opacity-100" />
                </div>
                <span className="text-[11px] text-slate-400 leading-snug">
                  Signature Neon Halo Ring erupting & expanding across viewport.
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
