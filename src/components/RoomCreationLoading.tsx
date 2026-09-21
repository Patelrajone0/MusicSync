import React, { useState, useEffect } from 'react';
import { Sparkles, Check, X, RotateCcw, LayoutGrid, Maximize2, ArrowRight } from 'lucide-react';

export type RoomCreateTheme = 'demo1' | 'demo2' | 'demo3' | 'demo4';

interface RoomCreationCardProps {
  theme: RoomCreateTheme;
  isCompact?: boolean;
  onAnimationEnd?: () => void;
  autoPlay?: boolean;
}

export const RoomCreationContent: React.FC<RoomCreationCardProps> = ({
  theme,
  isCompact = false,
  onAnimationEnd,
  autoPlay = true,
}) => {
  const [step, setStep] = useState(1);
  const totalDashes = theme === 'demo3' ? 10 : 8;

  // Animated telemetry numbers
  const [pairsSent, setPairsSent] = useState(6);
  const [pureMeasurements, setPureMeasurements] = useState(4);
  const [impureMeasurements, setImpureMeasurements] = useState(1);
  const [measurements, setMeasurements] = useState(3);
  const [audioStatus, setAudioStatus] = useState('0 loaded');
  const [wsStatus, setWsStatus] = useState('open');

  useEffect(() => {
    if (!autoPlay) return;

    setStep(1);
    setPairsSent(6);
    setPureMeasurements(4);
    setImpureMeasurements(1);
    setMeasurements(3);
    setAudioStatus('0 loaded');
    setWsStatus('open');

    const totalSteps = totalDashes;
    const intervalMs = 210; // ~1.7s total cycle

    const interval = setInterval(() => {
      setStep((prev) => {
        const next = prev + 1;
        // Dynamically increment telemetry counters realistically
        setPairsSent((p) => Math.min(32, p + Math.floor(Math.random() * 4 + 2)));
        setMeasurements((m) => Math.min(16, m + Math.floor(Math.random() * 2 + 1)));

        if (next >= 4) {
          setPureMeasurements((val) => Math.min(14, val + 2));
          setImpureMeasurements((val) => Math.min(9, val + 1));
        }
        if (next >= 6) {
          setAudioStatus('1 ready');
        }
        if (next >= totalSteps) {
          setMeasurements(16);
          setPureMeasurements(14);
          setImpureMeasurements(9);
          setPairsSent(29);
          clearInterval(interval);
          if (onAnimationEnd) {
            setTimeout(onAnimationEnd, 350);
          }
          return totalSteps;
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [autoPlay, totalDashes, onAnimationEnd]);

  // =========================================================================
  // DEMO 1: EXACT BEATSYNC REPLICA (From User Screenshot)
  // =========================================================================
  if (theme === 'demo1') {
    return (
      <div
        className={`relative w-full ${
          isCompact ? 'max-w-[340px] p-5' : 'max-w-[430px] p-6 sm:p-7'
        } rounded-2xl bg-[#121417]/95 border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_25px_rgba(0,0,0,0.7)] text-left select-none backdrop-blur-xl font-sans`}
      >
        {/* Header: Green pulsing dot + Title + Subtitle */}
        <div className="flex flex-col items-center text-center space-y-1 mb-5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_10px_#34d399]" />
            </span>
            <h3 className={`${isCompact ? 'text-sm' : 'text-base'} font-semibold text-white tracking-tight`}>
              Beatsync calibrating
            </h3>
          </div>
          <p className={`${isCompact ? 'text-[11px]' : 'text-xs'} text-zinc-400 font-normal`}>
            {step >= totalDashes ? 'Time synchronized • Ready' : 'Synchronizing time...'}
          </p>
        </div>

        {/* 8 Segmented White Glowing Dashes */}
        <div className="grid grid-cols-8 gap-1.5 sm:gap-2 my-5 px-1">
          {Array.from({ length: 8 }).map((_, i) => {
            const isFilled = i < step;
            return (
              <div
                key={i}
                className={`h-1 sm:h-1.5 rounded-full transition-all duration-150 ${
                  isFilled
                    ? 'bg-white shadow-[0_0_14px_rgba(255,255,255,0.95),0_0_24px_rgba(255,255,255,0.6)]'
                    : 'bg-white/[0.12]'
                }`}
              />
            );
          })}
        </div>

        {/* Monospace 2-Column Telemetry Table (Faithful Replica) */}
        <div className="space-y-1.5 font-mono text-[11px] sm:text-xs text-zinc-400 pt-1">
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">pairs sent</span>
            <span className="text-zinc-300 font-medium tabular-nums">{pairsSent}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">pure / impure</span>
            <span className="text-zinc-300 font-medium tabular-nums">{pureMeasurements} / {impureMeasurements}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">measurements</span>
            <span className="text-zinc-300 font-medium tabular-nums">{measurements} / 16</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">audio</span>
            <span className="text-zinc-300 font-medium">{audioStatus}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">ws</span>
            <span className="text-emerald-400 font-medium">{wsStatus}</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // DEMO 2: MUSICSYNC EMERALD AUDIO MESH (Brand Edition)
  // =========================================================================
  if (theme === 'demo2') {
    return (
      <div
        className={`relative w-full ${
          isCompact ? 'max-w-[340px] p-5' : 'max-w-[430px] p-6 sm:p-7'
        } rounded-2xl bg-[#0f1214]/95 border border-emerald-500/25 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(16,185,129,0.12)] text-left select-none backdrop-blur-xl font-sans`}
      >
        {/* Soft emerald ambient backlight */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-1 mb-5 relative z-10">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_12px_#34d399]" />
            </span>
            <h3 className={`${isCompact ? 'text-sm' : 'text-base'} font-bold text-white tracking-tight`}>
              MusicSync calibrating
            </h3>
          </div>
          <p className={`${isCompact ? 'text-[11px]' : 'text-xs'} text-emerald-400/80 font-mono`}>
            {step >= totalDashes ? '0ms P2P Mesh Locked • Ready' : 'Locking 0ms acoustic sync...'}
          </p>
        </div>

        {/* 8 Segmented Emerald-to-Cyan Glowing Dashes */}
        <div className="grid grid-cols-8 gap-1.5 sm:gap-2 my-5 px-1 relative z-10">
          {Array.from({ length: 8 }).map((_, i) => {
            const isFilled = i < step;
            return (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-150 ${
                  isFilled
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-200 shadow-[0_0_12px_rgba(52,211,153,0.9),0_0_20px_rgba(16,185,129,0.5)]'
                    : 'bg-emerald-950/40 border border-emerald-500/20'
                }`}
              />
            );
          })}
        </div>

        {/* Monospace Telemetry */}
        <div className="space-y-1.5 font-mono text-[11px] sm:text-xs text-zinc-400 pt-1 relative z-10">
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">p2p mesh sync</span>
            <span className="text-zinc-200 font-semibold tabular-nums">{pairsSent} nodes</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">clock offset</span>
            <span className="text-emerald-400 font-semibold tabular-nums">0.00 ms</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">ntp measurements</span>
            <span className="text-zinc-200 font-semibold tabular-nums">{measurements} / 16</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">lossless stream</span>
            <span className="text-zinc-200 font-semibold">48kHz</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">relay status</span>
            <span className="text-emerald-400 font-semibold uppercase">{step >= totalDashes ? 'LOCKED' : 'SYNCING'}</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // DEMO 3: CYBER HUD TERMINAL (10 Dashes with Technical Framing)
  // =========================================================================
  if (theme === 'demo3') {
    return (
      <div
        className={`relative w-full ${
          isCompact ? 'max-w-[340px] p-5' : 'max-w-[430px] p-6 sm:p-7'
        } rounded-2xl bg-[#0d1015]/95 border border-cyan-500/25 shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_30px_rgba(0,240,255,0.12)] text-left select-none backdrop-blur-xl font-mono`}
      >
        {/* Header with technical badge */}
        <div className="flex justify-between items-center mb-4 border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f0ff]" />
            <span className="text-xs font-bold text-white tracking-widest uppercase">
              BEATSYNC // CALIBRATION
            </span>
          </div>
          <span className="text-[10px] text-cyan-400 font-bold bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded">
            {step >= totalDashes ? '100% LOCKED' : `${Math.round((step / totalDashes) * 100)}%`}
          </span>
        </div>

        <p className="text-[11px] text-zinc-400 mb-4 tracking-wide">
          {step >= totalDashes ? '> Audio sub-millisecond clock locked' : '> Synchronizing P2P audio frames...'}
        </p>

        {/* 10 Segmented Cyan Laser Dashes */}
        <div className="grid grid-cols-10 gap-1.5 my-4">
          {Array.from({ length: 10 }).map((_, i) => {
            const isFilled = i < step;
            return (
              <div
                key={i}
                className={`h-1.5 rounded-sm transition-all duration-150 ${
                  isFilled
                    ? 'bg-gradient-to-r from-cyan-400 to-sky-200 shadow-[0_0_12px_rgba(0,240,255,0.9)]'
                    : 'bg-cyan-950/40 border border-cyan-500/20'
                }`}
              />
            );
          })}
        </div>

        {/* Telemetry Matrix */}
        <div className="space-y-1.5 text-[11px] text-zinc-400 pt-2 border-t border-white/[0.06]">
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">[SYS] packets sent</span>
            <span className="text-cyan-300 tabular-nums">{pairsSent}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">[NTP] clock jitter</span>
            <span className="text-cyan-300 tabular-nums">&lt;0.05ms</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">[DEV] buffer samples</span>
            <span className="text-cyan-300 tabular-nums">{measurements} / 16</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">[NET] websocket link</span>
            <span className="text-emerald-400">ESTABLISHED</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // DEMO 4: MINIMALIST TITANIUM STUDIO (Clean Apple Studio Minimal)
  // =========================================================================
  return (
    <div
      className={`relative w-full ${
        isCompact ? 'max-w-[340px] p-5' : 'max-w-[430px] p-6 sm:p-7'
      } rounded-2xl bg-[#111114]/95 border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.9)] text-center select-none backdrop-blur-xl font-sans`}
    >
      {/* Miniature Floating Titanium Logo */}
      <div className="flex justify-center mb-3">
        <img
          src="/musicsync-titanium.png?v=3"
          alt="MusicSync"
          className="w-full max-w-[170px] h-auto object-contain drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]"
        />
      </div>

      <div className="flex items-center justify-center gap-1.5 mb-4">
        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
        <span className="text-xs font-semibold text-zinc-300">
          {step >= totalDashes ? 'Ready to enter room' : 'Calibrating room sync...'}
        </span>
      </div>

      {/* 8 Clean Platinum / White Dashes */}
      <div className="grid grid-cols-8 gap-1.5 sm:gap-2 my-4 px-2">
        {Array.from({ length: 8 }).map((_, i) => {
          const isFilled = i < step;
          return (
            <div
              key={i}
              className={`h-1 sm:h-1.5 rounded-full transition-all duration-150 ${
                isFilled
                  ? 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]'
                  : 'bg-zinc-800'
              }`}
            />
          );
        })}
      </div>

      {/* Clean Telemetry Line */}
      <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 pt-2 px-1">
        <span>MEASUREMENTS {measurements}/16</span>
        <span className="text-emerald-400 font-bold">0ms LOCKED</span>
      </div>
    </div>
  );
};

// ===========================================================================
// FULLSCREEN ROOM CREATION OVERLAY (Shown when user clicks Create Room)
// ===========================================================================
interface RoomCreationOverlayProps {
  onComplete: () => void;
  theme?: RoomCreateTheme;
}

export const RoomCreationOverlay: React.FC<RoomCreationOverlayProps> = ({
  onComplete,
  theme = 'demo1',
}) => {
  const [selectedTheme] = useState<RoomCreateTheme>(() => {
    try {
      return (localStorage.getItem('musicsync_create_theme') as RoomCreateTheme) || theme;
    } catch {
      return theme;
    }
  });

  return (
    <div className="fixed inset-0 z-[99999] w-full h-full bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
      <RoomCreationContent
        theme={selectedTheme}
        isCompact={false}
        autoPlay={true}
        onAnimationEnd={onComplete}
      />
    </div>
  );
};

// ===========================================================================
// INTERACTIVE DEMO SHOWCASE PAGE (Allows comparing and selecting demos live)
// ===========================================================================
interface RoomCreationLoadingDemoProps {
  onClose?: () => void;
  onSelect?: (theme: RoomCreateTheme) => void;
}

export const RoomCreationLoadingDemo: React.FC<RoomCreationLoadingDemoProps> = ({
  onClose,
  onSelect,
}) => {
  const [activeTheme, setActiveTheme] = useState<RoomCreateTheme>(() => {
    try {
      return (localStorage.getItem('musicsync_create_theme') as RoomCreateTheme) || 'demo1';
    } catch {
      return 'demo1';
    }
  });

  const [viewMode, setViewMode] = useState<'grid' | RoomCreateTheme>('grid');
  const [replayKey, setReplayKey] = useState(0);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  const THEMES_INFO: { id: RoomCreateTheme; number: string; name: string; tag: string; desc: string }[] = [
    {
      id: 'demo1',
      number: '01',
      name: 'Beatsync Exact Replica',
      tag: 'FAITHFUL REPLICA',
      desc: '1:1 recreation from your screenshot with white glowing segmented dashes & full monospace telemetry table.',
    },
    {
      id: 'demo2',
      number: '02',
      name: 'MusicSync Emerald Mesh',
      tag: 'BRAND EDITION',
      desc: 'MusicSync brand edition with glowing emerald-to-cyan audio dashes and acoustic telemetry.',
    },
    {
      id: 'demo3',
      number: '03',
      name: 'Cyber HUD Terminal',
      tag: 'TECH HUD',
      desc: 'High-density 10-dash laser meter with system header and technical telemetry matrix.',
    },
    {
      id: 'demo4',
      number: '04',
      name: 'Titanium Studio Minimal',
      tag: 'STUDIO LUXURY',
      desc: 'Minimalist card featuring the Titanium emblem and clean white glowing dashes.',
    },
  ];

  const handleApplyTheme = (th: RoomCreateTheme) => {
    setActiveTheme(th);
    try {
      localStorage.setItem('musicsync_create_theme', th);
    } catch {}
    if (onSelect) onSelect(th);
    const chosen = THEMES_INFO.find((t) => t.id === th);
    setSavedToast(chosen?.name || 'Theme');
    setTimeout(() => setSavedToast(null), 2500);
  };

  const handleReplay = () => {
    setReplayKey((k) => k + 1);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'g' || e.key === '0') setViewMode('grid');
      if (e.key === '1') setViewMode('demo1');
      if (e.key === '2') setViewMode('demo2');
      if (e.key === '3') setViewMode('demo3');
      if (e.key === '4') setViewMode('demo4');
      if (e.key === 'r' || e.key === 'R') handleReplay();
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[99999] w-full h-full bg-[#08080a] flex flex-col select-none overflow-hidden font-sans text-white">
      {/* Top Header Controls Bar */}
      <header className="sticky top-0 z-50 w-full px-4 sm:px-6 py-3.5 bg-[#0e1014]/90 backdrop-blur-2xl border-b border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 p-0.5 shadow-[0_0_15px_rgba(52,211,153,0.4)]">
              <div className="w-full h-full bg-dark-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Room Calibration Demos</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 uppercase">
                  4 Variations
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Select your preferred animation for room creation.
              </p>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="sm:hidden p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* View Switchers & Actions */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full">
          {/* Replay Button */}
          <button
            type="button"
            onClick={handleReplay}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 text-xs font-semibold cursor-pointer transition-all active:scale-95 shadow"
            title="Replay calibration animation (Press R)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Replay (R)</span>
          </button>

          <div className="w-px h-4 bg-white/15 mx-0.5 shrink-0" />

          {/* Grid View toggle */}
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'grid'
                ? 'bg-white text-black shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>All 4 Grid</span>
          </button>

          {/* Direct Option Tabs */}
          {THEMES_INFO.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setViewMode(t.id)}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                viewMode === t.id
                  ? 'bg-emerald-400 text-black shadow-[0_0_12px_rgba(52,211,153,0.6)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{t.number}</span>
              <span className="hidden lg:inline">{t.name.split(' ')[0]}</span>
            </button>
          ))}

          {onClose && (
            <>
              <div className="w-px h-4 bg-white/15 mx-0.5 shrink-0 hidden sm:block" />
              <button
                type="button"
                onClick={onClose}
                className="hidden sm:flex p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                title="Close Demos (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Floating Saved Toast Notification */}
      {savedToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-bounce px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-mono font-bold shadow-[0_0_24px_rgba(16,185,129,0.5)] flex items-center gap-2 backdrop-blur-xl">
          <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
          <span>"{savedToast}" selected as room creation animation!</span>
        </div>
      )}

      {/* Main Viewport */}
      {viewMode === 'grid' ? (
        /* 2x2 Interactive Comparison Grid */
        <main className="flex-1 w-full h-full overflow-y-auto p-4 sm:p-6 pb-20 custom-scrollbar">
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-zinc-400 px-1">
              <p>
                Compare all 4 calibration animations. Click <strong>"Select This"</strong> on your
                favorite option to use it when entering/creating rooms.
              </p>
              <span className="text-[11px] font-mono text-emerald-400">
                Active: {THEMES_INFO.find((t) => t.id === activeTheme)?.name}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              {THEMES_INFO.map((opt) => {
                const isSelected = activeTheme === opt.id;

                return (
                  <div
                    key={`${opt.id}-${replayKey}`}
                    className={`relative rounded-3xl border transition-all duration-200 flex flex-col overflow-hidden bg-zinc-900/60 backdrop-blur-xl ${
                      isSelected
                        ? 'border-emerald-400/90 shadow-[0_0_30px_rgba(52,211,153,0.22)] ring-1 ring-emerald-400/40'
                        : 'border-white/[0.08] hover:border-white/[0.2] hover:shadow-xl'
                    }`}
                  >
                    {/* Card Top Title Bar */}
                    <div className="px-5 py-3 border-b border-white/[0.08] bg-zinc-950/70 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                          <span>{opt.name}</span>
                        </h3>
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                          {opt.tag}
                        </span>
                      </div>

                      {isSelected && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-mono font-bold">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>ACTIVE</span>
                        </div>
                      )}
                    </div>

                    {/* Live Animation Container */}
                    <div className="relative h-[290px] sm:h-[320px] w-full bg-[#08080a] flex items-center justify-center p-4 overflow-hidden">
                      <RoomCreationContent
                        theme={opt.id}
                        isCompact={true}
                        autoPlay={true}
                      />

                      {/* Quick Fullscreen Hover Overlay */}
                      <button
                        type="button"
                        onClick={() => setViewMode(opt.id)}
                        className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-white text-zinc-300 hover:text-black border border-white/10 text-[10px] font-mono font-bold backdrop-blur-md opacity-80 hover:opacity-100 transition-all cursor-pointer shadow-lg"
                        title="Fullscreen Preview"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </div>

                    {/* Card Action Footer */}
                    <div className="p-3.5 sm:p-4 border-t border-white/[0.08] bg-zinc-950/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <p className="text-xs text-zinc-400 line-clamp-1 flex-1 pr-2">
                        {opt.desc}
                      </p>

                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => setViewMode(opt.id)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>Full View</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApplyTheme(opt.id)}
                          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md ${
                            isSelected
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-emerald-400 hover:bg-emerald-300 text-black shadow-[0_0_15px_rgba(52,211,153,0.4)]'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Selected</span>
                            </>
                          ) : (
                            <span>Select This</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      ) : (
        /* Fullscreen Single Theme Inspection View */
        <main
          key={`${viewMode}-${replayKey}`}
          className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center p-4 bg-[#08080a]"
        >
          {/* Back to Grid Button */}
          <div className="absolute top-4 left-4 z-40 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-900/90 hover:bg-white text-zinc-300 hover:text-black border border-white/15 text-xs font-bold backdrop-blur-xl transition-all cursor-pointer shadow-lg"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>← Back to All 4 Grid</span>
            </button>
          </div>

          {/* Select Button */}
          <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleApplyTheme(viewMode as RoomCreateTheme)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-lg ${
                activeTheme === viewMode
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_14px_rgba(52,211,153,0.3)]'
                  : 'bg-emerald-400 hover:bg-emerald-300 text-black shadow-[0_0_16px_rgba(52,211,153,0.5)]'
              }`}
            >
              {activeTheme === viewMode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                  <span>Active Default</span>
                </>
              ) : (
                <span>Set as Active Calibration</span>
              )}
            </button>
          </div>

          <RoomCreationContent
            theme={viewMode as RoomCreateTheme}
            isCompact={false}
            autoPlay={true}
          />
        </main>
      )}

      {/* Footer Instructions */}
      <footer className="sticky bottom-0 z-40 w-full py-2 px-4 bg-[#0a0c0f]/90 border-t border-white/[0.08] text-center backdrop-blur-md">
        <p className="text-[11px] font-mono text-zinc-400">
          Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/10 text-white">R</kbd> to replay •{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/10 text-white">G</kbd> for grid •{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/10 text-white">1</kbd>{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/10 text-white">2</kbd>{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/10 text-white">3</kbd>{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/10 text-white">4</kbd> to inspect •{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/10 text-white">Esc</kbd> to close
        </p>
      </footer>
    </div>
  );
};
