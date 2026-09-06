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
  const isLg = size === 'lg';

  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16 md:w-20 md:h-20',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl md:text-4xl',
  };

  return (
    <div
      className={`flex ${
        layout === 'vertical'
          ? 'flex-col items-center text-center gap-3.5 sm:gap-4'
          : 'items-center gap-2.5 sm:gap-3.5'
      } group select-none ${className}`}
    >
      {/* Radiant Glowing Emblem */}
      <div className="relative shrink-0">
        {/* Ambient Neon Backglow */}
        <div
          className={`absolute -inset-1 rounded-2xl bg-gradient-to-r from-electric-cyan via-electric-purple to-electric-pink opacity-45 blur-md group-hover:opacity-85 group-hover:blur-lg transition-all duration-300 ${
            isLg ? 'opacity-65 blur-xl -inset-2.5' : ''
          }`}
        />

        {/* Squircle Card Container */}
        <div
          className={`${iconSizes[size]} relative rounded-xl md:rounded-2xl p-[1.5px] bg-gradient-to-tr from-electric-cyan via-electric-purple to-electric-pink shadow-xl group-hover:scale-105 group-hover:shadow-electric-cyan/40 transition-all duration-300`}
        >
          <div className="w-full h-full rounded-[10px] md:rounded-[14px] bg-dark-950/95 backdrop-blur-xl flex items-center justify-center p-1.5 overflow-hidden border border-white/10">
            <svg
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full filter drop-shadow-[0_0_10px_rgba(0,240,255,0.45)]"
            >
              <defs>
                {/* Metallic Speaker Frame Gradient */}
                <linearGradient id={`spk-rim-${size}`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#00f0ff" />
                  <stop offset="48%" stopColor="#9d4edd" />
                  <stop offset="100%" stopColor="#ff007f" />
                </linearGradient>

                {/* Transducer Acoustic Cone Cavity Depth */}
                <radialGradient id={`spk-cone-${size}`} cx="24" cy="24" r="21" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#1e0b36" />
                  <stop offset="45%" stopColor="#0e0e18" />
                  <stop offset="80%" stopColor="#06060a" />
                  <stop offset="100%" stopColor="#141420" />
                </radialGradient>

                {/* Center Core Radiant Jewel */}
                <linearGradient id={`spk-core-${size}`} x1="18" y1="18" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="25%" stopColor="#00f0ff" />
                  <stop offset="70%" stopColor="#9d4edd" />
                  <stop offset="100%" stopColor="#ff007f" />
                </linearGradient>

                {/* Concentric Acoustic Shockwave Wave Gradient */}
                <linearGradient id={`spk-wave-${size}`} x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#00f0ff" />
                  <stop offset="50%" stopColor="#c084fc" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>
              </defs>

              {/* Speaker Acoustic Cone Cavity */}
              <circle
                cx="24"
                cy="24"
                r="21.5"
                fill={`url(#spk-cone-${size})`}
                stroke="#ffffff"
                strokeOpacity="0.1"
                strokeWidth="0.8"
              />

              {/* Cardinal Waveguide Acoustic Ports (12, 3, 6, 9 o'clock) */}
              <path
                d="M 24 2.5 L 24 5.5 M 24 42.5 L 24 45.5 M 2.5 24 L 5.5 24 M 42.5 24 L 45.5 24"
                stroke={`url(#spk-rim-${size})`}
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.85"
              />

              {/* Acoustic Waveguide Corner Alignment Pins */}
              <circle cx="10" cy="10" r="0.8" fill="#00f0ff" opacity="0.65" />
              <circle cx="38" cy="10" r="0.8" fill="#ff007f" opacity="0.65" />
              <circle cx="10" cy="38" r="0.8" fill="#9d4edd" opacity="0.65" />
              <circle cx="38" cy="38" r="0.8" fill="#00f0ff" opacity="0.65" />

              {/* Outer Concentric Resonant Shockwave Ring (Ring 3) */}
              <circle
                cx="24"
                cy="24"
                r="18"
                stroke={`url(#spk-wave-${size})`}
                strokeWidth="1.5"
                strokeDasharray="4 2 8 2"
                className="logo-shockwave-3"
              />

              {/* Middle Concentric Resonant Shockwave Ring (Ring 2) */}
              <circle
                cx="24"
                cy="24"
                r="13.5"
                stroke={`url(#spk-rim-${size})`}
                strokeWidth="1.8"
                strokeDasharray="6 3"
                className="logo-shockwave-2"
              />

              {/* Inner Acoustic Suspension Surround Roll (Ring 1) */}
              <circle
                cx="24"
                cy="24"
                r="9.5"
                stroke={`url(#spk-wave-${size})`}
                strokeWidth="1.8"
                fill="none"
                className="logo-shockwave-1"
              />

              {/* Transducer Center Dust-Cap Dome */}
              <circle
                cx="24"
                cy="24"
                r="5.5"
                fill={`url(#spk-core-${size})`}
                className="logo-speaker-core"
              />

              {/* Central Sonic Phase Plug / Quantum Acoustic Core */}
              <circle cx="24" cy="24" r="2.2" fill="#ffffff" />
              <polygon points="24,20.8 25.5,24 24,27.2 22.5,24" fill="#00f0ff" opacity="0.95" />
            </svg>
          </div>
        </div>
      </div>

      {/* Brand Wordmark */}
      {showText && (
        <div className={`flex flex-col ${layout === 'vertical' ? 'items-center text-center' : 'text-left'}`}>
          <div className="flex items-center tracking-tight leading-none">
            <span
              className={`${textSizes[size]} font-black text-white group-hover:text-white transition-colors tracking-tight`}
            >
              Music
            </span>
            <span
              className={`${textSizes[size]} font-black bg-gradient-to-r from-electric-cyan via-cyan-300 to-electric-purple bg-clip-text text-transparent group-hover:brightness-125 transition-all ml-0.5`}
            >
              Sync
            </span>
            {/* Pulsating Sync Signal Dot */}
            <span className="relative flex h-2 w-2 ml-1.5 -mt-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-electric-cyan opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-electric-cyan shadow-sm"></span>
            </span>
          </div>

          {showTagline && (
            <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase mt-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Multi-Device Speaker Mesh
            </span>
          )}
        </div>
      )}
    </div>
  );
};
