import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Info,
  X,
  Sliders,
  Laptop,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  Check,
  Copy,
  Sparkles,
  ArrowRight,
  Wifi,
  Radio,
  BookOpen,
  Keyboard,
  Volume2,
  ChevronRight,
  Music,
  Terminal,
  Layers,
  Zap,
  Clock,
  Compass,
  MessageSquare
} from 'lucide-react';
import { Logo } from './Logo';

export type AboutHelpPosition =
  | 'lobby-top-bar'
  | 'lobby-card-footer'
  | 'lobby-fab'
  | 'studio-header'
  | 'studio-sidebar'
  | 'modals-preview';

interface PositionMeta {
  id: AboutHelpPosition;
  title: string;
  context: 'Lobby (Entry)' | 'Studio (In-Room)' | 'Design System';
  recommendationScore: number;
  badge: string;
  summary: string;
  pros: string[];
  cons: string[];
  idealFor: string;
}

export const CANDIDATE_POSITIONS: PositionMeta[] = [
  {
    id: 'lobby-top-bar',
    title: 'Position 1: Lobby Top-Right Quick Bar',
    context: 'Lobby (Entry)',
    recommendationScore: 9.8,
    badge: 'Recommended Best for New Users',
    summary:
      'Floating sleek capsule buttons in the top-right header of the Lobby screen. Provides effortless discovery before creating or entering a room.',
    pros: [
      'Standard web UI convention (users instinctively look at top-right for Help & About)',
      '100% visible on both mobile and desktop without pushing the card down',
      'Zero intrusion into the room creation or code input focus area',
      'Allows first-time visitors to understand what MusicSync is before joining'
    ],
    cons: [
      'Requires separate placement inside the room once connected (or a universal top bar)'
    ],
    idealFor: 'Explaining the app to newcomers before they enter a room.'
  },
  {
    id: 'lobby-card-footer',
    title: 'Position 2: Lobby Card Footer Links',
    context: 'Lobby (Entry)',
    recommendationScore: 8.9,
    badge: 'Minimalist & Clean',
    summary:
      'Discrete text links directly beneath the "No account required" tagline inside the central Lobby card.',
    pros: [
      'Ultra-minimalist aesthetic (popular in Discord, Linear, and Vercel)',
      'Centered in the natural reading flow right after entering name/code',
      'Keeps the outer canvas 100% uncluttered'
    ],
    cons: [
      'Slightly lower discovery rate than top-bar navigation',
      'Requires scrolling on small landscape screens'
    ],
    idealFor: 'Maintaining an ultra-clean, distraction-free landing card.'
  },
  {
    id: 'lobby-fab',
    title: 'Position 3: Floating Action Dial (FAB)',
    context: 'Lobby (Entry)',
    recommendationScore: 9.1,
    badge: 'High Discovery & Accessible',
    summary:
      'A glowing, glassmorphic circular icon pinned to the bottom-right corner that expands into quick options on hover/tap.',
    pros: [
      'Zero layout impact on any viewport size',
      'Thumb-friendly on mobile smartphones (bottom-right zone)',
      'Can remain persistently active across BOTH Lobby and In-Room views'
    ],
    cons: [
      'Can occasionally obscure background artwork or bottom corner notifications'
    ],
    idealFor: 'Mobile-first synchronized party use.'
  },
  {
    id: 'studio-header',
    title: 'Position 4: Titanium Studio Top Header',
    context: 'Studio (In-Room)',
    recommendationScore: 9.6,
    badge: 'Recommended Inside Room',
    summary:
      'Integrated into the Titanium top header bar, placed alongside the Theme selector and the Eject/Leave room button.',
    pros: [
      'Always accessible during active live playback from any room screen',
      'Sits naturally beside other utility actions (Themes, Telemetry, Eject)',
      'Compact icon-only pill with tooltip on desktop, clean touch target on mobile'
    ],
    cons: [
      'Only available after the user joins or creates a room'
    ],
    idealFor: 'In-session sync troubleshooting, audio unlock help, and keyboard shortcuts.'
  },
  {
    id: 'studio-sidebar',
    title: 'Position 5: Titanium Left Sidebar (System Section)',
    context: 'Studio (In-Room)',
    recommendationScore: 8.7,
    badge: 'Hardware Console Style',
    summary:
      'A dedicated system utility block at the bottom of the left-hand hardware sidebar, right next to QR Share and Diagnostics.',
    pros: [
      'Matches the Teenage Engineering audio console aesthetic',
      'Room for descriptive text labels rather than just icons',
      'Groups naturally with Network Diagnostics and Room QR Code'
    ],
    cons: [
      'On mobile screens, the left sidebar is tucked behind the "Room" tab'
    ],
    idealFor: 'Desktop desktop/laptop users who want quick technical reference.'
  },
  {
    id: 'modals-preview',
    title: 'Position 6: Full Modals & Content Preview',
    context: 'Design System',
    recommendationScore: 10.0,
    badge: 'Interactive Content Preview',
    summary:
      'Direct interactive demonstration of the actual "About MusicSync" modal and "Help & Troubleshooting" guide with working tabs, search, and shortcuts.',
    pros: [
      'Inspect the actual content architecture: NTP engine guide, audio troubleshooting, FAQ',
      'Test responsiveness and typography on dark cyber titanium design system',
      'Verify keyboard shortcuts table and copyable room specifications'
    ],
    cons: [],
    idealFor: 'Reviewing the exact copy, technical specs, and help documentation.'
  }
];

