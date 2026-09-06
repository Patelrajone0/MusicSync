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

  return (
    <div
      className={`flex ${
        layout === 'vertical'
          ? 'flex-col items-center text-center gap-3 sm:gap-3.5'
          : 'items-center gap-2.5 sm:gap-3'
      } group select-none ${className}`}
    >
      {/* Minimalist Emblem Container */}
      <div className="relative shrink-0">
        {/* Soft Ambient Glow on Hover */}
        <div className="absolute -inset-0.5 rounded-xl md:rounded-2xl bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-500" />

        {/* Squircle Badge */}
        <div
          className={`${iconSizes[size]} relative rounded-xl md:rounded-2xl p-[1px] bg-gradient-to-b from-white/15 via-white/5 to-transparent shadow-sm group-hover:from-cyan-400/40 group-hover:to-indigo-500/30 transition-all duration-300`}
        >
          <div className="w-full h-full rounded-[11px] md:rounded-[15px] bg-[#0c1017] flex items-center justify-center p-2 overflow-hidden border border-white/5">
            <svg
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full"
            >
              <defs>
                <linearGradient id={`minimal-grad-${size}`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#00f0ff" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>

              {/* Left Acoustic Broadcast Wave */}
              <path
                d="M 8 17 C 5.5 21.2 5.5 26.8 8 31"
                stroke={`url(#minimal-grad-${size})`}
                strokeWidth="2.75"
                strokeLinecap="round"
                className="logo-bracket-left opacity-75 group-hover:opacity-100 transition-opacity"
              />

              {/* Central Synchronized Waveform Bars */}
              {/* Bar 1 */}
              <rect
                x="13.5"
                y="17"
                width="3"
                height="14"
                rx="1.5"
                fill={`url(#minimal-grad-${size})`}
                className="logo-bar logo-bar-1 origin-center"
              />
              {/* Bar 2 */}
              <rect
                x="19.5"
                y="11"
                width="3"
                height="26"
                rx="1.5"
                fill={`url(#minimal-grad-${size})`}
                className="logo-bar logo-bar-2 origin-center"
              />
              {/* Bar 3 */}
              <rect
                x="25.5"
                y="11"
                width="3"
                height="26"
                rx="1.5"
                fill={`url(#minimal-grad-${size})`}
                className="logo-bar logo-bar-3 origin-center"
              />
              {/* Bar 4 */}
              <rect
                x="31.5"
                y="17"
                width="3"
                height="14"
                rx="1.5"
                fill={`url(#minimal-grad-${size})`}
                className="logo-bar logo-bar-4 origin-center"
              />

              {/* Right Acoustic Broadcast Wave */}
              <path
                d="M 40 17 C 42.5 21.2 42.5 26.8 40 31"
                stroke={`url(#minimal-grad-${size})`}
                strokeWidth="2.75"
                strokeLinecap="round"
                className="logo-bracket-right opacity-75 group-hover:opacity-100 transition-opacity"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className={`flex flex-col ${layout === 'vertical' ? 'items-center text-center' : 'text-left'}`}>
          <div className="flex items-center tracking-tight leading-none">
            <span
              className={`${textSizes[size]} font-semibold text-white tracking-tight`}
            >
              Music
            </span>
            <span
              className={`${textSizes[size]} font-semibold text-cyan-400 ml-0.5 tracking-tight`}
            >
              Sync
            </span>
            {/* Subtle Synchronized Status Dot */}
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 ml-1.5 inline-block opacity-85 shadow-[0_0_6px_rgba(0,240,255,0.6)]" />
          </div>

          {showTagline && (
            <span className="text-[11px] font-medium tracking-wider text-slate-400 uppercase mt-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Multi-Device Speaker Mesh
            </span>
          )}
        </div>
      )}
    </div>
  );
};
