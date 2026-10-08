import React, { useState, useEffect } from 'react';
import {
  Palette,
  Sparkles,
  Check,
  X,
  Eye,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Layers,
  ArrowRight,
  Disc3,
  Volume2,
} from 'lucide-react';
import {
  BACKGROUND_THEMES,
  BackgroundThemeId,
  BackgroundThemeDefinition,
  getStoredBackgroundTheme,
  applyBackgroundTheme,
} from '../types/backgroundThemes';
import { haptics } from '../utils/haptics';

interface BackgroundShowcaseProps {
  onClose: () => void;
  onApplyTheme?: (themeId: BackgroundThemeId) => void;
}

export const BackgroundShowcase: React.FC<BackgroundShowcaseProps> = ({
  onClose,
  onApplyTheme,
}) => {
  const [activeTheme, setActiveTheme] = useState<BackgroundThemeId>(getStoredBackgroundTheme);
  const [hoveredTheme, setHoveredTheme] = useState<BackgroundThemeId | null>(null);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [isTestDriving, setIsTestDriving] = useState<boolean>(false);

  // Sync with current theme on mount
  useEffect(() => {
    const current = getStoredBackgroundTheme();
    setActiveTheme(current);
  }, []);

  const handleSelectTheme = (themeId: BackgroundThemeId) => {
    setActiveTheme(themeId);
    applyBackgroundTheme(themeId);
    haptics.selection();
    if (onApplyTheme) onApplyTheme(themeId);

    const themeObj = BACKGROUND_THEMES.find((t) => t.id === themeId);
    setSavedToast(themeObj?.name || 'Theme');
    setTimeout(() => {
      setSavedToast((prev) => (prev === themeObj?.name ? null : prev));
    }, 2800);
  };

  const currentThemeObj =
    BACKGROUND_THEMES.find((t) => t.id === (hoveredTheme || activeTheme)) || BACKGROUND_THEMES[0];

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black/80 backdrop-blur-xl animate-fade-in overflow-hidden select-none font-sans">
      {/* Top Ambient Glow matching current theme */}
      <div
        className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-all duration-500 opacity-60"
        style={{ backgroundColor: currentThemeObj.previewSwatches[2] }}
      />

      {/* Header Bar */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-3.5 sm:py-4 border-b border-white/[0.08] bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-cyan-400 shadow-inner">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                Background Atmosphere
              </h2>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border border-cyan-400/30 bg-cyan-500/10 text-cyan-300">
                Live Preview
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Select any palette to transform the app atmosphere in real time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Test Drive Toggle */}
          <button
            type="button"
            onClick={() => setIsTestDriving(!isTestDriving)}
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isTestDriving
                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                : 'bg-white/[0.05] border-white/[0.1] text-zinc-300 hover:text-white hover:bg-white/[0.08]'
            }`}
            title="Minimize modal to inspect entire page"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isTestDriving ? 'Show Options' : 'Peek Background'}</span>
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] flex items-center justify-center text-zinc-300 hover:text-white transition-all cursor-pointer"
            aria-label="Close background showcase"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Floating Toast Notification */}
      {savedToast && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-50 animate-popover-spring pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-950/90 border border-cyan-400/40 text-cyan-200 shadow-2xl backdrop-blur-md text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>
              <strong>{savedToast}</strong> set as active background!
            </span>
          </div>
        </div>
      )}

      {/* Test Drive Peeking Banner (when in Test Drive Mode) */}
      {isTestDriving ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
          <div className="max-w-md bg-black/60 backdrop-blur-xl border border-white/[0.1] p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-white/[0.08] text-cyan-400">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Full-Screen Inspection Active</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              You are viewing the current background atmosphere across the entire screen.
              Active palette: <strong className="text-white">{currentThemeObj.name}</strong>.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => setIsTestDriving(false)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs cursor-pointer shadow-lg transition-transform active:scale-95"
              >
                Back to Theme Cards
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white font-medium text-xs border border-white/[0.1] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Main Theme Options Grid */
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 z-10 custom-scrollbar">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Quick Palette Bar (One-click swatches) */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3 sm:p-4 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-300">Quick Palette Selector:</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {BACKGROUND_THEMES.map((theme) => {
                  const isSelected = activeTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleSelectTheme(theme.id)}
                      onMouseEnter={() => setHoveredTheme(theme.id)}
                      onMouseLeave={() => setHoveredTheme(null)}
                      title={theme.name}
                      className={`group relative flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'bg-white/[0.12] border-white/40 shadow-md ring-1 ring-white/30 text-white'
                          : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08]'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm flex items-center justify-center transition-transform group-hover:scale-110"
                        style={{ backgroundColor: theme.hexPrimary }}
                      >
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                      </span>
                      <span className="text-[11px] truncate max-w-[110px]">{theme.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detailed 6-Theme Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {BACKGROUND_THEMES.map((theme) => {
                const isSelected = activeTheme === theme.id;
                return (
                  <div
                    key={theme.id}
                    onMouseEnter={() => setHoveredTheme(theme.id)}
                    onMouseLeave={() => setHoveredTheme(null)}
                    onClick={() => handleSelectTheme(theme.id)}
                    className={`group relative flex flex-col rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden p-5 ${
                      isSelected
                        ? 'border-cyan-400/60 shadow-[0_0_30px_rgba(0,240,255,0.18)] bg-white/[0.07] scale-[1.01]'
                        : 'border-white/[0.08] hover:border-white/25 bg-white/[0.03] hover:bg-white/[0.05]'
                    }`}
                    style={{
                      backgroundColor: theme.hexCard + 'cc',
                    }}
                  >
                    {/* Top Glow flare */}
                    <div
                      className="absolute -top-12 -right-12 w-36 h-36 rounded-full blur-2xl pointer-events-none transition-opacity duration-300"
                      style={{
                        backgroundColor: theme.previewSwatches[2],
                        opacity: isSelected ? 0.35 : 0.15,
                      }}
                    />

                    {/* Header Row: Swatches & Badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      {/* 3-color palette preview pill */}
                      <div className="flex items-center p-1 rounded-full bg-black/40 border border-white/10 gap-1 shadow-inner">
                        {theme.previewSwatches.map((color, idx) => (
                          <span
                            key={idx}
                            className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${theme.badgeColor}`}
                      >
                        {theme.tag}
                      </span>
                    </div>

                    {/* Title */}
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="text-base font-bold text-white group-hover:text-cyan-200 transition-colors">
                        {theme.name}
                      </h3>
                      {isSelected && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400">
                          <Check className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-xs text-zinc-300 leading-relaxed mb-4 flex-1">
                      {theme.description}
                    </p>

                    {/* Mini Visual Mockup Container */}
                    <div
                      className="rounded-xl p-3 border mb-4 space-y-2 relative overflow-hidden transition-all duration-200 shadow-inner"
                      style={{
                        backgroundColor: theme.hexPrimary,
                        borderColor: theme.hexBorder,
                      }}
                    >
                      {/* Mini Mockup: Search Bar & Player Pill */}
                      <div
                        className="h-6 rounded-lg border flex items-center px-2 justify-between"
                        style={{
                          backgroundColor: theme.hexElevated,
                          borderColor: theme.hexBorder,
                        }}
                      >
                        <span className="text-[10px] text-zinc-400">Search 100M+ tracks...</span>
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: theme.previewSwatches[2] }}
                        />
                      </div>

                      <div
                        className="p-2 rounded-lg border flex items-center justify-between"
                        style={{
                          backgroundColor: theme.hexSecondary,
                          borderColor: theme.hexBorder,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded flex items-center justify-center text-white"
                            style={{ backgroundColor: theme.previewSwatches[2] }}
                          >
                            <Disc3 className="w-3 h-3 animate-spin text-black" />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-white leading-tight">
                              Midnight Vibes
                            </div>
                            <div className="text-[9px] text-zinc-400 leading-tight">
                              Room 6-Digit Sync
                            </div>
                          </div>
                        </div>
                        <Volume2 className="w-3 h-3 text-zinc-400" />
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectTheme(theme.id);
                      }}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                        isSelected
                          ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(0,240,255,0.3)]'
                          : 'bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/[0.1]'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Applied as Default</span>
                        </>
                      ) : (
                        <>
                          <span>Apply This Atmosphere</span>
                          <ArrowRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Bottom Footer Tip */}
            <div className="text-center text-xs text-zinc-400 py-3">
              <span>
                💡 Your selected background atmosphere is automatically saved to your browser and
                persists across sessions.
              </span>
            </div>
          </div>
        </main>
      )}
    </div>
  );
};
