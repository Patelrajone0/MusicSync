import React, { useState } from 'react';
import {
  Users,
  Crown,
  QrCode,
  Upload,
  Radio,
  Sliders,
  Check,
  ChevronDown,
  Sparkles,
  Layers,
  Cpu,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { User } from '../types';

export type TitaniumSidebarTheme = 'studio' | 'rack' | 'stealth' | 'aerograde';

export const TITANIUM_SIDEBAR_THEMES: {
  id: TitaniumSidebarTheme;
  name: string;
  tag: string;
  desc: string;
}[] = [
  {
    id: 'studio',
    name: 'Titanium Studio Minimal',
    tag: 'RECOMMENDED',
    desc: 'Apple Studio & Leica precision brushed titanium with emerald micro-LEDs and laser typography.',
  },
  {
    id: 'rack',
    name: 'Hardware Audio Console',
    tag: 'TE PRO RACK',
    desc: 'Teenage Engineering OP-1 aesthetic with stamped industrial badges and recessed modular channels.',
  },
  {
    id: 'stealth',
    name: 'Stealth Obsidian DLC',
    tag: 'SURGICAL MATTE',
    desc: 'Deep matte black diamond-like carbon plate with zero glare and surgical emerald accents.',
  },
  {
    id: 'aerograde',
    name: 'Aerograde Prism Glass',
    tag: 'VISION GLASS',
    desc: 'Frosted multi-tone titanium glass with continuous metallic specular sweep and glass cards.',
  },
];

const THEME_STORAGE_KEY = 'musicsync_titanium_sidebar_theme';

export function getStoredSidebarTheme(): TitaniumSidebarTheme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'studio' || saved === 'rack' || saved === 'stealth' || saved === 'aerograde') {
      return saved;
    }
  } catch {}
  return 'studio';
}

export function saveStoredSidebarTheme(theme: TitaniumSidebarTheme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
}

export interface TitaniumSidebarProps {
  roomCode: string;
  users: User[];
  currentUser: User | null;
  hostId: string | null;
  mobileTab?: string;
  playbackPermission: 'everyone' | 'admins';
  onPermissionChange: (permission: 'everyone' | 'admins') => void;
  onOpenQR: () => void;
  onUploadAudio: () => void;
  theme?: TitaniumSidebarTheme;
  onThemeChange?: (theme: TitaniumSidebarTheme) => void;
  onOpenShowcase?: () => void;
  showThemeSwitcher?: boolean;
  className?: string;
}

