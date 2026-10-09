import React from 'react';

export type HeaderLogoVariant = 'studio' | 'rack' | 'stealth' | 'aerograde' | 'default';

export const HeaderBrandLogo: React.FC<{
  className?: string;
  onClick?: () => void;
  variant?: HeaderLogoVariant;
}> = ({ className = '', onClick, variant = 'studio' }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) {
      onClick();
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  // 1. RACK VARIANT: Teenage Engineering / Studio Rack Audio Console
  if (variant === 'rack') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`musicsync-brand-btn flex items-center gap-2 select-none px-2 py-1 rounded-md hover:bg-white/5 active:scale-95 transition-all duration-150 cursor-pointer border border-zinc-800/80 bg-zinc-950/60 text-left focus:outline-none ${className}`}
        title="MusicSync Pro Rack Console · Click to refresh"
      >
        <div className="musicsync-eq-container" aria-label="Audio Equalizer">
          <span className="musicsync-eq-bar musicsync-eq-bar-1" />
          <span className="musicsync-eq-bar musicsync-eq-bar-2" />
          <span className="musicsync-eq-bar musicsync-eq-bar-3" />
          <span className="musicsync-eq-bar musicsync-eq-bar-4" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="musicsync-wordmark font-mono uppercase tracking-wider text-xs">
            MusicSync
          </span>
          <span className="hidden sm:inline-block px-1 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-mono font-bold text-emerald-400 leading-none">
            PRO
          </span>
        </div>
      </button>
    );
  }

  // 2. STEALTH VARIANT: Matte Obsidian DLC & Surgical Emerald Dot
  if (variant === 'stealth') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`musicsync-brand-btn flex items-center gap-2 select-none px-1.5 py-0.5 rounded-lg hover:bg-white/5 active:scale-95 transition-all duration-150 cursor-pointer border-0 bg-transparent text-left focus:outline-none ${className}`}
        title="MusicSync Stealth · Click to refresh"
      >
        <div className="musicsync-eq-container" aria-label="Audio Equalizer">
          <span className="musicsync-eq-bar musicsync-eq-bar-1" />
          <span className="musicsync-eq-bar musicsync-eq-bar-2" />
          <span className="musicsync-eq-bar musicsync-eq-bar-3" />
          <span className="musicsync-eq-bar musicsync-eq-bar-4" />
        </div>
        <div className="flex items-center gap-1">
          <span className="musicsync-wordmark text-xs font-sans">
            MusicSync
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-90 shadow-[0_0_6px_rgba(52,211,153,0.9)] shrink-0" />
        </div>
      </button>
    );
  }

  // 3. AEROGRADE VARIANT: Frosted Glass & Specular Metallic Sheen
  if (variant === 'aerograde') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`musicsync-brand-btn flex items-center gap-2 select-none px-2 py-0.5 rounded-xl hover:bg-white/10 active:scale-95 transition-all duration-150 cursor-pointer border border-white/10 bg-white/[0.03] backdrop-blur-md text-left focus:outline-none shadow-[0_2px_10px_rgba(0,0,0,0.3)] ${className}`}
        title="MusicSync Aerograde Glass · Click to refresh"
      >
        <div className="musicsync-eq-container" aria-label="Audio Equalizer">
          <span className="musicsync-eq-bar musicsync-eq-bar-1" />
          <span className="musicsync-eq-bar musicsync-eq-bar-2" />
          <span className="musicsync-eq-bar musicsync-eq-bar-3" />
          <span className="musicsync-eq-bar musicsync-eq-bar-4" />
        </div>
        <span className="musicsync-wordmark text-xs font-sans">
          MusicSync
        </span>
      </button>
    );
  }

  // 4. DEFAULT ORIGINAL NEON VARIANT (Legacy fallback)
  if (variant === 'default') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`musicsync-brand-btn flex items-center gap-2 select-none px-1.5 py-0.5 rounded-lg hover:bg-white/10 active:scale-95 transition-all duration-150 cursor-pointer border-0 bg-transparent text-left focus:outline-none ${className}`}
        title="MusicSync Neon · Click to refresh"
      >
        <div className="musicsync-eq-container" aria-label="Audio Equalizer">
          <span className="musicsync-eq-bar musicsync-eq-bar-1" style={{ background: 'linear-gradient(to top, #00f0ff, #d946ef)' }} />
          <span className="musicsync-eq-bar musicsync-eq-bar-2" style={{ background: 'linear-gradient(to top, #00f0ff, #d946ef)' }} />
          <span className="musicsync-eq-bar musicsync-eq-bar-3" style={{ background: 'linear-gradient(to top, #00f0ff, #d946ef)' }} />
          <span className="musicsync-eq-bar musicsync-eq-bar-4" style={{ background: 'linear-gradient(to top, #00f0ff, #d946ef)' }} />
        </div>
        <span className="font-sans font-extrabold text-xs tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-fuchsia-400 hover:brightness-125 transition-all">
          MusicSync
        </span>
      </button>
    );
  }

  // 5. TITANIUM STUDIO MINIMAL (Apple & Leica Brushed Titanium - Recommended Default)
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`musicsync-brand-btn flex items-center gap-2 select-none px-2 py-1 rounded-lg hover:bg-white/[0.06] active:scale-95 transition-all duration-150 cursor-pointer border-0 bg-transparent text-left focus:outline-none group ${className}`}
      title="MusicSync Titanium Studio · Click to refresh"
    >
      {/* Dynamic 4-Bar Precision Equalizer Waveform */}
      <div className="musicsync-eq-container" aria-label="Audio Equalizer">
        <span className="musicsync-eq-bar musicsync-eq-bar-1" />
        <span className="musicsync-eq-bar musicsync-eq-bar-2" />
        <span className="musicsync-eq-bar musicsync-eq-bar-3" />
        <span className="musicsync-eq-bar musicsync-eq-bar-4" />
      </div>

      {/* Laser-Etched Titanium Wordmark */}
      <div className="flex items-center gap-1.5">
        <span className="musicsync-wordmark text-xs font-sans">
          MusicSync
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/90 shadow-[0_0_6px_rgba(52,211,153,0.9)] shrink-0" />
      </div>
    </button>
  );
};

export default HeaderBrandLogo;
