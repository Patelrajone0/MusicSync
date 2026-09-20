import React from 'react';

export const HeaderBrandLogo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`flex items-center gap-2 select-none px-1 py-0.5 rounded-lg ${className}`}
      title="MusicSync Pro Studio"
    >
      {/* Dynamic 4-Bar Equalizer */}
      <div className="flex items-center gap-[2.5px] h-4 px-0.5">
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
      <span className="font-sans font-bold text-xs tracking-tight text-white">
        MusicSync
      </span>
      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/40 font-mono font-bold uppercase shadow-[0_0_10px_rgba(16,185,129,0.25)]">
        PRO
      </span>
    </div>
  );
};
