import React, { useEffect } from 'react';
import { Wifi, X } from 'lucide-react';

interface LoadingScreenProps {
  isPreview?: boolean;
  onClose?: () => void;
  statusText?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isPreview = false,
  onClose,
  statusText = 'Restoring session state & audio buffers',
}) => {
  // Allow Esc key to exit preview if opened
  useEffect(() => {
    if (!isPreview || !onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreview, onClose]);

  return (
    <div className="fixed inset-0 z-[99999] w-full h-full bg-dark-950 flex flex-col items-center justify-center select-none overflow-hidden font-sans">
      {/* Subtle Ambient Emerald & Platinum Lighting Aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[620px] h-[620px] bg-gradient-to-tr from-emerald-500/12 via-zinc-400/5 to-transparent rounded-full blur-3xl pointer-events-none animate-pulse-slow" />

      {/* Floating Exit Button (only shown in preview mode) */}
      {isPreview && onClose && (
        <div className="absolute top-4 right-4 z-50">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-dark-900/90 hover:bg-white text-slate-300 hover:text-black border border-white/15 text-xs font-mono font-bold transition-all cursor-pointer shadow-lg backdrop-blur-xl"
            title="Close Preview (Esc)"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close Preview</span>
          </button>
        </div>
      )}

      {/* Centerpiece Content Card */}
      <div className="relative z-10 flex flex-col items-center gap-6 sm:gap-7 text-center max-w-sm sm:max-w-md w-full px-4 animate-fade-in">
        {/* Titanium Emblem with Diagonal Specular Light Sheen */}
        <div className="relative flex flex-col items-center group overflow-hidden rounded-3xl p-2.5">
          <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/15 via-zinc-300/10 to-teal-500/15 rounded-3xl blur-2xl opacity-70 pointer-events-none" />
          <img
            src="/musicsync-titanium.png?v=3"
            alt="MusicSync Titanium"
            className="w-full max-w-[290px] sm:max-w-[340px] h-auto object-contain relative z-10 drop-shadow-[0_10px_35px_rgba(0,0,0,0.9)]"
          />
          {/* Metallic Specular Sweep */}
          <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-3xl">
            <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[specularShineSweep_3s_ease-in-out_infinite]" />
          </div>
        </div>

        {/* 5-Bar Luxury Audio Level Indicator */}
        <div className="flex items-center justify-center gap-1.5 h-6">
          <span
            className="w-1 h-3 rounded-full bg-gradient-to-t from-zinc-600 to-emerald-400/80 animate-[titaniumEqBar_1.3s_ease-in-out_infinite]"
            style={{ animationDelay: '0.0s' }}
          />
          <span
            className="w-1 h-5 rounded-full bg-gradient-to-t from-zinc-500 to-emerald-300 animate-[titaniumEqBar_1.0s_ease-in-out_infinite]"
            style={{ animationDelay: '0.2s' }}
          />
          <span
            className="w-1 h-6 rounded-full bg-gradient-to-t from-emerald-400 via-teal-300 to-white shadow-[0_0_10px_rgba(52,211,153,0.9)] animate-[titaniumEqBar_0.85s_ease-in-out_infinite]"
            style={{ animationDelay: '0.4s' }}
          />
          <span
            className="w-1 h-4 rounded-full bg-gradient-to-t from-zinc-500 to-emerald-300 animate-[titaniumEqBar_1.1s_ease-in-out_infinite]"
            style={{ animationDelay: '0.15s' }}
          />
          <span
            className="w-1 h-3 rounded-full bg-gradient-to-t from-zinc-600 to-emerald-400/80 animate-[titaniumEqBar_1.25s_ease-in-out_infinite]"
            style={{ animationDelay: '0.35s' }}
          />
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-1">
          <h3 className="text-sm sm:text-base font-mono font-bold tracking-[0.24em] text-white uppercase">
            Reconnecting Mesh
          </h3>
          <p className="text-xs text-zinc-400 font-mono tracking-wider">
            {statusText}
          </p>
        </div>

        {/* ======================================================= */}
        {/* IMPROVED HIGH-TECH GREEN LOADING LINE ANIMATION         */}
        {/* ======================================================= */}
        <div className="w-full max-w-[280px] sm:max-w-[320px] space-y-2">
          {/* Recessed Glowing Glass Track */}
          <div className="relative w-full h-2 sm:h-2.5 rounded-full bg-dark-900/90 border border-emerald-500/35 p-[1px] overflow-hidden shadow-[inset_0_1px_4px_rgba(0,0,0,0.9),0_0_20px_rgba(16,185,129,0.18)] animate-[greenGlowPulse_3s_ease-in-out_infinite]">
            {/* Subtle background rail line */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-emerald-950/40 rounded-full" />

            {/* Hyper-smooth Sweeping Green Laser Beam */}
            <div className="relative h-full w-2/5 rounded-full bg-gradient-to-r from-transparent via-emerald-400 via-teal-300 to-emerald-300 shadow-[0_0_14px_rgba(52,211,153,1),0_0_26px_rgba(16,185,129,0.7)] animate-[greenLaserSweep_1.8s_cubic-bezier(0.4,0,0.2,1)_infinite]" />
          </div>

          {/* Telemetry Labels below the line */}
          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 px-0.5">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
              <span>Session Restoration</span>
            </span>
            <span className="text-emerald-400 font-bold tracking-wider">48kHz • 0ms</span>
          </div>
        </div>

        {/* High-Precision NTP Multi-Speaker Mesh Pill */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-dark-900/90 border border-emerald-500/30 shadow-[0_0_18px_rgba(16,185,129,0.2)] backdrop-blur-md">
          <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="text-[11px] font-mono text-emerald-300 font-bold tracking-wider uppercase">
            0ms NTP Clock Locked
          </span>
        </div>
      </div>
    </div>
  );
};
