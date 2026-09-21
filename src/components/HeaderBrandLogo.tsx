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
        className={`flex items-center gap-2 select-none px-2 py-1 rounded-md hover:bg-white/5 active:scale-95 transition-all duration-150 cursor-pointer border border-zinc-800/80 bg-zinc-950/60 text-left focus:outline-none ${className}`}
        title="MusicSync Pro Rack Console · Click to refresh"
      >
        <img
          src="/musicsync-icon.png"
          alt="MusicSync"
          className="w-4 h-4 object-contain filter drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]"
        />
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-bold text-xs tracking-wider text-zinc-100 uppercase">
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
        className={`flex items-center gap-2 select-none px-1.5 py-0.5 rounded-lg hover:bg-white/5 active:scale-95 transition-all duration-150 cursor-pointer border-0 bg-transparent text-left focus:outline-none ${className}`}
        title="MusicSync Stealth · Click to refresh"
      >
        <img
          src="/musicsync-icon.png"
          alt="MusicSync"
          className="w-4 h-4 object-contain filter drop-shadow-[0_0_6px_rgba(255,255,255,0.2)]"
        />
        <div className="flex items-center gap-1">
          <span className="font-sans font-bold text-xs tracking-tight text-zinc-200 hover:text-white transition-colors">
            MusicSync
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-80 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
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
        className={`flex items-center gap-2 select-none px-2 py-0.5 rounded-xl hover:bg-white/10 active:scale-95 transition-all duration-150 cursor-pointer border border-white/10 bg-white/[0.03] backdrop-blur-md text-left focus:outline-none shadow-[0_2px_10px_rgba(0,0,0,0.3)] ${className}`}
        title="MusicSync Aerograde Glass · Click to refresh"
      >
        <img
          src="/musicsync-icon.png"
          alt="MusicSync"
          className="w-4.5 h-4.5 object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
        />
        <span className="font-sans font-extrabold text-xs tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-zinc-400 hover:brightness-125 transition-all">
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
        className={`flex items-center gap-2 select-none px-1.5 py-0.5 rounded-lg hover:bg-white/10 active:scale-95 transition-all duration-150 cursor-pointer border-0 bg-transparent text-left focus:outline-none ${className}`}
        title="MusicSync · Click to refresh"
      >
        <img
          src="/musicsync-icon.png"
          alt="MusicSync"
          className="w-4.5 h-4.5 object-contain filter drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]"
        />
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
      className={`flex items-center gap-2.5 select-none px-2 py-1 rounded-lg hover:bg-white/[0.06] active:scale-95 transition-all duration-150 cursor-pointer border-0 bg-transparent text-left focus:outline-none group ${className}`}
      title="MusicSync Titanium Studio · Click to refresh"
    >
      {/* Official Titanium Emblem Icon */}
      <div className="relative w-5 h-5 shrink-0 flex items-center justify-center">
        <img
          src="/musicsync-icon.png"
          alt="MusicSync Icon"
          className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      {/* Laser-Etched Titanium Wordmark */}
      <div className="flex items-center gap-1.5">
        <span className="font-sans font-extrabold text-xs tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400 group-hover:from-white group-hover:to-zinc-200 transition-all">
          MusicSync
        </span>
        <span className="w-1 h-1 rounded-full bg-emerald-400/80 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
      </div>
    </button>
  );
};

export default HeaderBrandLogo;
