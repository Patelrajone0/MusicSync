import React, { useState, useEffect } from 'react';
import { LogOut, Copy, Check, ChevronDown, Sliders, Sparkles, Cpu, Radio, ShieldCheck, Activity } from 'lucide-react';
import { HeaderBrandLogo } from './HeaderBrandLogo';
import { SyncStats } from '../types';

export type TitaniumHeaderTheme = 'studio' | 'rack' | 'stealth' | 'aerograde';

export const TITANIUM_HEADER_THEMES: {
  id: TitaniumHeaderTheme;
  name: string;
  tag: string;
  desc: string;
}[] = [
  {
    id: 'studio',
    name: 'Titanium Studio Minimal',
    tag: 'RECOMMENDED',
    desc: 'Apple Studio & Leica precision brushed titanium with emerald micro-LED and laser typography.',
  },
  {
    id: 'rack',
    name: 'Hardware Audio Console',
    tag: 'TE PRO RACK',
    desc: 'Teenage Engineering OP-1 aesthetic with 16-bar hardware LED meter and recessed OLED panel.',
  },
  {
    id: 'stealth',
    name: 'Stealth Obsidian DLC',
    tag: 'SURGICAL MATTE',
    desc: 'Deep matte black diamond-like carbon plate with zero glare and surgical emerald lock dot.',
  },
  {
    id: 'aerograde',
    name: 'Aerograde Prism Glass',
    tag: 'VISION GLASS',
    desc: 'Frosted multi-tone titanium glass with continuous metallic specular sweep and glass capsules.',
  },
];

const THEME_STORAGE_KEY = 'musicsync_titanium_header_theme';

export function getStoredHeaderTheme(): TitaniumHeaderTheme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'studio' || saved === 'rack' || saved === 'stealth' || saved === 'aerograde') {
      return saved;
    }
  } catch {}
  return 'studio';
}

export function saveStoredHeaderTheme(theme: TitaniumHeaderTheme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
}

export interface TitaniumHeaderProps {
  roomCode: string;
  syncStats?: SyncStats;
  onLeaveRoom: () => void;
  theme?: TitaniumHeaderTheme;
  onThemeChange?: (newTheme: TitaniumHeaderTheme) => void;
  onOpenShowcase?: () => void;
  showThemeSwitcher?: boolean;
  className?: string;
}

