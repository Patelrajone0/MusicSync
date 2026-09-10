import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Copy,
  Check,
  Users,
  UserX,
  Smartphone,
  Crown,
  Disc3,
  Headphones,
  Volume2,
  VolumeX,
  ShieldCheck,
  X,
  LogOut,
  Loader2,
  Wifi,
  Globe,
  QrCode
} from 'lucide-react';
import { User, UserRole } from '../types';
import { socket } from '../services/socket';
import { NetworkModeModal, NetworkMode } from './NetworkModeModal';

interface RoomHeaderProps {
  roomCode: string;
  users: User[];
  currentUser: User | null;
  hostId: string;
  onOpenHistory?: () => void;
  onLeaveRoom?: () => void;
  masterVolume?: number;
  currentNetworkMode?: NetworkMode;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
  roomCode,
  users,
  currentUser,
  hostId,
  onLeaveRoom,
  masterVolume,
  currentNetworkMode,
}) => {
  const isHost = Boolean(
    currentUser && (
      currentUser.role === 'host' ||
      (hostId && currentUser.id === hostId) ||
      users.some((u) => u.id === currentUser.id && u.role === 'host')
    )
  );
  const [copiedCode, setCopiedCode] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [networkMode, setNetworkMode] = useState<NetworkMode>(() => {
    if (currentNetworkMode) return currentNetworkMode;
    try {
      return (localStorage.getItem('musicsync_network_mode') as NetworkMode) || 'local';
    } catch {
      return 'local';
    }
  });
  const [userToKick, setUserToKick] = useState<User | null>(null);
  const [userToMakeHost, setUserToMakeHost] = useState<User | null>(null);

  useEffect(() => {
    if (currentNetworkMode) {
      setNetworkMode(currentNetworkMode);
    }
  }, [currentNetworkMode]);

  useEffect(() => {
    const handleModeUpdate = ({ mode }: { mode: NetworkMode }) => {
      if (mode === 'local' || mode === 'online') {
        setNetworkMode(mode);
        try {
          localStorage.setItem('musicsync_network_mode', mode);
        } catch {}
      }
    };
    socket.on('room_network_mode_updated', handleModeUpdate);
    return () => {
      socket.off('room_network_mode_updated', handleModeUpdate);
    };
  }, []);

  // Listen to Escape key to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowUsersModal(false);
        setShowExitModal(false);
        setShowNetworkModal(false);
        setUserToKick(null);
        setUserToMakeHost(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleOpenUsers = () => {
    setShowUsersModal((prev) => !prev);
  };

  const handleMakeHost = (targetUser: User) => {
    if (!isHost || targetUser.id === currentUser?.id) return;
    setUserToMakeHost(targetUser);
  };

  const handleKickUser = (targetUser: User) => {
    if (!isHost || targetUser.id === currentUser?.id) return;
    setUserToKick(targetUser);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-40 bg-dark-950/90 backdrop-blur-xl border-b border-white/10 px-2 py-1.5 sm:px-4 sm:py-2.5 md:px-8 w-full select-none">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-1 sm:gap-3 w-full">
        {/* Dynamic Island Unified Cyber Capsule (Variation 1A) */}
        <div className="inline-flex items-center bg-dark-900/90 hover:bg-dark-850 border border-white/10 hover:border-cyan-400/40 rounded-full p-1 pl-1.5 pr-1 shadow-lg transition-all duration-200 gap-2 sm:gap-2.5 shrink-0 select-none">
          {/* Circular Brand Mark with Neon Halo Ring */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handleRefresh();
            }}
            title="Refresh MusicSync"
            className="flex items-center gap-1.5 sm:gap-2 group cursor-pointer focus:outline-none transition-transform active:scale-95"
          >
            <div className="relative w-[26px] h-[26px] sm:w-[28px] sm:h-[28px] rounded-full p-[1.5px] bg-gradient-to-tr from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_10px_rgba(0,240,255,0.45)] group-hover:shadow-[0_0_14px_rgba(0,240,255,0.7)] transition-shadow shrink-0 flex items-center justify-center">
              <img
                src="/musicsync-icon.png"
                alt="MusicSync Logo"
                className="w-full h-full rounded-full object-cover bg-dark-950 block"
              />
            </div>
            <span className="text-xs sm:text-sm font-black tracking-tight text-white">
              Music<span className="text-cyan-400">Sync</span>
            </span>
          </a>

          {/* Mini Live Equalizer Wave Bars */}
          <div className="flex items-center gap-0.5 h-3 px-0.5 sm:px-1 select-none" title="Live audio mesh synchronized">
            <span className="w-0.5 bg-cyan-400 rounded-full animate-wave-1 h-3.5"></span>
            <span className="w-0.5 bg-cyan-400 rounded-full animate-wave-2 h-2"></span>
            <span className="w-0.5 bg-cyan-400 rounded-full animate-wave-3 h-3"></span>
          </div>

          {/* Integrated Click-to-Copy Room Tag */}
          <button
            onClick={handleCopyCode}
            title="Click to copy Room Code"
            className={`group/btn flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border transition-all active:scale-95 cursor-pointer shrink-0 ${
              copiedCode
                ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]'
                : 'bg-white/5 hover:bg-cyan-400 hover:text-black border-white/10 hover:border-cyan-400 text-slate-300'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                copiedCode
                  ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]'
                  : 'bg-emerald-400 animate-pulse group-hover/btn:bg-black'
              }`}
            />
            <span className="font-mono text-[11px] font-bold tracking-wider">
              {copiedCode ? 'COPIED!' : `#${roomCode}`}
            </span>
            {copiedCode ? (
              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
            ) : (
              <Copy className="w-3 h-3 text-slate-400 group-hover/btn:text-black transition-colors shrink-0" />
            )}
          </button>
        </div>

        {/* Action Controls & Connected Members */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

          {/* Connected Devices Button - Dynamic Cyber Capsule with Neon Halo Avatars */}
          <button
            onClick={handleOpenUsers}
            className={`group/devices flex items-center gap-1.5 sm:gap-2 p-1 pl-1.5 pr-2.5 sm:pr-3 rounded-full border text-xs font-semibold transition-all duration-200 active:scale-95 shrink-0 shadow-lg cursor-pointer select-none ${
              showUsersModal
                ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-[0_0_14px_rgba(0,240,255,0.35)]'
                : 'bg-dark-900/90 hover:bg-dark-850 border-white/10 hover:border-cyan-400/40 text-slate-200 hover:text-white'
            }`}
            title="Connected Devices"
          >
            {/* Circular Avatar(s) with Neon Halo Ring matching Brand theme */}
            <div className="flex -space-x-1.5 sm:-space-x-2 items-center overflow-visible">
              {users.length > 0 ? (
                users.slice(0, 2).map((u, idx) => (
                  <div
                    key={u.id}
                    className="relative w-[22px] h-[22px] sm:w-[24px] sm:h-[24px] rounded-full p-[1.5px] bg-gradient-to-tr from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_8px_rgba(0,240,255,0.4)] group-hover/devices:shadow-[0_0_12px_rgba(0,240,255,0.65)] transition-shadow duration-200 shrink-0 flex items-center justify-center ring-1 ring-dark-950"
                    style={{ zIndex: 10 - idx }}
                  >
                    <div
                      style={{ backgroundColor: u.avatarColor || '#00f0ff' }}
                      className="w-full h-full rounded-full flex items-center justify-center text-[10px] sm:text-[11px] font-black text-black select-none uppercase tracking-tighter"
                    >
                      {u.name.charAt(0)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="relative w-[22px] h-[22px] sm:w-[24px] sm:h-[24px] rounded-full p-[1.5px] bg-gradient-to-tr from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_8px_rgba(0,240,255,0.4)] shrink-0 flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center text-cyan-400">
                    <Smartphone className="w-3 h-3" />
                  </div>
                </div>
              )}
            </div>

            {/* Device Count & Label */}
            <div className="flex items-center gap-1 leading-none">
              <span className="font-mono font-bold text-white text-xs tracking-tight">
                {users.length}
              </span>
              <span className="text-slate-400 group-hover/devices:text-slate-200 text-xs hidden sm:inline transition-colors">
                {users.length === 1 ? 'Device' : 'Devices'}
              </span>
            </div>

            {/* Live Synchronized Mesh Indicator Dot */}
            <span
              className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.9)] ml-0.5 shrink-0 hidden xs:inline-block"
              title="Mesh synchronized"
            />
          </button>

          {/* Room Type Display Badge & QR Viewer Button */}
          <button
            type="button"
            onClick={() => setShowNetworkModal(true)}
            className={`group/network flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 active:scale-95 shrink-0 shadow-lg cursor-pointer select-none ${
              networkMode === 'local'
                ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-400/50 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.25)]'
                : 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-400/50 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
            }`}
            title={
              networkMode === 'local'
                ? 'Local Wi-Fi Room (0ms Delay). Click to view QR code & invite link'
                : 'Online Cloud Room (Worldwide). Click to view QR code & invite link'
            }
          >
            {networkMode === 'local' ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-bold">Local</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)] animate-pulse" />
                <QrCode className="w-3 h-3 text-emerald-400/70 group-hover/network:text-emerald-300 transition-colors shrink-0 ml-0.5" />
              </>
            ) : (
              <>
                <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="font-bold">Online</span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(0,240,255,0.9)]" />
                <QrCode className="w-3 h-3 text-cyan-400/70 group-hover/network:text-cyan-300 transition-colors shrink-0 ml-0.5" />
              </>
            )}
          </button>

          {/* Exit Room Button - Matching Cyber Capsule with Neon Accent */}
          {onLeaveRoom && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowExitModal(true);
              }}
              className="group/exit flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1 rounded-full bg-dark-900/90 hover:bg-red-500/15 border border-white/10 hover:border-red-500/40 text-slate-300 hover:text-red-400 text-xs font-semibold shadow-lg transition-all duration-200 active:scale-95 shrink-0 cursor-pointer select-none"
              title="Exit Room"
            >
              <div className="w-[22px] h-[22px] sm:w-[24px] sm:h-[24px] rounded-full p-[1.5px] bg-gradient-to-tr from-rose-500/80 via-red-500/80 to-amber-500/80 shadow-[0_0_8px_rgba(244,63,94,0.35)] group-hover/exit:shadow-[0_0_12px_rgba(244,63,94,0.65)] shrink-0 flex items-center justify-center transition-all duration-200">
                <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center text-rose-400 group-hover/exit:text-rose-300">
                  <LogOut className="w-3 h-3 shrink-0" />
                </div>
              </div>
              <span className="hidden sm:inline pr-1">Exit</span>
            </button>
          )}
        </div>
      </div>

      {/* Connected Devices Modal (Rendered via Portal for 100% viewport centering and no screen overflow) */}
      {showUsersModal && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setShowUsersModal(false)}
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-dark-900 border border-white/15 rounded-2xl max-w-sm sm:max-w-md w-full max-h-[85vh] shadow-2xl animate-popover-spring overflow-hidden my-auto flex flex-col"
          >
            {/* Modal Header */}
            <div className="p-3 sm:p-3.5 border-b border-white/10 flex items-center justify-between bg-dark-950/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="relative w-8 h-8 rounded-full p-[1.5px] bg-gradient-to-tr from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_8px_rgba(0,240,255,0.4)] shrink-0 flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center text-cyan-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">Connected Devices</h4>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-electric-cyan/10 text-electric-cyan border border-electric-cyan/30 font-mono font-bold">
                      {users.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">Synced audio speaker network</p>
                </div>
              </div>
              <button
                onClick={() => setShowUsersModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Master Speaker Volume Control Card */}
            {currentUser?.id === hostId || currentUser?.role === 'host' ? (
              <div className="p-3 m-2.5 mb-1 rounded-xl bg-gradient-to-r from-amber-500/15 to-electric-cyan/15 border border-amber-500/30 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-bold text-white">Master Volume Control</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-300">
                    {Math.round((masterVolume ?? 0.9) * 100)}%
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => {
                      const target = (masterVolume ?? 0.9) === 0 ? 0.8 : 0;
                      socket.emit('set_master_volume', { volume: target });
                    }}
                    className="text-slate-400 hover:text-white transition-colors active:scale-95 shrink-0"
                    title={(masterVolume ?? 0.9) === 0 ? 'Unmute all' : 'Mute all'}
                  >
                    {(masterVolume ?? 0.9) === 0 ? (
                      <VolumeX className="w-4 h-4 text-red-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-amber-400" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={masterVolume ?? 0.9}
                    onChange={(e) => socket.emit('set_master_volume', { volume: parseFloat(e.target.value) })}
                    className="flex-1 h-1.5 bg-dark-950 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                </div>

                {/* Quick Presets: Grid of 5 so they NEVER overflow! */}
                <div className="grid grid-cols-5 gap-1 pt-1 border-t border-white/10 text-[10px]">
                  <button
                    onClick={() => socket.emit('set_master_volume', { volume: 0 })}
                    className="py-1 rounded-md bg-dark-900 hover:bg-dark-850 text-slate-400 hover:text-white border border-white/5 transition-all active:scale-95 text-center"
                  >
                    Mute
                  </button>
                  <button
                    onClick={() => socket.emit('set_master_volume', { volume: 0.3 })}
                    className="py-1 rounded-md bg-dark-900 hover:bg-dark-850 text-slate-300 hover:text-white border border-white/5 transition-all active:scale-95 text-center"
                  >
                    30%
                  </button>
                  <button
                    onClick={() => socket.emit('set_master_volume', { volume: 0.6 })}
                    className="py-1 rounded-md bg-dark-900 hover:bg-dark-850 text-slate-300 hover:text-white border border-white/5 transition-all active:scale-95 text-center"
                  >
                    60%
                  </button>
                  <button
                    onClick={() => socket.emit('set_master_volume', { volume: 0.85 })}
                    className="py-1 rounded-md bg-dark-900 hover:bg-dark-850 text-amber-400 hover:text-amber-300 border border-white/5 transition-all active:scale-95 font-semibold text-center"
                  >
                    85%
                  </button>
                  <button
                    onClick={() => socket.emit('set_master_volume', { volume: 1 })}
                    className="py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all active:scale-95 font-bold text-center"
                  >
                    MAX
                  </button>
                </div>
                <p className="text-[9px] text-slate-400 mt-1.5 text-center">
                  Controls volume across all {users.length} connected devices in real time
                </p>
              </div>
            ) : (
              <div className="px-3 py-2 m-2.5 mb-1 rounded-xl bg-dark-950 border border-white/10 flex items-center justify-between text-[11px] shrink-0">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Volume2 className="w-3.5 h-3.5 text-electric-cyan" />
                  <span>Master Volume:</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-electric-cyan">
                    {Math.round((masterVolume ?? 0.9) * 100)}%
                  </span>
                  <span className="text-[9px] text-slate-500">(Host Synced)</span>
                </div>
              </div>
            )}

            {/* Modal Body - Speaker list */}
            <div className="p-2.5 sm:p-3 overflow-y-auto flex-1 space-y-1.5">
              {users.map((u) => {
                const isUserHost = u.id === hostId || u.role === 'host';
                const isUserDj = u.role === 'dj';
                const isMe = Boolean(
                  currentUser && (u.id === currentUser.id || (socket.id && u.id === socket.id))
                );
                const canManage = isHost && !isMe;

                return (
                  <div
                    key={u.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors gap-2 ${
                      isMe
                        ? 'bg-dark-950/90 border-electric-cyan/20 shadow-sm'
                        : 'bg-dark-950 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Avatar with Circular Neon Halo Ring */}
                      <div className="relative w-8 h-8 rounded-full p-[1.5px] bg-gradient-to-tr from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_8px_rgba(0,240,255,0.4)] shrink-0 flex items-center justify-center">
                        <div
                          style={{ backgroundColor: u.avatarColor || '#00f0ff' }}
                          className="w-full h-full rounded-full flex items-center justify-center text-[12px] font-black text-black select-none uppercase tracking-tight"
                        >
                          {u.name.charAt(0)}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-white truncate max-w-[110px] sm:max-w-[150px]">
                            {u.name}
                          </span>
                          {isMe && (
                            <span className="text-[9px] bg-electric-cyan/15 text-electric-cyan px-1.5 py-0.2 rounded-full border border-electric-cyan/30 font-semibold shrink-0">
                              You
                            </span>
                          )}
                          {isUserHost && (
                            <span className="flex items-center gap-0.5 text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded-full border border-amber-500/30 shrink-0 font-medium">
                              <Crown className="w-2.5 h-2.5" /> Host
                            </span>
                          )}
                          {isUserDj && !isUserHost && (
                            <span className="flex items-center gap-0.5 text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded-full border border-purple-500/30 shrink-0 font-medium">
                              <Disc3 className="w-2.5 h-2.5" /> DJ
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                          {u.isAudioReady ? (
                            <span className="flex items-center gap-1 text-emerald-400 font-medium">
                              <Volume2 className="w-2.5 h-2.5" /> Active Speaker
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-amber-400/80">
                              <VolumeX className="w-2.5 h-2.5" /> Tap to play
                            </span>
                          )}
                          {isMe && isHost && (
                            <span className="text-slate-500 text-[9px]">• Host device</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Host controls: Make Host & Kick Device */}
                    {canManage ? (
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        <button
                          onClick={() => handleMakeHost(u)}
                          className="p-1 px-1.5 sm:px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 hover:border-amber-500/60 text-amber-400 hover:text-amber-300 text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-sm shadow-amber-500/10 shrink-0"
                          title={`Make "${u.name}" the Room Host`}
                        >
                          <Crown className="w-3 h-3" />
                          <span className="hidden xs:inline">Make Host</span>
                        </button>

                        <button
                          onClick={() => handleKickUser(u)}
                          className="p-1 px-1.5 sm:px-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/35 hover:border-red-500/60 text-red-400 hover:text-red-300 text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-sm shadow-red-500/10 shrink-0"
                          title={`Kick "${u.name}" from room`}
                        >
                          <UserX className="w-3 h-3" />
                          <span>Kick</span>
                        </button>
                      </div>
                    ) : isMe ? (
                      <span className="text-[10px] text-slate-500 italic pr-1 shrink-0">Host</span>
                    ) : null}
                  </div>
                );
              })}

              {/* If only host device connected */}
              {isHost && users.filter((u) => u.id !== currentUser?.id).length === 0 && (
                <div className="p-3 rounded-xl bg-dark-950/80 border border-dashed border-white/15 text-center space-y-2 mt-2">
                  <div className="flex items-center justify-center gap-1.5 text-amber-400 text-xs font-semibold">
                    <Crown className="w-3.5 h-3.5" />
                    <span>1 Device Connected (Host)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed px-1">
                    You cannot kick your own device. When other phones or laptops join using Room Code <span className="font-mono text-electric-cyan font-bold">{roomCode}</span>, they will appear here in real time.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-2.5 border-t border-white/10 bg-dark-950/60 shrink-0">
              <button
                onClick={() => setShowUsersModal(false)}
                className="w-full py-2 rounded-xl bg-dark-850 hover:bg-dark-800 border border-white/10 text-slate-300 hover:text-white font-medium text-xs transition-colors active:scale-95 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Custom Exit Room Confirmation Modal (Rendered in Portal for true viewport centering) */}
      {showExitModal && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setShowExitModal(false)}
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-dark-900 border border-white/15 rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-2xl animate-popover-spring space-y-4 my-auto"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white leading-tight">Exit Room</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Are you sure you want to leave Room <span className="font-mono font-semibold text-white">{roomCode}</span>?
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-colors active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitModal(false);
                  onLeaveRoom?.();
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-all shadow-lg shadow-red-500/20 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit Room</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Custom Kick Device Confirmation Modal (Rendered in Portal for true viewport centering) */}
      {userToKick && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setUserToKick(null)}
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-dark-900 border border-white/15 rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-2xl animate-popover-spring space-y-4 my-auto"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 shrink-0">
                <UserX className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white leading-tight">Remove Device</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Disconnect <span className="text-white font-semibold">{userToKick.name}</span> from this room?
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUserToKick(null)}
                className="flex-1 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-colors active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  socket.emit('kick_user', { targetUserId: userToKick.id });
                  setUserToKick(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-all shadow-lg shadow-red-500/20 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Custom Make Host Confirmation Modal (Rendered in Portal for true viewport centering) */}
      {userToMakeHost && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setUserToMakeHost(null)}
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-dark-900 border border-amber-500/30 rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-2xl shadow-amber-500/10 animate-popover-spring space-y-4 my-auto"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white leading-tight">Make Room Host</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Transfer Host privileges to <span className="text-white font-semibold">{userToMakeHost.name}</span>?
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  They will gain control over master volume and room device management.
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUserToMakeHost(null)}
                className="flex-1 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-colors active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  socket.emit('make_host', { targetUserId: userToMakeHost.id });
                  setUserToMakeHost(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Make Host</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Room Type & QR Code Information Modal */}
      <NetworkModeModal
        isOpen={showNetworkModal}
        onClose={() => setShowNetworkModal(false)}
        roomCode={roomCode}
        currentMode={networkMode}
      />
    </header>
  );
};
