import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Download,
  Smartphone,
  Share,
  PlusSquare,
  X,
  Sparkles,
  Check,
  Music,
  Radio,
  Monitor
} from 'lucide-react';
import { usePWAInstall, isRunningStandalone } from '../services/usePWAInstall';

const PWA_DISMISS_STORAGE_KEY = 'musicsync_pwa_dismissed_timestamp';
const DISMISS_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3 days cooldown if dismissed

export function triggerPwaInstallModal() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-pwa-install'));
  }
}

export const InstallPwaPrompt: React.FC = () => {
  const {
    canInstall,
    isInstalled,
    isMobile,
    isIOS,
    triggerInstallPrompt,
    hasNativePrompt
  } = usePWAInstall();

  const [isOpen, setIsOpen] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // Check if we should automatically show the mobile prompt
  useEffect(() => {
    if (isInstalled || isRunningStandalone()) {
      return;
    }

    // Listen for manual trigger from Lobby / Header
    const handleManualOpen = () => {
      setShowIosGuide(isIOS);
      setIsOpen(true);
    };

    window.addEventListener('open-pwa-install', handleManualOpen);

    // Auto-prompt mobile users after a pleasant 2-second delay
    let timer: NodeJS.Timeout | null = null;
    try {
      const dismissedTime = localStorage.getItem(PWA_DISMISS_STORAGE_KEY);
      const isDismissedRecently =
        dismissedTime && Date.now() - parseInt(dismissedTime, 10) < DISMISS_COOLDOWN_MS;

      if (isMobile && !isDismissedRecently) {
        timer = setTimeout(() => {
          if (!isRunningStandalone()) {
            setShowIosGuide(isIOS);
            setIsOpen(true);
          }
        }, 1800);
      }
    } catch (e) {
      // Storage access safety
    }

    return () => {
      window.removeEventListener('open-pwa-install', handleManualOpen);
      if (timer) clearTimeout(timer);
    };
  }, [isInstalled, isMobile, isIOS]);

  const handleDismiss = () => {
    setIsOpen(false);
    try {
      localStorage.setItem(PWA_DISMISS_STORAGE_KEY, Date.now().toString());
    } catch (e) {}
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosGuide(true);
      return;
    }

    if (hasNativePrompt) {
      const result = await triggerInstallPrompt();
      if (result === 'accepted') {
        setInstallSuccess(true);
        setTimeout(() => {
          setIsOpen(false);
        }, 1600);
      }
    } else {
      // If browser doesn't support beforeinstallprompt yet (or user clicked before event fired)
      setShowIosGuide(false);
      // Fallback helpful guidance
      alert(
        'To install MusicSync:\n1. Tap the three dots (⋮) or menu in your browser\n2. Select "Install app" or "Add to Home screen"'
      );
    }
  };

  if (!isOpen || isInstalled) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-3 sm:p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-black/80 backdrop-blur-md transition-all duration-300 animate-in fade-in"
    >
      {/* Modal Container */}
      <div
        className="relative w-full max-w-md bg-gradient-to-b from-[#111422] via-[#0c0e18] to-[#07080f] border border-cyan-500/30 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(0,240,255,0.18)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-cyan-500/20 blur-3xl pointer-events-none rounded-full" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {installSuccess ? (
          /* Success confirmation */
          <div className="py-8 text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">App Installed Successfully!</h3>
            <p className="text-sm text-slate-300">
              MusicSync is now ready on your home screen. Launch it anytime for zero-delay music!
            </p>
          </div>
        ) : showIosGuide ? (
          /* iOS Step-by-Step Guide */
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.2)]">
                <img
                  src="/musicsync-icon-192.png?v=5"
                  alt="MusicSync Icon"
                  className="w-8 h-8 rounded-xl object-contain"
                />
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-wider text-cyan-400 uppercase bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/30">
                  iOS Safari Installation
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
                  Add to iPhone Home Screen
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Install MusicSync in 3 quick taps to enjoy full-screen audio sync without browser bars:
            </p>

            {/* Step-by-step cards */}
            <div className="space-y-2.5 bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 text-xs">
              <div className="flex items-center gap-3 text-slate-200">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold shrink-0">
                  1
                </div>
                <div className="flex-1">
                  Tap the <strong className="text-cyan-300 inline-flex items-center gap-1 font-semibold">Share <Share className="w-3.5 h-3.5 text-cyan-400 inline" /></strong> button in Safari's bottom toolbar.
                </div>
              </div>

              <div className="w-full h-px bg-slate-800/80" />

              <div className="flex items-center gap-3 text-slate-200">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold shrink-0">
                  2
                </div>
                <div className="flex-1">
                  Scroll down and tap <strong className="text-purple-300 inline-flex items-center gap-1 font-semibold">Add to Home Screen <PlusSquare className="w-3.5 h-3.5 text-purple-400 inline" /></strong>.
                </div>
              </div>

              <div className="w-full h-px bg-slate-800/80" />

              <div className="flex items-center gap-3 text-slate-200">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                  3
                </div>
                <div className="flex-1">
                  Tap <strong className="text-emerald-300 font-semibold">Add</strong> in the top right corner to complete.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all active:scale-95"
            >
              Got It!
            </button>
          </div>
        ) : (
          /* Standard Install Prompt (Android & Desktop) */
          <div className="space-y-4 pt-1">
            {/* App Header Info */}
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#121626] to-[#0a0c16] border border-cyan-500/40 p-2 flex items-center justify-center shadow-[0_0_25px_rgba(0,240,255,0.25)]">
                  <img
                    src="/musicsync-icon-192.png?v=5"
                    alt="MusicSync"
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
                {/* Glowing badge */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-cyan-500 border-2 border-[#090b14] flex items-center justify-center text-black">
                  <Sparkles className="w-3 h-3 text-black" />
                </div>
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-bold text-cyan-300 uppercase tracking-wider mb-1">
                  <Radio className="w-2.5 h-2.5 animate-pulse text-cyan-400" />
                  Installable App
                </div>
                <h3 id="pwa-install-title" className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Install MusicSync
                </h3>
                <p className="text-xs text-slate-400">Zero-Delay Multi-Device Audio</p>
              </div>
            </div>

            {/* Why Install Highlights */}
            <div className="space-y-2 py-1">
              <div className="flex items-center gap-3 text-xs text-slate-300 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/80">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <Smartphone className="w-3.5 h-3.5" />
                </div>
                <span><strong>1-Tap Home Screen Access</strong> without opening a browser</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-300 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/80">
                <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                  <Music className="w-3.5 h-3.5" />
                </div>
                <span><strong>Lag-Free Background Audio</strong> with lock-screen controls</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-300 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/80">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Monitor className="w-3.5 h-3.5" />
                </div>
                <span><strong>Fullscreen Experience</strong> free from browser bars & borders</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-sm tracking-wide shadow-[0_0_25px_rgba(0,240,255,0.4)] transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Install App</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="py-3 px-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white font-medium text-xs tracking-wide transition-all active:scale-95"
              >
                Maybe Later
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
