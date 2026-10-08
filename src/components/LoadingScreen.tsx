import React, { useState, useEffect } from 'react';
import { Moon, X } from 'lucide-react';
import {
  getStoredBackgroundTheme,
  applyBackgroundTheme,
  BackgroundThemeId,
} from '../types/backgroundThemes';
import { haptics } from '../utils/haptics';

interface LoadingScreenProps {
  isPreview?: boolean;
  isReady?: boolean;
  onClose?: () => void;
  onComplete?: () => void;
  statusText?: string;
  minDuration?: number;
  isOled?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isPreview = false,
  isReady = true,
  onClose,
  onComplete,
  statusText,
  minDuration = 1800, // 1 complete, elegant animation cycle (~1.8s)
  isOled: forcedOled,
}) => {
  const [progressPercent, setProgressPercent] = useState(15);
  const [hasCompletedCycle, setHasCompletedCycle] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<BackgroundThemeId>(getStoredBackgroundTheme);
  const [isOledMode, setIsOledMode] = useState<boolean>(() => {
    if (typeof forcedOled === 'boolean') return forcedOled;
    const stored = getStoredBackgroundTheme();
    return stored === 'pure-oled-black' || stored === 'midnight-obsidian';
  });

  // Listen to background theme changes
  useEffect(() => {
    const handleThemeChange = (e: any) => {
      if (e.detail?.themeId) {
        setCurrentTheme(e.detail.themeId);
        if (typeof forcedOled !== 'boolean') {
          setIsOledMode(
            e.detail.themeId === 'pure-oled-black' || e.detail.themeId === 'midnight-obsidian'
          );
        }
      }
    };
    window.addEventListener('musicsync_bg_theme_changed', handleThemeChange);
    return () => window.removeEventListener('musicsync_bg_theme_changed', handleThemeChange);
  }, [forcedOled]);

  const handleToggleOled = () => {
    const nextOled = !isOledMode;
    setIsOledMode(nextOled);
    haptics.selection();
    if (nextOled) {
      applyBackgroundTheme('pure-oled-black');
    } else {
      applyBackgroundTheme('midnight-obsidian');
    }
  };

  const isOledActive = forcedOled ?? isOledMode;
  const isLight = !isOledActive && currentTheme === 'pure-light';

  // Smooth, natural progress easing across minDuration
  useEffect(() => {
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progressRatio = Math.min(1, elapsed / minDuration);

      // Smooth natural cubic-out curve
      const eased = 1 - Math.pow(1 - progressRatio, 2.2);

      if (progressRatio < 1) {
        setProgressPercent(Math.min(98, Math.max(15, Math.round(eased * 98))));
      } else {
        setHasCompletedCycle(true);
      }
    }, 35);

    return () => clearInterval(interval);
  }, [minDuration]);

  // When at least 1 full cycle is done AND session is ready:
  useEffect(() => {
    if (isPreview) return; // Keep active in preview mode until user closes

    if (hasCompletedCycle && isReady && !isFadingOut) {
      setProgressPercent(100);

      const holdTimer = setTimeout(() => {
        setIsFadingOut(true);

        const fadeTimer = setTimeout(() => {
          if (onComplete) onComplete();
        }, 280);

        return () => clearTimeout(fadeTimer);
      }, 250);

      return () => clearTimeout(holdTimer);
    }
  }, [hasCompletedCycle, isReady, isPreview, isFadingOut, onComplete]);

  // Allow Esc key to exit preview if opened
  useEffect(() => {
    if (!isPreview || !onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreview, onClose]);

  const isDone = progressPercent >= 100;

  // Exact 100% pitch black (#000000) for OLED
  const containerBg = isOledActive
    ? '#000000'
    : isLight
    ? '#f8fafc'
    : 'var(--bg-primary, #000000)';

  return (
    <div
      data-oled={isOledActive ? 'true' : 'false'}
      style={{ backgroundColor: containerBg }}
      className={`fixed inset-0 z-[99999] w-full h-full loading-screen-container flex flex-col items-center justify-center select-none overflow-hidden font-sans transition-opacity duration-300 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100 animate-fade-in'
      }`}
    >
      {/* Floating Header Controls (only shown in preview mode) */}
      {isPreview && (
        <div className="absolute top-4 sm:top-5 right-4 sm:right-5 z-50 flex items-center gap-2">
          {/* OLED Black Mode Toggle Pill */}
          <button
            type="button"
            onClick={handleToggleOled}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-md backdrop-blur-md border ${
              isOledActive
                ? 'bg-white/10 text-white border-white/30 shadow-[0_0_12px_rgba(255,255,255,0.2)]'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white border-white/10'
            }`}
            title="Toggle OLED Pure Black mode (#000000)"
          >
            <Moon className={`w-3.5 h-3.5 ${isOledActive ? 'text-white' : 'text-zinc-400'}`} />
            <span>{isOledActive ? 'OLED Black: ON (#000000)' : 'OLED Black: OFF'}</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 text-xs font-medium transition-all cursor-pointer shadow-lg backdrop-blur-md active:scale-95"
              title="Close Preview (Esc)"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close</span>
            </button>
          )}
        </div>
      )}

      {/* Simple & Classic Center Container */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-xs w-full px-4 animate-fade-in">
        {/* Pure MusicSync Titanium Emblem */}
        <div className="relative flex flex-col items-center mb-6">
          <img
            src="/musicsync-titanium.png?v=6"
            alt="MusicSync"
            className="w-full max-w-[220px] sm:max-w-[250px] h-auto object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.85)]"
          />
        </div>

        {/* Clean, Simple Green Loading Line */}
        <div className="w-48 sm:w-56 space-y-3">
          {/* Minimal 2.5px Recessed Rail Track */}
          <div
            className={`relative w-full h-[2.5px] rounded-full overflow-hidden transition-all duration-300 ${
              isOledActive
                ? 'bg-[#000000] ring-1 ring-white/15'
                : isLight
                ? 'bg-slate-200'
                : 'bg-zinc-800/80'
            }`}
          >
            {/* Smooth Sweeping Emerald Laser Beam */}
            <div className="relative h-full w-2/5 rounded-full bg-gradient-to-r from-emerald-500/20 via-emerald-400 to-teal-300 shadow-[0_0_12px_rgba(52,211,153,0.85)] animate-[greenLaserSweep_1.7s_cubic-bezier(0.4,0,0.2,1)_infinite] will-change-transform" />
          </div>

          {/* Simple, Classic Status Text */}
          <p
            className={`text-xs font-sans tracking-wide transition-colors duration-300 ${
              isLight ? 'text-slate-600' : 'text-zinc-400'
            }`}
          >
            {statusText || (isDone ? 'Connected' : 'Connecting...')}
          </p>
        </div>
      </div>
    </div>
  );
};
