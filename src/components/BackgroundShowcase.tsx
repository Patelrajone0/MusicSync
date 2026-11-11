import React, { useState, useEffect } from 'react';
import { Palette, Check, X, Zap } from 'lucide-react';
import {
  BACKGROUND_THEMES,
  BackgroundThemeId,
  getStoredBackgroundTheme,
  applyBackgroundTheme,
} from '../types/backgroundThemes';
import {
  getPerformanceMode,
  setPerformanceMode,
} from '../utils/performanceMode';
import { haptics } from '../utils/haptics';

export interface BackgroundShowcaseProps {
  onClose: () => void;
  onApplyTheme?: (themeId: BackgroundThemeId) => void;
}

export const BackgroundShowcase: React.FC<BackgroundShowcaseProps> = ({
  onClose,
  onApplyTheme,
}) => {
  const [activeTheme, setActiveTheme] = useState<BackgroundThemeId>(getStoredBackgroundTheme);
  const [isPerfMode, setIsPerfMode] = useState<boolean>(getPerformanceMode);

  // Sync with current stored theme on mount
  useEffect(() => {
    setActiveTheme(getStoredBackgroundTheme());
    setIsPerfMode(getPerformanceMode());
  }, []);

  // Dismiss on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSelectTheme = (themeId: BackgroundThemeId) => {
    setActiveTheme(themeId);
    applyBackgroundTheme(themeId);
    haptics.selection();
    if (onApplyTheme) onApplyTheme(themeId);
  };

  const handleTogglePerfMode = () => {
    const next = !isPerfMode;
    setIsPerfMode(next);
    setPerformanceMode(next);
    haptics.light();
  };

  const isLight = activeTheme === 'pure-light';
  const activeDef = BACKGROUND_THEMES.find((t) => t.id === activeTheme);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm select-none font-sans"
      onClick={onClose}
    >
      {/* Floating Theme Selection Dialog Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-popup-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: isLight ? '#ffffff' : '#11141c',
          borderColor: isLight ? 'rgba(203, 213, 225, 0.9)' : 'rgba(255, 255, 255, 0.12)',
        }}
        className={`relative w-full max-w-[430px] rounded-2xl border p-4 sm:p-5 flex flex-col gap-3.5 overflow-hidden shadow-2xl transition-opacity duration-150 ${
          isLight ? 'text-slate-900' : 'text-white'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between pb-3 border-b ${
            isLight ? 'border-slate-200' : 'border-white/[0.08]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              style={{
                backgroundColor: isLight ? '#eff6ff' : 'rgba(255, 255, 255, 0.08)',
                borderColor: isLight ? '#bfdbfe' : 'rgba(255, 255, 255, 0.15)',
              }}
              className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                isLight ? 'text-blue-600' : 'text-[var(--theme-accent,#00f0ff)]'
              }`}
            >
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="theme-popup-title"
                className="text-sm sm:text-base font-bold tracking-tight"
              >
                Theme Atmosphere
              </h2>
              <p className={`text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Select a background color palette
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                : 'bg-white/[0.08] hover:bg-white/[0.15] text-zinc-300 hover:text-white'
            }`}
            aria-label="Close theme selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Performance Mode Switch (Simple with Less Animations) */}
        <div
          onClick={handleTogglePerfMode}
          className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
            isPerfMode
              ? isLight
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              : isLight
              ? 'bg-slate-50 border-slate-200 hover:bg-slate-100/70 text-slate-700'
              : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07] text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                isPerfMode
                  ? 'bg-amber-500 text-black'
                  : isLight
                  ? 'bg-slate-200 text-slate-700'
                  : 'bg-white/10 text-zinc-400'
              }`}
            >
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold flex items-center gap-1.5">
                <span>Minimal Animations & Eco Mode</span>
                {isPerfMode && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className={`text-[10px] leading-tight ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Removes heavy blurs & keyframes to make it effortless for server/device to run
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <div
            className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center shrink-0 ${
              isPerfMode
                ? 'bg-amber-500'
                : isLight
                ? 'bg-slate-300'
                : 'bg-zinc-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-150 ${
                isPerfMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </div>
        </div>

        {/* Theme Options List */}
        <div className="flex flex-col gap-2 max-h-[46vh] sm:max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
          {BACKGROUND_THEMES.map((theme) => {
            const isSelected = theme.id === activeTheme;

            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleSelectTheme(theme.id)}
                style={
                  isSelected
                    ? {
                        borderColor: isLight ? '#2563eb' : theme.accentHex,
                      }
                    : undefined
                }
                className={`w-full shrink-0 min-h-[54px] text-left px-3 py-2 rounded-xl border transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                  isSelected
                    ? isLight
                      ? 'bg-blue-50/90 border-blue-600 text-slate-900 font-medium'
                      : 'bg-white/[0.08] text-white font-medium'
                    : isLight
                    ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                    : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.06] text-zinc-300'
                }`}
              >
                {/* Left: Clean Circular Color Swatch & Title */}
                <div className="flex items-center gap-3 min-w-0">
                  {/* Clean circular color disc (NOT a toggle switch) */}
                  <div
                    className="w-7 h-7 rounded-full border border-white/20 shrink-0 shadow-inner flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: theme.hexPrimary }}
                    title={theme.name}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: theme.accentHex }}
                    />
                  </div>

                  {/* Title & Tag */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-bold tracking-tight truncate">
                        {theme.name}
                      </span>
                    </div>
                    <div className="mt-0.5">
                      <span
                        className={`text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded uppercase inline-block ${
                          isLight
                            ? isSelected
                              ? 'bg-blue-100 text-blue-900 border border-blue-300'
                              : 'bg-slate-100 text-slate-800 border border-slate-300/80'
                            : isSelected
                            ? 'bg-white/15 text-white border border-white/25'
                            : 'bg-white/[0.06] text-zinc-300 border border-white/10'
                        }`}
                      >
                        {theme.tag.split('·')[0].trim()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Active Radio Indicator */}
                <div className="shrink-0 flex items-center">
                  {isSelected ? (
                    <div
                      style={{
                        backgroundColor: isLight ? '#2563eb' : theme.accentHex,
                        color: '#ffffff',
                      }}
                      className="w-5 h-5 rounded-full flex items-center justify-center shadow-sm text-white"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div
                      className={`w-5 h-5 rounded-full border transition-colors ${
                        isLight
                          ? 'border-slate-300 bg-slate-50'
                          : 'border-white/20 bg-white/[0.04]'
                      }`}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div
          className={`pt-2 border-t flex items-center justify-between gap-2 ${
            isLight ? 'border-slate-200' : 'border-white/[0.08]'
          }`}
        >
          <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
            Changes apply in real time
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: isLight ? '#2563eb' : (activeDef?.accentHex || '#00f0ff'),
              color: '#ffffff',
            }}
            className="px-4 py-1.5 rounded-lg font-bold text-xs cursor-pointer shadow-md hover:brightness-110 text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackgroundShowcase;

