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
  onSelectMode?: (mode: NetworkMode) => void;
}

export const NetworkModeModal: React.FC<NetworkModeModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  currentMode,
}) => {
  const [localIp, setLocalIp] = useState<string>('');
  const [localUrl, setLocalUrl] = useState<string>('');
  const [onlineUrl, setOnlineUrl] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  const isLocalMode = currentMode === 'local';
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

  // Construct valid join URL for the active room mode
  const roomParam = roomCode ? `?room=${roomCode}` : '';
  const modeParam = roomParam ? `${roomParam}&mode=${currentMode}` : `?mode=${currentMode}`;
  const basePath = typeof window !== 'undefined' ? (window.location.pathname || '') : '';
  const activeBaseUrl = isLocalMode ? (localUrl || onlineUrl) : onlineUrl;
  const currentJoinUrl = activeBaseUrl ? `${activeBaseUrl}${basePath}${modeParam}` : '';

  // Generate QR code for this specific room mode
  useEffect(() => {
    if (!isOpen) return;

    const targetUrl = currentJoinUrl || (typeof window !== 'undefined' ? window.location.href : '');
    QRCode.toDataURL(targetUrl, {
      width: 210,
      margin: 1.5,
      color: { dark: '#040812', light: '#ffffff' },
    })
      .then((url) => setQrCodeUrl(url))
      .catch(() => {});
  }, [isOpen, currentJoinUrl]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleCopy = () => {
    if (!currentJoinUrl) return;
    navigator.clipboard.writeText(currentJoinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
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
        {/* Modal Header: Displays Current Room Type */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${
                isLocalMode
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                  : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
              }`}
            >
              {isLocalMode ? <Wifi className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                {isLocalMode ? 'Local Wi-Fi Room' : 'Online Cloud Room'}
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase border ${
                    isLocalMode
                      ? 'bg-emerald-950/80 border-emerald-400/40 text-emerald-300'
                      : 'bg-cyan-950/80 border-cyan-400/40 text-cyan-300'
                  }`}
                >
                  {isLocalMode ? '0ms Delay' : 'Worldwide'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {isLocalMode
                  ? 'Strict same-network mode for zero-latency playback'
                  : 'Open for all devices on any network (4G/5G/Wi-Fi)'}
              </p>
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

        {/* Room Type Card & QR Details */}
        <div
          className={`p-4 rounded-2xl border space-y-3.5 mb-4 ${
            isLocalMode
              ? 'bg-gradient-to-b from-emerald-950/30 to-dark-950 border-emerald-500/20'
              : 'bg-gradient-to-b from-cyan-950/30 to-dark-950 border-cyan-500/20'
          }`}
        >
          {/* Header summary in card */}
          <div className="flex items-start gap-2.5">
            <div
              className={`p-2 rounded-xl border shrink-0 mt-0.5 ${
                isLocalMode
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
              }`}
            >
              {isLocalMode ? <Smartphone className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">
                {isLocalMode ? 'Connect Nearby Devices on Same Wi-Fi' : 'Connect from Any Network or Cellular Data'}
              </h4>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                {isLocalMode ? (
                  <>
                    Connect devices to the{' '}
                    <span className="text-emerald-400 font-semibold">same Wi-Fi or mobile hotspot</span>. Outside
                    networks and cellular data are blocked to ensure true 0ms delay.
                  </>
                ) : (
                  <>
                    Open to everyone! Friends on <span className="text-cyan-400 font-semibold">cellular data (4G/5G)</span>{' '}
                    or outside Wi-Fi networks can sync and listen together worldwide.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* QR Code & Join Link Display */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5 bg-dark-950/80 p-3 rounded-xl border border-white/10">
            {qrCodeUrl ? (
              <div className="p-2 bg-white rounded-xl shadow-lg shrink-0">
                <img
                  src={qrCodeUrl}
                  alt={`${isLocalMode ? 'Local Wi-Fi' : 'Online Cloud'} QR Code`}
                  className="w-28 h-28 object-contain block"
                />
              </div>
            ) : (
              <div className="w-28 h-28 rounded-xl bg-dark-900 border border-white/10 flex items-center justify-center text-slate-500 shrink-0">
                <QrCode className="w-8 h-8" />
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-2 w-full text-center sm:text-left">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  {isLocalMode
                    ? isLocalhost && localIp
                      ? `Local Wi-Fi URL (Host LAN: ${localIp})`
                      : 'Direct Local-Sync Link (0ms Delay)'
                    : 'Public Online Cloud URL'}
                </span>
                <div
                  className={`text-xs font-mono font-bold truncate select-all mt-0.5 ${
                    isLocalMode ? 'text-emerald-300' : 'text-cyan-300'
                  }`}
                >
                  {currentJoinUrl || (typeof window !== 'undefined' ? window.location.href : '')}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-md ${
                  isLocalMode
                    ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                    : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40'
                }`}
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied Link!' : isLocalMode ? 'Copy Local Link' : 'Copy Online Link'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-dark-950/50 p-2 rounded-lg">
            <Info className={`w-3.5 h-3.5 shrink-0 ${isLocalMode ? 'text-emerald-400' : 'text-cyan-400'}`} />
            <span>
              {isLocalMode
                ? 'Nearby devices can scan this QR code with their camera to join with 0ms latency.'
                : 'Anyone with an internet connection can scan this QR code to join.'}
            </span>
          </div>
        </div>

        {/* Modal Footer: Simple Close Button (No mode switching) */}
        <div className="pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-white text-xs font-bold border border-white/10 transition-colors active:scale-95 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