interface AboutHelpShowcaseProps {
  onClose?: () => void;
}

export const AboutHelpShowcase: React.FC<AboutHelpShowcaseProps> = ({ onClose }) => {
  const [selectedPosition, setSelectedPosition] = useState<AboutHelpPosition>('lobby-top-bar');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  
  // Interactive Modal states
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [activeHelpTab, setActiveHelpTab] = useState<'quickstart' | 'sync' | 'shortcuts' | 'faq'>('quickstart');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // FAB Menu expanded state for Position 3
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);

  const currentMeta = CANDIDATE_POSITIONS.find((p) => p.id === selectedPosition) || CANDIDATE_POSITIONS[0];

  const handleCopy = (text: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch {}
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAboutOpen) setIsAboutOpen(false);
        else if (isHelpOpen) setIsHelpOpen(false);
        else if (onClose) onClose();
      }
      if (e.key === '1') setSelectedPosition('lobby-top-bar');
      if (e.key === '2') setSelectedPosition('lobby-card-footer');
      if (e.key === '3') setSelectedPosition('lobby-fab');
      if (e.key === '4') setSelectedPosition('studio-header');
      if (e.key === '5') setSelectedPosition('studio-sidebar');
      if (e.key === '6') setSelectedPosition('modals-preview');
      if (e.key === 'm' || e.key === 'M') {
        setViewMode((v) => (v === 'desktop' ? 'mobile' : 'desktop'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAboutOpen, isHelpOpen, onClose]);

  return (
    <div className="fixed inset-0 z-[99999] w-full h-full bg-[#08090c] flex flex-col select-none overflow-hidden font-sans text-white">
      {/* ========================================================================= */}
      {/* TOP CONTROL BAR                                                           */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 w-full px-4 sm:px-6 py-3 bg-[#0e1014]/95 backdrop-blur-2xl border-b border-white/[0.08] flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xl">
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 p-0.5 shadow-[0_0_15px_rgba(56,189,248,0.3)]">
              <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                <Sliders className="w-4 h-4 text-cyan-300" />
              </div>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>About & Help Placement Showcase</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 uppercase">
                  Live Interactive Demo
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Preview all candidate locations in real-time. Click any highlighted button to test the live popups!
              </p>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="md:hidden p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Viewport switch & Quick Modals */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 md:pb-0">
          {/* Mobile vs Desktop Viewport Toggle */}
          <div className="flex items-center bg-black/60 p-1 rounded-xl border border-zinc-800 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'desktop'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'mobile'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile Frame</span>
            </button>
          </div>

          {/* Quick Direct Modal Triggers */}
          <button
            type="button"
            onClick={() => setIsAboutOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-200 hover:text-white text-xs font-semibold transition-all cursor-pointer shrink-0 active:scale-95"
          >
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Test "About" Modal</span>
          </button>

          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-200 hover:text-white text-xs font-semibold transition-all cursor-pointer shrink-0 active:scale-95"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Test "Help" Drawer</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-700/50 text-red-300 hover:text-white text-xs font-bold transition-all cursor-pointer shrink-0 active:scale-95"
              title="Close Showcase (Esc)"
            >
              <X className="w-3.5 h-3.5" />
              <span>Exit Demo</span>
            </button>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN DUAL-PANE WORKSPACE                                                  */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT / TOP CONTROL & POSITION SELECTION PANEL */}
        <div className="w-full lg:w-96 shrink-0 bg-[#0d0e12] border-r border-white/[0.08] flex flex-col overflow-y-auto p-4 sm:p-5 gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
              Step 1 • Select Position
            </span>
            <h3 className="text-sm font-bold text-white mt-0.5">Where can About & Help live?</h3>
          </div>

          {/* Position Selector Buttons */}
          <div className="flex flex-col gap-2">
            {CANDIDATE_POSITIONS.map((pos, idx) => {
              const isSelected = selectedPosition === pos.id;
              return (
                <button
                  key={pos.id}
                  type="button"
                  onClick={() => setSelectedPosition(pos.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 relative overflow-hidden group ${
                    isSelected
                      ? 'bg-zinc-900 border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/40'
                      : 'bg-zinc-950/60 border-zinc-800/80 hover:bg-zinc-900/60 hover:border-zinc-700 text-zinc-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold tracking-tight ${
                        isSelected ? 'text-white' : 'text-zinc-300 group-hover:text-white'
                      }`}
                    >
                      {pos.title}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300 font-semibold'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                      }`}
                    >
                      {pos.context}
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                    {pos.summary}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[10px]">
                    <span className="text-amber-400 font-mono font-semibold">
                      ★ Score: {pos.recommendationScore}/10
                    </span>
                    <span className="text-zinc-500 font-mono">Key: [{idx + 1}]</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Deep Dive Analysis for Selected Position */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3 mt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold">
                Position Analysis
              </span>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                {currentMeta.badge}
              </span>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Key Advantages
              </h4>
              <ul className="space-y-1">
                {currentMeta.pros.map((pro, i) => (
                  <li key={i} className="text-[11px] text-zinc-300 flex items-start gap-1.5 leading-snug">
                    <span className="text-emerald-400 shrink-0 font-bold">•</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>

            {currentMeta.cons.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-zinc-300 mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Considerations
                </h4>
                <ul className="space-y-1">
                  {currentMeta.cons.map((con, i) => (
                    <li key={i} className="text-[11px] text-zinc-400 flex items-start gap-1.5 leading-snug">
                      <span className="text-amber-400 shrink-0">•</span>
                      <span>{con}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 border-t border-zinc-800/80">
              <span className="text-[10px] font-bold text-cyan-400 block mb-0.5 uppercase tracking-wider">
                Best For:
              </span>
              <p className="text-[11px] text-zinc-300 italic">{currentMeta.idealFor}</p>
            </div>
          </div>

          {/* Interactive Hint */}
          <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/30 text-cyan-200 text-xs flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
            <span className="text-[11px]">
              Click the highlighted pulsing buttons in the preview stage on the right to test live interaction!
            </span>
          </div>
        </div>

        {/* RIGHT / MAIN PREVIEW CANVAS */}
        <div className="flex-1 bg-[#050608] flex flex-col items-center justify-center p-3 sm:p-6 overflow-y-auto relative">
          {/* Subtle Ambient Studio Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.04),rgba(0,0,0,0)_70%)] pointer-events-none" />

          {/* Device Frame Wrapper */}
          <div
            className={`w-full transition-all duration-300 relative flex flex-col rounded-2xl overflow-hidden border border-white/[0.12] shadow-[0_20px_60px_rgba(0,0,0,0.85)] ${
              viewMode === 'mobile'
                ? 'max-w-[390px] h-[780px] bg-[#09090b] ring-8 ring-zinc-800/70'
                : 'max-w-5xl h-[85vh] bg-[#09090b]'
            }`}
          >
            {/* Simulated Browser Chrome Bar (For Context) */}
            <div className="h-9 px-3 bg-[#111218] border-b border-zinc-800/80 flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="px-3 py-0.5 rounded-md bg-black/60 border border-zinc-800 text-[10px] font-mono text-zinc-400 flex items-center gap-2">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>musicsync.live</span>
                <span className="text-zinc-600">|</span>
                <span className="text-cyan-400">
                  {selectedPosition.startsWith('studio') ? '/room/64618' : '/lobby'}
                </span>
              </div>
              <div className="text-[10px] font-mono text-zinc-500">
                {viewMode === 'mobile' ? 'iPhone 15' : 'Desktop 1920x1080'}
              </div>
            </div>

            {/* PREVIEW STAGE BODY */}
            <div className="flex-1 relative overflow-hidden flex flex-col">
              {/* =============================================================== */}
              {/* SCENARIO A: LOBBY CONTEXT (Positions 1, 2, 3)                     */}
              {/* =============================================================== */}
              {['lobby-top-bar', 'lobby-card-footer', 'lobby-fab'].includes(selectedPosition) && (
                <div className="h-full w-full bg-[#09090b] text-zinc-200 flex flex-col justify-center items-center px-4 py-6 relative overflow-y-auto">
                  {/* Subtle Background Mesh */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-15%,rgba(120,119,198,0.08),rgba(0,0,0,0))] pointer-events-none" />

                  {/* ------------------------------------------------------------- */}
                  {/* POSITION 1: TOP-RIGHT NAVBAR PILL (Visible when selected)     */}
                  {/* ------------------------------------------------------------- */}
                  {selectedPosition === 'lobby-top-bar' && (
                    <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
                      <div className="relative group">
                        {/* Glowing focus pulse indicator */}
                        <div className="absolute -inset-1 rounded-full bg-cyan-400/40 blur-sm animate-pulse" />
                        <div className="relative flex items-center gap-1.5 p-1 rounded-full bg-zinc-900/90 backdrop-blur-md border border-cyan-400 shadow-xl">
                          <button
                            type="button"
                            onClick={() => setIsAboutOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 hover:text-white text-xs font-semibold transition-all cursor-pointer active:scale-95"
                            title="Click to view About MusicSync"
                          >
                            <Info className="w-3.5 h-3.5 text-cyan-400" />
                            <span>About</span>
                          </button>

                          <span className="w-px h-3.5 bg-zinc-700" />

                          <button
                            type="button"
                            onClick={() => setIsHelpOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 hover:text-white text-xs font-semibold transition-all cursor-pointer active:scale-95"
                            title="Click to view Help & FAQs"
                          >
                            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                            <span>Help & FAQ</span>
                          </button>
                        </div>
                      </div>

                      <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-[10px] text-cyan-300 font-mono animate-bounce">
                        <span>👈 Position 1</span>
                      </div>
                    </div>
                  )}

                  {/* Top-Left Brand Logo for Lobby */}
                  <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[11px] font-mono text-zinc-400">Web Audio Engine v2.4</span>
                  </div>

                  {/* Central Lobby Card */}
                  <div className="max-w-[420px] w-full z-10 transition-all duration-300 relative my-auto">
                    {/* Brand Header */}
                    <div className="text-center mb-6 flex flex-col items-center gap-2">
                      <Logo size="lg" layout="vertical" variant="titanium" showTagline={false} />
                    </div>

                    {/* Dark Card */}
                    <div className="bg-[#111115]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
                      {/* Segmented Tab */}
                      <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-900/80 border border-white/[0.06] text-xs font-medium">
                        <button
                          type="button"
                          className="py-2 rounded-lg bg-zinc-800 text-white font-semibold shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <Radio className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Create Room</span>
                        </button>
                        <button
                          type="button"
                          className="py-2 rounded-lg text-zinc-400 flex items-center justify-center gap-1.5"
                        >
                          <span>Join Room</span>
                        </button>
                      </div>

                      {/* Name Input */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-mono uppercase text-zinc-400 font-semibold tracking-wider">
                          Your Display Name
                        </label>
                        <input
                          type="text"
                          readOnly
                          value="AudioHost"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-200 text-sm focus:outline-none"
                        />
                      </div>

                      {/* Network Mode */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-zinc-900 border border-cyan-500/40 text-cyan-300 font-medium flex items-center gap-2">
                          <Wifi className="w-4 h-4 text-cyan-400" />
                          <div>
                            <div className="font-bold text-[11px]">Local Wi-Fi</div>
                            <div className="text-[9px] text-zinc-400">Ultra-low latency</div>
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 text-zinc-400 flex items-center gap-2 opacity-60">
                          <Compass className="w-4 h-4 text-zinc-400" />
                          <div>
                            <div className="font-bold text-[11px]">Public Cloud</div>
                            <div className="text-[9px] text-zinc-500">Internet sync</div>
                          </div>
                        </div>
                      </div>

                      {/* Main Action Button */}
                      <button
                        type="button"
                        className="w-full py-3 px-4 rounded-xl bg-zinc-100 text-zinc-950 font-semibold text-sm shadow-sm flex items-center justify-center gap-2"
                      >
                        <ArrowRight className="w-4 h-4 text-zinc-900" />
                        <span>Create Live Room</span>
                      </button>

                      {/* --------------------------------------------------------- */}
                      {/* POSITION 2: CARD FOOTER LINKS (Visible when selected)      */}
                      {/* --------------------------------------------------------- */}
                      {selectedPosition === 'lobby-card-footer' && (
                        <div className="relative pt-2">
                          {/* Pulsing Highlight Box */}
                          <div className="absolute -inset-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400 animate-pulse pointer-events-none" />
                          <div className="relative flex items-center justify-center gap-4 py-2 border-t border-zinc-800/90 text-xs">
                            <button
                              type="button"
                              onClick={() => setIsAboutOpen(true)}
                              className="text-cyan-300 hover:text-white font-semibold flex items-center gap-1 transition-colors cursor-pointer group"
                            >
                              <Info className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                              <span className="underline underline-offset-4 decoration-cyan-500/50">
                                About MusicSync
                              </span>
                            </button>

                            <span className="text-zinc-600">•</span>

                            <button
                              type="button"
                              onClick={() => setIsHelpOpen(true)}
                              className="text-amber-300 hover:text-white font-semibold flex items-center gap-1 transition-colors cursor-pointer group"
                            >
                              <HelpCircle className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                              <span className="underline underline-offset-4 decoration-amber-500/50">
                                Help & FAQs
                              </span>
                            </button>
                          </div>
                          <div className="text-center mt-1">
                            <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                              ▲ Position 2: Sub-Card Navigation Links
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Default Minimal Tagline */}
                    <p className="text-[11px] text-zinc-500 text-center mt-3">
                      No account required · Sub-millisecond peer-to-peer sync
                    </p>
                  </div>

                  {/* ------------------------------------------------------------- */}
                  {/* POSITION 3: FLOATING ACTION BUTTON (FAB)                      */}
                  {/* ------------------------------------------------------------- */}
                  {selectedPosition === 'lobby-fab' && (
                    <div className="absolute bottom-5 right-5 z-40 flex flex-col items-end gap-2">
                      {/* Expanded FAB Menu */}
                      {isFabMenuOpen && (
                        <div className="flex flex-col gap-1.5 p-2 rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-cyan-400/50 shadow-2xl animate-fade-in text-xs min-w-[170px]">
                          <div className="px-2 py-1 text-[10px] font-mono text-zinc-400 uppercase font-bold border-b border-zinc-800">
                            Quick Assistance
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAboutOpen(true);
                              setIsFabMenuOpen(false);
                            }}
                            className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors cursor-pointer text-left font-medium"
                          >
                            <Info className="w-4 h-4 text-cyan-400" />
                            <span>About MusicSync</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsHelpOpen(true);
                              setIsFabMenuOpen(false);
                            }}
                            className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors cursor-pointer text-left font-medium"
                          >
                            <HelpCircle className="w-4 h-4 text-amber-400" />
                            <span>Help & Guides</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsHelpOpen(true);
                              setActiveHelpTab('shortcuts');
                              setIsFabMenuOpen(false);
                            }}
                            className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors cursor-pointer text-left font-medium"
                          >
                            <Keyboard className="w-4 h-4 text-indigo-400" />
                            <span>Shortcuts (Space, F)</span>
                          </button>
                        </div>
                      )}

                      {/* Main Circular Trigger Orb */}
                      <div className="relative group">
                        <div className="absolute -inset-2 rounded-full bg-cyan-500/30 blur-md animate-pulse" />
                        <button
                          type="button"
                          onClick={() => setIsFabMenuOpen((prev) => !prev)}
                          className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-2xl border-2 border-white/40 cursor-pointer active:scale-95 transition-all hover:scale-105"
                          title="Click to toggle Help & About Speed Dial"
                        >
                          {isFabMenuOpen ? (
                            <X className="w-6 h-6" />
                          ) : (
                            <HelpCircle className="w-6 h-6" />
                          )}
                        </button>
                      </div>

                      <div className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-[9px] font-mono text-cyan-300 font-bold">
                        ▲ Position 3: Floating Action Dial
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* =============================================================== */}
              {/* SCENARIO B: STUDIO IN-ROOM CONTEXT (Positions 4 & 5)             */}
              {/* =============================================================== */}
              {['studio-header', 'studio-sidebar'].includes(selectedPosition) && (
                <div className="h-full w-full bg-[#0a0b0e] text-zinc-200 flex flex-col relative overflow-hidden font-mono">
                  {/* ------------------------------------------------------------- */}
                  {/* TOP TITANIUM HEADER                                           */}
                  {/* ------------------------------------------------------------- */}
                  <header className="h-12 shrink-0 bg-[#0d0f14] border-b border-zinc-800 px-4 flex items-center justify-between text-xs relative select-none">
                    {/* Left: Brand + Status */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 font-bold text-white tracking-wider">
                        <Music className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
                        <span>MUSIC//SYNC</span>
                      </div>
                      <span className="text-zinc-700 hidden sm:inline">|</span>
                      <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-black/80 border border-zinc-800 text-[10px] text-zinc-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>NTP BUFFER LOCKED (16/16)</span>
                      </div>
                    </div>

                    {/* Center Telemetry */}
                    <div className="hidden md:flex items-center gap-3 bg-black/80 border border-zinc-800 rounded px-3 py-1 text-[10px]">
                      <span className="text-zinc-500">OFFSET:</span>
                      <span className="text-emerald-400 font-bold">-0.82ms</span>
                      <span className="text-zinc-700">/</span>
                      <span className="text-zinc-500">RTT:</span>
                      <span className="text-zinc-200 font-bold">4.2ms</span>
                    </div>

                    {/* Right Utilities Cluster */}
                    <div className="flex items-center gap-2">
                      {/* ------------------------------------------------------- */}
                      {/* POSITION 4: TOP HEADER UTILITY CLUSTER BUTTONS          */}
                      {/* ------------------------------------------------------- */}
                      {selectedPosition === 'studio-header' ? (
                        <div className="relative flex items-center gap-1.5 p-1 rounded-lg bg-zinc-900 border border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] animate-pulse">
                          <button
                            type="button"
                            onClick={() => setIsAboutOpen(true)}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-black/80 hover:bg-zinc-800 text-cyan-300 hover:text-white text-[11px] font-bold border border-zinc-700 transition-all cursor-pointer"
                            title="Open About MusicSync"
                          >
                            <Info className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="hidden sm:inline">About</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsHelpOpen(true)}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-black/80 hover:bg-zinc-800 text-amber-300 hover:text-white text-[11px] font-bold border border-zinc-700 transition-all cursor-pointer"
                            title="Open Help & Shortcuts"
                          >
                            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                            <span className="hidden sm:inline">Help</span>
                          </button>

                          <div className="absolute -top-6 right-0 bg-cyan-400 text-black text-[9px] font-bold px-1.5 rounded font-sans uppercase">
                            Position 4: Top Header
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 opacity-50">
                          <button type="button" className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                            <Info className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                            <HelpCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Eject / Leave */}
                      <button
                        type="button"
                        className="px-2.5 py-1 rounded bg-rose-950/40 border border-rose-800/60 text-rose-300 text-[10px] font-bold flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        <span className="hidden sm:inline">EJECT</span>
                      </button>
                    </div>
                  </header>

                  {/* Studio Main Workspace Grid */}
                  <div className="flex-1 flex overflow-hidden">
                    {/* LEFT TITANIUM SIDEBAR */}
                    <aside className="w-56 shrink-0 bg-[#0d0f14] border-r border-zinc-800 flex flex-col p-3 gap-3 justify-between">
                      <div className="space-y-3">
                        <div className="p-2 rounded bg-black/80 border border-zinc-800">
                          <div className="text-[10px] text-zinc-500 font-bold uppercase">ROOM CODE</div>
                          <div className="text-sm font-bold text-cyan-400 tracking-widest">646-189</div>
                        </div>

                        {/* Room Users */}
                        <div className="space-y-1.5">
                          <div className="text-[10px] text-zinc-500 font-bold uppercase">
                            LISTENERS (2 ONLINE)
                          </div>
                          <div className="flex items-center gap-2 p-1.5 rounded bg-zinc-900/60 border border-zinc-800/60 text-xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-white font-medium">Raj (Host)</span>
                          </div>
                          <div className="flex items-center gap-2 p-1.5 rounded bg-zinc-900/40 border border-zinc-800/40 text-xs">
                            <span className="w-2 h-2 rounded-full bg-cyan-400" />
                            <span className="text-zinc-300">LivingRoom-Phone</span>
                          </div>
                        </div>
                      </div>

                      {/* SIDEBAR BOTTOM SECTION */}
                      <div className="space-y-2 pt-2 border-t border-zinc-800">
                        {/* ----------------------------------------------------- */}
                        {/* POSITION 5: TITANIUM SIDEBAR SYSTEM DRAWER            */}
                        {/* ----------------------------------------------------- */}
                        {selectedPosition === 'studio-sidebar' ? (
                          <div className="relative p-1.5 rounded-xl bg-zinc-900 border border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] animate-pulse space-y-1">
                            <div className="text-[9px] font-bold text-cyan-300 uppercase px-1">
                              Position 5: Sidebar Utilities
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsAboutOpen(true)}
                              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-black/80 hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <Info className="w-3.5 h-3.5 text-cyan-400" />
                                <span>About MusicSync</span>
                              </div>
                              <ChevronRight className="w-3 h-3 text-zinc-600" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setIsHelpOpen(true)}
                              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-black/80 hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                                <span>Help & Guides</span>
                              </div>
                              <ChevronRight className="w-3 h-3 text-zinc-600" />
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1 opacity-60">
                            <button type="button" className="w-full text-left p-1.5 rounded bg-zinc-950 text-zinc-400 text-xs flex items-center gap-1.5">
                              <Info className="w-3.5 h-3.5" />
                              <span>About System</span>
                            </button>
                            <button type="button" className="w-full text-left p-1.5 rounded bg-zinc-950 text-zinc-400 text-xs flex items-center gap-1.5">
                              <HelpCircle className="w-3.5 h-3.5" />
                              <span>Help Docs</span>
                            </button>
                          </div>
                        )}

                        <div className="text-[9px] text-zinc-600 text-center font-mono">
                          NTP AUDIO // ENGINE READY
                        </div>
                      </div>
                    </aside>

                    {/* MAIN PLAYER VIEW */}
                    <main className="flex-1 p-4 sm:p-6 flex flex-col justify-between items-center relative overflow-y-auto">
                      <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-4 my-auto">
                        {/* Mock Album Art */}
                        <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl bg-gradient-to-tr from-cyan-900 via-zinc-800 to-indigo-900 border border-zinc-700 shadow-2xl flex items-center justify-center relative overflow-hidden">
                          <Music className="w-16 h-16 text-cyan-300 opacity-60" />
                          <div className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded bg-black/70 backdrop-blur-md text-[10px] text-center text-zinc-300">
                            Synchronized Playback Active
                          </div>
                        </div>

                        <div className="text-center space-y-1 font-sans">
                          <h3 className="text-base sm:text-lg font-bold text-white">Cyber Synthwave Symphony</h3>
                          <p className="text-xs text-cyan-400 font-mono">Sub-Millisecond Multi-Device Audio</p>
                        </div>

                        {/* Audio Waveform Simulator */}
                        <div className="w-full h-8 flex items-end justify-center gap-1 px-4">
                          {[30, 60, 45, 80, 95, 70, 50, 85, 100, 75, 40, 60, 90, 65, 40, 80, 55, 30].map(
                            (h, idx) => (
                              <div
                                key={idx}
                                className="w-2 rounded-t bg-cyan-400/80 transition-all duration-300"
                                style={{ height: `${h}%` }}
                              />
                            )
                          )}
                        </div>
                      </div>
                    </main>
                  </div>
                </div>
              )}

              {/* =============================================================== */}
              {/* SCENARIO C: DIRECT MODAL / DRAWER DESIGN REVIEW (Position 6)     */}
              {/* =============================================================== */}
              {selectedPosition === 'modals-preview' && (
                <div className="h-full w-full bg-[#08090d] text-zinc-200 p-6 flex flex-col items-center justify-center gap-6 overflow-y-auto">
                  <div className="text-center max-w-md space-y-2">
                    <span className="text-xs font-mono uppercase text-cyan-400 font-bold px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30">
                      High-Precision Dialog Previews
                    </span>
                    <h2 className="text-xl font-bold text-white">Full Interactive Dialogs</h2>
                    <p className="text-xs text-zinc-400">
                      Click below to open and inspect the real modals designed for MusicSync.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg w-full">
                    {/* Launch About Modal Card */}
                    <div
                      onClick={() => setIsAboutOpen(true)}
                      className="p-5 rounded-2xl bg-zinc-900/90 border border-cyan-500/40 hover:border-cyan-400 shadow-xl flex flex-col gap-3 cursor-pointer group transition-all hover:scale-[1.02]"
                    >
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20">
                        <Info className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                          "About MusicSync" Modal
                        </h4>
                        <p className="text-[11px] text-zinc-400 mt-1">
                          NTP audio sync specs, Web Audio API engine architecture, drift compensation, and credits.
                        </p>
                      </div>
                      <span className="text-xs text-cyan-400 font-semibold flex items-center gap-1 mt-auto">
                        Launch Preview <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    {/* Launch Help Drawer Card */}
                    <div
                      onClick={() => setIsHelpOpen(true)}
                      className="p-5 rounded-2xl bg-zinc-900/90 border border-amber-500/40 hover:border-amber-400 shadow-xl flex flex-col gap-3 cursor-pointer group transition-all hover:scale-[1.02]"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/20">
                        <HelpCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                          "Help & Guide" Drawer
                        </h4>
                        <p className="text-[11px] text-zinc-400 mt-1">
                          Step-by-step device sync guide, Autoplay audio unlock troubleshooting, and hotkeys.
                        </p>
                      </div>
                      <span className="text-xs text-amber-400 font-semibold flex items-center gap-1 mt-auto">
                        Launch Preview <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LIVE MODAL 1: "ABOUT MUSICSYNC" POPUP (Interactive Real Preview)          */}
      {/* ========================================================================= */}
      {isAboutOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#0f1117] border border-cyan-500/30 rounded-2xl shadow-2xl p-6 text-zinc-200 space-y-5 overflow-hidden font-sans">
            {/* Ambient Background Gradient */}
            <div className="absolute -top-24 -right-24 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Modal Header */}
            <div className="flex items-start justify-between relative">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-0.5 shadow-lg">
                  <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
                    <Music className="w-6 h-6 text-cyan-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <span>MusicSync Pro</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 uppercase">
                      v2.4 Titanium
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">High-Precision Multi-Device Audio Synchronizer</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAboutOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Core Specs Pills */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-black/60 border border-zinc-800">
                <div className="text-[10px] text-zinc-500 uppercase font-mono">Precision</div>
                <div className="text-sm font-bold text-cyan-300 font-mono">±2.5 ms</div>
              </div>
              <div className="p-2.5 rounded-xl bg-black/60 border border-zinc-800">
                <div className="text-[10px] text-zinc-500 uppercase font-mono">Sync Clock</div>
                <div className="text-sm font-bold text-emerald-400 font-mono">NTP RFC 5905</div>
              </div>
              <div className="p-2.5 rounded-xl bg-black/60 border border-zinc-800">
                <div className="text-[10px] text-zinc-500 uppercase font-mono">Audio Engine</div>
                <div className="text-sm font-bold text-indigo-300 font-mono">Web Audio API</div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2 text-xs text-zinc-300 leading-relaxed bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/80">
              <p>
                <strong className="text-white">MusicSync</strong> transforms multiple smartphones, laptops, and speakers into a unified acoustic sound system with sub-millisecond precision.
              </p>
              <p className="text-zinc-400">
                Utilizing continuous Network Time Protocol (NTP) round-trip ping calculations, client drift calibration, and Web Audio hardware clock scheduling, music plays in exact synchrony without perceptible echo or phase distortion.
              </p>
            </div>

            {/* Tech Stack Chips */}
            <div>
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1.5">
                Built With
              </span>
              <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
                {['React 18', 'Web Audio API', 'Socket.io', 'TailwindCSS', 'TypeScript', 'Node.js', 'Vite'].map(
                  (tech) => (
                    <span
                      key={tech}
                      className="px-2.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-700/60 text-zinc-300"
                    >
                      {tech}
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs">
              <div className="text-zinc-500 text-[11px]">
                Crafted for party listening & acoustic surround
              </div>
              <button
                type="button"
                onClick={() => setIsAboutOpen(false)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold transition-all cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-95"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LIVE MODAL 2: "HELP & TROUBLESHOOTING" DRAWER / MODAL                      */}
      {/* ========================================================================= */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
          <div className="relative w-full max-w-2xl bg-[#0f1117] border border-amber-500/30 rounded-2xl shadow-2xl p-6 text-zinc-200 flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Help & Quick Start Guide</span>
                  </h3>
                  <p className="text-xs text-zinc-400">Everything you need to sync your audio seamlessly</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsHelpOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 py-3 border-b border-zinc-800 shrink-0 overflow-x-auto text-xs font-medium">
              {[
                { id: 'quickstart', label: '1. Quick Start', icon: Zap },
                { id: 'sync', label: '2. Audio Troubleshooting', icon: Volume2 },
                { id: 'shortcuts', label: '3. Keyboard Shortcuts', icon: Keyboard },
                { id: 'faq', label: '4. Frequently Asked', icon: MessageSquare }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeHelpTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveHelpTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Body Content */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
              {/* TAB 1: QUICK START */}
              {activeHelpTab === 'quickstart' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                      1
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Create or Join a Room</h4>
                      <p className="text-zinc-400 mt-0.5 leading-relaxed">
                        One person taps <strong>Create Room</strong> to become the Host/DJ. MusicSync will generate a 6-digit room code or QR code.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">
                      2
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Connect Other Devices</h4>
                      <p className="text-zinc-400 mt-0.5 leading-relaxed">
                        Friends on iPhones, Androids, or laptops open MusicSync, enter your 6-digit code, and join immediately. No accounts or app installations required!
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                      3
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Queue Songs & Enjoy Surround</h4>
                      <p className="text-zinc-400 mt-0.5 leading-relaxed">
                        Search and add any song to the queue. When the host taps Play, every connected speaker plays the exact same beat in millisecond sync.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: AUDIO TROUBLESHOOTING */}
              {activeHelpTab === 'sync' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200">
                    <h4 className="text-xs font-bold flex items-center gap-1.5 mb-1">
                      <Volume2 className="w-4 h-4 text-amber-400" />
                      Browser Audio Autoplay Restriction
                    </h4>
                    <p className="text-[11px] text-amber-200/80 leading-relaxed">
                      Browsers (especially iOS Safari & Chrome) block audio from playing automatically without a user tap. Tap anywhere on the screen if you see the "Unlock Audio" prompt.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
                    <h4 className="text-xs font-bold text-white mb-1">Local Wi-Fi vs Public Online Cloud</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      • <strong>Local Wi-Fi mode:</strong> Best for house parties and rooms on the same router/hotspot. Latency is virtually 0ms.
                      <br />
                      • <strong>Public Online mode:</strong> Connects friends across different cities or mobile 5G carriers via cloud relay.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
                    <h4 className="text-xs font-bold text-white mb-1">Bluetooth Speaker Latency Compensation</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Bluetooth speakers introduce 100-200ms hardware delay. You can adjust individual device offset in the Diagnostics panel to align Bluetooth and phone speakers perfectly.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 3: KEYBOARD SHORTCUTS */}
              {activeHelpTab === 'shortcuts' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'Space', desc: 'Play / Pause playback' },
                      { key: 'Shift + Right', desc: 'Skip to next track' },
                      { key: 'Shift + Left', desc: 'Previous track' },
                      { key: 'M', desc: 'Mute / Unmute audio' },
                      { key: 'F', desc: 'Toggle Fullscreen Mode' },
                      { key: 'Esc', desc: 'Close modals / search dialogs' },
                      { key: 'H', desc: 'Toggle Playback History' },
                      { key: '?', desc: 'Open this Help Guide' }
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800"
                      >
                        <span className="text-[11px] text-zinc-300">{item.desc}</span>
                        <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-amber-300 font-mono text-[10px] font-bold">
                          {item.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: FREQUENTLY ASKED */}
              {activeHelpTab === 'faq' && (
                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                    <h5 className="text-xs font-bold text-white mb-0.5">Do I need to install an app?</h5>
                    <p className="text-[11px] text-zinc-400">
                      No! MusicSync is a progressive web app running directly in mobile Safari, Chrome, and desktop browsers. You can also tap "Install App" to pin it to your homescreen.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                    <h5 className="text-xs font-bold text-white mb-0.5">How many devices can sync at once?</h5>
                    <p className="text-[11px] text-zinc-400">
                      MusicSync has been tested with 50+ simultaneous listeners in a single room with negligible server load thanks to NTP timestamp scheduling.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                    <h5 className="text-xs font-bold text-white mb-0.5">Can guests queue songs?</h5>
                    <p className="text-[11px] text-zinc-400">
                      Yes! Guests can add songs to the queue unless the host changes the permission toggle to "Admins Only".
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-zinc-800 shrink-0 flex items-center justify-between text-xs">
              <span className="text-zinc-500 text-[11px]">Press Esc to close anytime</span>
              <button
                type="button"
                onClick={() => setIsHelpOpen(false)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition-all cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AboutHelpShowcase;
