import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Check,
  X,
  Search,
  Disc3,
  Sliders,
  Layers,
  LayoutGrid,
  Radio,
  Eye,
  CheckCircle2,
  Zap,
  Maximize2,
  ChevronRight,
  Shield,
  Palette,
  ExternalLink,
} from 'lucide-react';
import {
  CurvedCornerStyle,
  CURVED_CORNER_STYLES,
  CornerStyleDefinition,
  getStoredCornerStyle,
  saveStoredCornerStyle,
} from '../types/cornerStyles';

interface CurvedCornersShowcaseProps {
  onClose?: () => void;
  onApplyStyle?: (style: CurvedCornerStyle) => void;
}

export const CurvedCornersShowcase: React.FC<CurvedCornersShowcaseProps> = ({
  onClose,
  onApplyStyle,
}) => {
  const [activeStyle, setActiveStyle] = useState<CurvedCornerStyle>(getStoredCornerStyle);
  const [viewMode, setViewMode] = useState<'compare' | CurvedCornerStyle>('compare');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [ambientGlowActive, setAmbientGlowActive] = useState<boolean>(true);

  const handleSelectStyle = (styleId: CurvedCornerStyle) => {
    setActiveStyle(styleId);
    saveStoredCornerStyle(styleId);
    if (onApplyStyle) onApplyStyle(styleId);

    const styleDef = CURVED_CORNER_STYLES.find((s) => s.id === styleId);
    setSavedToast(styleDef?.name || 'Design');
    setTimeout(() => setSavedToast(null), 2500);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
      if (e.key === 'c' || e.key === '0') setViewMode('compare');
      if (e.key === '1') setViewMode('liquid-squircle');
      if (e.key === '2') setViewMode('neon-kinetic');
      if (e.key === '3') setViewMode('titanium-chamfer');
      if (e.key === '4') setViewMode('organic-capsule');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[99999] w-full h-full bg-[#07080b] flex flex-col select-none overflow-hidden font-sans text-white">
      {/* ========================================================= */}
      {/* 1. TOP HEADER & NAVIGATION */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-50 w-full px-4 sm:px-6 py-3 bg-[#0d0f14]/95 backdrop-blur-2xl border-b border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-400 via-emerald-400 to-indigo-500 p-0.5 shadow-[0_0_20px_rgba(52,211,153,0.3)]">
              <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
                <Palette className="w-4 h-4 text-emerald-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Curved Corners Design Studio
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-bold uppercase">
                  4 Designs
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Preview live attractive corner curvature designs and pick the one you prefer.
              </p>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="sm:hidden p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setViewMode('compare')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'compare'
                ? 'bg-white text-black shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Compare All 4</span>
          </button>

          {CURVED_CORNER_STYLES.map((style, idx) => (
            <button
              key={style.id}
              type="button"
              onClick={() => setViewMode(style.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                viewMode === style.id
                  ? 'bg-emerald-400 text-black shadow-[0_0_15px_rgba(52,211,153,0.5)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="font-mono text-[10px]">0{idx + 1}</span>
              <span>{style.name.split(' ')[0]}</span>
            </button>
          ))}

          {onClose && (
            <>
              <div className="w-px h-4 bg-white/15 mx-1 shrink-0 hidden sm:block" />
              <button
                type="button"
                onClick={onClose}
                className="hidden sm:flex p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                title="Close Showcase (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. FLOATING SAVED TOAST */}
      {/* ========================================================= */}
      {savedToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-bounce px-5 py-2.5 rounded-full bg-emerald-500/25 border border-emerald-400/60 text-emerald-200 text-xs font-mono font-bold shadow-[0_0_30px_rgba(16,185,129,0.6)] flex items-center gap-2.5 backdrop-blur-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 stroke-[2.5]" />
          <span>"{savedToast}" applied as your active corner design!</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. TOOLBAR CONTROLS */}
      {/* ========================================================= */}
      <div className="shrink-0 bg-[#0b0d11]/90 border-b border-white/[0.06] px-4 sm:px-6 py-2 flex items-center justify-between gap-4 text-xs font-mono text-zinc-400 overflow-x-auto">
        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          <div className="flex items-center gap-2 text-zinc-300">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-[11px] font-semibold text-zinc-200">Interactive Corner Sandbox:</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-[11px]">Corner Ambient Glow:</span>
            <button
              type="button"
              onClick={() => setAmbientGlowActive(!ambientGlowActive)}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                ambientGlowActive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}
            >
              {ambientGlowActive ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-[11px] text-zinc-500">
            <span>Type in search to test live input state:</span>
            <span className="text-zinc-300 font-sans italic">"{searchQuery || 'What do you want to play?'}"</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-zinc-400 text-[11px] shrink-0">
          <span>Active Selection:</span>
          <span className="text-emerald-400 font-bold">
            {CURVED_CORNER_STYLES.find((s) => s.id === activeStyle)?.name}
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. MAIN CONTENT AREA */}
      {/* ========================================================= */}
      {viewMode === 'compare' ? (
        /* COMPARISON 4-GRID VIEW */
        <main className="flex-1 w-full h-full overflow-y-auto p-4 sm:p-6 pb-24 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-zinc-400 px-1">
              <p>
                Click <strong>"Choose This Design"</strong> on any card to immediately apply its curved corners across MusicSync.
              </p>
              <span className="text-[11px] font-mono text-emerald-400">
                Live Interactive Previews
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {CURVED_CORNER_STYLES.map((style, idx) => {
                const isSelected = activeStyle === style.id;
                return (
                  <DesignCard
                    key={style.id}
                    style={style}
                    index={idx}
                    isSelected={isSelected}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    ambientGlowActive={ambientGlowActive}
                    onSelect={() => handleSelectStyle(style.id)}
                    onFocusView={() => setViewMode(style.id)}
                  />
                );
              })}
            </div>
          </div>
        </main>
      ) : (
        /* SINGLE FOCUS VIEW */
        <main className="flex-1 w-full h-full overflow-y-auto p-4 sm:p-8 flex flex-col items-center justify-center custom-scrollbar">
          {(() => {
            const currentStyle =
              CURVED_CORNER_STYLES.find((s) => s.id === viewMode) || CURVED_CORNER_STYLES[0];
            const isSelected = activeStyle === currentStyle.id;

            return (
              <div className="max-w-3xl w-full flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setViewMode('compare')}
                    className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    ← Back to 4-Design Comparison
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleSelectStyle(currentStyle.id)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-emerald-400 text-black shadow-[0_0_20px_rgba(52,211,153,0.5)]'
                          : 'bg-white hover:bg-zinc-200 text-black'
                      }`}
                    >
                      {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                      <span>{isSelected ? 'Active Design' : 'Choose This Design'}</span>
                    </button>
                  </div>
                </div>

                <DesignCard
                  style={currentStyle}
                  index={CURVED_CORNER_STYLES.findIndex((s) => s.id === currentStyle.id)}
                  isSelected={isSelected}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  ambientGlowActive={ambientGlowActive}
                  onSelect={() => handleSelectStyle(currentStyle.id)}
                  isExpanded
                />
              </div>
            );
          })()}
        </main>
      )}
    </div>
  );
};

/* ==========================================================================
   Design Card Component for Individual Curved Corner Presentation
   ========================================================================== */
interface DesignCardProps {
  style: CornerStyleDefinition;
  index: number;
  isSelected: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  ambientGlowActive: boolean;
  onSelect: () => void;
  onFocusView?: () => void;
  isExpanded?: boolean;
}

const DesignCard: React.FC<DesignCardProps> = ({
  style,
  index,
  isSelected,
  searchQuery,
  onSearchChange,
  ambientGlowActive,
  onSelect,
  onFocusView,
  isExpanded = false,
}) => {
  return (
    <div
      className={`relative rounded-3xl border transition-all duration-300 flex flex-col overflow-hidden bg-[#090b0e]/95 backdrop-blur-xl ${
        isSelected
          ? 'border-emerald-400/80 shadow-[0_0_30px_rgba(52,211,153,0.22)] ring-1 ring-emerald-400/50'
          : 'border-white/[0.09] hover:border-white/20 shadow-2xl'
      }`}
    >
      {/* Top Meta Info Bar */}
      <div className="px-5 py-3 bg-[#0d0f14] border-b border-white/[0.08] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-zinc-500 font-bold">
            0{index + 1}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                {style.name}
              </h3>
              <span
                className={`text-[9px] font-mono px-2 py-0.5 rounded-full border uppercase font-semibold ${style.badgeColor}`}
              >
                {style.badge}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
              {style.radiusLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onFocusView && !isExpanded && (
            <button
              type="button"
              onClick={onFocusView}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Expand Single View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onSelect}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              isSelected
                ? 'bg-emerald-400 text-black shadow-[0_0_15px_rgba(52,211,153,0.5)]'
                : 'bg-white/10 hover:bg-white text-zinc-300 hover:text-black border border-white/10'
            }`}
          >
            {isSelected ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Selected</span>
              </>
            ) : (
              <span>Choose This</span>
            )}
          </button>
        </div>
      </div>

      {/* Description */}
      <div className="px-5 py-2.5 bg-[#090b0f] text-[11px] text-zinc-400 border-b border-white/[0.04]">
        {style.description}
      </div>

      {/* ========================================================= */}
      {/* CARD BODY: LIVE RENDERED CURVED CORNERS PREVIEW */}
      {/* ========================================================= */}
      <div className="p-4 sm:p-6 bg-[#060709] flex flex-col items-center justify-center relative">
        {/* Ambient Corner Flare Gradients (if enabled) */}
        {ambientGlowActive && style.accentHighlights === 'ambient-halo' && (
          <>
            <div className="absolute top-4 left-4 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute top-4 right-4 w-28 h-28 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-4 left-4 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-4 right-4 w-28 h-28 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
          </>
        )}

        {ambientGlowActive && style.accentHighlights === 'neon-beacons' && (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.06),transparent_70%)] pointer-events-none" />
        )}

        {/* Outer Dashboard Container Frame */}
        <div className={`w-full p-4 sm:p-5 flex flex-col gap-3.5 ${style.outerBoxClass}`}>
          {/* Neon Corner Beacon Dots (for Neon Kinetic) */}
          {style.accentHighlights === 'neon-beacons' && (
            <>
              <span className="absolute top-2.5 left-2.5 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)] animate-ping" />
              <span className="absolute top-2.5 left-2.5 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)] animate-pulse" />
              <span className="absolute bottom-2.5 left-2.5 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)] animate-pulse" />
              <span className="absolute bottom-2.5 right-2.5 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)] animate-ping" />
              <span className="absolute bottom-2.5 right-2.5 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
            </>
          )}

          {/* Milled Titanium Corner Ticks (for Titanium Chamfer) */}
          {style.accentHighlights === 'titanium-ticks' && (
            <>
              <div className="absolute top-3 left-3 w-2.5 h-2.5 border-t-2 border-l-2 border-zinc-400/80 rounded-tl-sm pointer-events-none" />
              <div className="absolute top-3 right-3 w-2.5 h-2.5 border-t-2 border-r-2 border-zinc-400/80 rounded-tr-sm pointer-events-none" />
              <div className="absolute bottom-3 left-3 w-2.5 h-2.5 border-b-2 border-l-2 border-zinc-400/80 rounded-bl-sm pointer-events-none" />
              <div className="absolute bottom-3 right-3 w-2.5 h-2.5 border-b-2 border-r-2 border-zinc-400/80 rounded-br-sm pointer-events-none" />
            </>
          )}

          {/* Organic Floating Corner Halo (for Organic Capsule) */}
          {style.accentHighlights === 'organic-glow' && (
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-20 bg-purple-500/15 rounded-full blur-2xl pointer-events-none" />
          )}

          {/* 1. UNIVERSAL SEARCH BAR WITH STYLE-SPECIFIC CURVES */}
          <div
            className={`w-full h-11 sm:h-12 px-4 flex items-center justify-between transition-all ${style.searchContainerClass}`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <Search
                className={`w-4 h-4 shrink-0 ${
                  style.id === 'neon-kinetic'
                    ? 'text-emerald-400'
                    : style.id === 'organic-capsule'
                    ? 'text-purple-300'
                    : 'text-zinc-400'
                }`}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="What do you want to play?"
                className="w-full bg-transparent text-white text-xs sm:text-sm font-semibold placeholder:text-zinc-500 outline-none"
              />
            </div>
            <span
              className={`px-2 py-0.5 rounded-full border text-[9px] font-mono select-none ${
                style.id === 'neon-kinetic'
                  ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                  : style.id === 'titanium-chamfer'
                  ? 'bg-zinc-900 border-zinc-700 text-zinc-300'
                  : 'bg-zinc-900/80 border-white/10 text-zinc-400'
              }`}
            >
              ⌘K
            </span>
          </div>

          {/* 2. CENTER QUEUE CARD WITH STYLE-SPECIFIC CURVES */}
          <div
            className={`w-full min-h-[220px] sm:min-h-[260px] p-6 flex flex-col items-center justify-center text-center ${style.queueCardContainerClass}`}
          >
            {/* Top Specular Hairline / Border Beam */}
            <div
              className={`absolute top-0 left-1/2 -translate-x-1/2 w-48 sm:w-64 h-[1px] pointer-events-none ${
                style.id === 'neon-kinetic'
                  ? 'bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                  : style.id === 'titanium-chamfer'
                  ? 'bg-gradient-to-r from-transparent via-zinc-200 to-transparent'
                  : style.id === 'organic-capsule'
                  ? 'bg-gradient-to-r from-transparent via-purple-300/80 to-transparent shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                  : 'bg-gradient-to-r from-transparent via-white/70 to-transparent shadow-[0_0_10px_rgba(255,255,255,0.4)]'
              }`}
            />

            {/* Corner Specular Curves for Squircles */}
            {style.id === 'liquid-squircle' && (
              <>
                <div className="absolute top-0 left-0 w-8 h-8 rounded-tl-[22px] border-t border-l border-white/30 pointer-events-none" />
                <div className="absolute top-0 right-0 w-8 h-8 rounded-tr-[22px] border-t border-r border-white/30 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-8 h-8 rounded-bl-[22px] border-b border-l border-white/20 pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-8 h-8 rounded-br-[22px] border-b border-r border-white/20 pointer-events-none" />
              </>
            )}

            {/* Spinning Disc Record with Emerald Dot */}
            <div className="relative mb-3.5">
              <div
                className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all ${
                  style.id === 'neon-kinetic'
                    ? 'border-emerald-500/40 bg-[#0d141b] shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                    : style.id === 'titanium-chamfer'
                    ? 'border-zinc-700 bg-zinc-900 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]'
                    : style.id === 'organic-capsule'
                    ? 'border-purple-500/30 bg-[#12111d] shadow-[0_0_20px_rgba(168,85,247,0.25)]'
                    : 'border-white/[0.15] bg-[#12151c] shadow-[inset_0_1px_3px_rgba(255,255,255,0.1),0_4px_16px_rgba(0,0,0,0.6)]'
                }`}
              >
                <Disc3
                  className={`w-7 h-7 animate-spin-slow ${
                    style.id === 'neon-kinetic'
                      ? 'text-emerald-400'
                      : style.id === 'organic-capsule'
                      ? 'text-purple-300'
                      : 'text-zinc-300'
                  }`}
                />
                <span
                  className={`w-1.5 h-1.5 rounded-full absolute ${
                    style.id === 'neon-kinetic'
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,1)]'
                      : style.id === 'organic-capsule'
                      ? 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,1)]'
                      : 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                  }`}
                />
              </div>
            </div>

            <h4 className="text-sm sm:text-base font-bold text-zinc-100 tracking-tight">
              No songs in queue
            </h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs">
              Type in the search bar above to add music
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Spec Footer */}
      <div className="px-5 py-3 bg-[#0c0e12] border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-zinc-400">
        <div className="flex items-center gap-3">
          <span className="text-zinc-500">Curvature:</span>
          <span className="text-zinc-300">{style.radiusLabel}</span>
        </div>
        <button
          type="button"
          onClick={onSelect}
          className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
        >
          <span>{isSelected ? 'Currently Applied' : 'Activate this design →'}</span>
        </button>
      </div>
    </div>
  );
};
