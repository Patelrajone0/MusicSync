import React from 'react';

export type LogoVariant = 'titanium' | 'vector' | 'wordmark' | 'neon';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  layout?: 'horizontal' | 'vertical';
  variant?: LogoVariant;
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  layout = 'horizontal',
  variant = 'titanium',
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

  // 1. VERTICAL LAYOUT (Lobby Hero)
  if (layout === 'vertical') {
    // VARIANT 1: BRUSHED TITANIUM & OBSIDIAN EMBLEM (Modern Classic Luxury)
    if (variant === 'titanium') {
      return (
        <div className={`flex flex-col items-center text-center group select-none ${className}`}>
          <div className="relative flex flex-col items-center">
            {/* Subtle, dark ambient halo */}
            <div className="absolute -inset-4 bg-white/[0.03] rounded-full blur-2xl pointer-events-none" />

            {/* Dark Brushed Titanium Emblem */}
            <img
              src="/musicsync-dark-logo.jpg"
              alt="MusicSync Titanium"
              className="w-full max-w-[260px] sm:max-w-[320px] h-auto object-contain rounded-2xl relative z-10 shadow-2xl transition-transform duration-300 group-hover:scale-[1.01]"
            />

            {showTagline && (
              <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 mt-2.5 text-[10px] font-mono tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                <span>Multi-Device Mesh</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    // VARIANT 2: PURE MINIMALIST VECTOR AUDIO MARK (Lightweight, Crisp SVG)
    if (variant === 'vector') {
      return (
        <div className={`flex flex-col items-center text-center group select-none ${className}`}>
          <div className="relative flex flex-col items-center">
            {/* Custom Vector Infinity Waveform Emblem */}
            <div className="w-20 h-12 sm:w-24 sm:h-14 flex items-center justify-center text-white mb-2 relative">
              <svg viewBox="0 0 100 48" className="w-full h-full" fill="none" stroke="currentColor">
                {/* Infinity Loop in Brushed Platinum */}
                <path
                  d="M26,24 C14,14 6,18 6,24 C6,30 14,34 26,24 C38,14 46,14 50,24 C54,34 62,34 74,24 C86,14 94,18 94,24 C94,30 86,34 74,24 C62,14 54,14 50,24 C46,34 38,34 26,24 Z"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="stroke-zinc-500 group-hover:stroke-zinc-300 transition-colors"
                />
                {/* Central Audio Waveform Bars */}
                <line x1="38" y1="18" x2="38" y2="30" stroke="#a1a1aa" strokeWidth="2.2" strokeLinecap="round" />
                <line x1="44" y1="12" x2="44" y2="36" stroke="#f4f4f5" strokeWidth="2.4" strokeLinecap="round" />
                <line x1="50" y1="8" x2="50" y2="40" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" />
                <line x1="56" y1="12" x2="56" y2="36" stroke="#f4f4f5" strokeWidth="2.4" strokeLinecap="round" />
                <line x1="62" y1="18" x2="62" y2="30" stroke="#a1a1aa" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>

            {/* Wordmark */}
            <div className="flex items-center tracking-tight leading-none">
              <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Music
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-zinc-400 ml-0.5 tracking-tight">
                Sync
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-white ml-1.5 inline-block opacity-90 animate-pulse shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
            </div>

            {showTagline && (
              <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 mt-2 text-[10px] font-mono tracking-wider uppercase">
                <span>0ms Synchronized Audio</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    // VARIANT 3: MINIMAL WORDMARK CREST (Audio Equipment Pro Style)
    if (variant === 'wordmark') {
      return (
        <div className={`flex flex-col items-center text-center group select-none ${className}`}>
          <div className="flex flex-col items-center gap-1.5">
            {/* Minimal 5-Bar Titanium Equalizer */}
            <div className="flex items-center gap-1 h-5 px-1 shrink-0 mb-1">
              <span className="w-1 h-2 rounded-full bg-zinc-500 animate-pulse" style={{ animationDuration: '1.2s' }} />
              <span className="w-1 h-4 rounded-full bg-zinc-300 animate-pulse" style={{ animationDuration: '0.8s', animationDelay: '0.2s' }} />
              <span className="w-1 h-5 rounded-full bg-white animate-pulse" style={{ animationDuration: '1.0s', animationDelay: '0.4s' }} />
              <span className="w-1 h-3.5 rounded-full bg-zinc-300 animate-pulse" style={{ animationDuration: '1.1s', animationDelay: '0.15s' }} />
              <span className="w-1 h-2 rounded-full bg-zinc-500 animate-pulse" style={{ animationDuration: '1.3s', animationDelay: '0.3s' }} />
            </div>

            {/* Typography */}
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-1">
              <span>MusicSync</span>
            </h1>

            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">
              Acoustic Speaker Mesh
            </span>
          </div>
        </div>
      );
    }

    // VARIANT 4: NEON (Original 3D Colorful Logo)
    return (
      <div className={`flex flex-col items-center text-center group select-none ${className}`}>
        {showText ? (
          <div className="relative flex flex-col items-center">
            <div className="absolute -inset-3 bg-gradient-to-r from-cyan-500/20 via-purple-500/15 to-pink-500/20 rounded-3xl blur-2xl opacity-40 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <img
              src="/musicsync-logo.png"
              alt="MusicSync Logo"
              className="w-full max-w-[280px] sm:max-w-[340px] h-auto object-contain relative z-10 mix-blend-screen drop-shadow-[0_8px_32px_rgba(0,0,0,0.8)]"
            />
          </div>
        ) : (
          <img
            src="/musicsync-icon.png"
            alt="MusicSync Icon"
            className={`${iconSizes[size]} object-contain relative z-10`}
          />
        )}
      </div>
    );
  }

  // 2. HORIZONTAL LAYOUT (Header Dock)
  return (
    <div className={`flex items-center gap-2 sm:gap-2.5 group select-none ${className}`}>
      <div className="relative shrink-0">
        <img
          src="/musicsync-icon.png"
          alt="MusicSync"
          className={`${iconSizes[size]} object-contain relative z-10 drop-shadow-md shrink-0`}
        />
      </div>

      {showText && (
        <div className="flex flex-col text-left">
          <div className="flex items-center tracking-tight leading-none">
            <span className={`${textSizes[size]} font-extrabold text-white tracking-tight`}>
              Music
            </span>
            <span className={`${textSizes[size]} font-extrabold text-zinc-400 ml-0.5 tracking-tight`}>
              Sync
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 ml-1.5 inline-block opacity-90 animate-pulse" />
          </div>

          {showTagline && (
            <span className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase mt-1 font-mono">
              Speaker Mesh
            </span>
          )}
        </div>
      )}
    </div>
  );
};
