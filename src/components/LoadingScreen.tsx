import React, { useState, useEffect } from 'react';
import { Wifi, X, Volume2, ShieldCheck, Sparkles } from 'lucide-react';

interface LoadingScreenProps {
  isPreview?: boolean;
  onClose?: () => void;
  statusText?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isPreview = false,
  onClose,
  statusText,
}) => {
  // Smooth progressive calibration counter (18% -> 99%)
  const [progressPercent, setProgressPercent] = useState(24);
  const [activeStageIndex, setActiveStageIndex] = useState(0);

  const CALIBRATION_STAGES = [
    { label: 'SYNCHRONIZING P2P MESH NODES', detail: 'Locating nearby active speakers' },
    { label: 'CALIBRATING SUB-MILLISECOND NTP CLOCK', detail: '0.00ms audio clock offset locked' },
    { label: 'BUFFERING 48kHz LOSSLESS STREAM', detail: 'Pre-filling audio ring buffer' },
    { label: 'AUDIO MESH SYNCHRONIZED', detail: 'Ready for synchronized playback' },
  ];

  // Increment simulated progress with smooth natural pacing
  useEffect(() => {
    const interval = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev < 50) return prev + Math.floor(Math.random() * 4 + 3);
        if (prev < 85) return prev + Math.floor(Math.random() * 3 + 2);
        if (prev < 98) return prev + 1;
        return 98;
      });
    }, 180);

    return () => clearInterval(interval);
  }, []);

  // Update telemetry stage based on progress
  useEffect(() => {
    if (progressPercent < 45) {
      setActiveStageIndex(0);
    } else if (progressPercent < 75) {
      setActiveStageIndex(1);
    } else if (progressPercent < 94) {
      setActiveStageIndex(2);
    } else {
      setActiveStageIndex(3);
    }
  }, [progressPercent]);

  // Allow Esc key to exit preview if opened
  useEffect(() => {
    if (!isPreview || !onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreview, onClose]);

  const currentStage = CALIBRATION_STAGES[activeStageIndex];

  return (
    <div className="fixed inset-0 z-[99999] w-full h-full bg-dark-950 flex flex-col items-center justify-center select-none overflow-hidden font-sans">
      {/* Background Soft Lighting Field */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] bg-gradient-to-tr from-emerald-500/10 via-zinc-400/5 to-transparent rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] bg-gradient-to-b from-teal-500/8 to-transparent rounded-full blur-2xl pointer-events-none" />

      {/* Floating Exit Button (only shown in preview mode) */}
      {isPreview && onClose && (
        <div className="absolute top-4 right-4 z-50">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-dark-900/90 hover:bg-white text-slate-300 hover:text-black border border-white/15 text-xs font-mono font-bold transition-all cursor-pointer shadow-lg backdrop-blur-xl active:scale-95"
            title="Close Preview (Esc)"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close Preview</span>
          </button>
        </div>
      )}

      {/* Centerpiece Studio Container */}
      <div className="relative z-10 flex flex-col items-center gap-6 sm:gap-7 text-center max-w-sm sm:max-w-md w-full px-4 animate-fade-in">
        {/* Titanium Emblem with Specular Shine Sweep */}
        <div className="relative flex flex-col items-center group overflow-hidden rounded-3xl p-3">
          <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/15 via-zinc-300/10 to-teal-500/15 rounded-3xl blur-2xl opacity-75 pointer-events-none" />
          <img
            src="/musicsync-titanium.png?v=3"
            alt="MusicSync Titanium"
            className="w-full max-w-[280px] sm:max-w-[340px] h-auto object-contain relative z-10 drop-shadow-[0_12px_40px_rgba(0,0,0,0.95)]"
          />
          {/* Specular Diagonal Sheen Sweep */}
          <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-3xl">
            <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/35 to-transparent animate-[specularShineSweep_3.2s_ease-in-out_infinite]" />
          </div>
        </div>

        {/* 7-Bar Precision Audio Spectrum Analyzer */}
        <div className="flex items-end justify-center gap-1.5 h-7 px-3 py-0.5">
          {/* Bar 1 (Sub-bass) */}
          <div
            className="w-1 h-3.5 rounded-full bg-gradient-to-t from-zinc-700 via-zinc-500 to-emerald-400/80 animate-[eqBarBass_1.1s_ease-in-out_infinite] origin-bottom will-change-transform"
            style={{ animationDelay: '0.0s' }}
          />
          {/* Bar 2 (Bass) */}
          <div
            className="w-1 h-5 rounded-full bg-gradient-to-t from-zinc-600 via-zinc-400 to-emerald-300 animate-[eqBarBass_0.95s_ease-in-out_infinite] origin-bottom will-change-transform"
            style={{ animationDelay: '0.12s' }}
          />
          {/* Bar 3 (Low-mid) */}
          <div
            className="w-1.5 h-6 rounded-full bg-gradient-to-t from-zinc-500 via-emerald-400 to-teal-200 animate-[eqBarMid_1.25s_ease-in-out_infinite] origin-bottom will-change-transform shadow-[0_0_8px_rgba(52,211,153,0.5)]"
            style={{ animationDelay: '0.2s' }}
          />
          {/* Bar 4 (Peak Center Focal) */}
          <div
            className="w-1.5 h-7 rounded-full bg-gradient-to-t from-emerald-500 via-teal-300 to-white animate-[eqBarMid_0.85s_ease-in-out_infinite] origin-bottom will-change-transform shadow-[0_0_12px_rgba(52,211,153,0.9)]"
            style={{ animationDelay: '0.05s' }}
          />
          {/* Bar 5 (High-mid) */}
          <div
            className="w-1.5 h-6 rounded-full bg-gradient-to-t from-zinc-500 via-emerald-400 to-teal-200 animate-[eqBarTreble_1.15s_ease-in-out_infinite] origin-bottom will-change-transform shadow-[0_0_8px_rgba(52,211,153,0.5)]"
            style={{ animationDelay: '0.15s' }}
          />
          {/* Bar 6 (Highs) */}
          <div
            className="w-1 h-5 rounded-full bg-gradient-to-t from-zinc-600 via-zinc-400 to-emerald-300 animate-[eqBarTreble_0.9s_ease-in-out_infinite] origin-bottom will-change-transform"
            style={{ animationDelay: '0.28s' }}
          />
          {/* Bar 7 (Air) */}
          <div
            className="w-1 h-3.5 rounded-full bg-gradient-to-t from-zinc-700 via-zinc-500 to-emerald-400/80 animate-[eqBarBass_1.05s_ease-in-out_infinite] origin-bottom will-change-transform"
            style={{ animationDelay: '0.35s' }}
          />
        </div>

        {/* Title & Dynamic Telemetry Description */}
        <div className="space-y-1.5">
          <h3 className="text-sm sm:text-base font-mono font-bold tracking-[0.24em] text-white uppercase flex items-center justify-center gap-2">
            <span>RECONNECTING MESH</span>
          </h3>
          <p className="text-xs text-zinc-400 font-mono tracking-wider min-h-[18px]">
            {statusText || currentStage.detail}
          </p>
        </div>

        {/* ======================================================= */}
        {/* ENHANCED SMOOTH EMERALD LASER LOADING LINE              */}
        {/* ======================================================= */}
        <div className="w-full max-w-[280px] sm:max-w-[340px] space-y-2.5">
          {/* Recessed Glass Rail Track with Breathing Glow */}
          <div className="relative w-full h-2.5 sm:h-3 rounded-full bg-[#080d0a] border border-emerald-500/40 p-[1.5px] overflow-hidden shadow-[inset_0_2px_6px_rgba(0,0,0,0.9),0_0_24px_rgba(16,185,129,0.22)] backdrop-blur-xl animate-[greenGlowPulse_2.8s_ease-in-out_infinite]">
            {/* Soft Ambient Background Rail Track */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-emerald-950/40 rounded-full" />

            {/* Micro Precision Track Notch Markings */}
            <div className="absolute inset-0 flex justify-between items-center px-4 pointer-events-none opacity-20">
              <span className="w-0.5 h-1 bg-emerald-400 rounded-full" />
              <span className="w-0.5 h-1 bg-emerald-400 rounded-full" />
              <span className="w-0.5 h-1 bg-emerald-400 rounded-full" />
              <span className="w-0.5 h-1 bg-emerald-400 rounded-full" />
            </div>

            {/* Continuous Smooth Sweeping Laser Beam */}
            <div className="relative h-full w-1/2 rounded-full overflow-hidden animate-[greenLaserSweep_1.7s_cubic-bezier(0.4,0,0.2,1)_infinite] will-change-transform">
              {/* Laser Core Gradient */}
              <div className="w-full h-full rounded-full bg-gradient-to-r from-transparent via-emerald-500/25 via-emerald-400 via-teal-300 to-emerald-200 shadow-[0_0_18px_rgba(52,211,153,1),0_0_35px_rgba(16,185,129,0.75)]" />

              {/* Radiant White-Hot Leading Spark Tip */}
              <div className="absolute right-0 top-0 bottom-0 w-2.5 rounded-full bg-white shadow-[0_0_12px_#ffffff,0_0_24px_#34d399]" />
            </div>
          </div>

          {/* Telemetry Indicator Row */}
          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 px-1">
            <span className="flex items-center gap-1.5 uppercase tracking-wider font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_#34d399]"></span>
              </span>
              <span className="text-zinc-300">{currentStage.label}</span>
            </span>
            <span className="text-emerald-400 font-bold tracking-widest tabular-nums">
              {progressPercent}%
            </span>
          </div>
        </div>

        {/* High-Precision NTP Multi-Speaker Mesh Pill */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-dark-900/90 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.22)] backdrop-blur-md">
          <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="text-[11px] font-mono text-emerald-300 font-bold tracking-wider uppercase">
            0.00ms NTP Clock Locked • 48kHz
          </span>
        </div>
      </div>
    </div>
  );
};
