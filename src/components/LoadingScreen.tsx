import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface LoadingScreenProps {
  isPreview?: boolean;
  isReady?: boolean;
  onClose?: () => void;
  onComplete?: () => void;
  statusText?: string;
  minDuration?: number;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isPreview = false,
  isReady = true,
  onClose,
  onComplete,
  statusText,
  minDuration = 1800, // 1 complete, elegant animation cycle (~1.8s)
}) => {
  const [progressPercent, setProgressPercent] = useState(15);
  const [hasCompletedCycle, setHasCompletedCycle] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

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

  return (
    <div
      className={`fixed inset-0 z-[99999] w-full h-full bg-[#08080a] flex flex-col items-center justify-center select-none overflow-hidden font-sans transition-opacity duration-300 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100 animate-fade-in'
      }`}
    >
      {/* Floating Exit Button (only shown in preview mode) */}
      {isPreview && onClose && (
        <div className="absolute top-5 right-5 z-50">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 text-xs font-medium transition-all cursor-pointer shadow-lg backdrop-blur-md"
            title="Close Preview (Esc)"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close Preview</span>
          </button>
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
          <div className="relative w-full h-[2.5px] rounded-full bg-zinc-800/80 overflow-hidden">
            {/* Smooth Sweeping Emerald Laser Beam */}
            <div className="relative h-full w-2/5 rounded-full bg-gradient-to-r from-emerald-500/20 via-emerald-400 to-teal-300 shadow-[0_0_10px_rgba(52,211,153,0.7)] animate-[greenLaserSweep_1.7s_cubic-bezier(0.4,0,0.2,1)_infinite] will-change-transform" />
          </div>

          {/* Simple, Classic Status Text */}
          <p className="text-xs text-zinc-400 font-sans tracking-wide">
            {statusText || (isDone ? 'Connected' : 'Connecting...')}
          </p>
        </div>
      </div>
    </div>
  );
};