export const TitaniumSidebar: React.FC<TitaniumSidebarProps> = ({
  roomCode,
  users,
  currentUser,
  hostId,
  mobileTab = 'room',
  playbackPermission,
  onPermissionChange,
  onOpenQR,
  onUploadAudio,
  theme: controlledTheme,
  onThemeChange,
  onOpenShowcase,
  showThemeSwitcher = false,
  className = '',
}) => {
  const [internalTheme, setInternalTheme] = useState<TitaniumSidebarTheme>(getStoredSidebarTheme);
  const activeTheme = controlledTheme || internalTheme;

  const handleSelectTheme = (th: TitaniumSidebarTheme) => {
    setInternalTheme(th);
    saveStoredSidebarTheme(th);
    if (onThemeChange) onThemeChange(th);
  };

  const isVisibleOnMobile = mobileTab === 'room';

  // =========================================================================
  // THEME 2: HARDWARE AUDIO CONSOLE (Teenage Engineering Rackmount Style)
  // =========================================================================
  if (activeTheme === 'rack') {
    return (
      <aside
        className={`w-full md:w-60 lg:w-64 shrink-0 bg-[#0d0f14] border-r border-zinc-800/90 flex-col p-3.5 gap-4 overflow-y-auto relative z-10 font-mono shadow-[4px_0_24px_rgba(0,0,0,0.7)] ${
          isVisibleOnMobile ? 'flex' : 'hidden md:flex'
        } ${className}`}
      >
        {/* Rackmount Simulated Hex Screws */}
        <div className="absolute top-1.5 left-2 w-1.5 h-1.5 rounded-full border border-zinc-700/80 flex items-center justify-center opacity-40">
          <div className="w-1 h-px bg-zinc-600" />
        </div>
        <div className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full border border-zinc-700/80 flex items-center justify-center opacity-40">
          <div className="w-1 h-px bg-zinc-600" />
        </div>

        {/* Room Header & Industrial QR Trigger */}
        <div className="flex items-center justify-between shrink-0 pt-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] font-bold text-zinc-500 uppercase">SYS</span>
            <h2 className="text-xs font-bold text-zinc-100 tracking-wider truncate uppercase">
              ROOM // {roomCode}
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            {showThemeSwitcher && (
              <SidebarThemeDropdown
                activeTheme={activeTheme}
                onSelect={handleSelectTheme}
                onOpenShowcase={onOpenShowcase}
              />
            )}
            <button
              type="button"
              onClick={onOpenQR}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/80 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white text-[11px] font-bold cursor-pointer transition-all shrink-0 shadow-sm"
              title="View Room QR Code & Info"
            >
              <QrCode className="w-3 h-3 text-zinc-400" />
              <span>QR ⊞</span>
            </button>
          </div>
        </div>

        {/* PLAYBACK PERMISSIONS (Rackmount Tactile Rockers) */}
        <div className="space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-sm bg-emerald-400/80 shadow-[0_0_5px_rgba(52,211,153,0.8)]" />
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
                BUS 01 // PERMISSIONS
              </label>
            </div>
            <span className="text-[9px] font-mono text-zinc-600">ROUTE</span>
          </div>

          <div className="grid grid-cols-2 p-1 rounded-md bg-black/80 border border-zinc-800/90 text-xs">
            <button
              type="button"
              onClick={() => onPermissionChange('everyone')}
              className={`py-1.5 rounded font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-[11px] ${
                playbackPermission === 'everyone'
                  ? 'bg-zinc-800 border border-zinc-600 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Users className="w-3 h-3" />
              <span>ALL</span>
            </button>
            <button
              type="button"
              onClick={() => onPermissionChange('admins')}
              className={`py-1.5 rounded font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-[11px] ${
                playbackPermission === 'admins'
                  ? 'bg-amber-950/40 border border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>ADMINS</span>
            </button>
          </div>
        </div>

        {/* CONNECTED USERS LIST (Modular Hardware Channels) */}
        <div className="space-y-2 flex-1 min-h-[140px] flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-sm bg-emerald-400/80 shadow-[0_0_5px_rgba(52,211,153,0.8)]" />
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
                NODES // USERS
              </label>
            </div>
            <span className="px-2 py-0.2 rounded bg-black/80 border border-zinc-800 text-emerald-400 font-mono text-[10px] font-bold">
              {users.length} ON
            </span>
          </div>

          <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
            {users.map((u, idx) => {
              const isUserHost = u.role === 'host' || u.id === hostId;
              const isYou = u.id === currentUser?.id;

              return (
                <div
                  key={u.id}
                  className={`flex items-center justify-between p-2 rounded-md border transition-all ${
                    isYou
                      ? 'bg-zinc-900/90 border-zinc-600 text-white shadow-sm'
                      : 'bg-black/60 border-zinc-800/80 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[9px] text-zinc-600 font-mono">
                      0{idx + 1}
                    </span>
                    <div className="relative w-5 h-5 rounded bg-zinc-900 border border-zinc-700 flex items-center justify-center text-[10px] shrink-0 font-sans">
                      <span>🇮🇳</span>
                      {isUserHost && (
                        <span className="absolute -top-1 -right-1 text-amber-400">
                          <Crown className="w-2.5 h-2.5 fill-amber-400" />
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold truncate tracking-tight">{u.name}</span>
                  </div>

                  {isYou && (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-600 text-zinc-200 shrink-0">
                      HOST
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Upload Button (Industrial Audio Dock) */}
        <button
          type="button"
          onClick={onUploadAudio}
          className="w-full p-2.5 rounded-md border border-zinc-800 hover:border-zinc-600 bg-black/80 hover:bg-zinc-900/90 flex items-center gap-2.5 text-left transition-all cursor-pointer group active:scale-[0.98] shrink-0 shadow-sm"
        >
          <div className="w-7 h-7 rounded bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-300 shrink-0 group-hover:bg-zinc-800 group-hover:text-white transition-colors">
            <Upload className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-zinc-100 leading-tight uppercase tracking-wider">
              AUDIO IN // UPLOAD
            </h4>
            <p className="text-[10px] text-zinc-500 leading-tight">Patch file into master queue</p>
          </div>
        </button>
      </aside>
    );
  }

  // =========================================================================
  // THEME 3: STEALTH OBSIDIAN DLC (Matte Carbon & Surgical Emerald)
  // =========================================================================
  if (activeTheme === 'stealth') {
    return (
      <aside
        className={`w-full md:w-60 lg:w-64 shrink-0 bg-[#08090c] border-r border-zinc-800/80 flex-col p-3.5 gap-4 overflow-y-auto relative z-10 select-none shadow-[2px_0_15px_rgba(0,0,0,0.9)] ${
          isVisibleOnMobile ? 'flex' : 'hidden md:flex'
        } ${className}`}
      >
        {/* Room Header & Flush Stealth QR Trigger */}
        <div className="flex items-center justify-between shrink-0">
          <h2 className="text-sm font-bold text-zinc-200 tracking-tight flex items-center gap-1.5 truncate">
            <span className="text-zinc-500">#</span>
            <span>Room {roomCode}</span>
          </h2>

          <div className="flex items-center gap-1.5">
            {showThemeSwitcher && (
              <SidebarThemeDropdown
                activeTheme={activeTheme}
                onSelect={handleSelectTheme}
                onOpenShowcase={onOpenShowcase}
              />
            )}
            <button
              type="button"
              onClick={onOpenQR}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#101217] hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer transition-all shrink-0 shadow-sm"
              title="View Room QR Code & Info"
            >
              <QrCode className="w-3 h-3 text-zinc-400" />
              <span>QR</span>
            </button>
          </div>
        </div>

        {/* PLAYBACK PERMISSIONS (Flush Matte Segments) */}
        <div className="space-y-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
              Playback Permissions
            </label>
          </div>

          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#101217] border border-zinc-800/80 text-xs">
            <button
              type="button"
              onClick={() => onPermissionChange('everyone')}
              className={`py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                playbackPermission === 'everyone'
                  ? 'bg-zinc-800 border border-zinc-700 text-white font-bold shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Users className="w-3 h-3" />
              <span>Everyone</span>
            </button>
            <button
              type="button"
              onClick={() => onPermissionChange('admins')}
              className={`py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                playbackPermission === 'admins'
                  ? 'bg-zinc-800 border border-amber-500/40 text-amber-300 font-bold shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>Admins</span>
            </button>
          </div>
        </div>

        {/* CONNECTED USERS LIST (Stealth Flush Cards) */}
        <div className="space-y-2 flex-1 min-h-[140px] flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                Connected Users
              </label>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#101217] border border-zinc-800 text-zinc-400 font-mono text-[10px] font-bold">
              {users.length}
            </span>
          </div>

          <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
            {users.map((u) => {
              const isUserHost = u.role === 'host' || u.id === hostId;
              const isYou = u.id === currentUser?.id;

              return (
                <div
                  key={u.id}
                  className={`flex items-center justify-between p-2 sm:p-2.5 rounded-xl border transition-all ${
                    isYou
                      ? 'bg-[#12141a] border-zinc-700 text-white shadow-sm ring-1 ring-zinc-700/50'
                      : 'bg-[#0f1115] border-zinc-800/80 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs shrink-0">
                      <span>🇮🇳</span>
                      {isUserHost && (
                        <span className="absolute -top-1 -right-1 text-amber-400">
                          <Crown className="w-2.5 h-2.5 fill-amber-400" />
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold truncate">{u.name}</span>
                  </div>

                  {isYou && (
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.3)] shrink-0">
                      You
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Upload Button (Flush Stealth Dock) */}
        <button
          type="button"
          onClick={onUploadAudio}
          className="w-full p-2.5 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-[#101217] hover:bg-[#14171e] flex items-center gap-2.5 text-left transition-all cursor-pointer group active:scale-[0.98] shrink-0 shadow-sm"
        >
          <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0 group-hover:text-emerald-400 transition-colors">
            <Upload className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-zinc-200 leading-tight">Upload audio</h4>
            <p className="text-[10px] text-zinc-500 leading-tight">Add music to queue</p>
          </div>
        </button>
      </aside>
    );
  }

  // =========================================================================
  // THEME 4: AEROGRADE PRISM GLASS (Vision Frosted Glass & Specular Bevels)
  // =========================================================================
  if (activeTheme === 'aerograde') {
    return (
      <aside
        className={`w-full md:w-60 lg:w-64 shrink-0 bg-zinc-950/70 backdrop-blur-3xl border-r border-white/[0.12] flex-col p-3.5 gap-4 overflow-y-auto relative z-10 select-none shadow-[4px_0_30px_rgba(0,0,0,0.6)] ${
          isVisibleOnMobile ? 'flex' : 'hidden md:flex'
        } ${className}`}
      >
        {/* Specular Refraction Accent Line */}
        <div className="absolute top-0 bottom-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-white/30 to-transparent pointer-events-none" />

        {/* Room Header & Frosted Glass QR Trigger */}
        <div className="flex items-center justify-between shrink-0">
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5 truncate">
            <span className="text-zinc-400">#</span>
            <span>Room {roomCode}</span>
          </h2>

          <div className="flex items-center gap-1.5">
            {showThemeSwitcher && (
              <SidebarThemeDropdown
                activeTheme={activeTheme}
                onSelect={handleSelectTheme}
                onOpenShowcase={onOpenShowcase}
              />
            )}
            <button
              type="button"
              onClick={onOpenQR}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 hover:border-white/30 text-zinc-200 hover:text-white text-xs font-semibold cursor-pointer transition-all shrink-0 shadow-[0_2px_10px_rgba(0,0,0,0.3)] backdrop-blur-md"
              title="View Room QR Code & Info"
            >
              <QrCode className="w-3 h-3 text-zinc-300" />
              <span>QR</span>
            </button>
          </div>
        </div>

        {/* PLAYBACK PERMISSIONS (Frosted Glass Segmented Control) */}
        <div className="space-y-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
              <Radio className="w-2 h-2 text-zinc-200" />
            </div>
            <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider font-mono">
              Playback Permissions
            </label>
          </div>

          <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.1] text-xs backdrop-blur-xl shadow-inner">
            <button
              type="button"
              onClick={() => onPermissionChange('everyone')}
              className={`py-1.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                playbackPermission === 'everyone'
                  ? 'bg-white/15 border border-white/25 text-white font-bold shadow-[0_2px_10px_rgba(0,0,0,0.3)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Users className="w-3 h-3" />
              <span>Everyone</span>
            </button>
            <button
              type="button"
              onClick={() => onPermissionChange('admins')}
              className={`py-1.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                playbackPermission === 'admins'
                  ? 'bg-amber-500/20 border border-amber-400/40 text-amber-200 font-bold shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Crown className="w-3 h-3 text-amber-300 fill-amber-300" />
              <span>Admins</span>
            </button>
          </div>
        </div>

        {/* CONNECTED USERS LIST (Frosted Glass User Cards) */}
        <div className="space-y-2 flex-1 min-h-[140px] flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                <Users className="w-2 h-2 text-zinc-200" />
              </div>
              <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider font-mono">
                Connected Users
              </label>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/15 text-zinc-200 font-mono text-[10px] font-bold shadow-sm">
              {users.length}
            </span>
          </div>

          <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
            {users.map((u) => {
              const isUserHost = u.role === 'host' || u.id === hostId;
              const isYou = u.id === currentUser?.id;

              return (
                <div
                  key={u.id}
                  className={`flex items-center justify-between p-2 sm:p-2.5 rounded-xl border transition-all backdrop-blur-md ${
                    isYou
                      ? 'bg-white/[0.1] border-white/25 text-white shadow-[0_2px_15px_rgba(0,0,0,0.3)] ring-1 ring-white/20'
                      : 'bg-white/[0.03] border-white/[0.08] hover:border-white/20 text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative w-6 h-6 rounded-full bg-zinc-900/80 border border-white/15 flex items-center justify-center text-xs shrink-0 shadow-inner">
                      <span>🇮🇳</span>
                      {isUserHost && (
                        <span className="absolute -top-1 -right-1 text-amber-300">
                          <Crown className="w-2.5 h-2.5 fill-amber-300" />
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold truncate">{u.name}</span>
                  </div>

                  {isYou && (
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-white shadow-[0_0_8px_rgba(255,255,255,0.4)] shrink-0">
                      You
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Upload Button (Frosted Glass Action Dock) */}
        <button
          type="button"
          onClick={onUploadAudio}
          className="w-full p-2.5 rounded-2xl border border-white/10 hover:border-white/30 bg-white/[0.04] hover:bg-white/[0.08] flex items-center gap-2.5 text-left transition-all cursor-pointer group active:scale-[0.98] shrink-0 shadow-[0_2px_12px_rgba(0,0,0,0.3)] backdrop-blur-md"
        >
          <div className="w-7 h-7 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0 group-hover:bg-white group-hover:text-black transition-colors shadow-sm">
            <Upload className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-white leading-tight">Upload audio</h4>
            <p className="text-[10px] text-zinc-400 leading-tight">Add music to queue</p>
          </div>
        </button>
      </aside>
    );
  }

  // =========================================================================
  // THEME 1: TITANIUM STUDIO MINIMAL (Apple & Leica Precision - Recommended)
  // =========================================================================
  return (
    <aside
      className={`w-full md:w-60 lg:w-64 shrink-0 bg-[#0e1014]/90 backdrop-blur-2xl border-r border-white/[0.08] flex-col p-3.5 gap-4 overflow-y-auto relative z-10 select-none shadow-[4px_0_24px_rgba(0,0,0,0.7)] ${
        isVisibleOnMobile ? 'flex' : 'hidden md:flex'
      } ${className}`}
    >
      {/* Precision Brushed Platinum Top Highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-zinc-200/40 to-transparent pointer-events-none" />

      {/* Room Header & QR Trigger (Machined Titanium Capsule) */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-bold text-zinc-100 tracking-tight flex items-center gap-1.5 truncate">
            <span className="text-zinc-500">#</span>
            <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
              Room {roomCode}
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          {showThemeSwitcher && (
            <SidebarThemeDropdown
              activeTheme={activeTheme}
              onSelect={handleSelectTheme}
              onOpenShowcase={onOpenShowcase}
            />
          )}

          <button
            type="button"
            onClick={onOpenQR}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-white/[0.08] hover:border-white/25 text-zinc-300 hover:text-white text-xs font-semibold cursor-pointer transition-all shrink-0 shadow-sm active:scale-95"
            title="View Room QR Code & Info"
          >
            <QrCode className="w-3 h-3 text-zinc-400 group-hover:text-white" />
            <span className="text-[11px]">QR</span>
          </button>
        </div>
      </div>

      {/* PLAYBACK PERMISSIONS (Precision Machined Titanium Slider) */}
      <div className="space-y-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider font-mono">
            Playback Permissions
          </label>
        </div>

        <div className="grid grid-cols-2 p-1 rounded-2xl bg-zinc-950/80 border border-white/[0.08] text-xs shadow-inner">
          <button
            type="button"
            onClick={() => onPermissionChange('everyone')}
            className={`py-1.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs ${
              playbackPermission === 'everyone'
                ? 'bg-zinc-800/90 border border-white/20 text-white font-bold shadow-[0_2px_8px_rgba(0,0,0,0.4)]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>Everyone</span>
          </button>
          <button
            type="button"
            onClick={() => onPermissionChange('admins')}
            className={`py-1.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs ${
              playbackPermission === 'admins'
                ? 'bg-amber-500/15 border border-amber-400/30 text-amber-200 font-bold shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span>Admins</span>
          </button>
        </div>
      </div>

      {/* CONNECTED USERS LIST (Machined Titanium Cards) */}
      <div className="space-y-2 flex-1 min-h-[140px] flex flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider font-mono">
              Connected Users
            </label>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-zinc-900/80 border border-white/[0.08] text-zinc-300 font-mono text-[10px] font-bold shadow-sm">
            {users.length}
          </span>
        </div>

        <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
          {users.map((u) => {
            const isUserHost = u.role === 'host' || u.id === hostId;
            const isYou = u.id === currentUser?.id;

            return (
              <div
                key={u.id}
                className={`flex items-center justify-between p-2 sm:p-2.5 rounded-xl border transition-all ${
                  isYou
                    ? 'bg-zinc-800/80 border-white/20 text-white shadow-[0_2px_12px_rgba(0,0,0,0.5)] ring-1 ring-white/10'
                    : 'bg-zinc-900/60 border-white/[0.06] hover:border-white/15 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative w-6 h-6 rounded-full bg-zinc-950 border border-white/10 flex items-center justify-center text-xs shrink-0 shadow-inner">
                    <span>🇮🇳</span>
                    {isUserHost && (
                      <span className="absolute -top-1 -right-1 text-amber-400">
                        <Crown className="w-2.5 h-2.5 fill-amber-400" />
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold truncate text-zinc-100">{u.name}</span>
                </div>

                {isYou && (
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-zinc-200 shadow-sm shrink-0">
                    You
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Upload Button (Beveled Titanium Dock) */}
      <button
        type="button"
        onClick={onUploadAudio}
        className="w-full p-2.5 rounded-2xl border border-white/[0.08] hover:border-white/25 bg-zinc-900/80 hover:bg-zinc-800/90 flex items-center gap-2.5 text-left transition-all cursor-pointer group active:scale-[0.98] shrink-0 shadow-sm"
      >
        <div className="w-7 h-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 shrink-0 group-hover:bg-white group-hover:text-black transition-colors shadow-inner">
          <Upload className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-white leading-tight">Upload audio</h4>
          <p className="text-[10px] text-zinc-400 leading-tight">Add music to queue</p>
        </div>
      </button>
    </aside>
  );
};

// =========================================================================
// SUBCOMPONENT: THEME DROPDOWN SWITCHER (Optional)
// =========================================================================
const SidebarThemeDropdown: React.FC<{
  activeTheme: TitaniumSidebarTheme;
  onSelect: (theme: TitaniumSidebarTheme) => void;
  onOpenShowcase?: () => void;
}> = ({ activeTheme, onSelect, onOpenShowcase }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 rounded-full bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white text-[10px] font-mono cursor-pointer"
        title="Switch Sidebar Titanium Style"
      >
        <span>{activeTheme.slice(0, 3).toUpperCase()}</span>
        <ChevronDown className="w-2.5 h-2.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-60 rounded-xl bg-[#111317]/95 border border-white/10 shadow-2xl p-2 z-50 backdrop-blur-2xl flex flex-col gap-1 text-left">
          <div className="px-2 py-1 border-b border-white/[0.08] flex items-center justify-between">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
              Sidebar Styles
            </span>
            {onOpenShowcase && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenShowcase();
                }}
                className="text-[9px] font-mono text-emerald-400 hover:underline cursor-pointer"
              >
                All ↗
              </button>
            )}
          </div>

          {TITANIUM_SIDEBAR_THEMES.map((th) => (
            <button
              key={th.id}
              type="button"
              onClick={() => {
                onSelect(th.id);
                setIsOpen(false);
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between cursor-pointer ${
                th.id === activeTheme
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
              }`}
            >
              <span>{th.name}</span>
              {th.id === activeTheme && <Check className="w-3 h-3 text-emerald-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TitaniumSidebar;
