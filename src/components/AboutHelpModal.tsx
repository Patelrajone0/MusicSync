import React, { useState, useEffect } from 'react';
import {
  Info,
  HelpCircle,
  X,
  Music,
  Zap,
  Volume2,
  Keyboard,
  MessageSquare,
  ShieldCheck,
  Check,
  ExternalLink
} from 'lucide-react';

export type AboutHelpModalType = 'about' | 'help' | null;

interface AboutHelpModalProps {
  type: AboutHelpModalType;
  onClose: () => void;
  initialTab?: 'quickstart' | 'sync' | 'shortcuts' | 'faq';
}

export const AboutHelpModal: React.FC<AboutHelpModalProps> = ({
  type,
  onClose,
  initialTab = 'quickstart'
}) => {
  const [activeTab, setActiveTab] = useState<'quickstart' | 'sync' | 'shortcuts' | 'faq'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, type]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (type) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [type, onClose]);

  if (!type) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full bg-[#111115]/95 border rounded-2xl shadow-2xl overflow-hidden text-zinc-200 transition-all duration-200 ${
          type === 'about'
            ? 'max-w-md border-cyan-500/30 p-5 sm:p-6 space-y-4'
            : 'max-w-xl border-amber-500/30 p-5 sm:p-6 flex flex-col max-h-[85vh]'
        }`}
      >
        {/* ================================================================= */}
        {/* MODAL 1: ABOUT MUSICSYNC                                          */}
        {/* ================================================================= */}
        {type === 'about' && (
          <>
            {/* Ambient Background Aura */}
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-start justify-between relative">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-0.5 shadow-lg">
                  <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                    <Music className="w-5 h-5 text-cyan-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <span>MusicSync Pro</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 uppercase font-semibold">
                      v2.4 Titanium
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">High-Precision Multi-Device Audio Synchronizer</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Core Specs Grid */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-black/50 border border-white/[0.06]">
                <div className="text-[9px] text-zinc-500 uppercase font-mono">Sync Accuracy</div>
                <div className="text-sm font-bold text-cyan-300 font-mono mt-0.5">±2.5 ms</div>
              </div>
              <div className="p-2 rounded-xl bg-black/50 border border-white/[0.06]">
                <div className="text-[9px] text-zinc-500 uppercase font-mono">Clock Protocol</div>
                <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">NTP RFC 5905</div>
              </div>
              <div className="p-2 rounded-xl bg-black/50 border border-white/[0.06]">
                <div className="text-[9px] text-zinc-500 uppercase font-mono">Audio Engine</div>
                <div className="text-sm font-bold text-indigo-300 font-mono mt-0.5">Web Audio</div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2 text-xs text-zinc-300 leading-relaxed bg-black/40 p-3.5 rounded-xl border border-white/[0.06]">
              <p>
                <strong className="text-white">MusicSync</strong> transforms multiple smartphones, laptops, and speakers into a unified acoustic sound system with sub-millisecond precision.
              </p>
              <p className="text-zinc-400">
                Continuous Network Time Protocol (NTP) round-trip ping calculations, client drift calibration, and Web Audio hardware clock scheduling ensure music plays in exact synchrony without echo or phase lag.
              </p>
            </div>

            {/* Tech Stack Chips */}
            <div>
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1.5">
                Technology
              </span>
              <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                {['React 18', 'Web Audio API', 'Socket.io', 'TailwindCSS', 'TypeScript', 'Vite'].map(
                  (tech) => (
                    <span
                      key={tech}
                      className="px-2 py-0.5 rounded-md bg-zinc-900 border border-white/10 text-zinc-300"
                    >
                      {tech}
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs">
              <span className="text-zinc-500 text-[11px]">Designed for party sound & surround</span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold transition-all cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-95"
              >
                Close
              </button>
            </div>
          </>
        )}

        {/* ================================================================= */}
        {/* MODAL 2: HELP & QUICK START GUIDE                                 */}
        {/* ================================================================= */}
        {type === 'help' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Help & Quick Start Guide</h3>
                  <p className="text-xs text-zinc-400">Everything you need to sync your audio seamlessly</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 py-2.5 border-b border-white/[0.08] shrink-0 overflow-x-auto text-xs font-medium">
              {[
                { id: 'quickstart', label: '1. Quick Start', icon: Zap },
                { id: 'sync', label: '2. Audio Issues', icon: Volume2 },
                { id: 'shortcuts', label: '3. Shortcuts', icon: Keyboard },
                { id: 'faq', label: '4. FAQs', icon: MessageSquare }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 text-xs pr-1">
              {/* TAB 1: QUICK START */}
              {activeTab === 'quickstart' && (
                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                      1
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Create a Room (Host)</h4>
                      <p className="text-zinc-400 mt-0.5 leading-relaxed text-[11px]">
                        Choose your name and tap <strong>Create Room</strong>. You will receive a unique 6-digit room code and QR code.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                      2
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Connect Friends & Speakers</h4>
                      <p className="text-zinc-400 mt-0.5 leading-relaxed text-[11px]">
                        Friends open MusicSync on their phones or laptops, switch to <strong>Join Room</strong>, and enter your 6-digit code. No login needed!
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                      3
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Play in Exact Millisecond Sync</h4>
                      <p className="text-zinc-400 mt-0.5 leading-relaxed text-[11px]">
                        Search and queue any song. When the track starts, every connected speaker plays the exact same beat in millisecond harmony.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: AUDIO TROUBLESHOOTING */}
              {activeTab === 'sync' && (
                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200">
                    <h4 className="text-xs font-bold flex items-center gap-1.5 mb-1">
                      <Volume2 className="w-4 h-4 text-amber-400" />
                      Browser Autoplay Audio Unlock
                    </h4>
                    <p className="text-[11px] text-amber-200/80 leading-relaxed">
                      Browsers (especially mobile iOS Safari & Chrome) block audio from playing automatically without an explicit user tap. If you don't hear music, tap anywhere on the screen to unlock Web Audio.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06]">
                    <h4 className="text-xs font-bold text-white mb-1">Local Wi-Fi vs Online Cloud</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      • <strong>Local Wi-Fi:</strong> Lowest latency (near 0ms jitter) for house parties on the same router or phone hotspot.<br />
                      • <strong>Public Cloud:</strong> Best for listening together across different cities or mobile data carriers.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 3: KEYBOARD SHORTCUTS */}
              {activeTab === 'shortcuts' && (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'Space', desc: 'Play / Pause playback' },
                    { key: 'Shift + →', desc: 'Skip to next track' },
                    { key: 'Shift + ←', desc: 'Previous track' },
                    { key: 'M', desc: 'Mute / Unmute audio' },
                    { key: 'F', desc: 'Toggle Fullscreen Mode' },
                    { key: 'Esc', desc: 'Close modals & dialogs' }
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-black/50 border border-white/[0.06]"
                    >
                      <span className="text-[11px] text-zinc-300">{item.desc}</span>
                      <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-amber-300 font-mono text-[10px] font-bold">
                        {item.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 4: FAQS */}
              {activeTab === 'faq' && (
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
                    <h5 className="text-xs font-bold text-white mb-0.5">Do I need to install an app?</h5>
                    <p className="text-[11px] text-zinc-400">
                      No installation needed! MusicSync is a progressive web app running directly in Chrome, Safari, and Firefox. You can also tap "Install App" to add it to your homescreen.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
                    <h5 className="text-xs font-bold text-white mb-0.5">How many devices can sync at once?</h5>
                    <p className="text-[11px] text-zinc-400">
                      MusicSync supports 50+ simultaneous listeners in a single room with negligible latency thanks to continuous NTP hardware clock scheduling.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-2.5 border-t border-white/[0.08] shrink-0 flex items-center justify-between text-xs">
              <span className="text-zinc-500 text-[11px]">Press Esc anytime to close</span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition-all cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95"
              >
                Got It
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AboutHelpModal;
