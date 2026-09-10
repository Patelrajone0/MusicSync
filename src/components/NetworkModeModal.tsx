import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Wifi, Globe, Zap, Check, Copy, X, QrCode, Smartphone, Info } from 'lucide-react';
import QRCode from 'qrcode';

export type NetworkMode = 'local' | 'online';

interface NetworkModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string | null;
  currentMode: NetworkMode;
  onSelectMode: (mode: NetworkMode) => void;
}

export const NetworkModeModal: React.FC<NetworkModeModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  currentMode,
  onSelectMode,
}) => {
  const [selectedTab, setSelectedTab] = useState<NetworkMode>(currentMode);
  const [localIp, setLocalIp] = useState<string>('');
  const [localUrl, setLocalUrl] = useState<string>('');
  const [onlineUrl, setOnlineUrl] = useState<string>('');
  const [localQr, setLocalQr] = useState<string>('');
  const [onlineQr, setOnlineQr] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Fetch local network IP from server if on localhost, otherwise use current live origin
  useEffect(() => {
    if (!isOpen) return;

    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    setOnlineUrl(currentOrigin);

    if (isLocalhost) {
      fetch('/api/network-info')
        .then((res) => res.json())
        .then((data) => {
          if (data.localIp && data.localIp !== 'localhost' && !data.isCloud) {
            setLocalIp(data.localIp);
            const port = window.location.port ? `:${window.location.port}` : '';
            setLocalUrl(`http://${data.localIp}${port}`);
          } else {
            setLocalUrl(currentOrigin);
          }
        })
        .catch(() => {
          setLocalUrl(currentOrigin);
        });
    } else {
      // On live production deployments, local mode operates over the live domain with 0ms sync
      setLocalUrl(currentOrigin);
    }
  }, [isOpen, isLocalhost]);

  // Construct valid join URLs with mode query parameter
  const roomParam = roomCode ? `?room=${roomCode}` : '';
  const localModeParam = roomParam ? `${roomParam}&mode=local` : '?mode=local';
  const onlineModeParam = roomParam ? `${roomParam}&mode=online` : '?mode=online';

  const basePath = typeof window !== 'undefined' ? (window.location.pathname || '') : '';
  const currentLocalJoinUrl = localUrl ? `${localUrl}${basePath}${localModeParam}` : '';
  const currentOnlineJoinUrl = onlineUrl ? `${onlineUrl}${basePath}${onlineModeParam}` : '';

  // Generate QR codes for both modes
  useEffect(() => {
    if (!isOpen) return;

    // Generate Local QR
    const targetLocal = currentLocalJoinUrl || (typeof window !== 'undefined' ? window.location.href : '');
    QRCode.toDataURL(targetLocal, {
      width: 200,
      margin: 1.5,
      color: { dark: '#040812', light: '#ffffff' },
    })
      .then((url) => setLocalQr(url))
      .catch(() => {});

    // Generate Online QR
    const targetOnline = currentOnlineJoinUrl || (typeof window !== 'undefined' ? window.location.href : '');
    QRCode.toDataURL(targetOnline, {
      width: 200,
      margin: 1.5,
      color: { dark: '#040812', light: '#ffffff' },
    })
      .then((url) => setOnlineQr(url))
      .catch(() => {});
  }, [isOpen, currentLocalJoinUrl, currentOnlineJoinUrl]);

  useEffect(() => {
    setSelectedTab(currentMode);
  }, [currentMode]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleCopy = (url: string, type: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedLink(type);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleApplyMode = (mode: NetworkMode) => {
    onSelectMode(mode);
    onClose();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-dark-900/98 border border-white/15 rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl animate-popover-spring flex flex-col p-4 sm:p-6 select-none my-auto"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_12px_rgba(0,240,255,0.25)]">
              {currentMode === 'local' ? <Wifi className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                Network Mode
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 uppercase">
                  Multi-Mesh
                </span>
              </h3>
              <p className="text-xs text-slate-400">Choose how devices connect to this room</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs / Cards */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          {/* 1. Local Wi-Fi Card */}
          <button
            type="button"
            onClick={() => setSelectedTab('local')}
            className={`flex flex-col text-left p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer active:scale-98 ${
              selectedTab === 'local'
                ? 'bg-emerald-950/40 border-emerald-400/80 shadow-[0_0_20px_rgba(52,211,153,0.25)] ring-1 ring-emerald-400/50'
                : 'bg-dark-950 hover:bg-dark-850 border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white">
                <Wifi className={`w-4 h-4 ${selectedTab === 'local' ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>Local Wi-Fi</span>
              </span>
              {currentMode === 'local' && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  ACTIVE
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold mb-1">
              <Zap className="w-3 h-3 fill-emerald-400 shrink-0" />
              <span>Same Network Only · 0ms Lag</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Same Wi-Fi / Hotspot only. Outside networks blocked.
            </p>
          </button>

          {/* 2. Online Cloud Card */}
          <button
            type="button"
            onClick={() => setSelectedTab('online')}
            className={`flex flex-col text-left p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer active:scale-98 ${
              selectedTab === 'online'
                ? 'bg-cyan-950/40 border-cyan-400/80 shadow-[0_0_20px_rgba(0,240,255,0.25)] ring-1 ring-cyan-400/50'
                : 'bg-dark-950 hover:bg-dark-850 border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white">
                <Globe className={`w-4 h-4 ${selectedTab === 'online' ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>Online Cloud</span>
              </span>
              {currentMode === 'online' && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  ACTIVE
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 font-bold mb-1">
              <Globe className="w-3 h-3 shrink-0" />
              <span>Open to All · 4G/5G</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Any network can join from anywhere.
            </p>
          </button>
        </div>

        {/* Selected Mode Deep-Dive Details */}
        {selectedTab === 'local' ? (
          <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-950/30 to-dark-950 border border-emerald-500/20 space-y-3.5 mb-4">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0 mt-0.5">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">
                  Connect Nearby Devices on Same Wi-Fi
                </h4>
                <p className="text-[11px] text-slate-300 mt-1">
                  Connect all phones to the <span className="text-emerald-400 font-semibold">same Wi-Fi or mobile hotspot</span>. Devices on outside networks or mobile data cannot join this room.
                </p>
              </div>
            </div>

            {/* QR Code & Join Link Display */}
            <div className="flex flex-col sm:flex-row items-center gap-3.5 bg-dark-950/80 p-3 rounded-xl border border-white/10">
              {localQr ? (
                <div className="p-2 bg-white rounded-xl shadow-lg shrink-0">
                  <img src={localQr} alt="Local Wi-Fi QR Code" className="w-28 h-28 object-contain block" />
                </div>
              ) : (
                <div className="w-28 h-28 rounded-xl bg-dark-900 border border-white/10 flex items-center justify-center text-slate-500 shrink-0">
                  <QrCode className="w-8 h-8" />
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-2 w-full text-center sm:text-left">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    {isLocalhost && localIp ? `Local Wi-Fi URL (Host LAN: ${localIp})` : 'Direct Local-Sync Link (0ms Delay)'}
                  </span>
                  <div className="text-xs font-mono font-bold text-emerald-300 truncate select-all mt-0.5">
                    {currentLocalJoinUrl || (typeof window !== 'undefined' ? window.location.href : '')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(currentLocalJoinUrl, 'local')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                >
                  {copiedLink === 'local' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink === 'local' ? 'Copied Link!' : 'Copy Local Link'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-dark-950/50 p-2 rounded-lg">
              <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Strict Network Rule: Devices must be on the host's Wi-Fi. Outside networks are blocked from joining.</span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-gradient-to-b from-cyan-950/30 to-dark-950 border border-cyan-500/20 space-y-3.5 mb-4">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shrink-0 mt-0.5">
                <Globe className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">
                  Open to Everyone (Any Network & 4G/5G)
                </h4>
                <p className="text-[11px] text-slate-300 mt-1">
                  Open for all! Allows friends on cellular data (4G/5G) or outside Wi-Fi networks to connect and sync from anywhere in the world.
                </p>
              </div>
            </div>

            {/* QR Code & Join Link Display */}
            <div className="flex flex-col sm:flex-row items-center gap-3.5 bg-dark-950/80 p-3 rounded-xl border border-white/10">
              {onlineQr ? (
                <div className="p-2 bg-white rounded-xl shadow-lg shrink-0">
                  <img src={onlineQr} alt="Online Cloud QR Code" className="w-28 h-28 object-contain block" />
                </div>
              ) : (
                <div className="w-28 h-28 rounded-xl bg-dark-900 border border-white/10 flex items-center justify-center text-slate-500 shrink-0">
                  <QrCode className="w-8 h-8" />
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-2 w-full text-center sm:text-left">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    Public Cloud URL
                  </span>
                  <div className="text-xs font-mono font-bold text-cyan-300 truncate select-all mt-0.5">
                    {currentOnlineJoinUrl || 'Loading public URL...'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(currentOnlineJoinUrl, 'online')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                >
                  {copiedLink === 'online' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink === 'online' ? 'Copied Link!' : 'Copy Online Link'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-dark-950/50 p-2 rounded-lg">
              <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Anyone with an internet connection can join through this URL.</span>
            </div>
          </div>
        )}

        {/* Action Button: Set Active Mode */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-colors active:scale-95 cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => handleApplyMode(selectedTab)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedTab === 'local'
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/25'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/25'
            }`}
          >
            {selectedTab === 'local' ? <Zap className="w-3.5 h-3.5 fill-current" /> : <Globe className="w-3.5 h-3.5" />}
            <span>Set as {selectedTab === 'local' ? 'Local Wi-Fi Mode' : 'Online Cloud Mode'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
