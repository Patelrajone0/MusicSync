import React, { useState, useEffect } from 'react';
import { Sparkles, Check, X, RotateCcw, LayoutGrid, Maximize2, Radio, Disc, Terminal, Activity, ShieldCheck } from 'lucide-react';

export type RoomCreateTheme = 'demo5' | 'demo1' | 'demo2' | 'demo3' | 'demo4' | 'demo6';

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
  const totalDashes = theme === 'demo6' ? 10 : 8;

  // Animated telemetry numbers
  const [meshNodes, setMeshNodes] = useState(8);
  const [clockOffset, setClockOffset] = useState('+1.84');
  const [measurements, setMeasurements] = useState(2);
  const [audioEngineText, setAudioEngineText] = useState('initializing');
  const [wsRelayText, setWsRelayText] = useState('CONNECTING');

  // Exact Beatsync replica counters (for demo1)
  const [pairsSent, setPairsSent] = useState(6);
  const [pureMeasurements, setPureMeasurements] = useState(2);
  const [impureMeasurements, setImpureMeasurements] = useState(1);
  const [audioStatus, setAudioStatus] = useState('0 loaded');
  const [wsStatus, setWsStatus] = useState('open');

  useEffect(() => {
    if (!autoPlay) return;

    setStep(1);
    setMeshNodes(8);
    setClockOffset('+1.84');
    setMeasurements(2);
    setAudioEngineText('initializing');
    setWsRelayText('CONNECTING');

    setPairsSent(6);
    setPureMeasurements(2);
    setImpureMeasurements(1);
    setAudioStatus('0 loaded');
    setWsStatus('open');

    const totalSteps = totalDashes;
    const intervalMs = 210; // ~1.7s total sequence

    const interval = setInterval(() => {
      setStep((prev) => {
        const next = prev + 1;

        // Dynamic process simulation for Titanium Studio Capsule (Demo 5)
        if (next === 2) {
          setMeshNodes(14);
          setClockOffset('+0.92');
          setMeasurements(5);
          setAudioEngineText('handshake');
          setWsRelayText('SYNCING');
        } else if (next === 3) {
          setMeshNodes(19);
          setClockOffset('+0.36');
          setMeasurements(8);
          setAudioEngineText('pre-buffering');
          setWsRelayText('VERIFYING');
        } else if (next === 4) {
          setMeshNodes(23);
          setClockOffset('+0.12');
          setMeasurements(11);
          setAudioEngineText('48kHz Lossless');
          setWsRelayText('CALIBRATING');
        } else if (next === 5) {
          setMeshNodes(26);
          setClockOffset('-0.03');
          setMeasurements(13);
          setAudioEngineText('48kHz Lossless');
          setWsRelayText('LOCKING');
        } else if (next === 6) {
          setMeshNodes(28);
          setClockOffset('0.00');
          setMeasurements(15);
          setAudioEngineText('48kHz Lossless');
          setWsRelayText('LOCKED');
        } else if (next >= 7) {
          setMeshNodes(29);
          setClockOffset('0.00');
          setMeasurements(16);
          setAudioEngineText('48kHz Lossless');
          setWsRelayText('LOCKED');
        }

        // Demo 1 Replica counters
        setPairsSent((p) => Math.min(29, p + Math.floor(Math.random() * 4 + 3)));
        if (next >= 3) {
          setPureMeasurements((val) => Math.min(14, val + 2));
          setImpureMeasurements((val) => Math.min(9, val + 1));
        }
        if (next >= 6) {
          setAudioStatus('1 ready');
        }

        if (next >= totalSteps) {
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
  // OPTION 5 (DEFAULT): TITANIUM STUDIO CAPSULE WITH LIVE PROCESS TELEMETRY
  // =========================================================================
  if (theme === 'demo5') {
    return (
      <div
        className={`relative w-full ${
          isCompact ? 'max-w-[340px] p-5' : 'max-w-[420px] p-7 sm:p-8'
        } rounded-[26px] bg-[#121418]/95 border border-emerald-500/25 shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(16,185,129,0.14)] text-left select-none font-sans backdrop-blur-xl`}
      >
        {/* Ambient emerald backlight */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Floating Titanium Logo Emblem */}
        <div className="flex justify-center mb-3.5 relative z-10">
          <img
            src="/musicsync-titanium.png?v=3"
            alt="MusicSync"
            className="w-full max-w-[175px] h-auto object-contain drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)]"
          />
        </div>

        {/* Status Header with Pulsing Mint Dot */}
        <div className="flex items-center justify-center gap-2 mb-4 relative z-10">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_12px_#34d399]" />
          </span>
          <span className="text-xs sm:text-sm font-semibold text-zinc-300">
            {step >= totalDashes ? 'Master Audio Clock Locked' : 'Calibrating Room Session...'}
          </span>
        </div>

        {/* 8 Segmented Calibration Dashes with Diffuse White Bloom */}
        <div className="grid grid-cols-8 gap-2 my-5 px-1 relative z-10">
          {Array.from({ length: 8 }).map((_, i) => {
            const isFilled = i < step;
            return (
              <div
                key={i}
                className={`h-1.5 sm:h-2 rounded-full transition-all duration-150 ${
                  isFilled
                    ? 'bg-white shadow-[0_0_16px_rgba(255,255,255,1),0_0_30px_rgba(255,255,255,0.6)]'
                    : 'bg-[#24272f]'
                }`}
              />
            );
          })}
        </div>

        {/* LIVE MONOSPACE TELEMETRY (Directly below calibration dashes) */}
        <div className="space-y-2 font-mono text-xs sm:text-[13px] text-zinc-400 pt-2 border-t border-white/[0.06] relative z-10">
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">mesh nodes</span>
            <span className="text-zinc-200 tabular-nums">{meshNodes} sent</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">clock offset</span>
            <span
              className={`tabular-nums font-semibold transition-colors duration-150 ${
                clockOffset === '0.00' ? 'text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'text-zinc-300'
              }`}
            >
              {clockOffset} ms
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">measurements</span>
            <span className="text-zinc-200 tabular-nums">{measurements} / 16</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">audio engine</span>
            <span className="text-white font-medium">{audioEngineText}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">ws relay</span>
            <span
              className={`font-bold uppercase tracking-wider transition-colors duration-200 ${
                wsRelayText === 'LOCKED'
                  ? 'text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]'
                  : 'text-zinc-400'
              }`}
            >
              {wsRelayText}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // OPTION 1: BEATSYNC MATTE STUDIO (1:1 Exact Replica from Screenshot)
  // =========================================================================
  if (theme === 'demo1') {
    return (
      <div
        className={`relative w-full ${
          isCompact ? 'max-w-[340px] p-5' : 'max-w-[420px] p-7 sm:p-8'
        } rounded-[26px] bg-[#14161a] border border-[#23262d] shadow-[0_25px_60px_rgba(0,0,0,0.95)] text-left select-none font-sans`}
      >
        <div className="flex flex-col items-center text-center space-y-1.5 mb-6">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#10b981] shadow-[0_0_12px_#10b981,0_0_22px_rgba(16,185,129,0.6)]" />
            </span>
            <h3 className={`${isCompact ? 'text-base' : 'text-lg'} font-bold text-white tracking-tight`}>
              Beatsync calibrating
            </h3>
          </div>
          <p className={`${isCompact ? 'text-xs' : 'text-sm'} text-[#71717a] font-normal`}>
            {step >= totalDashes ? 'Time synchronized' : 'Synchronizing time...'}
          </p>
        </div>

        <div className="grid grid-cols-8 gap-2 sm:gap-2.5 my-6 px-1">
          {Array.from({ length: 8 }).map((_, i) => {
            const isFilled = i < step;
            return (
              <div
                key={i}
                className={`h-1.5 sm:h-2 rounded-full transition-all duration-150 ${
                  isFilled
                    ? 'bg-white shadow-[0_0_16px_rgba(255,255,255,1),0_0_32px_rgba(255,255,255,0.6)]'
                    : 'bg-[#26282f]'
                }`}
              />
            );
          })}
        </div>

        <div className="space-y-2 font-mono text-xs sm:text-[13px] text-[#71717a] pt-1">
          <div className="flex justify-between items-center">
            <span>pairs sent</span>
            <span className="text-[#d4d4d8] tabular-nums">{pairsSent}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>pure / impure</span>
            <span className="text-[#d4d4d8] tabular-nums">{pureMeasurements} / {impureMeasurements}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>measurements</span>
            <span className="text-[#d4d4d8] tabular-nums">{measurements} / 16</span>
          </div>
          <div className="flex justify-between items-center">
            <span>audio</span>
            <span className="text-[#d4d4d8]">{audioStatus}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>ws</span>
            <span className="text-[#10b981] font-semibold">{wsStatus}</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // OPTION 2: ACOUSTIC WAVE SPECTRUM (Audio Frequency Bars)
  // =========================================================================
  if (theme === 'demo2') {
    const barHeights = ['h-3.5', 'h-5', 'h-7', 'h-8', 'h-8', 'h-6', 'h-4.5', 'h-3.5'];

    return (
      <div
        className={`relative w-full ${
          isCompact ? 'max-w-[340px] p-5' : 'max-w-[420px] p-7 sm:p-8'
        } rounded-[26px] bg-[#121418] border border-white/[0.08] shadow-[0_25px_60px_rgba(0,0,0,0.95)] text-left select-none font-sans`}
      >
        <div className="flex flex-col items-center text-center space-y-1.5 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-400 shadow-[0_0_12px_#00f0ff]" />
            </span>
            <h3 className={`${isCompact ? 'text-base' : 'text-lg'} font-bold text-white tracking-tight`}>
              Acoustic Wave calibrating
            </h3>
          </div>
          <p className={`${isCompact ? 'text-xs' : 'text-sm'} text-zinc-400 font-normal`}>
            {step >= totalDashes ? 'Acoustic latency locked' : 'Harmonizing multi-speaker clock...'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2.5 h-10 my-5 px-2">
          {Array.from({ length: 8 }).map((_, i) => {
            const isFilled = i < step;
            return (
              <div
                key={i}
                className={`w-2.5 rounded-full transition-all duration-200 ${barHeights[i]} ${
                  isFilled
                    ? 'bg-white shadow-[0_0_16px_rgba(255,255,255,1),0_0_28px_rgba(0,240,255,0.7)] animate-pulse'
                    : 'bg-[#252830]'
                }`}
              />
            );
          })}
        </div>

        <div className="space-y-2 font-mono text-xs sm:text-[13px] text-zinc-400 pt-1">
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">clock drift</span>
            <span className="text-white tabular-nums">0.00 ms</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">sub-frame jitter</span>
            <span className="text-white tabular-nums">&lt;0.02 ms</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">audio ring buffer</span>
            <span className="text-white tabular-nums">{measurements} / 16</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">lossless stream</span>
            <span className="text-white">48kHz Lossless</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">mesh sync</span>
            <span className="text-cyan-400 font-semibold uppercase">{step >= totalDashes ? 'LOCKED' : 'SYNCING'}</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // OPTION 3: RADIAL SONIC ORBIT DIAL (Circular Arc Gauge)
  // =========================================================================
  if (theme === 'demo3') {
    return (
      <div
        className={`relative w-full ${
          isCompact ? 'max-w-[340px] p-5' : 'max-w-[420px] p-7 sm:p-8'
        } rounded-[26px] bg-[#131519] border border-white/[0.08] shadow-[0_25px_60px_rgba(0,0,0,0.95)] text-center select-none font-sans`}
      >
        <div className="flex flex-col items-center space-y-1 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981] animate-pulse" />
            <h3 className={`${isCompact ? 'text-base' : 'text-lg'} font-bold text-white tracking-tight`}>
              Sonic Orbit calibrating
            </h3>
          </div>
          <p className="text-xs text-zinc-400 font-normal">
            {step >= totalDashes ? 'Sub-frame clock established' : 'Orbital acoustic calibration...'}
          </p>
        </div>

        <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto my-4 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            {Array.from({ length: 8 }).map((_, i) => {
              const isFilled = i < step;
              const strokeDashoffset = -i * 35;

              return (
                <circle
                  key={i}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={isFilled ? '#ffffff' : '#262830'}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray="23 8.5"
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-200"
                  style={{
                    filter: isFilled ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.9))' : 'none',
                  }}
                />
              );
            })}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
            <span className="text-sm sm:text-base font-bold text-white tabular-nums">
              {measurements}/16
            </span>
            <span className="text-[9px] text-emerald-400 uppercase font-semibold">0ms NTP</span>
          </div>
        </div>

        <div className="space-y-1.5 font-mono text-xs sm:text-[12px] text-zinc-400 text-left pt-2 border-t border-white/[0.06]">
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">pairs sent</span>
            <span className="text-zinc-300 tabular-nums">{pairsSent}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">audio samples</span>
            <span className="text-zinc-300 tabular-nums">{pureMeasurements} / {impureMeasurements}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">connection</span>
            <span className="text-emerald-400 font-semibold">{wsStatus}</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // OPTION 4: EMERALD LASER GRID (MusicSync Glowing Brand Edition)
  // =========================================================================
  if (theme === 'demo4') {
    return (
      <div
        className={`relative w-full ${
          isCompact ? 'max-w-[340px] p-5' : 'max-w-[420px] p-7 sm:p-8'
        } rounded-[26px] bg-[#101317] border border-emerald-500/25 shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_30px_rgba(16,185,129,0.15)] text-left select-none font-sans`}
      >
        <div className="flex flex-col items-center text-center space-y-1.5 mb-6">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 shadow-[0_0_14px_#34d399]" />
            </span>
            <h3 className={`${isCompact ? 'text-base' : 'text-lg'} font-bold text-white tracking-tight`}>
              MusicSync calibrating
            </h3>
          </div>
          <p className={`${isCompact ? 'text-xs' : 'text-sm'} text-emerald-400/80 font-mono`}>
            {step >= totalDashes ? 'P2P Mesh Locked • 0ms Drift' : 'Calibrating multi-device audio clock...'}
          </p>
        </div>

        <div className="grid grid-cols-8 gap-2 my-6 px-1">
          {Array.from({ length: 8 }).map((_, i) => {
            const isFilled = i < step;
            return (
              <div
                key={i}
                className={`h-1.5 sm:h-2 rounded-full transition-all duration-150 ${
                  isFilled
                    ? 'bg-gradient-to-r from-emerald-400 via-teal-300 to-white shadow-[0_0_16px_rgba(52,211,153,1),0_0_24px_rgba(16,185,129,0.6)]'
                    : 'bg-[#1b2223] border border-emerald-500/20'
                }`}
              />
            );
          })}
        </div>

        <div className="space-y-2 font-mono text-xs sm:text-[13px] text-zinc-400 pt-1">
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">mesh nodes</span>
            <span className="text-white tabular-nums">{meshNodes} sent</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">clock offset</span>
            <span className="text-emerald-400 tabular-nums">0.00 ms</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">measurements</span>
            <span className="text-white tabular-nums">{measurements} / 16</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">audio engine</span>
            <span className="text-white">48kHz Lossless</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">ws relay</span>
            <span className="text-emerald-400 font-semibold uppercase">{step >= totalDashes ? 'LOCKED' : 'OPEN'}</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // OPTION 6: RETRO CYBER TERMINAL (10 Dashes with Technical Monospace HUD)
  // =========================================================================
  return (
    <div
      className={`relative w-full ${
        isCompact ? 'max-w-[340px] p-5' : 'max-w-[420px] p-7 sm:p-8'
      } rounded-[26px] bg-[#0c0f14] border border-cyan-500/30 shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_30px_rgba(0,240,255,0.15)] text-left select-none font-mono`}
    >
      <div className="flex justify-between items-center mb-4 border-b border-cyan-500/20 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 shadow-[0_0_8px_#00f0ff] animate-pulse" />
          <span className="text-xs font-bold text-white tracking-widest uppercase">
            BEATSYNC // SYNC_V2
          </span>
        </div>
        <span className="text-[10px] text-cyan-300 font-bold bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 rounded">
          {step >= totalDashes ? 'LOCKED' : `${Math.round((step / totalDashes) * 100)}%`}
        </span>
      </div>

      <p className="text-[11px] text-zinc-400 mb-4 tracking-wide">
        {step >= totalDashes ? '> 0ms audio sync verified' : '> Synchronizing P2P timeframes...'}
      </p>

      <div className="grid grid-cols-10 gap-1.5 my-4">
        {Array.from({ length: 10 }).map((_, i) => {
          const isFilled = i < step;
          return (
            <div
              key={i}
              className={`h-1.5 rounded-sm transition-all duration-150 ${
                isFilled
                  ? 'bg-gradient-to-r from-cyan-400 to-sky-100 shadow-[0_0_12px_rgba(0,240,255,0.9)]'
                  : 'bg-cyan-950/40 border border-cyan-500/20'
              }`}
            />
          );
        })}
      </div>

      <div className="space-y-1.5 text-xs text-zinc-400 pt-2 border-t border-cyan-500/15">
        <div className="flex justify-between items-center">
          <span className="text-zinc-500">packets sent</span>
          <span className="text-cyan-300 tabular-nums">{pairsSent}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-zinc-500">measurements</span>
          <span className="text-cyan-300 tabular-nums">{measurements} / 16</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-zinc-500">socket state</span>
          <span className="text-emerald-400 font-bold">CONNECTED</span>
        </div>
      </div>
    </div>
  );
};

// ===========================================================================
// FULLSCREEN ROOM CREATION OVERLAY (Active when user clicks Create Room)
// Defaults to demo5 (Titanium Studio Capsule with live process details!)
// ===========================================================================
interface RoomCreationOverlayProps {
  onComplete: () => void;
  theme?: RoomCreateTheme;
}

export const RoomCreationOverlay: React.FC<RoomCreationOverlayProps> = ({
  onComplete,
  theme = 'demo5',
}) => {
  const [selectedTheme] = useState<RoomCreateTheme>(() => {
    try {
      return (localStorage.getItem('musicsync_create_theme') as RoomCreateTheme) || 'demo5';
    } catch {
      return 'demo5';
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
// INTERACTIVE DEMO SHOWCASE
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
      return (localStorage.getItem('musicsync_create_theme') as RoomCreateTheme) || 'demo5';
    } catch {
      return 'demo5';
    }
  });

  const [viewMode, setViewMode] = useState<'grid' | RoomCreateTheme>('demo5');
  const [replayKey, setReplayKey] = useState(0);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  const THEMES_INFO: {
    id: RoomCreateTheme;
    number: string;
    name: string;
    tag: string;
    icon: any;
    desc: string;
  }[] = [
    {
      id: 'demo5',
      number: '01',
      name: 'Titanium Studio Capsule',
      tag: 'RECOMMENDED • APPLIED',
      icon: ShieldCheck,
      desc: 'Applied active design: Titanium logo, 8 white glowing dashes, and the exact live process telemetry table right below the calibration.',
    },
    {
      id: 'demo1',
      number: '02',
      name: 'Beatsync Exact Replica',
      tag: '1:1 SCREENSHOT REPLICA',
      icon: Radio,
      desc: 'Exact matte charcoal card, glowing mint LED, 8 diffuse white fluorescent pill dashes, and full monospace telemetry table.',
    },
    {
      id: 'demo2',
      number: '03',
      name: 'Acoustic Waveform',
      tag: 'AUDIO SPECTRUM BARS',
      icon: Activity,
      desc: 'Different Take: 8 vertical soundwave frequency bars that pulse and illuminate with intense audio bloom.',
    },
    {
      id: 'demo3',
      number: '04',
      name: 'Radial Sonic Orbit',
      tag: 'CIRCULAR ARC GAUGE',
      icon: Disc,
      desc: 'Different Take: Circular 8-segment arc dial inspired by Teenage Engineering / high-end audio synthesizers.',
    },
    {
      id: 'demo4',
      number: '05',
      name: 'Emerald Laser Grid',
      tag: 'BRAND EDITION',
      icon: Sparkles,
      desc: 'MusicSync emerald-to-white glowing laser dashes with acoustic P2P telemetry.',
    },
    {
      id: 'demo6',
      number: '06',
      name: 'Retro Terminal HUD',
      tag: 'CYBER HUD',
      icon: Terminal,
      desc: 'High-density 10-dash cyan terminal with live packets and status matrix.',
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
      if (e.key === '1') setViewMode('demo5');
      if (e.key === '2') setViewMode('demo1');
      if (e.key === '3') setViewMode('demo2');
      if (e.key === '4') setViewMode('demo3');
      if (e.key === '5') setViewMode('demo4');
      if (e.key === '6') setViewMode('demo6');
      if (e.key === 'r' || e.key === 'R') handleReplay();
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[99999] w-full h-full bg-[#090a0d] flex flex-col select-none overflow-hidden font-sans text-white">
      {/* Top Header Controls Bar */}
      <header className="sticky top-0 z-50 w-full px-4 sm:px-6 py-3.5 bg-[#101217]/95 backdrop-blur-2xl border-b border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 p-0.5 shadow-[0_0_15px_rgba(52,211,153,0.4)]">
              <div className="w-full h-full bg-dark-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Room Calibration Showcase</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 uppercase">
                  Titanium Capsule Applied
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Titanium Studio Capsule is active with real-time process telemetry.
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

        {/* View Switchers & Controls */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full">
          {/* Replay Button */}
          <button
            type="button"
            onClick={handleReplay}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 text-xs font-semibold cursor-pointer transition-all active:scale-95 shadow"
            title="Replay calibration sequence (Press R)"
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
            <span>All 6 Grid</span>
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
              <span className="hidden xl:inline">{t.name.split(' ')[0]}</span>
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
        /* Responsive Comparison Grid */
        <main className="flex-1 w-full h-full overflow-y-auto p-4 sm:p-6 pb-24 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-zinc-400 px-1">
              <p>
                Compare all 6 live calibration designs. <strong>Titanium Studio Capsule</strong> is applied with live process telemetry.
              </p>
              <span className="text-[11px] font-mono text-emerald-400">
                Active Theme: {THEMES_INFO.find((t) => t.id === activeTheme)?.name}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
              {THEMES_INFO.map((opt) => {
                const isSelected = activeTheme === opt.id;
                const Icon = opt.icon;

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
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-zinc-300">
                          <Icon className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                            <span>{opt.name}</span>
                          </h3>
                          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                            {opt.tag}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-mono font-bold">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>ACTIVE</span>
                        </div>
                      )}
                    </div>

                    {/* Live Animation Container */}
                    <div className="relative h-[340px] sm:h-[370px] w-full bg-[#08080a] flex items-center justify-center p-3 overflow-hidden">
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
              <span>← Back to All 6 Grid</span>
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
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/10 text-white">1</kbd>-
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/10 text-white">6</kbd> to inspect •{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/10 text-white">Esc</kbd> to close
        </p>
      </footer>
    </div>
  );
};
