import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Sliders,
  Compass,
  Check,
  X,
  Volume2,
  Crown,
  Wifi,
  Disc3,
  LayoutGrid,
  Maximize2,
} from 'lucide-react';

export type LoadingTheme = 'option1' | 'option2' | 'option3' | 'option4';
export type ShowcaseViewMode = 'grid' | LoadingTheme;

interface LoadingScreenContentProps {
  theme: LoadingTheme;
  isCompact?: boolean;
}

export const LoadingScreenContent: React.FC<LoadingScreenContentProps> = ({
  theme,
  isCompact = false,
}) => {
  // Cycling status messages for Option 4
  const [matrixStep, setMatrixStep] = useState(0);
  useEffect(() => {
    if (theme !== 'option4') return;
    const timer = setInterval(() => {
      setMatrixStep((prev) => (prev + 1) % 3);
    }, 1800);
    return () => clearInterval(timer);
  }, [theme]);

  return (
    <div className="w-full h-full relative overflow-hidden flex items-center justify-center select-none bg-dark-950">
      {/* ======================================================= */}
      {/* THEME 1: ACOUSTIC EQUALIZER PULSE (DJ Studio Theme)     */}
      {/* ======================================================= */}
      {theme === 'option1' && (
        <div className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-4 relative overflow-hidden animate-fade-in">
          {/* Ambient Reactive Neon Light Field */}
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${
              isCompact ? 'w-[280px] h-[280px]' : 'w-[520px] h-[520px]'
            } bg-gradient-to-tr from-cyan-500/20 via-purple-500/15 to-pink-500/20 rounded-full blur-3xl pointer-events-none animate-pulse-slow`}
          />

          <div
            className={`relative z-10 flex flex-col items-center ${
              isCompact ? 'gap-3 max-w-[260px]' : 'gap-5 sm:gap-6 max-w-md'
            } text-center w-full px-2`}
          >
            {/* Breathing MusicSync Neon Emblem */}
            <div className="relative flex flex-col items-center group">
              <div className="absolute -inset-3 bg-gradient-to-r from-cyan-500/30 via-purple-500/25 to-pink-500/30 rounded-2xl blur-xl opacity-80 animate-pulse pointer-events-none" />
              <img
                src="/musicsync-logo.png"
                alt="MusicSync Logo"
                className={`w-full ${
                  isCompact ? 'max-w-[190px]' : 'max-w-[320px] sm:max-w-[420px]'
                } h-auto object-contain relative z-10 mix-blend-screen drop-shadow-[0_8px_32px_rgba(0,0,0,0.85)]`}
              />
            </div>

            {/* Dynamic 9-Bar Frequency Audio Equalizer */}
            <div
              className={`flex items-end justify-center ${
                isCompact ? 'gap-1 h-6 py-0.5' : 'gap-1.5 h-8 sm:h-9 px-4 py-1'
              }`}
            >
              {[
                { delay: '0.0s', dur: '0.65s' },
                { delay: '0.2s', dur: '0.85s' },
                { delay: '0.4s', dur: '0.7s' },
                { delay: '0.1s', dur: '0.95s' },
                { delay: '0.3s', dur: '0.6s' },
                { delay: '0.5s', dur: '0.8s' },
                { delay: '0.15s', dur: '0.75s' },
                { delay: '0.35s', dur: '0.9s' },
                { delay: '0.25s', dur: '0.65s' },
              ].map((bar, i) => (
                <div
                  key={i}
                  style={{
                    animationDuration: bar.dur,
                    animationDelay: bar.delay,
                  }}
                  className={`${
                    isCompact ? 'w-1 sm:w-1.5' : 'w-1.5 sm:w-2'
                  } h-full rounded-full bg-gradient-to-t from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_8px_rgba(0,240,255,0.6)] animate-[eqBarBounce_1s_ease-in-out_infinite] origin-bottom`}
                />
              ))}
            </div>

            {/* Title & Subtitle */}
            <div className={isCompact ? 'space-y-0.5' : 'space-y-1.5'}>
              <h3
                className={`${
                  isCompact ? 'text-xs sm:text-sm' : 'text-base sm:text-xl'
                } font-extrabold text-white tracking-tight`}
              >
                Synchronizing Audio Mesh...
              </h3>
              <p
                className={`${
                  isCompact ? 'text-[10px] sm:text-[11px]' : 'text-xs sm:text-sm'
                } text-slate-400 font-medium`}
              >
                Calibrating 0ms latency with speakers
              </p>
            </div>

            {/* Fluid Hairline Progress Bar */}
            <div
              className={`${
                isCompact ? 'w-36 sm:w-44 h-0.5 sm:h-1' : 'w-56 sm:w-72 h-1'
              } rounded-full bg-dark-900 border border-white/10 overflow-hidden relative shadow-inner`}
            >
              <div className="w-1/2 h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_12px_rgba(0,240,255,0.8)] animate-[progressSweepLine_2s_ease-in-out_infinite]" />
            </div>

            {/* High-Precision NTP Telemetry Pill */}
            <div
              className={`flex items-center gap-1.5 ${
                isCompact ? 'px-2.5 py-1 text-[9px]' : 'px-3.5 py-1.5 text-[11px]'
              } rounded-full bg-dark-900/90 border border-cyan-400/35 shadow-[0_0_18px_rgba(0,240,255,0.25)] backdrop-blur-md`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
              <span className="font-mono text-cyan-300 font-bold tracking-wider uppercase">
                0ms NTP Clock Locked
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* THEME 2: QUANTUM SONIC RADAR (Spatial Audio Theme)      */}
      {/* ======================================================= */}
      {theme === 'option2' && (
        <div className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-4 relative overflow-hidden animate-fade-in">
          {/* Ambient Background Aura */}
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${
              isCompact ? 'w-[280px] h-[280px]' : 'w-[600px] h-[600px]'
            } bg-gradient-to-tr from-cyan-500/15 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none`}
          />

          {/* Central Orbital Soundstage Container */}
          <div
            className={`relative ${
              isCompact ? 'w-44 h-44 sm:w-52 sm:h-52' : 'w-80 h-80 sm:w-96 sm:h-96'
            } flex items-center justify-center z-10`}
          >
            {/* Expanding Concentric Sonar Acoustic Shockwaves */}
            <div className="absolute inset-2 sm:inset-4 rounded-full border border-cyan-400/30 animate-[radarPingWave_3.2s_ease-out_infinite] pointer-events-none" />
            <div className="absolute inset-2 sm:inset-4 rounded-full border border-fuchsia-500/25 animate-[radarPingWave_3.2s_ease-out_infinite_1.6s] pointer-events-none" />

            {/* Outer Cyan Orbit Ring with Satellite Node */}
            <div className="absolute inset-0 rounded-full border border-cyan-400/25 animate-[spinSlow_10s_linear_infinite] pointer-events-none">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-cyan-400 shadow-[0_0_16px_rgba(0,240,255,1)] absolute -top-1 sm:-top-1.5 left-1/2 -translate-x-1/2" />
            </div>

            {/* Inner Violet Orbit Ring with Counter Rotation */}
            <div className="absolute inset-5 sm:inset-8 rounded-full border border-fuchsia-500/25 animate-[spinReverseSlow_7s_linear_infinite] pointer-events-none">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-fuchsia-400 shadow-[0_0_14px_rgba(232,121,249,1)] absolute -bottom-1 sm:-bottom-1.25 left-1/2 -translate-x-1/2" />
            </div>

            {/* Speaker Beacons on Perimeter (Echoing 3D soundstage) */}
            <div
              className={`absolute ${
                isCompact ? 'top-1.5' : 'top-6'
              } left-1/2 -translate-x-1/2 flex flex-col items-center`}
            >
              <div
                className={`${
                  isCompact ? 'w-4.5 h-4.5 text-[8px]' : 'w-6 h-6 text-[10px]'
                } rounded-full bg-dark-900 border border-amber-400/60 flex items-center justify-center text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)]`}
              >
                <Crown
                  className={isCompact ? 'w-2.5 h-2.5 fill-amber-400' : 'w-3 h-3 fill-amber-400'}
                />
              </div>
              <span className="text-[8px] font-mono text-amber-300 font-bold mt-0.5">Host</span>
            </div>

            <div
              className={`absolute ${
                isCompact ? 'bottom-3 left-2' : 'bottom-10 left-6'
              } flex flex-col items-center`}
            >
              <div
                className={`${
                  isCompact ? 'w-4 h-4 text-[8px]' : 'w-5 h-5 text-[9px]'
                } rounded-full bg-dark-900 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.4)]`}
              >
                <Volume2 className={isCompact ? 'w-2 h-2' : 'w-2.5 h-2.5'} />
              </div>
              <span className="text-[8px] font-mono text-cyan-400 mt-0.5">Spk L</span>
            </div>

            <div
              className={`absolute ${
                isCompact ? 'bottom-3 right-2' : 'bottom-10 right-6'
              } flex flex-col items-center`}
            >
              <div
                className={`${
                  isCompact ? 'w-4 h-4 text-[8px]' : 'w-5 h-5 text-[9px]'
                } rounded-full bg-dark-900 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.4)]`}
              >
                <Volume2 className={isCompact ? 'w-2 h-2' : 'w-2.5 h-2.5'} />
              </div>
              <span className="text-[8px] font-mono text-cyan-400 mt-0.5">Spk R</span>
            </div>

            {/* Centerpiece MusicSync Emblem */}
            <div
              className={`relative z-10 flex flex-col items-center ${
                isCompact ? 'max-w-[125px] sm:max-w-[145px]' : 'max-w-[220px] sm:max-w-[260px]'
              }`}
            >
              <img
                src="/musicsync-logo.png"
                alt="MusicSync Logo"
                className="w-full h-auto object-contain mix-blend-screen drop-shadow-[0_8px_24px_rgba(0,0,0,0.9)]"
              />
            </div>
          </div>

          {/* Bottom Status Info */}
          <div
            className={`relative z-10 flex flex-col items-center ${
              isCompact ? 'gap-1.5 mt-1' : 'gap-3 mt-3'
            } text-center`}
          >
            <div className="space-y-0.5">
              <h3
                className={`${
                  isCompact ? 'text-xs sm:text-sm' : 'text-base sm:text-lg'
                } font-bold text-white tracking-tight`}
              >
                Multi-Device Soundstage
              </h3>
              <p className={`${isCompact ? 'text-[10px]' : 'text-xs'} text-slate-400`}>
                Triangulating acoustic spatial nodes
              </p>
            </div>

            <div
              className={`flex items-center gap-2 ${
                isCompact ? 'px-2.5 py-1 text-[9px]' : 'px-4 py-1.5 text-[11px]'
              } rounded-full bg-dark-900/90 border border-cyan-400/35 shadow-[0_0_16px_rgba(0,240,255,0.25)] backdrop-blur-md`}
            >
              <div
                className={`${
                  isCompact ? 'w-3 h-3' : 'w-4 h-4'
                } border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin shrink-0`}
              />
              <span className="font-mono text-cyan-300 font-bold tracking-wider uppercase">
                Spatial Radar Sync
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* THEME 3: TITANIUM STUDIO GLASS (Minimal Pro Luxury)     */}
      {/* ======================================================= */}
      {theme === 'option3' && (
        <div className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-4 relative overflow-hidden animate-fade-in">
          {/* Subtle Platinum & Slate Ambient Lighting */}
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${
              isCompact ? 'w-[250px] h-[250px]' : 'w-[480px] h-[480px]'
            } bg-gradient-to-tr from-cyan-500/10 via-zinc-400/5 to-transparent rounded-full blur-3xl pointer-events-none`}
          />

          <div
            className={`relative z-10 flex flex-col items-center ${
              isCompact ? 'gap-3 max-w-[240px]' : 'gap-6 max-w-sm'
            } text-center w-full px-2`}
          >
            {/* Titanium Emblem with Diagonal Specular Light Sheen */}
            <div className="relative flex flex-col items-center group overflow-hidden rounded-2xl p-1.5">
              <img
                src="/musicsync-titanium.png?v=3"
                alt="MusicSync Titanium"
                className={`w-full ${
                  isCompact ? 'max-w-[170px]' : 'max-w-[280px] sm:max-w-[320px]'
                } h-auto object-contain relative z-10`}
              />
              {/* Metallic Specular Sweep */}
              <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/25 to-transparent animate-[specularShineSweep_2.8s_ease-in-out_infinite]" />
              </div>
            </div>

            {/* Minimal 5-Bar Luxury Audio Indicator */}
            <div className={`flex items-center ${isCompact ? 'gap-1 h-4' : 'gap-1.5 h-6'}`}>
              <span
                className={`${isCompact ? 'w-0.5 h-2' : 'w-1 h-3'} rounded-full bg-zinc-500 animate-pulse`}
                style={{ animationDuration: '1.2s' }}
              />
              <span
                className={`${isCompact ? 'w-0.5 h-3.5' : 'w-1 h-5'} rounded-full bg-zinc-300 animate-pulse`}
                style={{ animationDuration: '0.8s', animationDelay: '0.2s' }}
              />
              <span
                className={`${
                  isCompact ? 'w-0.5 h-4.5' : 'w-1 h-6'
                } rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse`}
                style={{ animationDuration: '1.0s', animationDelay: '0.4s' }}
              />
              <span
                className={`${isCompact ? 'w-0.5 h-3' : 'w-1 h-4'} rounded-full bg-zinc-300 animate-pulse`}
                style={{ animationDuration: '1.1s', animationDelay: '0.15s' }}
              />
              <span
                className={`${isCompact ? 'w-0.5 h-2' : 'w-1 h-3'} rounded-full bg-zinc-500 animate-pulse`}
                style={{ animationDuration: '1.3s', animationDelay: '0.3s' }}
              />
            </div>

            <div className="space-y-0.5">
              <h3
                className={`${
                  isCompact ? 'text-[11px] sm:text-xs' : 'text-sm sm:text-base'
                } font-mono font-bold tracking-[0.16em] text-white uppercase`}
              >
                Reconnecting Mesh
              </h3>
              <p className={`${isCompact ? 'text-[9px]' : 'text-xs'} text-zinc-400 font-mono tracking-wider`}>
                48kHz Lossless Synchronized Audio
              </p>
            </div>

            {/* Minimalist Glass Hairline Progress */}
            <div
              className={`w-full ${
                isCompact ? 'max-w-[180px] space-y-1' : 'max-w-[260px] space-y-1.5'
              }`}
            >
              <div className="h-[2px] w-full bg-zinc-800 rounded-full overflow-hidden relative">
                <div className="h-full w-1/3 bg-gradient-to-r from-cyan-400 to-white shadow-[0_0_10px_rgba(0,240,255,0.8)] animate-[progressSweepLine_2.2s_ease-in-out_infinite]" />
              </div>
              <div
                className={`flex justify-between ${
                  isCompact ? 'text-[8px]' : 'text-[10px]'
                } font-mono text-zinc-500`}
              >
                <span>SESSION RESTORATION</span>
                <span className="text-cyan-400 font-bold">85%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* THEME 4: CYBER AMBIENT MATRIX (Stage Glassmorphism)     */}
      {/* ======================================================= */}
      {theme === 'option4' && (
        <div className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-4 relative overflow-hidden animate-fade-in">
          {/* Ambient Background Aura */}
          <div
            className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 ${
              isCompact ? 'w-[280px] h-[280px]' : 'w-[550px] h-[550px]'
            } bg-gradient-to-tr from-fuchsia-600/15 via-cyan-500/15 to-transparent rounded-full blur-3xl pointer-events-none`}
          />

          {/* Elevated Cyber Glassmorphic Card */}
          <div
            className={`relative z-10 w-full ${
              isCompact
                ? 'max-w-[250px] sm:max-w-[270px] p-3.5 sm:p-4 gap-3'
                : 'max-w-sm sm:max-w-md p-6 sm:p-8 gap-5'
            } rounded-3xl bg-dark-900/85 backdrop-blur-2xl border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.9),0_0_30px_rgba(0,240,255,0.08)] flex flex-col items-center text-center overflow-hidden`}
          >
            {/* Top Cyber Hairline Accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 sm:w-48 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent pointer-events-none" />

            {/* Logo with Soft Glow */}
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 rounded-2xl blur-xl opacity-80 pointer-events-none" />
              <img
                src="/musicsync-logo.png"
                alt="MusicSync Logo"
                className={`w-full ${
                  isCompact ? 'max-w-[150px]' : 'max-w-[260px] sm:max-w-[320px]'
                } h-auto object-contain relative z-10 mix-blend-screen drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]`}
              />
            </div>

            {/* Step Flow Transition Banner */}
            <div className="w-full space-y-1.5 py-0.5">
              <div className={`${isCompact ? 'h-5' : 'h-6'} flex items-center justify-center`}>
                <span
                  key={matrixStep}
                  className={`${
                    isCompact ? 'text-[10px] sm:text-[11px]' : 'text-xs sm:text-sm'
                  } font-mono font-bold text-cyan-300 animate-fade-in tracking-wide`}
                >
                  {matrixStep === 0 && '[1/3] Handshaking Room Socket...'}
                  {matrixStep === 1 && '[2/3] Calibrating Clock Offset...'}
                  {matrixStep === 2 && '[3/3] Restoring Session State...'}
                </span>
              </div>

              {/* 3 Step Dot Indicators */}
              <div className="flex items-center justify-center gap-1.5">
                <span
                  className={`${isCompact ? 'h-1' : 'h-1.5'} rounded-full transition-all duration-300 ${
                    matrixStep === 0
                      ? isCompact
                        ? 'w-4 bg-cyan-400'
                        : 'w-6 bg-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.8)]'
                      : isCompact
                      ? 'w-1 bg-zinc-700'
                      : 'w-1.5 bg-zinc-700'
                  }`}
                />
                <span
                  className={`${isCompact ? 'h-1' : 'h-1.5'} rounded-full transition-all duration-300 ${
                    matrixStep === 1
                      ? isCompact
                        ? 'w-4 bg-purple-400'
                        : 'w-6 bg-purple-400 shadow-[0_0_8px_rgba(157,78,221,0.8)]'
                      : isCompact
                      ? 'w-1 bg-zinc-700'
                      : 'w-1.5 bg-zinc-700'
                  }`}
                />
                <span
                  className={`${isCompact ? 'h-1' : 'h-1.5'} rounded-full transition-all duration-300 ${
                    matrixStep === 2
                      ? isCompact
                        ? 'w-4 bg-emerald-400'
                        : 'w-6 bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                      : isCompact
                      ? 'w-1 bg-zinc-700'
                      : 'w-1.5 bg-zinc-700'
                  }`}
                />
              </div>
            </div>

            {/* Animated Progress Bar */}
            <div
              className={`w-full ${
                isCompact ? 'h-1' : 'h-1.5'
              } bg-dark-950 border border-white/10 rounded-full overflow-hidden relative shadow-inner`}
            >
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500 rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(0,240,255,0.7)]"
                style={{ width: matrixStep === 0 ? '35%' : matrixStep === 1 ? '70%' : '100%' }}
              />
            </div>

            {/* Bottom Room Mesh Badge */}
            <div
              className={`flex items-center gap-1.5 ${
                isCompact ? 'text-[9px]' : 'text-[11px]'
              } font-mono text-slate-400`}
            >
              <Wifi className={`${isCompact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-cyan-400 animate-pulse`} />
              <span>Multi-Device Network</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const THEME_OPTIONS: {
  id: LoadingTheme;
  number: string;
  name: string;
  badge: string;
  badgeColor: string;
  icon: any;
  tagline: string;
  description: string;
}[] = [
  {
    id: 'option1',
    number: '01',
    name: 'Neon Equalizer Pulse',
    badge: 'DJ STUDIO',
    badgeColor: 'from-cyan-400 to-sky-500 text-black',
    icon: Sliders,
    tagline: 'Vibrant neon aura, 9-bar reactive equalizer, & NTP clock lock.',
    description: 'High-energy cyberpunk aesthetic with bouncing frequency bars and glowing neon aura.',
  },
  {
    id: 'option2',
    number: '02',
    name: 'Quantum Sonic Radar',
    badge: 'SPATIAL AUDIO',
    badgeColor: 'from-cyan-400 to-fuchsia-500 text-black',
    icon: Compass,
    tagline: 'Acoustic shockwaves with orbiting Host and Speaker soundstage nodes.',
    description: 'Orbital radar rings that simulate spatial audio triangulation between room participants.',
  },
  {
    id: 'option3',
    number: '03',
    name: 'Titanium Studio Glass',
    badge: 'LUXURY LOSSLESS',
    badgeColor: 'from-zinc-200 to-slate-400 text-black',
    icon: Disc3,
    tagline: 'Specular metallic sweep, platinum audio meters, & minimal typography.',
    description: 'Refined, modern studio luxury design with metallic sheen reflection and studio meters.',
  },
  {
    id: 'option4',
    number: '04',
    name: 'Cyber Ambient Matrix',
    badge: 'GLASSMORPHISM',
    badgeColor: 'from-fuchsia-400 to-pink-500 text-white',
    icon: Sparkles,
    tagline: 'Elevated frosted glass card with 3-step live network telemetry.',
    description: 'Frosted card with active multi-step progress telemetry and gradient accents.',
  },
];

interface LoadingScreensShowcaseProps {
  onClose?: () => void;
  onSelectTheme?: (theme: LoadingTheme) => void;
  initialTheme?: LoadingTheme;
}

export const LoadingScreensShowcase: React.FC<LoadingScreensShowcaseProps> = ({
  onClose,
  onSelectTheme,
  initialTheme = 'option1',
}) => {
  const [selectedTheme, setSelectedTheme] = useState<LoadingTheme>(() => {
    try {
      return (localStorage.getItem('musicsync_loading_theme') as LoadingTheme) || initialTheme;
    } catch {
      return initialTheme;
    }
  });

  const [viewMode, setViewMode] = useState<ShowcaseViewMode>('grid');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const handleApplyTheme = (theme: LoadingTheme) => {
    setSelectedTheme(theme);
    try {
      localStorage.setItem('musicsync_loading_theme', theme);
    } catch {}
    if (onSelectTheme) onSelectTheme(theme);
    const chosen = THEME_OPTIONS.find((t) => t.id === theme);
    setSavedNotice(chosen?.name || 'Theme');
    setTimeout(() => setSavedNotice(null), 2500);
  };

  // Keyboard navigation: G for grid, 1, 2, 3, 4 to switch options, Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'g' || e.key === '0') setViewMode('grid');
      if (e.key === '1') setViewMode('option1');
      if (e.key === '2') setViewMode('option2');
      if (e.key === '3') setViewMode('option3');
      if (e.key === '4') setViewMode('option4');
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[99999] w-full h-full bg-dark-950 flex flex-col select-none overflow-hidden font-sans">
      {/* ========================================================= */}
      {/* TOP FLOATING NAVIGATION & VIEW CONTROLLER                 */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-50 w-full px-3 py-3 sm:px-6 bg-dark-950/90 backdrop-blur-2xl border-b border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_10px_35px_rgba(0,0,0,0.85)]">
        {/* Left branding & title */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-0.5 shadow-[0_0_15px_rgba(0,240,255,0.4)]">
              <div className="w-full h-full bg-dark-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Loading Screen Gallery</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-400/15 border border-cyan-400/30 text-cyan-300 uppercase">
                  4 Live Themes
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                All themes run live with active animations. Click to select your default.
              </p>
            </div>
          </div>

          {/* Mobile Close Button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="sm:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Close Preview (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-dark-900/90 border border-white/10 shadow-inner overflow-x-auto max-w-full">
          {/* Grid View button */}
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'grid'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-[0_0_16px_rgba(0,240,255,0.6)] font-extrabold'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>All 4 Grid</span>
          </button>

          <div className="w-px h-4 bg-white/15 mx-0.5 shrink-0" />

          {/* Individual option tabs */}
          {THEME_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = viewMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setViewMode(opt.id)}
                className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-black shadow-[0_0_14px_rgba(255,255,255,0.5)] font-extrabold'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span className="hidden md:inline">{opt.name.split(' ')[0]}</span>
                <span className="md:hidden">{opt.number}</span>
              </button>
            );
          })}

          {/* Close button on desktop */}
          {onClose && (
            <>
              <div className="w-px h-4 bg-white/15 mx-0.5 shrink-0 hidden sm:block" />
              <button
                type="button"
                onClick={onClose}
                className="hidden sm:flex p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                title="Close Gallery (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Floating Saved Toast Notification */}
      {savedNotice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-bounce px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-mono font-bold shadow-[0_0_24px_rgba(16,185,129,0.5)] flex items-center gap-2 backdrop-blur-xl">
          <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
          <span>"{savedNotice}" set as your default loading screen!</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* MAIN VIEWPORT: GRID MODE VS FULLSCREEN MODE               */}
      {/* ========================================================= */}
      {viewMode === 'grid' ? (
        /* ------------------------------------------------------- */
        /* ALL-IN-ONE 2x2 COMPARISON GALLERY GRID                  */
        /* ------------------------------------------------------- */
        <main className="flex-1 w-full h-full overflow-y-auto p-3 sm:p-6 pb-20 custom-scrollbar">
          <div className="max-w-6xl mx-auto space-y-4">
            {/* Gallery Intro Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-1 text-xs text-slate-400">
              <p>
                Compare all four live animations in real-time. Choose your favorite below or expand
                fullscreen to test full fidelity.
              </p>
              <div className="flex items-center gap-2 font-mono text-[11px] text-cyan-300 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Rendering Synchronized</span>
              </div>
            </div>

            {/* 2x2 Responsive Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              {THEME_OPTIONS.map((option) => {
                const isSelected = selectedTheme === option.id;
                const Icon = option.icon;

                return (
                  <div
                    key={option.id}
                    className={`relative rounded-3xl border transition-all duration-300 flex flex-col overflow-hidden bg-dark-900/70 backdrop-blur-xl group ${
                      isSelected
                        ? 'border-cyan-400/90 shadow-[0_0_35px_rgba(0,240,255,0.22)] ring-1 ring-cyan-400/50'
                        : 'border-white/10 hover:border-white/25 hover:shadow-[0_0_25px_rgba(255,255,255,0.06)]'
                    }`}
                  >
                    {/* Top Card Header */}
                    <div className="px-4 py-3 border-b border-white/10 bg-dark-900/90 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs bg-gradient-to-tr ${option.badgeColor}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-2">
                            <span>{option.name}</span>
                          </h3>
                          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                            {option.badge}
                          </p>
                        </div>
                      </div>

                      {/* Selection Status Badge */}
                      {isSelected ? (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-mono font-bold shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>ACTIVE DEFAULT</span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-500">Option {option.number}</span>
                      )}
                    </div>

                    {/* Miniature Live Preview Viewport */}
                    <div className="relative h-[270px] sm:h-[300px] w-full overflow-hidden bg-dark-950 flex items-center justify-center">
                      <LoadingScreenContent theme={option.id} isCompact={true} />

                      {/* Quick Fullscreen Hover Overlay Trigger */}
                      <button
                        type="button"
                        onClick={() => setViewMode(option.id)}
                        className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-dark-900/80 hover:bg-white text-slate-300 hover:text-black border border-white/15 text-[10px] font-mono font-bold backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-lg"
                        title="Expand to Fullscreen Preview"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>Fullscreen</span>
                      </button>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="p-3 sm:p-4 border-t border-white/10 bg-dark-900/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <p className="text-xs text-slate-400 line-clamp-1 flex-1 pr-2">
                        {option.tagline}
                      </p>

                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => setViewMode(option.id)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApplyTheme(option.id)}
                          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md ${
                            isSelected
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]'
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
        /* ------------------------------------------------------- */
        /* FULLSCREEN SINGLE THEME INSPECTION VIEW                 */
        /* ------------------------------------------------------- */
        <main className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center">
          {/* Sub-bar for Fullscreen Actions */}
          <div className="absolute top-4 left-4 z-40 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-dark-900/90 hover:bg-white text-slate-300 hover:text-black border border-white/15 text-xs font-bold backdrop-blur-xl transition-all cursor-pointer shadow-lg"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>← Back to All 4 Grid</span>
            </button>
          </div>

          <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleApplyTheme(viewMode as LoadingTheme)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-lg ${
                selectedTheme === viewMode
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_14px_rgba(16,185,129,0.3)]'
                  : 'bg-gradient-to-r from-cyan-400 to-sky-400 text-black shadow-[0_0_16px_rgba(0,240,255,0.5)]'
              }`}
            >
              {selectedTheme === viewMode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                  <span>Active Default</span>
                </>
              ) : (
                <span>Set as Default Loading Screen</span>
              )}
            </button>
          </div>

          <LoadingScreenContent theme={viewMode as LoadingTheme} isCompact={false} />
        </main>
      )}

      {/* ========================================================= */}
      {/* BOTTOM FOOTER INFO SHORTCUTS                              */}
      {/* ========================================================= */}
      <footer className="sticky bottom-0 z-40 w-full py-2 px-4 bg-dark-950/90 border-t border-white/10 text-center backdrop-blur-md">
        <p className="text-[11px] font-mono text-slate-400">
          Keyboard shortcuts: Press{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-dark-900 border border-white/15 text-white">G</kbd> for
          Grid •{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-dark-900 border border-white/15 text-white">1</kbd>{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-dark-900 border border-white/15 text-white">2</kbd>{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-dark-900 border border-white/15 text-white">3</kbd>{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-dark-900 border border-white/15 text-white">4</kbd> to
          switch fullscreen •{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-dark-900 border border-white/15 text-white">Esc</kbd> to
          close
        </p>
      </footer>
    </div>
  );
};