export const TitaniumHeader: React.FC<TitaniumHeaderProps> = ({
  roomCode,
  syncStats = { clockOffset: -11.0, rtt: 102.0, drift: 0, isLocked: true },
  onLeaveRoom,
  theme: controlledTheme,
  onThemeChange,
  onOpenShowcase,
  showThemeSwitcher = false,
  className = '',
}) => {
  const [internalTheme, setInternalTheme] = useState<TitaniumHeaderTheme>(getStoredHeaderTheme);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const activeTheme = controlledTheme || internalTheme;

  const handleSelectTheme = (th: TitaniumHeaderTheme) => {
    setInternalTheme(th);
    saveStoredHeaderTheme(th);
    if (onThemeChange) onThemeChange(th);
    setIsMenuOpen(false);
  };

  const handleCopyRoomCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && roomCode) {
        navigator.clipboard.writeText(roomCode);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }
    } catch {}
  };

  const clockOffsetNum = typeof syncStats.clockOffset === 'number' ? syncStats.clockOffset : -11.0;
  const rttNum = typeof syncStats.rtt === 'number' ? syncStats.rtt : 102.0;
  const driftNum = typeof syncStats.drift === 'number' ? syncStats.drift : 0;

  // =========================================================================
  // THEME 2: HARDWARE AUDIO CONSOLE (Teenage Engineering Rackmount Style)
  // =========================================================================
  if (activeTheme === 'rack') {
    return (
      <header
        className={`shrink-0 bg-[#0d0f14] border-b border-zinc-800/90 px-3 sm:px-5 pt-[env(safe-area-inset-top,0px)] select-none z-30 relative shadow-[0_4px_25px_rgba(0,0,0,0.8)] font-mono ${className}`}
      >
        {/* Subtle machined rack bevel and simulated screw rivets */}
        <div className="absolute top-1 left-2 w-1.5 h-1.5 rounded-full border border-zinc-700/80 flex items-center justify-center opacity-40">
          <div className="w-1 h-px bg-zinc-600" />
        </div>
        <div className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full border border-zinc-700/80 flex items-center justify-center opacity-40">
          <div className="w-1 h-px bg-zinc-600" />
        </div>

        <div className="h-11 flex items-center justify-between text-[11px] text-zinc-400 w-full">
          {/* Left: Brand + 16-Segment Hardware LED Meter + Patch Code */}
          <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
            <HeaderBrandLogo variant="rack" />

            <span className="text-zinc-700 hidden sm:inline">|</span>

            {/* 16-Segment Hardware Tick Meter (Teenage Engineering Hardware) */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/80 border border-zinc-800 text-zinc-300"
              title="16/16 Hardware Buffer Synced"
            >
              <div className="flex items-center gap-[2px]">
                {Array.from({ length: 8 }).map((_, i) => (
                  <span
                    key={i}
                    className="w-1 h-2 rounded-[1px] bg-emerald-400/90 shadow-[0_0_3px_rgba(52,211,153,0.8)] animate-pulse"
                    style={{ animationDelay: `${i * 0.08}s`, animationDuration: '1.4s' }}
                  />
                ))}
              </div>
              <span className="text-[10px] font-bold tracking-tight text-emerald-400">16/16</span>
            </div>

            <span className="text-zinc-700 hidden sm:inline">|</span>

            {/* Hardware Patch Code Capsule */}
            <button
              type="button"
              onClick={handleCopyRoomCode}
              className="px-2.5 py-1 rounded-md bg-black/80 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-300 font-bold truncate flex items-center gap-1.5 transition-colors cursor-pointer group"
              title="Click to copy Room Code"
            >
              <span className="text-zinc-500 font-normal text-[10px]">PATCH</span>
              <span className="text-zinc-100">#{roomCode}</span>
              {copiedCode ? (
                <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
              ) : (
                <Copy className="w-2.5 h-2.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
              )}
            </button>
          </div>

          {/* Center: Recessed OLED Digital Telemetry Readout */}
          <div className="hidden md:flex items-center gap-3.5 bg-black/90 border border-zinc-800/90 rounded-md px-3.5 py-1 shadow-inner text-[10px] tracking-wide">
            <div className="flex items-center gap-1">
              <span className="text-zinc-500 font-medium">OFFSET:</span>
              <span className="text-emerald-400 font-bold">{clockOffsetNum.toFixed(2)}ms</span>
            </div>
            <span className="text-zinc-800">/</span>
            <div className="flex items-center gap-1">
              <span className="text-zinc-500 font-medium">RTT:</span>
              <span className="text-zinc-200 font-bold">{rttNum.toFixed(2)}ms</span>
            </div>
            <span className="text-zinc-800">/</span>
            <div className="flex items-center gap-1">
              <span className="text-zinc-500 font-medium">DRIFT:</span>
              <span className="text-zinc-300 font-bold">{driftNum.toFixed(0)}ms</span>
            </div>
            <span className="text-zinc-800">/</span>
            <div className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold">
              <span>LOCKED</span>
            </div>
          </div>

          {/* Right: Theme Switcher & Eject Button */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {showThemeSwitcher && (
              <ThemeDropdown
                activeTheme={activeTheme}
                onSelect={handleSelectTheme}
                onOpenShowcase={onOpenShowcase}
                buttonClass="bg-black/80 hover:bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-md"
              />
            )}

            {/* Industrial Eject Button */}
            <button
              type="button"
              onClick={onLeaveRoom}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-black/80 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-700/50 text-zinc-400 hover:text-rose-300 transition-all cursor-pointer text-xs font-bold active:scale-95 shadow-sm"
              title="Eject / Leave Room"
            >
              <LogOut className="w-3 h-3 text-zinc-400 group-hover:text-rose-400" />
              <span className="hidden sm:inline text-[10px] tracking-wider uppercase">EJECT</span>
            </button>
          </div>
        </div>
      </header>
    );
  }

  // =========================================================================
  // THEME 3: STEALTH OBSIDIAN DLC (Matte Carbon & Surgical Emerald)
  // =========================================================================
  if (activeTheme === 'stealth') {
    return (
      <header
        className={`shrink-0 bg-[#090a0d] border-b border-zinc-800/80 px-3 sm:px-5 pt-[env(safe-area-inset-top,0px)] select-none z-30 relative shadow-[0_2px_15px_rgba(0,0,0,0.9)] ${className}`}
      >
        <div className="h-11 flex items-center justify-between text-[11px] font-mono text-zinc-400 w-full">
          {/* Left: Brand + Flush Badges */}
          <div className="flex items-center gap-2 sm:gap-2.5 overflow-hidden">
            <HeaderBrandLogo variant="stealth" />

            <span className="text-zinc-800 hidden sm:inline">•</span>

            {/* Flush NTP Buffer Pill */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#101217] border border-zinc-800 text-zinc-300"
              title="NTP Sync Buffer (16/16)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
              <span className="text-zinc-300 font-semibold text-[11px]">16/16</span>
            </div>

            <span className="text-zinc-800 hidden sm:inline">•</span>

            {/* Flush Room Code */}
            <button
              type="button"
              onClick={handleCopyRoomCode}
              className="px-2.5 py-0.5 rounded-full bg-[#101217] hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-semibold truncate flex items-center gap-1 transition-colors cursor-pointer group"
              title="Click to copy Room Code"
            >
              <span className="text-zinc-500">#</span>
              <span className="text-zinc-200">{roomCode}</span>
              {copiedCode ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-2.5 h-2.5 text-zinc-600 group-hover:text-zinc-400" />
              )}
            </button>
          </div>

          {/* Center: Monochromatic Latency HUD */}
          <div className="hidden md:flex items-center gap-4 text-zinc-400 bg-[#101217] border border-zinc-800/80 rounded-full px-3.5 py-0.5">
            <div>
              Offset: <span className="text-emerald-400 font-bold font-mono">{clockOffsetNum.toFixed(2)}ms</span>
            </div>
            <span className="text-zinc-800">|</span>
            <div>
              RTT: <span className="text-zinc-300 font-bold font-mono">{rttNum.toFixed(2)}ms</span>
            </div>
            <span className="text-zinc-800">|</span>
            <div>
              Drift: <span className="text-zinc-400 font-bold font-mono">{driftNum.toFixed(0)}ms</span>
            </div>
          </div>

          {/* Right: Theme Switcher & Leave Button */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {showThemeSwitcher && (
              <ThemeDropdown
                activeTheme={activeTheme}
                onSelect={handleSelectTheme}
                onOpenShowcase={onOpenShowcase}
                buttonClass="bg-[#101217] hover:bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              />
            )}

            <button
              type="button"
              onClick={onLeaveRoom}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#101217] hover:bg-rose-950/30 border border-zinc-800 hover:border-rose-900/50 text-zinc-400 hover:text-rose-300 transition-all cursor-pointer text-xs font-semibold active:scale-95 shadow-sm"
              title="Leave Room"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden sm:inline text-[11px]">Leave</span>
            </button>
          </div>
        </div>
      </header>
    );
  }

  // =========================================================================
  // THEME 4: AEROGRADE PRISM GLASS (Vision Frosted Glass & Specular Bevels)
  // =========================================================================
  if (activeTheme === 'aerograde') {
    return (
      <header
        className={`shrink-0 bg-zinc-950/70 backdrop-blur-3xl border-b border-white/[0.12] px-3 sm:px-5 pt-[env(safe-area-inset-top,0px)] select-none z-30 relative shadow-[0_4px_30px_rgba(0,0,0,0.6)] ${className}`}
      >
        {/* Continuous Specular Refraction Highlight Line */}
        <div className="absolute top-[env(safe-area-inset-top,0px)] left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none opacity-80" />

        <div className="h-11 flex items-center justify-between text-[11px] font-mono text-zinc-300 w-full">
          {/* Left: Brand + Glass Capsules */}
          <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
            <HeaderBrandLogo variant="aerograde" />

            <span className="text-white/20 hidden sm:inline">•</span>

            {/* Glass Frosted Buffer Indicator */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.15] text-emerald-300 font-semibold shadow-[0_2px_12px_rgba(0,0,0,0.3)] backdrop-blur-md"
              title="NTP Clock Sync Buffer (16/16)"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
              <span>16/16</span>
            </div>

            <span className="text-white/20 hidden sm:inline">•</span>

            {/* Glass Frosted Room Code */}
            <button
              type="button"
              onClick={handleCopyRoomCode}
              className="px-2.5 py-0.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.15] hover:border-white/30 text-white font-semibold truncate shadow-[0_2px_12px_rgba(0,0,0,0.3)] flex items-center gap-1.5 backdrop-blur-md transition-all cursor-pointer group"
              title="Click to copy Room Code"
            >
              <span className="text-zinc-400">#</span>
              <span>{roomCode}</span>
              {copiedCode ? (
                <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
              ) : (
                <Copy className="w-2.5 h-2.5 text-zinc-400 group-hover:text-white transition-colors" />
              )}
            </button>
          </div>

          {/* Center: Frosted Glass Bridge Latency Telemetry */}
          <div className="hidden md:flex items-center gap-4 text-zinc-300 bg-white/[0.04] border border-white/[0.12] rounded-full px-3.5 py-1 shadow-[0_2px_16px_rgba(0,0,0,0.4)] backdrop-blur-xl">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>Offset:</span>
              <span className="text-emerald-400 font-bold font-mono">{clockOffsetNum.toFixed(2)}ms</span>
            </div>
            <span className="text-white/15">|</span>
            <div>
              RTT: <span className="text-white font-bold font-mono">{rttNum.toFixed(2)}ms</span>
            </div>
            <span className="text-white/15">|</span>
            <div>
              Drift: <span className="text-zinc-300 font-bold font-mono">{driftNum.toFixed(0)}ms</span>
            </div>
          </div>

          {/* Right: Theme Switcher & Glass Leave Button */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {showThemeSwitcher && (
              <ThemeDropdown
                activeTheme={activeTheme}
                onSelect={handleSelectTheme}
                onOpenShowcase={onOpenShowcase}
                buttonClass="bg-white/[0.05] hover:bg-white/[0.1] border-white/15 text-zinc-200"
              />
            )}

            <button
              type="button"
              onClick={onLeaveRoom}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] hover:bg-rose-500/20 border border-white/[0.15] hover:border-rose-400/40 text-zinc-300 hover:text-rose-200 transition-all cursor-pointer text-xs font-semibold active:scale-95 shadow-[0_2px_10px_rgba(0,0,0,0.3)] backdrop-blur-md"
              title="Leave Room"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Leave</span>
            </button>
          </div>
        </div>
      </header>
    );
  }

  // =========================================================================
  // THEME 1: TITANIUM STUDIO MINIMAL (Apple & Leica Precision - Recommended)
  // =========================================================================
  return (
    <header
      className={`shrink-0 bg-[#0e1014]/90 backdrop-blur-2xl border-b border-white/[0.08] px-3 sm:px-5 pt-[env(safe-area-inset-top,0px)] select-none z-30 relative shadow-[0_4px_24px_rgba(0,0,0,0.7)] ${className}`}
    >
      {/* Precision Brushed Platinum Specular Hairline */}
      <div className="absolute top-[env(safe-area-inset-top,0px)] left-1/2 -translate-x-1/2 w-64 sm:w-96 h-[1.2px] bg-gradient-to-r from-transparent via-zinc-200/50 to-transparent pointer-events-none" />

      <div className="h-11 flex items-center justify-between text-[11px] font-mono text-zinc-400 w-full">
        {/* Left: Brand + Buffer + Room Code */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
          <HeaderBrandLogo variant="studio" />

          <span className="text-white/20 hidden sm:inline">•</span>

          {/* Sync Buffer Indicator (Machined Titanium Capsule) */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-900/80 border border-emerald-500/30 text-emerald-400 font-semibold shadow-[0_0_12px_rgba(16,185,129,0.12)]"
            title="NTP Clock Sync Buffer (16/16)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            <span className="tracking-tight">16/16</span>
          </div>

          <span className="text-white/20 hidden sm:inline">•</span>

          {/* Room Code Badge */}
          <button
            type="button"
            onClick={handleCopyRoomCode}
            className="px-2.5 py-0.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800/80 border border-white/[0.08] hover:border-white/20 text-zinc-200 font-semibold truncate flex items-center gap-1.5 transition-all cursor-pointer group shadow-sm active:scale-95"
            title="Click to copy Room Code"
          >
            <span className="text-zinc-500">#</span>
            <span className="text-zinc-100">{roomCode}</span>
            {copiedCode ? (
              <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
            ) : (
              <Copy className="w-2.5 h-2.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
            )}
          </button>
        </div>

        {/* Center: Real-time Audio Latency Telemetry (Floating Titanium Bar) */}
        <div className="hidden md:flex items-center gap-4 text-zinc-400 bg-zinc-900/60 border border-white/[0.06] rounded-full px-3.5 py-1 shadow-inner">
          <div>
            Offset: <span className="text-emerald-400 font-bold font-mono">{clockOffsetNum.toFixed(2)}ms</span>
          </div>
          <span className="text-white/10">|</span>
          <div>
            RTT: <span className="text-zinc-200 font-bold font-mono">{rttNum.toFixed(2)}ms</span>
          </div>
          <span className="text-white/10">|</span>
          <div>
            Drift: <span className="text-zinc-300 font-bold font-mono">{driftNum.toFixed(0)}ms</span>
          </div>
        </div>

        {/* Right: Room Controls & Theme Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {showThemeSwitcher && (
            <ThemeDropdown
              activeTheme={activeTheme}
              onSelect={handleSelectTheme}
              onOpenShowcase={onOpenShowcase}
              buttonClass="bg-zinc-900/80 hover:bg-zinc-800 border-white/[0.08] text-zinc-300 hover:text-white"
            />
          )}

          {/* Leave Room Button */}
          <button
            type="button"
            onClick={onLeaveRoom}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/80 hover:bg-rose-500/15 border border-white/[0.08] hover:border-rose-500/30 text-zinc-400 hover:text-rose-300 transition-all cursor-pointer text-xs font-semibold active:scale-95 shadow-sm"
            title="Leave Room"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Leave</span>
          </button>
        </div>
      </div>
    </header>
  );
};

// =========================================================================
// SUBCOMPONENT: THEME DROPDOWN SWITCHER
// =========================================================================
const ThemeDropdown: React.FC<{
  activeTheme: TitaniumHeaderTheme;
  onSelect: (theme: TitaniumHeaderTheme) => void;
  onOpenShowcase?: () => void;
  buttonClass?: string;
}> = ({ activeTheme, onSelect, onOpenShowcase, buttonClass = '' }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = () => setIsOpen(false);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  const currentTheme = TITANIUM_HEADER_THEMES.find((t) => t.id === activeTheme);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-mono font-medium transition-all cursor-pointer active:scale-95 shadow-sm ${buttonClass}`}
        title="Switch Titanium Header Style"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
        <span className="hidden sm:inline text-zinc-400">Titanium:</span>
        <span className="font-semibold text-zinc-200">{currentTheme?.name.split(' ')[1] || 'Studio'}</span>
        <ChevronDown className="w-3 h-3 text-zinc-400 ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-[#111317]/95 border border-white/10 shadow-2xl p-2 z-50 backdrop-blur-2xl flex flex-col gap-1 text-left animate-popover-spring">
          <div className="px-2.5 py-1.5 border-b border-white/[0.08] flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
              Titanium Header Styles
            </span>
            {onOpenShowcase && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenShowcase();
                }}
                className="text-[10px] font-mono text-emerald-400 hover:underline cursor-pointer"
              >
                Compare All ↗
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1 pt-1">
            {TITANIUM_HEADER_THEMES.map((theme) => {
              const isSelected = theme.id === activeTheme;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => onSelect(theme.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-start justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-800/90 border border-emerald-500/40 text-white'
                      : 'hover:bg-white/[0.06] text-zinc-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold">{theme.name}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-zinc-400">
                        {theme.tag}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">{theme.desc}</p>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TitaniumHeader;
