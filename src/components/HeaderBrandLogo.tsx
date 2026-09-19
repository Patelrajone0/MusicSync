import React, { useState, useEffect } from 'react';
import { Check, Sparkles, X, ChevronDown } from 'lucide-react';

export type LogoStyleId =
  | 'waveform-crown'
  | 'pulse-equalizer'
  | 'sync-helix'
  | 'phase-rings'
  | 'two-tone-studio';

export interface LogoStyleOption {
  id: LogoStyleId;
  name: string;
  tagline: string;
  description: string;
}

export const LOGO_STYLE_OPTIONS: LogoStyleOption[] = [
  {
    id: 'waveform-crown',
    name: '1. Apex Waveform Crown',
    tagline: 'Audio Royalty (Vector Crown)',
    description: 'Geometric audio frequency bars shaped into a razor-sharp modern crown in cyber emerald.'
  },
  {
    id: 'pulse-equalizer',
    name: '2. Dynamic Pulse Equalizer',
    tagline: 'Live Waves (Cyan to Emerald)',
    description: '4-bar pulsing frequency visualizer with modern geometric typography and glowing PRO pill.'
  },
  {
    id: 'sync-helix',
    name: '3. Sync Helix "M"',
    tagline: 'Infinite Phase Lock',
    description: 'Interlocking dual sine waves forming an abstract "M" symbol for zero-latency speaker sync.'
  },
  {
    id: 'phase-rings',
    name: '4. Interlocking Phase Rings',
    tagline: 'Dual Node Stereo Sync',
    description: 'Minimalist intersecting acoustic rings with an orange phase-lock pulse node at center.'
  },
  {
    id: 'two-tone-studio',
    name: '5. Two-Tone Acoustic Studio',
    tagline: 'Minimalist DAW Rackmount',
    description: 'High-contrast white MUSIC and emerald SYNC with acoustic 3-dot pulse radar.'
  }
];

const STORAGE_KEY = 'musicsync_logo_style';

export function getSavedLogoStyle(): LogoStyleId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as LogoStyleId;
    if (saved && LOGO_STYLE_OPTIONS.some(opt => opt.id === saved)) {
      return saved;
    }
  } catch (e) {}
  return 'waveform-crown';
}

export function saveLogoStyle(style: LogoStyleId) {
  try {
    localStorage.setItem(STORAGE_KEY, style);
  } catch (e) {}
}

