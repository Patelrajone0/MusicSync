import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Share2,
  Copy,
  Check,
  QrCode,
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
  History,
  LogOut,
  Loader2
} from 'lucide-react';
import QRCode from 'qrcode';
import { User, UserRole } from '../types';
import { socket } from '../services/socket';
import { userTasteEngine } from '../services/userTaste';
import { Logo } from './Logo';

interface RoomHeaderProps {
  roomCode: string;
  users: User[];
  currentUser: User | null;
  hostId: string;
  onOpenHistory: () => void;
  onLeaveRoom?: () => void;
  masterVolume?: number;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
  roomCode,
  users,
  currentUser,
  hostId,
  onOpenHistory,
  onLeaveRoom,
  masterVolume,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrSvg, setQrSvg] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [networkIp, setNetworkIp] = useState<string>('');
  const [qrMode, setQrMode] = useState<'network' | 'direct'>('network');
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [userToKick, setUserToKick] = useState<User | null>(null);
  const [userToMakeHost, setUserToMakeHost] = useState<User | null>(null);
  const [historyCount, setHistoryCount] = useState<number>(() => userTasteEngine.getHistory().length);

  React.useEffect(() => {
    const unsub = userTasteEngine.subscribe(() => {
      setHistoryCount(userTasteEngine.getHistory().length);
    });
    return unsub;
  }, []);

  // Fetch local Wi-Fi IP so mobile devices on the same network can join via QR code
  useEffect(() => {
    fetch('/api/network-info')
      .then((res) => res.json())
      .then((data) => {
        if (data.localIp && data.localIp !== 'localhost') {
          setNetworkIp(data.localIp);
        }
      })
      .catch(() => {});
  }, []);

  // Listen to Escape key to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowQrModal(false);
        setShowUsersModal(false);
        setShowExitModal(false);
        setUserToKick(null);
        setUserToMakeHost(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isHost = Boolean(
    currentUser && (
      currentUser.role === 'host' ||
      (hostId && currentUser.id === hostId) ||
      users.some((u) => u.id === currentUser.id && u.role === 'host')
    )
  );

  const currentPort = window.location.port ? `:${window.location.port}` : '';
  const mobileRoomUrl = networkIp
    ? `${window.location.protocol}//${networkIp}${currentPort}?room=${roomCode}`
    : `${window.location.origin}?room=${roomCode}`;
  const directRoomUrl = `${window.location.origin}?room=${roomCode}`;
  const activeQrUrl = (qrMode === 'network' && networkIp) ? mobileRoomUrl : directRoomUrl;

  // Eagerly generate crisp, high-contrast SVG and DataURL QR code as soon as URL is known
  useEffect(() => {
    let isCurrent = true;
    setIsGeneratingQr(true);

    // Vector SVG generation for razor-sharp pixel display without anti-aliasing blur
    QRCode.toString(activeQrUrl, {
      type: 'svg',
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((svg) => {
        if (isCurrent) {
          setQrSvg(svg);
          setIsGeneratingQr(false);
        }
      })
      .catch((err) => {
        console.error('Failed to generate QR SVG', err);
        if (isCurrent) setIsGeneratingQr(false);
      });

    // Fallback DataURL generation
    QRCode.toDataURL(activeQrUrl, {
      width: 420,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isCurrent) {
          setQrDataUrl(url);
        }
      })
      .catch((err) => {
        console.error('Failed to generate QR DataURL', err);
      });

    return () => {
      isCurrent = false;
    };
  }, [activeQrUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(activeQrUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleOpenQr = () => {
    setShowQrModal((prev) => !prev);
    setShowUsersModal(false);
  };

  const handleOpenUsers = () => {
    setShowUsersModal((prev) => !prev);
    setShowQrModal(false);
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
    <header className="sticky top-0 z-40 bg-dark-950/85 backdrop-blur-xl border-b border-white/10 px-2.5 py-1.5 sm:px-4 sm:py-3 md:px-8">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-1.5 sm:gap-4">
        {/* Logo & Room Code */}
        <div className="flex items-center gap-1.5 sm:gap-3 md:gap-5 shrink-0">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handleRefresh();
            }}
            title="Refresh MusicSync"
            className="flex items-center group cursor-pointer focus:outline-none transition-transform active:scale-95 shrink-0"
          >
            <Logo size="sm" showText={false} className="sm:hidden" />
            <Logo size="sm" showText={true} className="hidden sm:flex" />
          </a>

          <div className="h-4 sm:h-5 w-[1px] bg-white/10 shrink-0"></div>

          {/* Room Code Badge */}
          <div className="flex items-center gap-1 sm:gap-1.5 bg-dark-900 border border-white/10 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-inner shrink-0">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 hidden sm:inline">Room:</span>
            <span className="font-mono font-bold text-electric-cyan text-xs sm:text-sm tracking-wider sm:tracking-widest">{roomCode}</span>
            <button
              onClick={handleCopyCode}
              title="Copy Room Code"
              className="p-0.5 sm:p-1 hover:text-electric-cyan text-slate-400 transition-colors ml-0.5"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Action Controls & Connected Members */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3 shrink-0">
          {/* Quick Share Link Button */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1 sm:gap-1.5 bg-dark-850 hover:bg-dark-800 border border-white/10 hover:border-electric-cyan/40 text-slate-200 p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-medium transition-all shadow-sm active:scale-95 shrink-0"
            title="Copy shareable room link"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 hidden sm:inline">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-electric-cyan" />
                <span className="hidden md:inline">Share Link</span>
              </>
            )}
          </button>

          {/* Playback History Button (Hidden on extra small screens since it is in main action toolbar) */}
          <button
            onClick={onOpenHistory}
            className="hidden sm:flex items-center gap-1.5 bg-dark-850 hover:bg-dark-800 border border-white/10 hover:border-electric-cyan/40 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shadow-sm active:scale-95"
            title="View Music Playback History"
          >
            <History className="w-3.5 h-3.5 text-electric-cyan" />
            <span className="hidden sm:inline">History</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-electric-cyan/20 text-electric-cyan text-[10px] font-mono font-bold">
                {historyCount}
              </span>
            )}
          </button>

          {/* Mobile QR Code Popover right at the button */}
          <div className="relative">
            <button
              onClick={handleOpenQr}
              className={`p-1.5 sm:p-2 rounded-xl border transition-all active:scale-95 shrink-0 ${
                showQrModal
                  ? 'bg-electric-purple/20 border-electric-purple text-electric-purple shadow-lg shadow-electric-purple/20'
                  : 'bg-dark-850 hover:bg-dark-800 border-white/10 text-slate-300 hover:text-white'
              }`}
              title="Show QR Code for phones"
            >
              <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-electric-purple" />
            </button>

            {/* QR Popover Menu */}
            {showQrModal && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-2 z-50 w-72 sm:w-80 max-w-[calc(100vw-24px)] bg-dark-900 border border-white/15 rounded-2xl shadow-2xl overflow-hidden animate-popover-spring flex flex-col"
              >
                {/* Popover Header */}
                <div className="p-3 border-b border-white/10 flex items-center justify-between bg-dark-950/70 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-electric-cyan/10 text-electric-cyan">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white leading-tight">Connect Device</h4>
                      <p className="text-[10px] text-slate-400 leading-tight">Scan with phone camera</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowQrModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Popover Body */}
                <div className="p-3 flex flex-col items-center text-center space-y-2.5">
                  {/* Network / Local URL Mode Switcher */}
                  {networkIp && (
                    <div className="flex bg-dark-950 p-1 rounded-xl border border-white/5 w-full text-[11px]">
                      <button
                        type="button"
                        onClick={() => setQrMode('network')}
                        className={`flex-1 py-1 rounded-lg font-medium transition-all ${
                          qrMode === 'network'
                            ? 'bg-electric-cyan text-black font-bold shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        📱 Wi-Fi
                      </button>
                      <button
                        type="button"
                        onClick={() => setQrMode('direct')}
                        className={`flex-1 py-1 rounded-lg font-medium transition-all ${
                          qrMode === 'direct'
                            ? 'bg-dark-800 text-white font-bold border border-white/10 shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        💻 Local
                      </button>
                    </div>
                  )}

                  {/* High-Contrast Pure White QR Canvas */}
                  <div className="bg-white p-2.5 rounded-xl shadow-lg border-2 border-white inline-flex items-center justify-center my-0.5">
                    {qrSvg ? (
                      <div
                        className="w-44 h-44 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:block select-none"
                        dangerouslySetInnerHTML={{ __html: qrSvg }}
                      />
                    ) : qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt={`Room ${roomCode} QR Code`}
                        className="w-44 h-44 block object-contain select-none"
                      />
                    ) : (
                      <div className="w-44 h-44 flex flex-col items-center justify-center gap-2 text-slate-700">
                        <Loader2 className="w-6 h-6 text-black animate-spin" />
                        <span className="text-[10px] font-mono">Generating QR...</span>
                      </div>
                    )}
                  </div>

                  {/* Room Code Badge */}
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Room:</span>
                    <span className="text-xs font-mono font-black text-electric-cyan tracking-widest bg-dark-950 px-2.5 py-0.5 rounded-md border border-white/10">
                      {roomCode}
                    </span>
                  </div>

                  {/* URL String */}
                  <div className="text-[10px] font-mono text-slate-300 bg-dark-950 py-1 px-2.5 rounded-lg border border-white/5 w-full truncate select-all">
                    {activeQrUrl}
                  </div>
                </div>

                {/* Popover Footer */}
                <div className="p-2 border-t border-white/10 bg-dark-950/60 shrink-0 flex flex-col gap-1.5">
                  <button
                    onClick={handleCopyLink}
                    className="w-full py-2 rounded-xl bg-electric-cyan text-black font-bold text-xs hover:bg-white transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-black" />
                        <span>Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Shareable Link</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowQrModal(false)}
                    className="w-full py-1.5 rounded-xl bg-dark-850 hover:bg-dark-800 border border-white/10 text-slate-300 hover:text-white font-medium text-xs transition-colors active:scale-95"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Connected Devices Popover right at the button */}
          <div className="relative shrink-0">
            <button
              onClick={handleOpenUsers}
              className={`flex items-center gap-1 sm:gap-2 border px-1.5 sm:px-3 py-1.5 rounded-xl text-xs transition-all active:scale-95 shrink-0 ${
                showUsersModal
                  ? 'bg-electric-cyan/20 border-electric-cyan text-white shadow-lg shadow-electric-cyan/20'
                  : 'bg-dark-850 hover:bg-dark-800 border-white/10'
              }`}
              title="Connected Devices"
            >
              <div className="flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-electric-cyan sm:hidden" />
                <div className="hidden sm:flex -space-x-1.5 overflow-hidden">
                  {users.slice(0, 3).map((u) => (
                    <div
                      key={u.id}
                      style={{ backgroundColor: u.avatarColor || '#00f0ff' }}
                      className="w-5 h-5 rounded-full border border-dark-900 flex items-center justify-center text-[9px] font-bold text-black"
                    >
                      {u.name.charAt(0)}
                    </div>
                  ))}
                </div>
                <span className="font-semibold text-white text-xs">{users.length}</span>
                <span className="text-slate-400 hidden lg:inline">Devices</span>
              </div>
            </button>

            {/* Devices Popover Menu */}
            {showUsersModal && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 max-w-[calc(100vw-24px)] max-h-[75vh] bg-dark-900 border border-white/15 rounded-2xl shadow-2xl overflow-hidden animate-popover-spring flex flex-col"
              >
                {/* Popover Header */}
                <div className="p-3 border-b border-white/10 flex items-center justify-between bg-dark-950/70 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-electric-cyan/10 text-electric-cyan">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-white leading-tight">Connected Devices</h4>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-electric-cyan/10 text-electric-cyan border border-electric-cyan/30 font-mono font-bold">
                          {users.length}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight">Synced audio network</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowUsersModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Master Speaker Volume Control Card */}
                {currentUser?.id === hostId || currentUser?.role === 'host' ? (
                  <div className="p-3 m-2.5 mb-1 rounded-xl bg-gradient-to-r from-amber-500/15 to-electric-cyan/15 border border-amber-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="text-xs font-bold text-white">Party Master Volume</span>
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
                        className="text-slate-400 hover:text-white transition-colors active:scale-95"
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

                    {/* Quick Presets */}
                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-white/10 text-[10px]">
                      <button
                        onClick={() => socket.emit('set_master_volume', { volume: 0 })}
                        className="px-2 py-0.5 rounded-md bg-dark-900 hover:bg-dark-850 text-slate-400 hover:text-white border border-white/5 transition-all active:scale-95"
                      >
                        Mute
                      </button>
                      <button
                        onClick={() => socket.emit('set_master_volume', { volume: 0.3 })}
                        className="px-2 py-0.5 rounded-md bg-dark-900 hover:bg-dark-850 text-slate-300 hover:text-white border border-white/5 transition-all active:scale-95"
                      >
                        30%
                      </button>
                      <button
                        onClick={() => socket.emit('set_master_volume', { volume: 0.6 })}
                        className="px-2 py-0.5 rounded-md bg-dark-900 hover:bg-dark-850 text-slate-300 hover:text-white border border-white/5 transition-all active:scale-95"
                      >
                        60%
                      </button>
                      <button
                        onClick={() => socket.emit('set_master_volume', { volume: 0.85 })}
                        className="px-2 py-0.5 rounded-md bg-dark-900 hover:bg-dark-850 text-amber-400 hover:text-amber-300 border border-white/5 transition-all active:scale-95 font-semibold"
                      >
                        85%
                      </button>
                      <button
                        onClick={() => socket.emit('set_master_volume', { volume: 1 })}
                        className="px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all active:scale-95 font-bold"
                      >
                        MAX
                      </button>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1.5 text-center">
                      Controls volume across all {users.length} connected devices in real time
                    </p>
                  </div>
                ) : (
                  <div className="px-3 py-2 m-2.5 mb-1 rounded-xl bg-dark-950 border border-white/10 flex items-center justify-between text-[11px]">
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

                {/* Popover Body - Speaker list */}
                <div className="p-2.5 overflow-y-auto flex-1 space-y-1.5">
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
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                          isMe
                            ? 'bg-dark-950/90 border-electric-cyan/20 shadow-sm'
                            : 'bg-dark-950 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            style={{ backgroundColor: u.avatarColor || '#00f0ff' }}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-black shadow-sm shrink-0"
                          >
                            {u.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-semibold text-white truncate max-w-[110px] sm:max-w-[140px]">
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
                                  <Volume2 className="w-2.5 h-2.5" /> Active
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
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <button
                              onClick={() => handleMakeHost(u)}
                              className="p-1 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 hover:border-amber-500/60 text-amber-400 hover:text-amber-300 text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-sm shadow-amber-500/10"
                              title={`Make "${u.name}" the Room Host`}
                            >
                              <Crown className="w-3 h-3" />
                              <span>Make Host</span>
                            </button>

                            <button
                              onClick={() => handleKickUser(u)}
                              className="p-1 px-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/35 hover:border-red-500/60 text-red-400 hover:text-red-300 text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-sm shadow-red-500/10"
                              title={`Kick "${u.name}" from room`}
                            >
                              <UserX className="w-3 h-3" />
                              <span>Kick</span>
                            </button>
                          </div>
                        ) : isMe ? (
                          <span className="text-[10px] text-slate-500 italic pr-1">Host</span>
                        ) : null}
                      </div>
                    );
                  })}

                  {/* If no other devices connected yet, explain clearly how Kick works & offer 1-click test */}
                  {isHost && users.filter((u) => u.id !== currentUser?.id).length === 0 && (
                    <div className="p-3 rounded-xl bg-dark-950/80 border border-dashed border-white/15 text-center space-y-2 mt-2">
                      <div className="flex items-center justify-center gap-1.5 text-amber-400 text-xs font-semibold">
                        <Crown className="w-3.5 h-3.5" />
                        <span>1 Device Connected (Host)</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed px-1">
                        You cannot kick your own device. When other phones or laptops join using Room Code <span className="font-mono text-electric-cyan font-bold">{roomCode}</span> or QR code, the <span className="text-amber-400 font-bold">Make Host</span> and <span className="text-red-400 font-bold">Kick</span> buttons will appear next to their name.
                      </p>
                      <div className="flex items-center justify-center pt-1">
                        <button
                          onClick={() => {
                            setShowUsersModal(false);
                            setShowQrModal(true);
                          }}
                          className="text-[11px] px-3 py-1.5 rounded-lg bg-electric-cyan/15 hover:bg-electric-cyan/25 text-electric-cyan border border-electric-cyan/30 transition-all flex items-center gap-1.5 font-semibold active:scale-95"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Scan QR to Connect Device</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Helpful footer text when guest devices exist */}
                  {isHost && users.filter((u) => u.id !== currentUser?.id).length > 0 && (
                    <div className="px-1 pt-1.5 text-[10px] text-slate-500 text-center">
                      Tap <span className="text-amber-400 font-semibold">Make Host</span> to transfer host, or <span className="text-red-400 font-semibold">Kick</span> to remove
                    </div>
                  )}
                </div>

                {/* Popover Footer */}
                <div className="p-2 border-t border-white/10 bg-dark-950/60 shrink-0">
                  <button
                    onClick={() => setShowUsersModal(false)}
                    className="w-full py-1.5 rounded-xl bg-dark-850 hover:bg-dark-800 border border-white/10 text-slate-300 hover:text-white font-medium text-xs transition-colors active:scale-95"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Exit Room Button */}
          {onLeaveRoom && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowExitModal(true);
              }}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-dark-850 hover:bg-red-500/15 border border-white/10 hover:border-red-500/30 text-slate-300 hover:text-red-400 text-xs font-semibold transition-all active:scale-95 shrink-0 select-none cursor-pointer"
              title="Exit Room"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 shrink-0" />
              <span>Exit</span>
              <span className="hidden sm:inline">Room</span>
            </button>
          )}
        </div>
      </div>

      {/* Click-outside backdrop for popovers */}
      {(showQrModal || showUsersModal) && (
        <div
          onClick={() => {
            setShowQrModal(false);
            setShowUsersModal(false);
          }}
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px]"
        />
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
    </header>
  );
};
