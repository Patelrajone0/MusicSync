import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  layout?: 'horizontal' | 'vertical';
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  layout = 'horizontal',
  showText = true,
  showTagline = false,
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16 md:w-20 md:h-20',
  };

  const textSizes = {
    sm: 'text-base sm:text-lg',
    md: 'text-lg sm:text-xl',
    lg: 'text-2xl sm:text-3xl md:text-4xl',
  };

  // 1. Vertical layout (used primarily in the Lobby hero and welcome screen)
  if (layout === 'vertical') {
    return (
      <div className={`flex flex-col items-center text-center group select-none ${className}`}>
        {showText ? (
          // Full Brand Master Logo (Emblem + "MusicSync" Wordmark)
          <div className="relative flex flex-col items-center">
            {/* Ambient neon aura on hover */}
            <div className="absolute -inset-3 bg-gradient-to-r from-cyan-500/20 via-purple-500/15 to-pink-500/20 rounded-3xl blur-2xl opacity-40 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            {/* High-Resolution 3D Neon Chrome Master Logo */}
            <img
              src="/musicsync-logo.png"
              alt="MusicSync Logo"
              className="w-full max-w-[260px] sm:max-w-[320px] md:max-w-[360px] h-auto object-contain relative z-10 drop-shadow-[0_8px_32px_rgba(0,0,0,0.9)] group-hover:scale-[1.02] transition-transform duration-300"
            />

            {showTagline && (
              <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-dark-900/90 border border-white/10 shadow-lg mt-1.5 relative z-10 backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-slate-300 uppercase font-mono">
                  Multi-Device Speaker Mesh
                </span>
              </div>
            )}
          </div>
        ) : (
          // Standalone High-Res Squircle Icon (used in Loading / Splash states)
          <div className="relative group">
            <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-cyan-500/30 to-fuchsia-500/30 blur-lg opacity-60 animate-pulse pointer-events-none" />
            <img
              src="/musicsync-icon.png"
              alt="MusicSync Icon"
              className={`${iconSizes[size]} object-contain relative z-10 drop-shadow-xl group-hover:scale-105 transition-transform duration-300`}
            />
          </div>
        )}
      </div>
    );
  }

  // 2. Horizontal layout (used in RoomHeader navigation dock)
  return (
    <div className={`flex items-center gap-2 sm:gap-2.5 group select-none ${className}`}>
      {/* High-Res Squircle Emblem Badge */}
      <div className="relative shrink-0">
        <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-cyan-500/25 to-fuchsia-500/25 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300 pointer-events-none" />
        <img
          src="/musicsync-icon.png"
          alt="MusicSync"
          className={`${iconSizes[size]} object-contain relative z-10 drop-shadow-md group-hover:scale-105 transition-transform duration-200 shrink-0`}
        />
      </div>

      {/* Brand Wordmark matching the 3D logo colorway */}
      {showText && (
        <div className="flex flex-col text-left">
          <div className="flex items-center tracking-tight leading-none">
            <span className={`${textSizes[size]} font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] via-[#38bdf8] to-[#60a5fa] tracking-tight`}>
              Music
            </span>
            <span className={`${textSizes[size]} font-black text-transparent bg-clip-text bg-gradient-to-r from-[#c084fc] via-[#e879f9] to-[#f43f5e] ml-0.5 tracking-tight`}>
              Sync
            </span>
            {/* Synchronized status dot */}
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 ml-1.5 inline-block opacity-90 shadow-[0_0_8px_rgba(0,240,255,0.9)] animate-pulse" />
          </div>

          {showTagline && (
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mt-1 flex items-center gap-1.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              Multi-Device Mesh
            </span>
          )}
        </div>
      )}
    </div>
  );
};