export const RenderLogoVisual: React.FC<{ styleId: LogoStyleId; isHovered?: boolean }> = ({ styleId }) => {
  switch (styleId) {
    case 'waveform-crown':
      return (
        <div className="flex items-center gap-2 select-none">
          {/* Vector Equalizer Crown */}
          <div className="relative flex items-center justify-center">
            <svg
              className="w-5 h-5 text-[#10b981] filter drop-shadow-[0_0_6px_rgba(16,185,129,0.55)]"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M3 18L5 8.5L9.5 13L12 6L14.5 13L19 8.5L21 18H3Z"
                stroke="#10b981"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="rgba(16,185,129,0.18)"
              />
              <line x1="7.5" y1="13.5" x2="7.5" y2="16.5" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="9.75" y1="12" x2="9.75" y2="16.5" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="12" y1="9.5" x2="12" y2="16.5" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="14.25" y1="12" x2="14.25" y2="16.5" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="16.5" y1="13.5" x2="16.5" y2="16.5" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <span className="font-sans font-black text-xs tracking-wider text-white">
            MUSICSYNC
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 uppercase font-mono font-bold tracking-wider shadow-[0_0_8px_rgba(16,185,129,0.2)]">
            PRO
          </span>
        </div>
      );

    case 'pulse-equalizer':
      return (
        <div className="flex items-center gap-2 select-none">
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

    case 'sync-helix':
      return (
        <div className="flex items-center gap-2 select-none">
          {/* Dual Sine Wave / Helix 'M' */}
          <svg
            className="w-6 h-4 filter drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]"
            viewBox="0 0 28 18"
            fill="none"
          >
            <path
              d="M2 13C5 13 6 4 9 4C12 4 13 14 16 14C19 14 20 4 23 4C25 4 26 8 27 10"
              stroke="#10b981"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M2 7C5 7 6 15 9 15C12 15 13 6 16 6C19 6 20 15 23 15C25 15 26 11 27 9"
              stroke="#38bdf8"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.85"
            />
          </svg>
          <span className="font-sans font-extrabold text-xs tracking-tight text-white">
            MusicSync
          </span>
          <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono font-bold uppercase border border-white/10">
            PRO
          </span>
        </div>
      );

    case 'phase-rings':
      return (
        <div className="flex items-center gap-2 select-none">
          {/* Interlocking Phase Circles with Focus Dot */}
          <svg className="w-6 h-4.5" viewBox="0 0 30 18" fill="none">
            <circle
              cx="9"
              cy="9"
              r="6"
              stroke="#ffffff"
              strokeWidth="1.6"
              strokeOpacity="0.85"
              className="filter drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]"
            />
            <circle
              cx="17"
              cy="9"
              r="6"
              stroke="#10b981"
              strokeWidth="1.6"
              className="filter drop-shadow-[0_0_6px_rgba(16,185,129,0.7)]"
            />
            <circle
              cx="13"
              cy="9"
              r="2"
              fill="#f97316"
              className="filter drop-shadow-[0_0_5px_rgba(249,115,22,0.9)] animate-pulse"
            />
          </svg>
          <span className="font-sans font-bold text-xs tracking-tight text-white">
            MusicSync
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-orange-500/15 text-orange-400 border border-orange-500/30 uppercase font-mono font-bold">
            PRO
          </span>
        </div>
      );

    case 'two-tone-studio':
      return (
        <div className="flex items-center gap-1.5 select-none relative pt-1">
          {/* Acoustic 3-dot pulse radar above SYNC */}
          <div className="absolute -top-1 left-[54px] flex items-center gap-0.5 pointer-events-none">
            <span className="w-0.5 h-0.5 rounded-full bg-emerald-400 opacity-40 animate-pulse" />
            <span className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
            <span className="w-0.5 h-0.5 rounded-full bg-emerald-400 opacity-40 animate-pulse" />
          </div>
          <div className="flex items-center tracking-wider">
            <span className="font-sans font-black text-xs text-white">MUSIC</span>
            <span className="font-sans font-black text-xs text-[#10b981] ml-0.5 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">
              SYNC
            </span>
          </div>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 border border-white/10 font-mono font-bold uppercase ml-0.5">
            PRO
          </span>
        </div>
      );
  }
};

export const HeaderBrandLogo: React.FC<{
  activeStyle: LogoStyleId;
  onOpenPicker: () => void;
}> = ({ activeStyle, onOpenPicker }) => {
  return (
    <div
      onClick={onOpenPicker}
      className="flex items-center gap-1.5 cursor-pointer group px-1 py-0.5 rounded-lg hover:bg-white/5 transition-all"
      title="Click to preview & change MusicSync Pro logo style"
    >
      <RenderLogoVisual styleId={activeStyle} />
      <span className="text-[10px] text-slate-500 group-hover:text-emerald-400 transition-colors flex items-center ml-0.5">
        <ChevronDown className="w-3 h-3 group-hover:translate-y-0.5 transition-transform" />
      </span>
    </div>
  );
};

export const LogoPickerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  activeStyle: LogoStyleId;
  onSelectStyle: (style: LogoStyleId) => void;
}> = ({ isOpen, onClose, activeStyle, onSelectStyle }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-2xl bg-[#0e0e12] border border-white/15 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">
                Select MusicSync Pro Header Logo
              </h3>
              <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                Click any design below to test it live in the top navigation bar.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5">
          {LOGO_STYLE_OPTIONS.map((opt) => {
            const isSelected = activeStyle === opt.id;

            return (
              <div
                key={opt.id}
                onClick={() => onSelectStyle(opt.id)}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer group ${
                  isSelected
                    ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/40'
                    : 'bg-[#14141a] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                }`}
              >
                {/* Left: Info */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                    isSelected
                      ? 'bg-emerald-500 border-emerald-400 text-black'
                      : 'border-white/20 text-transparent group-hover:border-white/40'
                  }`}>
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-xs font-bold transition-colors ${
                        isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'
                      }`}>
                        {opt.name}
                      </h4>
                      <span className="text-[10px] font-mono text-emerald-400/90 font-medium">
                        [{opt.tagline}]
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      {opt.description}
                    </p>
                  </div>
                </div>

                {/* Right: Actual Live Preview rendered */}
                <div className="mt-3 sm:mt-0 sm:ml-4 flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div className="px-3.5 py-2 rounded-lg bg-black/70 border border-white/10 shadow-inner flex items-center min-h-[38px]">
                    <RenderLogoVisual styleId={opt.id} />
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectStyle(opt.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500 text-black font-bold shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {isSelected ? 'Active' : 'Preview'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-[11px] text-slate-400">
          <span>Selection is saved automatically in your browser.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#10b981] hover:bg-emerald-400 text-black font-bold transition-colors cursor-pointer text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
