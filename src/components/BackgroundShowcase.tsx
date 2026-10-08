import React, { useState, useEffect } from 'react';
import { Palette, Check, X, Sparkles } from 'lucide-react';
import {
  BACKGROUND_THEMES,
  BackgroundThemeId,
  getStoredBackgroundTheme,
  applyBackgroundTheme,
} from '../types/backgroundThemes';
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

  // Sync with current stored theme on mount
  useEffect(() => {
    const current = getStoredBackgroundTheme();
    setActiveTheme(current);
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

  const isLight = activeTheme === 'pure-light';
  const activeDef = BACKGROUND_THEMES.find((t) => t.id === activeTheme);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none font-sans"
      onClick={onClose}
    >
      {/* Floating Theme Selection Dialog Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-popup-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-surface-elevated, rgba(16, 18, 26, 0.96))',
          borderColor: 'var(--bg-border, rgba(255, 255, 255, 0.12))',
        }}
        className={`relative w-full max-w-[430px] rounded-3xl border shadow-[0_24px_60px_rgba(0,0,0,0.85)] p-4 sm:p-5 backdrop-blur-2xl flex flex-col gap-3.5 animate-modal-spring overflow-hidden ring-1 ${
          isLight ? 'ring-black/5 shadow-[0_24px_60px_rgba(0,0,0,0.18)]' : 'ring-white/10'
        }`}
      >
        {/* Specular Top Hairline */}
        <div
          className={`absolute top-0 left-0 right-0 h-[1.5px] pointer-events-none ${
            isLight
              ? 'bg-gradient-to-r from-transparent via-blue-500/30 to-transparent'
              : 'bg-gradient-to-r from-transparent via-white/30 to-transparent'
          }`}
        />

        {/* Modal Header */}
        <div
          className={`flex items-center justify-between pb-3 border-b ${
            isLight ? 'border-slate-200' : 'border-white/[0.08]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              style={{
                backgroundColor: 'var(--bg-surface, rgba(255, 255, 255, 0.06))',
                borderColor: 'var(--bg-border, rgba(255, 255, 255, 0.12))',
              }}
              className="w-8 h-8 rounded-xl border flex items-center justify-center text-[var(--theme-accent,#00f0ff)] shadow-inner"
            >
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="theme-popup-title"
                className={`text-sm sm:text-base font-bold tracking-tight flex items-center gap-1.5 ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                Theme Atmosphere
              </h2>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Select a background color palette
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
              isLight
                ? 'bg-black/[0.05] hover:bg-black/[0.1] border border-black/[0.08] text-slate-500 hover:text-slate-900'
                : 'bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.10] text-zinc-400 hover:text-white'
            }`}
            aria-label="Close theme selection"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Theme Options List */}
        <div className="flex flex-col gap-1.5 max-h-[58vh] overflow-y-auto pr-0.5 custom-scrollbar">
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
                        borderColor: theme.accentHex,
                        boxShadow: `0 0 16px ${theme.accentHex}25`,
                      }
                    : undefined
                }
                className={`w-full text-left p-2.5 sm:p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99] ${
                  isSelected
                    ? isLight
                      ? 'bg-blue-500/10 border-blue-600 text-slate-900 shadow-sm'
                      : 'bg-white/[0.08] text-white'
                    : isLight
                    ? 'bg-black/[0.02] hover:bg-black/[0.05] border-black/[0.06] hover:border-black/[0.14] text-slate-700'
                    : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.06] hover:border-white/[0.14] text-zinc-300'
                }`}
              >
                {/* Left: Swatch circles & Title */}
                <div className="flex items-center gap-3 min-w-0">
                  {/* Tri-color Swatch Pill */}
                  <div
                    className={`flex items-center -space-x-1 shrink-0 p-1 rounded-full shadow-inner ${
                      isLight ? 'bg-slate-200/80 border border-slate-300' : 'bg-black/40 border border-white/10'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/25 shadow-sm"
                      style={{ backgroundColor: theme.previewSwatches[0] }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/25 shadow-sm"
                      style={{ backgroundColor: theme.previewSwatches[1] }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/25 shadow-sm"
                      style={{ backgroundColor: theme.previewSwatches[2] }}
                    />
                  </div>

                  {/* Title & Tag */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs sm:text-sm font-semibold tracking-tight truncate ${
                          isLight ? 'text-slate-900' : 'text-white'
                        }`}
                      >
                        {theme.name}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono truncate block ${
                        isLight ? 'text-slate-500' : 'text-zinc-400'
                      }`}
                    >
                      {theme.tag.split('·')[0].trim()}
                    </span>
                  </div>
                </div>

                {/* Right: Active Indicator */}
                <div className="shrink-0 flex items-center">
                  {isSelected ? (
                    <div
                      style={{
                        backgroundColor: theme.accentHex,
                        color:
                          theme.id === 'pure-light'
                            ? '#ffffff'
                            : theme.id === 'pure-oled-black'
                            ? '#000000'
                            : '#000000',
                      }}
                      className="w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-scale-in"
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : (
                    <div
                      className={`w-4 h-4 rounded-full border transition-colors ${
                        isLight
                          ? 'border-slate-300 group-hover:border-slate-500'
                          : 'border-white/20 group-hover:border-white/40'
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
          <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
            Changes apply in real time
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: activeDef?.accentHex || 'var(--theme-accent, #00f0ff)',
              color:
                activeTheme === 'pure-light'
                  ? '#ffffff'
                  : activeTheme === 'pure-oled-black'
                  ? '#000000'
                  : '#000000',
            }}
            className="px-4 py-2 rounded-xl font-bold text-xs cursor-pointer shadow-lg transition-transform active:scale-95 hover:brightness-110"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackgroundShowcase;
