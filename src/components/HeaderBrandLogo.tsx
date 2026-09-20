import React from 'react';

export const HeaderBrandLogo: React.FC<{
  className?: string;
  onClick?: () => void;
}> = ({ className = '', onClick }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) {
      onClick();
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center gap-2 select-none px-1.5 py-0.5 rounded-lg hover:bg-white/10 active:scale-95 transition-all duration-150 cursor-pointer border-0 bg-transparent text-left focus:outline-none ${className}`}
      title="MusicSync · Click to refresh"
    >
      {/* Dynamic 4-Bar Equalizer */}
      <div className="flex items-center gap-[2.5px] h-4 px-0.5 shrink-0">
        <span
          className="w-1 h-2.5 rounded-full bg-gradient-to-t from-cyan-400 to-[#10b981] animate-pulse shadow-[0_0_6px_rgba(56,189,248,0.5)]"
          style={{ animationDuration: '1.2s' }}
        />
        <span
          className="w-1 h-4 rounded-full bg-gradient-to-t from-cyan-400 to-[#10b981] animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"
          style={{ animationDuration: '0.8s', animationDelay: '0.2s' }}
        />
        <span
          className="w-1 h-3 rounded-full bg-gradient-to-t from-cyan-400 to-[#10b981] animate-pulse shadow-[0_0_7px_rgba(16,185,129,0.5)]"
          style={{ animationDuration: '1.0s', animationDelay: '0.4s' }}
        />
        <span
          className="w-1 h-2 rounded-full bg-gradient-to-t from-cyan-400 to-[#10b981] animate-pulse shadow-[0_0_5px_rgba(56,189,248,0.4)]"
          style={{ animationDuration: '1.3s', animationDelay: '0.15s' }}
        />
      </div>
      <span className="font-sans font-bold text-xs tracking-tight text-white hover:text-cyan-300 transition-colors">
        MusicSync
      </span>
    </button>
  );
};
