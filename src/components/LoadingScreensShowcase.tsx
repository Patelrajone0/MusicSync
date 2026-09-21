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
} from 'lucide-react';

export type LoadingTheme = 'option1' | 'option2' | 'option3' | 'option4';

interface LoadingScreenContentProps {
  theme: LoadingTheme;
}

export const LoadingScreenContent: React.FC<LoadingScreenContentProps> = ({ theme }) => {
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
        <div className="w-full h-full flex flex-col items-center justify-center p-4 relative overflow-hidden animate-fade-in">
          {/* Ambient Reactive Neon Light Field */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-gradient-to-tr from-cyan-500/20 via-purple-500/15 to-pink-500/20 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />

          <div className="relative z-10 flex flex-col items-center gap-5 sm:gap-6 text-center max-w-md w-full px-4">
            {/* Breathing MusicSync Neon Emblem */}
            <div className="relative flex flex-col items-center group">
              <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/30 via-purple-500/25 to-pink-500/30 rounded-3xl blur-2xl opacity-80 animate-pulse pointer-events-none" />
              <img
                src="/musicsync-logo.png"
                alt="MusicSync Logo"
                className="w-full max-w-[320px] sm:max-w-[420px] h-auto object-contain relative z-10 mix-blend-screen drop-shadow-[0_8px_32px_rgba(0,0,0,0.85)]"
              />
            </div>

            {/* Dynamic 9-Bar Frequency Audio Equalizer */}
            <div className="flex items-end justify-center gap-1.5 h-8 sm:h-9 px-4 py-1">
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
                  className="w-1.5 sm:w-2 h-full rounded-full bg-gradient-to-t from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_8px_rgba(0,240,255,0.6)] animate-[eqBarBounce_1s_ease-in-out_infinite] origin-bottom"
                />
              ))}
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-1.5">
              <h3 className="text-base sm:text-xl font-extrabold text-white tracking-tight">
                Synchronizing Audio Mesh...
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 font-medium">
                Calibrating 0ms latency with connected speakers
              </p>
            </div>

            {/* Fluid Hairline Progress Bar */}
            <div className="w-56 sm:w-72 h-1 rounded-full bg-dark-900 border border-white/10 overflow-hidden relative shadow-inner">
              <div className="w-1/2 h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_12px_rgba(0,240,255,0.8)] animate-[progressSweepLine_2s_ease-in-out_infinite]" />
            </div>

            {/* High-Precision NTP Telemetry Pill */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-dark-900/90 border border-cyan-400/35 shadow-[0_0_18px_rgba(0,240,255,0.25)] backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
              <span className="text-[11px] font-mono text-cyan-300 font-bold tracking-wider uppercase">
                0ms NTP Clock Locked • 16/16
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* THEME 2: QUANTUM SONIC RADAR (Spatial Audio Theme)      */}
      {/* ======================================================= */}
      {theme === 'option2' && (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 relative overflow-hidden animate-fade-in">
          {/* Ambient Background Aura */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-500/15 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Central Orbital Soundstage Container */}
          <div className="relative w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center z-10">
            {/* Expanding Concentric Sonar Acoustic Shockwaves */}
            <div className="absolute inset-4 rounded-full border border-cyan-400/30 animate-[radarPingWave_3.2s_ease-out_infinite] pointer-events-none" />
            <div className="absolute inset-4 rounded-full border border-fuchsia-500/25 animate-[radarPingWave_3.2s_ease-out_infinite_1.6s] pointer-events-none" />

            {/* Outer Cyan Orbit Ring with Satellite Node */}
            <div className="absolute inset-0 rounded-full border border-cyan-400/25 animate-[spinSlow_10s_linear_infinite] pointer-events-none">
              <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_16px_rgba(0,240,255,1)] absolute -top-1.5 left-1/2 -translate-x-1/2" />
            </div>

            {/* Inner Violet Orbit Ring with Counter Rotation */}
            <div className="absolute inset-8 rounded-full border border-fuchsia-500/25 animate-[spinReverseSlow_7s_linear_infinite] pointer-events-none">
              <div className="w-2.5 h-2.5 rounded-full bg-fuchsia-400 shadow-[0_0_14px_rgba(232,121,249,1)] absolute -bottom-1.25 left-1/2 -translate-x-1/2" />
            </div>

            {/* Speaker Beacons on Perimeter (Echoing 3D soundstage) */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-dark-900 border border-amber-400/60 flex items-center justify-center text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)] text-[10px]">
                <Crown className="w-3 h-3 fill-amber-400" />
              </div>
              <span className="text-[9px] font-mono text-amber-300 font-bold mt-0.5">Host</span>
            </div>

            <div className="absolute bottom-10 left-6 flex flex-col items-center">
              <div className="w-5 h-5 rounded-full bg-dark-900 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.4)] text-[9px]">
                <Volume2 className="w-2.5 h-2.5" />
              </div>
              <span className="text-[9px] font-mono text-cyan-400 mt-0.5">Spk L</span>
            </div>

            <div className="absolute bottom-10 right-6 flex flex-col items-center">
              <div className="w-5 h-5 rounded-full bg-dark-900 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.4)] text-[9px]">
                <Volume2 className="w-2.5 h-2.5" />
              </div>
              <span className="text-[9px] font-mono text-cyan-400 mt-0.5">Spk R</span>
            </div>

            {/* Centerpiece MusicSync Emblem */}
            <div className="relative z-10 flex flex-col items-center max-w-[220px] sm:max-w-[260px]">
              <img
                src="/musicsync-logo.png"
                alt="MusicSync Logo"
                className="w-full h-auto object-contain mix-blend-screen drop-shadow-[0_8px_24px_rgba(0,0,0,0.9)]"
              />
            </div>
          </div>

          {/* Bottom Status Info */}
          <div className="relative z-10 flex flex-col items-center gap-3 text-center mt-3">
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Connecting Multi-Device Soundstage
              </h3>
              <p className="text-xs text-slate-400">
                Triangulating acoustic spatial orientation
              </p>
            </div>

            <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-dark-900/90 border border-cyan-400/35 shadow-[0_0_16px_rgba(0,240,255,0.25)] backdrop-blur-md">
              <div className="w-4 h-4 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin shrink-0" />
              <span className="text-[11px] font-mono text-cyan-300 font-bold tracking-wider uppercase">
                Spatial Radar Synchronizing
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* THEME 3: TITANIUM STUDIO GLASS (Minimal Pro Luxury)     */}
      {/* ======================================================= */}
      {theme === 'option3' && (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 relative overflow-hidden animate-fade-in">
          {/* Subtle Platinum & Slate Ambient Lighting */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-gradient-to-tr from-cyan-500/10 via-zinc-400/5 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center gap-6 text-center max-w-sm w-full px-4">
            {/* Titanium Emblem with Diagonal Specular Light Sheen */}
            <div className="relative flex flex-col items-center group overflow-hidden rounded-2xl p-2">
              <img
                src="/musicsync-titanium.png?v=3"
                alt="MusicSync Titanium"
                className="w-full max-w-[280px] sm:max-w-[320px] h-auto object-contain relative z-10"
              />
              {/* Metallic Specular Sweep */}
              <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/25 to-transparent animate-[specularShineSweep_2.8s_ease-in-out_infinite]" />
              </div>
            </div>

            {/* Minimal 5-Bar Luxury Audio Indicator */}
            <div className="flex items-center gap-1.5 h-6">
              <span className="w-1 h-3 rounded-full bg-zinc-500 animate-pulse" style={{ animationDuration: '1.2s' }} />
              <span className="w-1 h-5 rounded-full bg-zinc-300 animate-pulse" style={{ animationDuration: '0.8s', animationDelay: '0.2s' }} />
              <span className="w-1 h-6 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse" style={{ animationDuration: '1.0s', animationDelay: '0.4s' }} />
              <span className="w-1 h-4 rounded-full bg-zinc-300 animate-pulse" style={{ animationDuration: '1.1s', animationDelay: '0.15s' }} />
              <span className="w-1 h-3 rounded-full bg-zinc-500 animate-pulse" style={{ animationDuration: '1.3s', animationDelay: '0.3s' }} />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-mono font-bold tracking-[0.18em] text-white uppercase">
                Reconnecting Mesh
              </h3>
              <p className="text-xs text-zinc-400 font-mono tracking-wider">
                48kHz Lossless Synchronized Audio
              </p>
            </div>

            {/* Minimalist Glass Hairline Progress */}
            <div className="w-full max-w-[260px] space-y-1.5">
              <div className="h-[2px] w-full bg-zinc-800 rounded-full overflow-hidden relative">
                <div className="h-full w-1/3 bg-gradient-to-r from-cyan-400 to-white shadow-[0_0_10px_rgba(0,240,255,0.8)] animate-[progressSweepLine_2.2s_ease-in-out_infinite]" />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
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
        <div className="w-full h-full flex flex-col items-center justify-center p-4 relative overflow-hidden animate-fade-in">
          {/* Ambient Background Aura */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-fuchsia-600/15 via-cyan-500/15 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Elevated Cyber Glassmorphic Card */}
          <div className="relative z-10 w-full max-w-sm sm:max-w-md p-6 sm:p-8 rounded-3xl bg-dark-900/85 backdrop-blur-2xl border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.9),0_0_30px_rgba(0,240,255,0.08)] flex flex-col items-center gap-5 text-center overflow-hidden">
            {/* Top Cyber Hairline Accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent pointer-events-none" />

            {/* Logo with Soft Glow */}
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 rounded-2xl blur-xl opacity-80 pointer-events-none" />
              <img
                src="/musicsync-logo.png"
                alt="MusicSync Logo"
                className="w-full max-w-[260px] sm:max-w-[320px] h-auto object-contain relative z-10 mix-blend-screen drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]"
              />
            </div>

            {/* Step Flow Transition Banner */}
            <div className="w-full space-y-2 py-1">
              <div className="h-6 flex items-center justify-center">
                <span
                  key={matrixStep}
                  className="text-xs sm:text-sm font-mono font-bold text-cyan-300 animate-fade-in tracking-wide"
                >
                  {matrixStep === 0 && '[1/3] Handshaking Room Socket...'}
                  {matrixStep === 1 && '[2/3] Calibrating NTP Clock Offset...'}
                  {matrixStep === 2 && '[3/3] Restoring Session State...'}
                </span>
              </div>

              {/* 3 Step Dot Indicators */}
              <div className="flex items-center justify-center gap-2">
                <span
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    matrixStep === 0 ? 'w-6 bg-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.8)]' : 'w-1.5 bg-zinc-700'
                  }`}
                />
                <span
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    matrixStep === 1 ? 'w-6 bg-purple-400 shadow-[0_0_8px_rgba(157,78,221,0.8)]' : 'w-1.5 bg-zinc-700'
                  }`}
                />
                <span
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    matrixStep === 2 ? 'w-6 bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'w-1.5 bg-zinc-700'
                  }`}
                />
              </div>
            </div>

            {/* Animated Progress Bar */}
            <div className="w-full h-1.5 bg-dark-950 border border-white/10 rounded-full overflow-hidden relative shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500 rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(0,240,255,0.7)]"
                style={{ width: matrixStep === 0 ? '35%' : matrixStep === 1 ? '70%' : '100%' }}
              />
            </div>

            {/* Bottom Room Mesh Badge */}
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <Wifi className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Multi-Device Acoustic Network</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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

  const [activeTab, setActiveTab] = useState<LoadingTheme>(selectedTheme);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleApplyTheme = (theme: LoadingTheme) => {
    setSelectedTheme(theme);
    try {
      localStorage.setItem('musicsync_loading_theme', theme);
    } catch {}
    if (onSelectTheme) onSelectTheme(theme);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  // Keyboard navigation: 1, 2, 3, 4 to switch options, Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1') setActiveTab('option1');
      if (e.key === '2') setActiveTab('option2');
      if (e.key === '3') setActiveTab('option3');
      if (e.key === '4') setActiveTab('option4');
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[99999] w-full h-full bg-dark-950 flex flex-col select-none overflow-hidden font-sans">
      {/* ========================================================= */}
      {/* FLOATING TOP SWITCHER DOCK                                 */}
      {/* ========================================================= */}
      <header className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-3 flex flex-col items-center gap-2">
        <div className="flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-full bg-dark-900/90 backdrop-blur-2xl border border-white/15 shadow-[0_10px_35px_rgba(0,0,0,0.85),0_0_25px_rgba(0,240,255,0.15)] overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('option1')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'option1'
                ? 'bg-gradient-to-r from-cyan-400 to-sky-400 text-black shadow-[0_0_15px_rgba(0,240,255,0.5)] scale-105'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>1. Equalizer Pulse</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('option2')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'option2'
                ? 'bg-gradient-to-r from-cyan-400 to-purple-400 text-black shadow-[0_0_15px_rgba(0,240,255,0.5)] scale-105'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>2. Quantum Radar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('option3')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'option3'
                ? 'bg-gradient-to-r from-zinc-200 to-slate-300 text-black shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Disc3 className="w-3.5 h-3.5" />
            <span>3. Titanium Glass</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('option4')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'option4'
                ? 'bg-gradient-to-r from-fuchsia-400 to-pink-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)] scale-105'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>4. Cyber Matrix</span>
          </button>

          <div className="w-px h-5 bg-white/20 mx-1 shrink-0" />

          {/* Set as Default button */}
          <button
            type="button"
            onClick={() => handleApplyTheme(activeTab)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all whitespace-nowrap ${
              selectedTheme === activeTab
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            }`}
            title="Set this theme as your active default loading screen"
          >
            {selectedTheme === activeTab ? (
              <>
                <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                <span>Active</span>
              </>
            ) : (
              <span>Apply Theme</span>
            )}
          </button>

          {/* Close / Exit Preview */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-0.5"
              title="Close Preview (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Floating Saved Toast Notice */}
        {savedNotice && (
          <div className="animate-fade-in px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold shadow-[0_0_16px_rgba(16,185,129,0.35)] flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            <span>Saved as default loading screen!</span>
          </div>
        )}
      </header>

      {/* ========================================================= */}
      {/* SCREEN CONTAINER: SELECTED LIVE THEME                     */}
      {/* ========================================================= */}
      <main className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center">
        <LoadingScreenContent theme={activeTab} />
      </main>

      {/* ========================================================= */}
      {/* BOTTOM FOOTER INFO BAR                                    */}
      {/* ========================================================= */}
      <footer className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 text-center px-4 pointer-events-none">
        <p className="text-[11px] font-mono text-slate-500 select-none">
          Use buttons above or press <kbd className="px-1.5 py-0.5 rounded bg-dark-900 border border-white/10 text-slate-300">1</kbd> <kbd className="px-1.5 py-0.5 rounded bg-dark-900 border border-white/10 text-slate-300">2</kbd> <kbd className="px-1.5 py-0.5 rounded bg-dark-900 border border-white/10 text-slate-300">3</kbd> <kbd className="px-1.5 py-0.5 rounded bg-dark-900 border border-white/10 text-slate-300">4</kbd> to switch • Click <strong className="text-cyan-300 font-semibold">Apply Theme</strong> to set as default
        </p>
      </footer>
    </div>
  );
};
